"""
Pydantic schemas for authentication requests and responses.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response."""
    id: str
    email: str
    oauth_provider: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        
    @classmethod
    def model_validate(cls, obj):
        """Custom validation to convert UUID to string."""
        if hasattr(obj, 'id'):
            obj_dict = {
                'id': str(obj.id),
                'email': obj.email,
                'oauth_provider': obj.oauth_provider,
                'created_at': obj.created_at
            }
            return cls(**obj_dict)
        return super().model_validate(obj)


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str


class GoogleOAuthCallback(BaseModel):
    """Schema for Google OAuth callback."""
    code: str
    state: Optional[str] = None
