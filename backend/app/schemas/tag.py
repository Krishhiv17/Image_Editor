from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class TagCreate(BaseModel):
    """Schema for creating a new tag"""
    name: str = Field(..., min_length=1, max_length=50, description="Tag name")

class TagResponse(BaseModel):
    """Schema for tag response"""
    id: UUID
    user_id: UUID
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TagWithCount(BaseModel):
    """Schema for tag with photo count"""
    id: UUID
    name: str
    photo_count: int
    created_at: datetime

class AddTagToPhoto(BaseModel):
    """Schema for adding tag to photo"""
    tag_id: UUID

class CreateAndAddTag(BaseModel):
    """Schema for creating a new tag and adding to photo"""
    name: str = Field(..., min_length=1, max_length=50)
