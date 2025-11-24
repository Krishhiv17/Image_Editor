"""
Photo upload and management router.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Photo
from app.schemas.photo import (
    PhotoUploadInit,
    PhotoUploadInitResponse,
    PhotoUploadComplete,
    PhotoResponse,
    PhotoListResponse
)
from app.services.blob_service import blob_service
from app.utils.exif import extract_exif_data
from app.config import settings
from typing import List, Optional
from uuid import UUID
import uuid

router = APIRouter()


@router.post("/upload/init", response_model=PhotoUploadInitResponse, status_code=status.HTTP_201_CREATED)
async def initialize_upload(
    upload_data: PhotoUploadInit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PhotoUploadInitResponse:
    """
    Initialize photo upload and generate SAS token.
    
    Args:
        upload_data: Upload initialization data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Upload URL and photo ID
    """
    # Generate unique blob name
    blob_name = blob_service.generate_unique_blob_name(
        user_id=str(current_user.id),
        filename=upload_data.filename
    )
    
    # Generate SAS URL for upload
    upload_url = blob_service.generate_upload_sas_url(
        container_name=settings.blob_container_originals,
        blob_name=blob_name,
        expiry_minutes=60
    )
    
    # Create photo record in database (pending upload)
    photo = Photo(
        id=uuid.uuid4(),
        owner_id=current_user.id,
        filename=upload_data.filename,
        blob_name=blob_name,
        blob_url="",  # Will be set on completion
        file_size=upload_data.file_size,
        content_type=upload_data.content_type,
        album_id=upload_data.album_id
    )
    
    db.add(photo)
    db.commit()
    db.refresh(photo)
    
    return PhotoUploadInitResponse(
        upload_url=upload_url,
        blob_name=blob_name,
        photo_id=str(photo.id)
    )


@router.post("/upload/complete", response_model=PhotoResponse)
async def complete_upload(
    completion_data: PhotoUploadComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PhotoResponse:
    """
    Complete photo upload, extract EXIF, and finalize metadata.
    
    Args:
        completion_data: Upload completion data
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Complete photo response
    """
    # Get photo record
    photo = db.query(Photo).filter(
        Photo.id == completion_data.photo_id,
        Photo.owner_id == current_user.id
    ).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    # Verify blob exists
    if not blob_service.blob_exists(settings.blob_container_originals, completion_data.blob_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo upload not found in storage"
        )
    
    # Download blob for EXIF extraction
    try:
        blob_bytes = blob_service.get_blob_bytes(
            settings.blob_container_originals,
            completion_data.blob_name
        )
        
        # Extract EXIF metadata
        exif_data = extract_exif_data(blob_bytes)
        
        # Update photo record
        photo.blob_url = blob_service.get_blob_url(
            settings.blob_container_originals,
            completion_data.blob_name
        )
        photo.width = exif_data.get('width')
        photo.height = exif_data.get('height')
        photo.exif_data = exif_data
        
        db.commit()
        db.refresh(photo)
        
        # Generate SAS token for immediate viewing
        sas_token = blob_service.generate_read_sas_token(
            settings.blob_container_originals,
            photo.blob_name
        )
        
        response = PhotoResponse.model_validate(photo)
        response.blob_url = f"{response.blob_url}{sas_token}"
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process photo: {str(e)}"
        )


@router.get("", response_model=PhotoListResponse)
async def list_photos(
    album_id: Optional[UUID] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PhotoListResponse:
    """
    List user's photos.
    
    Args:
        album_id: Filter by album (optional)
        limit: Number of photos to return
        offset: Pagination offset
        current_user: Authenticated user
        db: Database session
        
    Returns:
        List of photos with pagination info
    """
    # Build query
    query = db.query(Photo).filter(Photo.owner_id == current_user.id)
    
    if album_id:
        query = query.filter(Photo.album_id == album_id)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    photos = query.order_by(Photo.created_at.desc()).offset(offset).limit(limit).all()
    
    # Process photos with SAS tokens
    photo_responses = []
    for p in photos:
        response = PhotoResponse.model_validate(p)
        
        # Generate SAS token if blob_name exists
        if p.blob_name:
            sas_token = blob_service.generate_read_sas_token(
                settings.blob_container_originals,
                p.blob_name
            )
            response.blob_url = f"{response.blob_url}{sas_token}"
            
        photo_responses.append(response)
    
    return PhotoListResponse(
        photos=photo_responses,
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PhotoResponse:
    """
    Get photo details.
    
    Args:
        photo_id: Photo ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Photo details
    """
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.owner_id == current_user.id
    ).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    response = PhotoResponse.model_validate(photo)
    
    # Generate SAS token
    if photo.blob_name:
        sas_token = blob_service.generate_read_sas_token(
            settings.blob_container_originals,
            photo.blob_name
        )
        response.blob_url = f"{response.blob_url}{sas_token}"
    
    return response


@router.delete("/{photo_id}")
async def delete_photo(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete photo.
    
    Args:
        photo_id: Photo ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Success message
    """
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.owner_id == current_user.id
    ).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    # Delete from blob storage
    blob_service.delete_blob(
        settings.blob_container_originals,
        photo.blob_name
    )
    
    # Delete from database
    db.delete(photo)
    db.commit()
    
    return {"message": "Photo deleted successfully"}
