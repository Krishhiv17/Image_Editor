from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.services.blob_service import blob_service
from app.config import settings
from app.schemas.album import (
    AlbumCreate,
    AlbumUpdate,
    AlbumResponse,
    AlbumListResponse,
    AddPhotosToAlbum,
    RemovePhotosFromAlbum,
    ReorderPhotos,
    SetCoverPhoto
)

router = APIRouter(prefix="/api/albums", tags=["albums"])


@router.post("", response_model=AlbumResponse, status_code=status.HTTP_201_CREATED)
async def create_album(
    album_data: AlbumCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new album"""
    query = text("""
        INSERT INTO albums (user_id, name, description, is_public)
        VALUES (:user_id, :name, :description, :is_public)
        RETURNING id, user_id, name, description, cover_photo_id, is_public, created_at, updated_at
    """)
    
    result = db.execute(query, {
        "user_id": current_user.id,
        "name": album_data.name,
        "description": album_data.description,
        "is_public": album_data.is_public
    })
    db.commit()
    
    album = result.fetchone()
    
    return AlbumResponse(
        id=album.id,
        user_id=album.user_id,
        name=album.name,
        description=album.description,
        cover_photo_id=album.cover_photo_id,
        cover_photo_url=None,
        is_public=album.is_public,
        photo_count=0,
        created_at=album.created_at,
        updated_at=album.updated_at
    )


@router.get("", response_model=List[AlbumListResponse])
async def list_albums(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all albums for the current user"""
    query = text("""
        SELECT 
            a.id,
            a.name,
            a.description,
            a.created_at,
            a.updated_at,
            p.blob_url as cover_photo_url,
            COUNT(ap.photo_id) as photo_count
        FROM albums a
        LEFT JOIN photos p ON a.cover_photo_id = p.id
        LEFT JOIN album_photos ap ON a.id = ap.album_id
        WHERE a.user_id = :user_id
        GROUP BY a.id, a.name, a.description, a.created_at, a.updated_at, p.blob_url
        ORDER BY a.updated_at DESC
    """)
    
    result = db.execute(query, {"user_id": current_user.id})
    albums = result.fetchall()
    
    return [
        AlbumListResponse(
            id=album.id,
            name=album.name,
            description=album.description,
            cover_photo_url=album.cover_photo_url,
            photo_count=album.photo_count or 0,
            created_at=album.created_at,
            updated_at=album.updated_at
        )
        for album in albums
    ]


@router.get("/{album_id}", response_model=AlbumResponse)
async def get_album(
    album_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get album details with photos"""
    query = text("""
        SELECT 
            a.id,
            a.user_id,
            a.name,
            a.description,
            a.cover_photo_id,
            a.is_public,
            a.created_at,
            a.updated_at,
            p.blob_url as cover_photo_url,
            COUNT(ap.photo_id) as photo_count
        FROM albums a
        LEFT JOIN photos p ON a.cover_photo_id = p.id
        LEFT JOIN album_photos ap ON a.id = ap.album_id
        WHERE a.id = :album_id AND a.user_id = :user_id
        GROUP BY a.id, a.user_id, a.name, a.description, a.cover_photo_id, 
                 a.is_public, a.created_at, a.updated_at, p.blob_url
    """)
    
    result = db.execute(query, {
        "album_id": str(album_id),
        "user_id": current_user.id
    })
    album = result.fetchone()
    
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    return AlbumResponse(
        id=album.id,
        user_id=album.user_id,
        name=album.name,
        description=album.description,
        cover_photo_id=album.cover_photo_id,
        cover_photo_url=album.cover_photo_url,
        is_public=album.is_public,
        photo_count=album.photo_count or 0,
        created_at=album.created_at,
        updated_at=album.updated_at
    )


@router.get("/{album_id}/photos")
async def get_album_photos(
    album_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all photos in an album"""
    # Verify album ownership
    check_query = text("SELECT id FROM albums WHERE id = :album_id AND user_id = :user_id")
    result = db.execute(check_query, {
        "album_id": str(album_id),
        "user_id": current_user.id
    })
    
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    # Get photos in album
    photos_query = text("""
        SELECT 
            p.id,
            p.filename,
            p.blob_url,
            p.blob_name,
            p.thumbnail_url,
            p.created_at,
            ap.position
        FROM photos p
        INNER JOIN album_photos ap ON p.id = ap.photo_id
        WHERE ap.album_id = :album_id
        ORDER BY ap.position ASC, ap.added_at DESC
    """)
    
    photos_result = db.execute(photos_query, {"album_id": str(album_id)})
    photos = photos_result.fetchall()
    
    # Generate SAS tokens for blob URLs
    result_photos = []
    for photo in photos:
        blob_url = photo.blob_url
        
        # Add SAS token if blob_url and blob_name exist
        if blob_url and photo.blob_name:
            try:
                # Generate read SAS token (valid for 1 hour)
                sas_token = blob_service.generate_read_sas_token(
                    settings.blob_container_originals,
                    photo.blob_name
                )
                blob_url = f"{blob_url}{sas_token}"
            except Exception as e:
                print(f"Error generating SAS token: {e}")
        
        result_photos.append({
            "id": str(photo.id),
            "filename": photo.filename,
            "blob_url": blob_url,
            "thumbnail_url": photo.thumbnail_url,
            "created_at": photo.created_at.isoformat() if photo.created_at else None,
            "position": photo.position
        })
    
    return result_photos


@router.put("/{album_id}", response_model=AlbumResponse)
async def update_album(
    album_id: UUID,
    album_data: AlbumUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update album details"""
    # Verify ownership
    check_query = text("SELECT id FROM albums WHERE id = :album_id AND user_id = :user_id")
    result = db.execute(check_query, {
        "album_id": str(album_id),
        "user_id": current_user.id
    })
    
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    # Build update query dynamically
    updates = []
    params = {"album_id": str(album_id)}
    
    if album_data.name is not None:
        updates.append("name = :name")
        params["name"] = album_data.name
    
    if album_data.description is not None:
        updates.append("description = :description")
        params["description"] = album_data.description
    
    if album_data.is_public is not None:
        updates.append("is_public = :is_public")
        params["is_public"] = album_data.is_public
    
    if album_data.cover_photo_id is not None:
        updates.append("cover_photo_id = :cover_photo_id")
        params["cover_photo_id"] = str(album_data.cover_photo_id)
    
    if not updates:
        # No updates, just return current album
        return await get_album(album_id, db, current_user)
    
    update_query = text(f"""
        UPDATE albums
        SET {", ".join(updates)}
        WHERE id = :album_id
    """)
    
    db.execute(update_query, params)
    db.commit()
    
    return await get_album(album_id, db, current_user)


@router.delete("/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_album(
    album_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an album"""
    query = text("DELETE FROM albums WHERE id = :album_id AND user_id = :user_id")
    result = db.execute(query, {
        "album_id": str(album_id),
        "user_id": current_user.id
    })
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )


@router.post("/{album_id}/photos", status_code=status.HTTP_201_CREATED)
async def add_photos_to_album(
    album_id: UUID,
    photos_data: AddPhotosToAlbum,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add photos to an album"""
    # Verify album ownership
    check_query = text("SELECT id FROM albums WHERE id = :album_id AND user_id = :user_id")
    result = db.execute(check_query, {
        "album_id": str(album_id),
        "user_id": current_user.id
    })
    
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    # Get current max position
    max_pos_query = text("""
        SELECT COALESCE(MAX(position), -1) as max_pos 
        FROM album_photos 
        WHERE album_id = :album_id
    """)
    max_pos_result = db.execute(max_pos_query, {"album_id": str(album_id)})
    max_pos = max_pos_result.fetchone().max_pos
    
    # Add photos
    for idx, photo_id in enumerate(photos_data.photo_ids):
        insert_query = text("""
            INSERT INTO album_photos (album_id, photo_id, position)
            VALUES (:album_id, :photo_id, :position)
            ON CONFLICT (album_id, photo_id) DO NOTHING
        """)
        db.execute(insert_query, {
            "album_id": str(album_id),
            "photo_id": str(photo_id),
            "position": max_pos + idx + 1
        })
    
    db.commit()
    return {"message": "Photos added successfully"}


@router.delete("/{album_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_photo_from_album(
    album_id: UUID,
    photo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a photo from an album"""
    # Verify album ownership
    check_query = text("SELECT id FROM albums WHERE id = :album_id AND user_id = :user_id")
    result = db.execute(check_query, {
        "album_id": str(album_id),
        "user_id": current_user.id
    })
    
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    delete_query = text("""
        DELETE FROM album_photos 
        WHERE album_id = :album_id AND photo_id = :photo_id
    """)
    db.execute(delete_query, {
        "album_id": str(album_id),
        "photo_id": str(photo_id)
    })
    db.commit()


@router.put("/{album_id}/cover")
async def set_cover_photo(
    album_id: UUID,
    cover_data: SetCoverPhoto,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Set album cover photo"""
    # Verify album ownership
    check_query = text("SELECT id FROM albums WHERE id = :album_id AND user_id = :user_id")
    result = db.execute(check_query, {
        "album_id": str(album_id),
        "user_id": current_user.id
    })
    
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found"
        )
    
    # Verify photo is in album
    photo_check = text("""
        SELECT id FROM album_photos 
        WHERE album_id = :album_id AND photo_id = :photo_id
    """)
    photo_result = db.execute(photo_check, {
        "album_id": str(album_id),
        "photo_id": str(cover_data.photo_id)
    })
    
    if not photo_result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo is not in this album"
        )
    
    update_query = text("""
        UPDATE albums 
        SET cover_photo_id = :photo_id 
        WHERE id = :album_id
    """)
    db.execute(update_query, {
        "album_id": str(album_id),
        "photo_id": str(cover_data.photo_id)
    })
    db.commit()
    
    return {"message": "Cover photo updated successfully"}
