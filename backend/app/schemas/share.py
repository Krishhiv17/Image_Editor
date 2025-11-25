from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal

class ShareCreate(BaseModel):
    """Schema for creating a new share"""
    resource_type: Literal['photo', 'album']
    resource_id: UUID
    scope: Literal['view', 'edit'] = 'view'
    expires_in_days: Optional[int] = Field(None, description="Days until expiry (null = never)")

class ShareResponse(BaseModel):
    """Schema for share response"""
    id: UUID
    share_token: str
    share_url: str
    resource_type: str
    resource_id: UUID
    scope: str
    expires_at: Optional[datetime]
    created_at: datetime
    access_count: int
    
    class Config:
        from_attributes = True

class ShareListItem(BaseModel):
    """Schema for listing shares with resource details"""
    id: UUID
    share_token: str
    share_url: str
    resource_type: str
    resource_id: UUID
    resource_name: str  # Photo filename or album name
    scope: str
    expires_at: Optional[datetime]
    created_at: datetime
    last_accessed_at: Optional[datetime]
    access_count: int
    is_expired: bool

class ShareUpdate(BaseModel):
    """Schema for updating a share"""
    scope: Optional[Literal['view', 'edit']] = None
    expires_in_days: Optional[int] = None  # None = no change, 0 = never, >0 = days

class SharedPhotoResponse(BaseModel):
    """Schema for public photo access"""
    id: UUID
    filename: str
    blob_url: str
    width: Optional[int]
    height: Optional[int]
    created_at: datetime
    scope: str

class SharedAlbumResponse(BaseModel):
    """Schema for public album access"""
    id: UUID
    name: str
    description: Optional[str]
    photo_count: int
    photos: list
    scope: str
