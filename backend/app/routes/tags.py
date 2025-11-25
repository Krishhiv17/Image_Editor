from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.tag import (
    TagCreate,
    TagResponse,
    TagWithCount,
    AddTagToPhoto,
    CreateAndAddTag
)

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tag"""
    # Check if tag already exists for this user
    check_query = text("""
        SELECT id, user_id, name, created_at
        FROM tags 
        WHERE user_id = :user_id AND LOWER(name) = LOWER(:name)
    """)
    
    existing = db.execute(check_query, {
        "user_id": current_user.id,
        "name": tag_data.name
    }).fetchone()
    
    if existing:
        # Return existing tag instead of error
        return TagResponse(
            id=existing.id,
            user_id=existing.user_id,
            name=existing.name,
            created_at=existing.created_at
        )
    
    # Create new tag
    insert_query = text("""
        INSERT INTO tags (user_id, name)
        VALUES (:user_id, :name)
        RETURNING id, user_id, name, created_at
    """)
    
    result = db.execute(insert_query, {
        "user_id": current_user.id,
        "name": tag_data.name
    })
    db.commit()
    
    tag = result.fetchone()
    
    return TagResponse(
        id=tag.id,
        user_id=tag.user_id,
        name=tag.name,
        created_at=tag.created_at
    )


@router.get("", response_model=List[TagWithCount])
async def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all tags for the current user with photo counts"""
    query = text("""
        SELECT 
            t.id,
            t.name,
            t.created_at,
            COUNT(pt.photo_id) as photo_count
        FROM tags t
        LEFT JOIN photo_tags pt ON t.id = pt.tag_id
        WHERE t.user_id = :user_id
        GROUP BY t.id, t.name, t.created_at
        ORDER BY t.name ASC
    """)
    
    result = db.execute(query, {"user_id": current_user.id})
    tags = result.fetchall()
    
    return [
        TagWithCount(
            id=tag.id,
            name=tag.name,
            photo_count=tag.photo_count or 0,
            created_at=tag.created_at
        )
        for tag in tags
    ]


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a tag (also removes from all photos)"""
    query = text("DELETE FROM tags WHERE id = :tag_id AND user_id = :user_id")
    result = db.execute(query, {
        "tag_id": str(tag_id),
        "user_id": current_user.id
    })
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )


@router.post("/photos/{photo_id}/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def add_tag_to_photo(
    photo_id: UUID,
    tag_data: AddTagToPhoto,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add existing tag to a photo"""
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
    
    # Verify tag ownership
    tag_check = text("SELECT id, user_id, name, created_at FROM tags WHERE id = :tag_id AND user_id = :user_id")
    tag_result = db.execute(tag_check, {
        "tag_id": str(tag_data.tag_id),
        "user_id": current_user.id
    })
    
    tag = tag_result.fetchone()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    # Add tag to photo (ignore if already exists)
    insert_query = text("""
        INSERT INTO photo_tags (photo_id, tag_id)
        VALUES (:photo_id, :tag_id)
        ON CONFLICT (photo_id, tag_id) DO NOTHING
    """)
    
    db.execute(insert_query, {
        "photo_id": str(photo_id),
        "tag_id": str(tag_data.tag_id)
    })
    db.commit()
    
    return TagResponse(
        id=tag.id,
        user_id=tag.user_id,
        name=tag.name,
        created_at=tag.created_at
    )


@router.post("/photos/{photo_id}/tags/create", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_and_add_tag(
    photo_id: UUID,
    tag_data: CreateAndAddTag,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tag and add it to a photo (convenience endpoint)"""
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
    
    # Create or get existing tag
    tag = await create_tag(TagCreate(name=tag_data.name), db, current_user)
    
    # Add tag to photo
    insert_query = text("""
        INSERT INTO photo_tags (photo_id, tag_id)
        VALUES (:photo_id, :tag_id)
        ON CONFLICT (photo_id, tag_id) DO NOTHING
    """)
    
    db.execute(insert_query, {
        "photo_id": str(photo_id),
        "tag_id": str(tag.id)
    })
    db.commit()
    
    return tag


@router.get("/photos/{photo_id}/tags", response_model=List[TagResponse])
async def get_photo_tags(
    photo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tags for a specific photo"""
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
    
    # Get tags
    query = text("""
        SELECT t.id, t.user_id, t.name, t.created_at
        FROM tags t
        INNER JOIN photo_tags pt ON t.id = pt.tag_id
        WHERE pt.photo_id = :photo_id
        ORDER BY t.name ASC
    """)
    
    result = db.execute(query, {"photo_id": str(photo_id)})
    tags = result.fetchall()
    
    return [
        TagResponse(
            id=tag.id,
            user_id=tag.user_id,
            name=tag.name,
            created_at=tag.created_at
        )
        for tag in tags
    ]


@router.delete("/photos/{photo_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tag_from_photo(
    photo_id: UUID,
    tag_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a tag from a photo"""
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
    
    # Remove tag from photo
    delete_query = text("""
        DELETE FROM photo_tags 
        WHERE photo_id = :photo_id AND tag_id = :tag_id
    """)
    
    db.execute(delete_query, {
        "photo_id": str(photo_id),
        "tag_id": str(tag_id)
    })
    db.commit()
