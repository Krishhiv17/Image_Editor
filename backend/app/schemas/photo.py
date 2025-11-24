"""
Pydantic schemas for photo upload and management.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class PhotoUploadInit(BaseModel):
    """Schema for initializing photo upload."""
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., pattern=r"^image/(jpeg|png|gif|webp)$")
    file_size: int = Field(..., gt=0, le=52428800)  # Max 50MB
    album_id: Optional[UUID] = None


class PhotoUploadInitResponse(BaseModel):
    """Response for upload initialization."""
    upload_url: str
    blob_name: str
    photo_id: str


class PhotoUploadComplete(BaseModel):
    """Schema for completing photo upload."""
    photo_id: UUID
    blob_name: str


class PhotoResponse(BaseModel):
    """Schema for photo response."""
    id: str
    owner_id: str
    filename: str
    blob_url: str
    thumbnail_url: Optional[str] = None
    file_size: int
    content_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    exif_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    album_id: Optional[str] = None

    class Config:
        from_attributes = True
        
    @classmethod
    def model_validate(cls, obj):
        """Custom validation to convert UUID to string."""
        if hasattr(obj, 'id'):
            obj_dict = {
                'id': str(obj.id),
                'owner_id': str(obj.owner_id),
                'filename': obj.filename,
                'blob_url': obj.blob_url,
                'thumbnail_url': obj.thumbnail_url,
                'file_size': obj.file_size,
                'content_type': obj.content_type,
                'width': obj.width,
                'height': obj.height,
                'exif_data': obj.exif_data,
                'created_at': obj.created_at,
                'updated_at': obj.updated_at,
                'album_id': str(obj.album_id) if obj.album_id else None
            }
            return cls(**obj_dict)
        return super().model_validate(obj)


class PhotoListResponse(BaseModel):
    """Schema for photo list response."""
    photos: list[PhotoResponse]
    total: int
    limit: int
    offset: int
