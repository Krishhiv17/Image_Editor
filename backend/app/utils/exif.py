"""
EXIF metadata extraction utilities.
"""
from PIL import Image
from PIL.ExifTags import TAGS
import io
from typing import Dict, Any, Optional


def extract_exif_data(blob_bytes: bytes) -> Dict[str, Any]:
    """
    Extract EXIF metadata and dimensions from image bytes.
    
    Args:
        blob_bytes: Image file as bytes
        
    Returns:
        Dictionary with width, height, format, and EXIF data
    """
    try:
        image = Image.open(io.BytesIO(blob_bytes))
        
        # Get basic image info
        width, height = image.size
        image_format = image.format
        mode = image.mode
        
        # Extract EXIF data
        exif_dict = {}
        if hasattr(image, '_getexif') and image._getexif():
            exif = image._getexif()
            if exif:
                for tag_id, value in exif.items():
                    tag_name = TAGS.get(tag_id, f"Unknown_{tag_id}")
                    # Convert to string for JSON serialization
                    try:
                        exif_dict[tag_name] = str(value) if value is not None else None
                    except:
                        exif_dict[tag_name] = None
        
        return {
            "width": width,
            "height": height,
            "format": image_format,
            "mode": mode,
            "exif": exif_dict
        }
    except Exception as e:
        # Return minimal data if extraction fails
        return {
            "width": None,
            "height": None,
            "format": None,
            "mode": None,
            "exif": {},
            "error": str(e)
        }


def strip_gps_data(exif_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Remove GPS data from EXIF metadata for privacy.
    
    Args:
        exif_data: EXIF data dictionary
        
    Returns:
        EXIF data without GPS information
    """
    if not exif_data or 'exif' not in exif_data:
        return exif_data
    
    # GPS-related EXIF tags to remove
    gps_tags = [
        'GPSInfo', 'GPSLatitude', 'GPSLongitude', 'GPSAltitude',
        'GPSLatitudeRef', 'GPSLongitudeRef', 'GPSAltitudeRef',
        'GPSTimeStamp', 'GPSDateStamp', 'GPSProcessingMethod'
    ]
    
    cleaned_exif = exif_data.copy()
    if 'exif' in cleaned_exif:
        for tag in gps_tags:
            cleaned_exif['exif'].pop(tag, None)
    
    return cleaned_exif
