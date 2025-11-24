"""
Pydantic schemas for image editing operations.
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Union, Literal
from enum import Enum

class OperationType(str, Enum):
    CROP = "crop"
    ROTATE = "rotate"
    RESIZE = "resize"
    ADJUST = "adjust"
    FILTER = "filter"
    TEXT = "text"

class BaseOperation(BaseModel):
    op: OperationType

class CropOp(BaseOperation):
    op: Literal[OperationType.CROP] = OperationType.CROP
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)

class RotateOp(BaseOperation):
    op: Literal[OperationType.ROTATE] = OperationType.ROTATE
    degrees: float = Field(..., description="Rotation angle in degrees (clockwise)")

class ResizeOp(BaseOperation):
    op: Literal[OperationType.RESIZE] = OperationType.RESIZE
    width: Optional[int] = Field(None, gt=0)
    height: Optional[int] = Field(None, gt=0)
    
    @validator('width')
    def validate_dimensions(cls, v, values):
        if v is None and values.get('height') is None:
            raise ValueError('Either width or height must be provided')
        return v

class AdjustmentType(str, Enum):
    BRIGHTNESS = "brightness"
    CONTRAST = "contrast"
    SATURATION = "saturation"
    SHARPNESS = "sharpness"
    TEMPERATURE = "temperature"
    TINT = "tint"
    EXPOSURE = "exposure"

class AdjustOp(BaseOperation):
    op: Literal[OperationType.ADJUST] = OperationType.ADJUST
    type: AdjustmentType
    amount: float = Field(..., description="Adjustment factor (1.0 is original)")

class FilterType(str, Enum):
    BLUR = "blur"
    SEPIA = "sepia"
    GRAYSCALE = "grayscale"
    VIGNETTE = "vignette"

class FilterOp(BaseOperation):
    op: Literal[OperationType.FILTER] = OperationType.FILTER
    type: FilterType
    intensity: float = Field(1.0, ge=0.0, le=1.0)

class TextOp(BaseOperation):
    op: Literal[OperationType.TEXT] = OperationType.TEXT
    text: str = Field(..., min_length=1, max_length=500, description="Text to overlay")
    font_size: int = Field(32, ge=10, le=200, description="Font size in pixels")
    color: str = Field("#FFFFFF", pattern="^#[0-9A-Fa-f]{6}$", description="Hex color code")
    x: int = Field(..., description="X position (pixels from left)")
    y: int = Field(..., description="Y position (pixels from top)")
    font_family: str = Field("Arial", description="Font family name")

# Union of all operation types
Operation = Union[CropOp, RotateOp, ResizeOp, AdjustOp, FilterOp, TextOp]

class OperationGraph(BaseModel):
    """
    Represents a sequence of image operations.
    """
    photo_id: str
    operations: List[Operation]
    output_format: Literal["jpeg", "png", "webp"] = "jpeg"
    quality: int = Field(85, ge=1, le=100)

class EditPreviewResponse(BaseModel):
    """
    Response for edit preview (returns a temporary SAS URL).
    """
    preview_url: str
    processing_time_ms: float
