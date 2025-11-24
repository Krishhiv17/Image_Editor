"""
SQLAlchemy models for the Photo Editor application.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, TIMESTAMP, Enum, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class User(Base):
    """User account model."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    pass_hash = Column(Text, nullable=True)  # NULL for OAuth-only users
    oauth_provider = Column(String, nullable=True)  # "google", etc.
    oauth_sub = Column(String, nullable=True)  # OAuth subject identifier
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationships
    albums = relationship("Album", back_populates="owner", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="owner", cascade="all, delete-orphan")


class Album(Base):
    """Photo album model."""
    __tablename__ = "albums"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(Text, nullable=False)
    is_private = Column(Boolean, default=True)
    # Temporarily make this nullable without FK constraint - we'll add it later if needed
    cover_photo_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="albums")
    photos = relationship("Photo", back_populates="album", foreign_keys="Photo.album_id", cascade="all, delete-orphan")
    shares = relationship("Share", back_populates="album", cascade="all, delete-orphan")


class Photo(Base):
    """Photo metadata model."""
    __tablename__ = "photos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id", ondelete="CASCADE"), nullable=True, index=True)  # Made nullable
    
    # File information
    filename = Column(Text, nullable=False)  # Original filename
    blob_name = Column(Text, nullable=False)  # Path in Azure Blob (unique identifier)
    blob_url = Column(Text, nullable=False)  # Full URL to blob
    thumbnail_url = Column(Text, nullable=True)  # URL to thumbnail (optional)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    content_type = Column(Text, nullable=False)  # MIME type
    
    # Image metadata
    width = Column(Integer)
    height = Column(Integer)
    exif_data = Column(JSONB, nullable=True)  # Camera metadata (renamed from exif_json)
    taken_at = Column(TIMESTAMP(timezone=True), nullable=True)  # Extracted from EXIF
    
    # Legacy columns (kept for compatibility, can be removed later)
    blob_key = Column(Text, nullable=True)  # Old path column
    mime = Column(Text, nullable=True)  # Old MIME column
    
    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="photos")
    album = relationship("Album", back_populates="photos", foreign_keys=[album_id])
    versions = relationship("PhotoVersion", back_populates="photo", cascade="all, delete-orphan")
    tags = relationship("PhotoTag", back_populates="photo", cascade="all, delete-orphan")


class PhotoVersion(Base):
    """Photo edit version model."""
    __tablename__ = "photo_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)
    op_graph_json = Column(JSONB, nullable=False)  # Operation graph
    variant_blob_key = Column(Text, unique=True, nullable=False)  # Immutable variant path
    format = Column(Text, nullable=False)  # jpeg, png, webp
    bytes = Column(Integer)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationships
    photo = relationship("Photo", back_populates="versions")


class Tag(Base):
    """Tag model for photo organization."""
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False, index=True)
    
    # Relationships
    photo_tags = relationship("PhotoTag", back_populates="tag", cascade="all, delete-orphan")


class PhotoTag(Base):
    """Many-to-many relationship between photos and tags."""
    __tablename__ = "photo_tags"
    
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True)
    
    # Relationships
    photo = relationship("Photo", back_populates="tags")
    tag = relationship("Tag", back_populates="photo_tags")


class ShareScope(str, enum.Enum):
    """Share permission scope."""
    VIEW = "view"
    EDIT = "edit"


class Share(Base):
    """Share link model."""
    __tablename__ = "shares"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id", ondelete="CASCADE"), nullable=False, index=True)
    scope = Column(Enum(ShareScope), nullable=False)
    token_hash = Column(Text, unique=True, nullable=False)  # Hashed token
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationships
    album = relationship("Album", back_populates="shares")
