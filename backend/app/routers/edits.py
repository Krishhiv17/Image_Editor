"""
Router for image editing operations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Photo
from app.schemas.edit import OperationGraph, EditPreviewResponse
from app.services.image_service import image_service
from app.services.blob_service import blob_service
from app.config import settings
from uuid import UUID
import time
import uuid

router = APIRouter()

@router.post("/preview", response_model=EditPreviewResponse)
async def preview_edit(
    graph: OperationGraph,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply operations to a photo and return a temporary preview URL.
    Does NOT save the result to the database.
    """
    start_time = time.time()
    
    # Get original photo
    photo = db.query(Photo).filter(
        Photo.id == graph.photo_id,
        Photo.owner_id == current_user.id
    ).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    # Download original image
    try:
        image_bytes = blob_service.get_blob_bytes(
            settings.blob_container_originals,
            photo.blob_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve original image: {e}"
        )
        
    # Process image
    try:
        processed_bytes = image_service.process_image(
            image_bytes,
            graph.operations,
            format=graph.output_format,
            quality=graph.quality
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image processing failed: {e}"
        )
        
    # Upload to temporary blob (or use a dedicated previews container)
    # For now, we'll use the 'originals' container but with a 'previews/' prefix
    # In production, use a separate container with lifecycle policy to auto-delete
    
    preview_filename = f"previews/{current_user.id}/{uuid.uuid4()}.{graph.output_format}"
    
    try:
        blob_service.upload_bytes(
            settings.blob_container_originals,
            preview_filename,
            processed_bytes,
            content_type=f"image/{graph.output_format}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload preview: {e}"
        )
        
    # Generate SAS URL for preview
    preview_url = blob_service.generate_read_sas_token(
        settings.blob_container_originals,
        preview_filename,
        expiry_minutes=15 # Short expiry for previews
    )
    
    # Construct full URL
    # Note: We need the base URL. blob_service doesn't expose it directly in a clean way
    # but we can construct it from the connection string or config.
    # For now, we'll use the get_blob_url method which returns the base URL
    base_url = blob_service.get_blob_url(settings.blob_container_originals, preview_filename)
    full_preview_url = f"{base_url}{preview_url}"
    
    processing_time = (time.time() - start_time) * 1000
    
    return EditPreviewResponse(
        preview_url=full_preview_url,
        processing_time_ms=processing_time
    )

@router.post("/commit", response_model=dict)
async def commit_edit(
    graph: OperationGraph,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply operations and save as a new photo.
    """
    # Get original photo
    photo = db.query(Photo).filter(
        Photo.id == graph.photo_id,
        Photo.owner_id == current_user.id
    ).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    # Download original image
    try:
        image_bytes = blob_service.get_blob_bytes(
            settings.blob_container_originals,
            photo.blob_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve original image: {e}"
        )
        
    # Process image
    try:
        processed_bytes = image_service.process_image(
            image_bytes,
            graph.operations,
            format=graph.output_format,
            quality=graph.quality
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image processing failed: {e}"
        )
    
    # Generate new filename
    # e.g. "edited_{uuid}.jpg"
    new_filename = f"edited_{uuid.uuid4()}.{graph.output_format}"
    blob_name = f"{current_user.id}/{new_filename}"
    
    # Upload to blob storage
    try:
        blob_service.upload_bytes(
            settings.blob_container_originals,
            blob_name,
            processed_bytes,
            content_type=f"image/{graph.output_format}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload edited image: {e}"
        )
        
    # Get public URL (or construct it)
    blob_url = blob_service.get_blob_url(settings.blob_container_originals, blob_name)

    # Create new Photo record
    new_photo = Photo(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        filename=f"Edited {photo.filename}",
        blob_name=blob_name,
        blob_url=blob_url,
        file_size=len(processed_bytes),
        content_type=f"image/{graph.output_format}",
        # Copy other metadata if needed
    )
    
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)
    
    return {"id": new_photo.id, "message": "Photo saved successfully"}
