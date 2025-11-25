from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/photos")
async def search_photos(
    q: Optional[str] = Query(None, description="Search query for filename"),
    tag_ids: Optional[str] = Query(None, description="Comma-separated tag IDs"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search photos with multiple filters:
    - q: Text search in filename
    - tag_ids: Filter by tags (comma-separated UUIDs)
    - start_date/end_date: Date range filter
    """
    
    # Build dynamic SQL query
    conditions = ["p.owner_id = :user_id"]
    params = {"user_id": current_user.id}
    
    # Filename search
    if q:
        conditions.append("LOWER(p.filename) LIKE :search_query")
        params["search_query"] = f"%{q.lower()}%"
    
    # Date range filter
    if start_date:
        conditions.append("p.created_at >= :start_date")
        params["start_date"] = start_date
    
    if end_date:
        conditions.append("p.created_at <= :end_date")
        params["end_date"] = end_date
    
    # Base query
    where_clause = " AND ".join(conditions)
    
    # Tag filter requires JOIN
    if tag_ids:
        tag_list = [tid.strip() for tid in tag_ids.split(',') if tid.strip()]
        if tag_list:
            # Cast string UUIDs to UUID type for PostgreSQL
            tag_uuids_str = ','.join([f"'{tid}'::uuid" for tid in tag_list])
            # Use subquery for tag filtering
            query = text(f"""
                SELECT DISTINCT
                    p.id,
                    p.filename,
                    p.blob_url,
                    p.blob_name,
                    p.thumbnail_url,
                    p.created_at,
                    p.width,
                    p.height
                FROM photos p
                INNER JOIN photo_tags pt ON p.id = pt.photo_id
                WHERE {where_clause} AND pt.tag_id IN ({tag_uuids_str})
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset
            """)
        else:
            # No valid tags, use regular query
            query = text(f"""
                SELECT
                    p.id,
                    p.filename,
                    p.blob_url,
                    p.blob_name,
                    p.thumbnail_url,
                    p.created_at,
                    p.width,
                    p.height
                FROM photos p
                WHERE {where_clause}
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset
            """)
    else:
        # Regular query without tag filter
        query = text(f"""
            SELECT
                p.id,
                p.filename,
                p.blob_url,
                p.blob_name,
                p.thumbnail_url,
                p.created_at,
                p.width,
                p.height
            FROM photos p
            WHERE {where_clause}
            ORDER BY p.created_at DESC
            LIMIT :limit OFFSET :offset
        """)
    
    params["limit"] = limit
    params["offset"] = offset
    
    # Execute query
    result = db.execute(query, params)
    photos = result.fetchall()
    
    # Get tags for each photo and generate SAS tokens
    from app.services.blob_service import blob_service
    from app.config import settings
    
    photos_with_tags = []
    for photo in photos:
        # Get tags
        tags_query = text("""
            SELECT t.id, t.name
            FROM tags t
            INNER JOIN photo_tags pt ON t.id = pt.tag_id
            WHERE pt.photo_id = :photo_id
            ORDER BY t.name ASC
        """)
        tags_result = db.execute(tags_query, {"photo_id": str(photo.id)})
        tags = tags_result.fetchall()
        
        # Generate SAS token
        blob_url = photo.blob_url
        if blob_url and photo.blob_name:
            try:
                sas_token = blob_service.generate_read_sas_token(
                    settings.blob_container_originals,
                    photo.blob_name
                )
                blob_url = f"{blob_url}{sas_token}"
            except Exception as e:
                print(f"Error generating SAS token: {e}")
        
        photos_with_tags.append({
            "id": str(photo.id),
            "filename": photo.filename,
            "blob_url": blob_url,
            "thumbnail_url": photo.thumbnail_url,
            "created_at": photo.created_at.isoformat() if photo.created_at else None,
            "width": photo.width,
            "height": photo.height,
            "tags": [{"id": str(tag.id), "name": tag.name} for tag in tags]
        })
    
    # Get total count for pagination
    if tag_ids and tag_list:
        count_query = text(f"""
            SELECT COUNT(DISTINCT p.id)
            FROM photos p
            INNER JOIN photo_tags pt ON p.id = pt.photo_id
            WHERE {where_clause} AND pt.tag_id IN ({tag_uuids_str})
        """)
    else:
        count_query = text(f"""
            SELECT COUNT(DISTINCT p.id)
            FROM photos p
            WHERE {where_clause}
        """)
    
    count_params = {k: v for k, v in params.items() if k not in ['limit', 'offset']}
    total_result = db.execute(count_query, count_params)
    total = total_result.scalar()
    
    return {
        "photos": photos_with_tags,
        "total": total,
        "limit": limit,
        "offset": offset
    }
