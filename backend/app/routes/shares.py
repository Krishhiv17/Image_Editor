from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID
import secrets

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.share import (
    ShareCreate,
    ShareResponse,
    ShareListItem,
    ShareUpdate,
    SharedPhotoResponse,
    SharedAlbumResponse
)
from app.services.blob_service import blob_service
from app.config import settings

router = APIRouter(prefix="/api", tags=["shares"])


def generate_share_token() -> str:
    """Generate a cryptographically secure share token"""
    return secrets.token_urlsafe(32)  # 256 bits of entropy


def get_share_url(request: Request, token: str) -> str:
    """Generate full share URL"""
    base_url = str(request.base_url).rstrip('/')
    # Use frontend URL in production
    frontend_url = settings.frontend_url if hasattr(settings, 'frontend_url') else base_url.replace(':8000', ':3000')
    return f"{frontend_url}/share/{token}"


@router.post("/photos/{photo_id}/share", response_model=ShareResponse)
async def create_photo_share(
    photo_id: UUID,
    share_data: ShareCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a share link for a photo"""
    # Verify photo ownership
    photo_check = text("SELECT id FROM photos WHERE id = :photo_id AND owner_id = :user_id")
    photo_result = db.execute(photo_check, {
        "photo_id": str(photo_id),
        "user_id": current_user.id
    })
    
    if not photo_result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    # Generate unique token
    share_token = generate_share_token()
    
    # Calculate expiry
    expires_at = None
    if share_data.expires_in_days and share_data.expires_in_days > 0:
        expires_at = datetime.utcnow() + timedelta(days=share_data.expires_in_days)
    
    # Create share
    insert_query = text("""
        INSERT INTO shares (share_token, resource_type, resource_id, owner_id, scope, expires_at)
        VALUES (:token, 'photo', :resource_id, :owner_id, :scope, :expires_at)
        RETURNING id, share_token, resource_type, resource_id, scope, expires_at, created_at, access_count
    """)
    
    result = db.execute(insert_query, {
        "token": share_token,
        "resource_id": str(photo_id),
        "owner_id": current_user.id,
        "scope": share_data.scope,
        "expires_at": expires_at
    })
    db.commit()
    
    share = result.fetchone()
    
    return ShareResponse(
        id=share.id,
        share_token=share.share_token,
        share_url=get_share_url(request, share.share_token),
        resource_type=share.resource_type,
        resource_id=share.resource_id,
        scope=share.scope,
        expires_at=share.expires_at,
        created_at=share.created_at,
        access_count=share.access_count
    )


@router.post("/albums/{album_id}/share", response_model=ShareResponse)
async def create_album_share(
    album_id: UUID,
    share_data: ShareCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a share link for an album"""
    # Verify album ownership
    album_check = text("SELECT id FROM albums WHERE id = :album_id AND user_id = :user_id")
    album_result = db.execute(album_check, {
        "album_id": str(album_id),
        "user_id": current_user.id
    })
    
    if not album_result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    # Generate unique token
    share_token = generate_share_token()
    
    # Calculate expiry
    expires_at = None
    if share_data.expires_in_days and share_data.expires_in_days > 0:
        expires_at = datetime.utcnow() + timedelta(days=share_data.expires_in_days)
    
    # Create share
    insert_query = text("""
        INSERT INTO shares (share_token, resource_type, resource_id, owner_id, scope, expires_at)
        VALUES (:token, 'album', :resource_id, :owner_id, :scope, :expires_at)
        RETURNING id, share_token, resource_type, resource_id, scope, expires_at, created_at, access_count
    """)
    
    result = db.execute(insert_query, {
        "token": share_token,
        "resource_id": str(album_id),
        "owner_id": current_user.id,
        "scope": share_data.scope,
        "expires_at": expires_at
    })
    db.commit()
    
    share = result.fetchone()
    
    return ShareResponse(
        id=share.id,
        share_token=share.share_token,
        share_url=get_share_url(request, share.share_token),
        resource_type=share.resource_type,
        resource_id=share.resource_id,
        scope=share.scope,
        expires_at=share.expires_at,
        created_at=share.created_at,
        access_count=share.access_count
    )


@router.get("/shares", response_model=List[ShareListItem])
async def list_shares(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all shares created by the current user"""
    query = text("""
        SELECT 
            s.id,
            s.share_token,
            s.resource_type,
            s.resource_id,
            s.scope,
            s.expires_at,
            s.created_at,
            s.last_accessed_at,
            s.access_count,
            CASE 
                WHEN s.resource_type = 'photo' THEN p.filename
                WHEN s.resource_type = 'album' THEN a.name
            END as resource_name
        FROM shares s
        LEFT JOIN photos p ON s.resource_type = 'photo' AND s.resource_id = p.id
        LEFT JOIN albums a ON s.resource_type = 'album' AND s.resource_id = a.id
        WHERE s.owner_id = :user_id
        ORDER BY s.created_at DESC
    """)
    
    result = db.execute(query, {"user_id": current_user.id})
    shares = result.fetchall()
    
    return [
        ShareListItem(
            id=share.id,
            share_token=share.share_token,
            share_url=get_share_url(request, share.share_token),
            resource_type=share.resource_type,
            resource_id=share.resource_id,
            resource_name=share.resource_name or "Deleted",
            scope=share.scope,
            expires_at=share.expires_at,
            created_at=share.created_at,
            last_accessed_at=share.last_accessed_at,
            access_count=share.access_count,
            is_expired=(share.expires_at and share.expires_at < datetime.utcnow()) if share.expires_at else False
        )
        for share in shares
    ]


@router.delete("/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share(
    share_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke a share link"""
    delete_query = text("DELETE FROM shares WHERE id = :share_id AND owner_id = :user_id")
    result = db.execute(delete_query, {
        "share_id": str(share_id),
        "user_id": current_user.id
    })
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )


@router.get("/share/{token}")
async def get_shared_resource(
    token: str,
    db: Session = Depends(get_db)
):
    """Get shared resource (public endpoint - no auth required)"""
    # Get share details
    share_query = text("""
        SELECT id, resource_type, resource_id, scope, expires_at, access_count
        FROM shares
        WHERE share_token = :token
    """)
    
    result = db.execute(share_query, {"token": token})
    share = result.fetchone()
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )
    
    # Check if expired
    if share.expires_at and share.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share link has expired"
        )
    
    # Update access tracking
    update_query = text("""
        UPDATE shares 
        SET last_accessed_at = CURRENT_TIMESTAMP, access_count = access_count + 1
        WHERE share_token = :token
    """)
    db.execute(update_query, {"token": token})
    db.commit()
    
    # Get resource data based on type
    if share.resource_type == 'photo':
        photo_query = text("""
            SELECT id, filename, blob_url, blob_name, width, height, created_at
            FROM photos
            WHERE id = :photo_id
        """)
        photo_result = db.execute(photo_query, {"photo_id": str(share.resource_id)})
        photo = photo_result.fetchone()
        
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
        
        # Generate SAS token
        blob_url = photo.blob_url
        if photo.blob_name:
            sas_token = blob_service.generate_read_sas_token(
                settings.blob_container_originals,
                photo.blob_name
            )
            blob_url = f"{blob_url}{sas_token}"
        
        return {
            "type": "photo",
            "data": SharedPhotoResponse(
                id=photo.id,
                filename=photo.filename,
                blob_url=blob_url,
                width=photo.width,
                height=photo.height,
                created_at=photo.created_at,
                scope=share.scope
            )
        }
    
    elif share.resource_type == 'album':
        # Get album details
        album_query = text("""
            SELECT id, name, description
            FROM albums
            WHERE id = :album_id
        """)
        album_result = db.execute(album_query, {"album_id": str(share.resource_id)})
        album = album_result.fetchone()
        
        if not album:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Album not found"
            )
        
        # Get album photos
        photos_query = text("""
            SELECT p.id, p.filename, p.blob_url, p.blob_name, p.width, p.height
            FROM photos p
            INNER JOIN album_photos ap ON p.id = ap.photo_id
            WHERE ap.album_id = :album_id
            ORDER BY ap.position ASC, ap.added_at DESC
        """)
        photos_result = db.execute(photos_query, {"album_id": str(share.resource_id)})
        photos = photos_result.fetchall()
        
        # Generate SAS tokens for photos
        photos_with_sas = []
        for photo in photos:
            blob_url = photo.blob_url
            if photo.blob_name:
                sas_token = blob_service.generate_read_sas_token(
                    settings.blob_container_originals,
                    photo.blob_name
                )
                blob_url = f"{blob_url}{sas_token}"
            
            photos_with_sas.append({
                "id": str(photo.id),
                "filename": photo.filename,
                "blob_url": blob_url,
                "width": photo.width,
                "height": photo.height
            })
        
        return {
            "type": "album",
            "data": SharedAlbumResponse(
                id=album.id,
                name=album.name,
                description=album.description,
                photo_count=len(photos),
                photos=photos_with_sas,
                scope=share.scope
            )
        }
