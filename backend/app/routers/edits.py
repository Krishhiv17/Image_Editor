"""
Router for image editing operations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Photo
from app.schemas.edit import OperationGraph, EditPreviewResponse
from app.utils.exif import extract_exif_data
from app.services.image_service import image_service
from app.services.blob_service import blob_service
from app.config import settings
from uuid import UUID
from datetime import datetime
import time
import uuid
import io
from fastapi.responses import StreamingResponse

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
    
    # Overwrite the existing blob for this photo
    try:
        blob_service.upload_bytes(
            settings.blob_container_originals,
            photo.blob_name,
            processed_bytes,
            content_type=f"image/{graph.output_format}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload edited image: {e}"
        )
    
    # Extract dimensions/EXIF from the edited image
    try:
        exif_data = extract_exif_data(processed_bytes)
        width = exif_data.get("width")
        height = exif_data.get("height")
    except Exception:
        exif_data = {}
        width = None
        height = None
    
    # Update existing photo record
    base_blob_url = blob_service.get_blob_url(
        settings.blob_container_originals,
        photo.blob_name
    )
    # Generate a fresh SAS for cache busting on the client
    sas_token = blob_service.generate_read_sas_token(
        settings.blob_container_originals,
        photo.blob_name,
        expiry_minutes=120
    )

    photo.blob_url = base_blob_url
    photo.file_size = len(processed_bytes)
    photo.content_type = f"image/{graph.output_format}"
    photo.width = width
    photo.height = height
    photo.exif_data = exif_data
    photo.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(photo)
    
    return {
        "id": str(photo.id),
        "message": "Photo saved successfully",
        "blob_url": photo.blob_url,
        "signed_url": f"{base_blob_url}{sas_token}"
    }


@router.post("/download")
async def download_edit(
    graph: OperationGraph,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply operations and return the edited image as a download (does not persist).
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

    # Download original image bytes
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

    filename_safe = (photo.filename or "photo").rsplit(".", 1)[0]
    download_name = f"{filename_safe}-edited.{graph.output_format}"

    return StreamingResponse(
        io.BytesIO(processed_bytes),
        media_type=f"image/{graph.output_format}",
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"'
        }
    )
