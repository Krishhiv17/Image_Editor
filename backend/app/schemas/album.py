from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class AlbumCreate(BaseModel):
    """Schema for creating a new album"""
    name: str = Field(..., min_length=1, max_length=255, description="Album name")
    description: Optional[str] = Field(None, description="Album description")
    is_public: bool = Field(default=False, description="Whether album is publicly viewable")


class AlbumUpdate(BaseModel):
    """Schema for updating an existing album"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    cover_photo_id: Optional[UUID] = None


class AlbumResponse(BaseModel):
    """Schema for album response"""
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    cover_photo_id: Optional[UUID]
    cover_photo_url: Optional[str]
    is_public: bool
    photo_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AlbumListResponse(BaseModel):
    """Schema for album list item"""
    id: UUID
    name: str
    description: Optional[str]
    cover_photo_url: Optional[str]
    photo_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AddPhotosToAlbum(BaseModel):
    """Schema for adding photos to an album"""
    photo_ids: List[UUID] = Field(..., min_items=1, description="List of photo IDs to add")


class RemovePhotosFromAlbum(BaseModel):
    """Schema for removing photos from an album"""
    photo_ids: List[UUID] = Field(..., min_items=1, description="List of photo IDs to remove")


class ReorderPhotos(BaseModel):
    """Schema for reordering photos in an album"""
    photo_order: List[UUID] = Field(..., min_items=1, description="Ordered list of photo IDs")


class SetCoverPhoto(BaseModel):
    """Schema for setting album cover photo"""
    photo_id: UUID = Field(..., description="Photo ID to set as cover")
