"""
Image processing service using Pillow (PIL).
"""
from PIL import Image, ImageEnhance, ImageOps, ImageFilter, ImageDraw, ImageFont
import io
from typing import List, Tuple
from app.schemas.edit import (
    Operation, OperationType, CropOp, RotateOp, ResizeOp, AdjustOp, FilterOp, TextOp, AdjustmentType, FilterType
)

class ImageService:
    def process_image(self, image_bytes: bytes, operations: List[Operation], format: str = "JPEG", quality: int = 85) -> bytes:
        """
        Apply a sequence of operations to an image.
        """
        # Load image
        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary (e.g. for JPEG output)
        if img.mode in ('RGBA', 'P') and format.upper() == 'JPEG':
            img = img.convert('RGB')
            
        # Apply operations in order
        for op in operations:
            if op.op == OperationType.CROP:
                img = self._apply_crop(img, op)
            elif op.op == OperationType.ROTATE:
                img = self._apply_rotate(img, op)
            elif op.op == OperationType.RESIZE:
                img = self._apply_resize(img, op)
            elif op.op == OperationType.ADJUST:
                img = self._apply_adjust(img, op)
            elif op.op == OperationType.FILTER:
                img = self._apply_filter(img, op)
            elif op.op == OperationType.TEXT:
                img = self._apply_text(img, op)
                
        # Save to bytes
        output = io.BytesIO()
        img.save(output, format=format, quality=quality)
        return output.getvalue()

    def _apply_crop(self, img: Image.Image, op: CropOp) -> Image.Image:
        return img.crop((op.x, op.y, op.x + op.width, op.y + op.height))

    def _apply_rotate(self, img: Image.Image, op: RotateOp) -> Image.Image:
        # Expand=True ensures the image isn't cropped when rotated
        return img.rotate(-op.degrees, expand=True, resample=Image.Resampling.BICUBIC)

    def _apply_resize(self, img: Image.Image, op: ResizeOp) -> Image.Image:
        width, height = img.size
        new_width = op.width
        new_height = op.height
        
        if new_width and not new_height:
            # Calculate height to maintain aspect ratio
            ratio = new_width / width
            new_height = int(height * ratio)
        elif new_height and not new_width:
            # Calculate width to maintain aspect ratio
            ratio = new_height / height
            new_width = int(width * ratio)
            
        return img.resize((new_width, new_height), resample=Image.Resampling.LANCZOS)

    def _apply_adjust(self, img: Image.Image, op: AdjustOp) -> Image.Image:
        if op.type == AdjustmentType.BRIGHTNESS:
            enhancer = ImageEnhance.Brightness(img)
            return enhancer.enhance(op.amount)
        elif op.type == AdjustmentType.CONTRAST:
            enhancer = ImageEnhance.Contrast(img)
            return enhancer.enhance(op.amount)
        elif op.type == AdjustmentType.SATURATION:
            enhancer = ImageEnhance.Color(img)
            return enhancer.enhance(op.amount)
        elif op.type == AdjustmentType.SHARPNESS:
            enhancer = ImageEnhance.Sharpness(img)
            return enhancer.enhance(op.amount)
        elif op.type == AdjustmentType.EXPOSURE:
            # Exposure is essentially brightness (multiplicative)
            enhancer = ImageEnhance.Brightness(img)
            return enhancer.enhance(op.amount)
        elif op.type == AdjustmentType.TEMPERATURE:
            # Warmth (Red/Blue balance)
            # amount: -1.0 (Cool) to 1.0 (Warm)
            # 0.0 is neutral
            r, g, b = img.split()
            
            # Scale factor - keep it subtle, max 30% shift
            factor = op.amount * 0.3
            
            # Warm: +Red, -Blue
            # Cool: -Red, +Blue
            r = r.point(lambda i: i * (1 + factor))
            b = b.point(lambda i: i * (1 - factor))
            
            return Image.merge('RGB', (r, g, b))
            
        elif op.type == AdjustmentType.TINT:
            # Tint (Green/Magenta balance)
            # amount: -1.0 (Green) to 1.0 (Magenta)
            # 0.0 is neutral
            r, g, b = img.split()
            
            # Scale factor
            factor = op.amount * 0.3
            
            # Magenta: -Green (or +Red/Blue, but -Green is simpler)
            # Green: +Green
            # So if amount is positive (Magenta), we reduce Green.
            g = g.point(lambda i: i * (1 - factor))
            
            return Image.merge('RGB', (r, g, b))
            
        return img

    def _apply_filter(self, img: Image.Image, op: FilterOp) -> Image.Image:
        if op.type == FilterType.BLUR:
            # Apply Gaussian blur
            return img.filter(ImageFilter.GaussianBlur(radius=op.intensity * 10))
        elif op.type == FilterType.SEPIA:
            # Convert to sepia tone
            # Convert to grayscale first
            grayscale = img.convert('L')
            # Create sepia by applying color tint
            sepia = Image.new('RGB', img.size)
            pixels = sepia.load()
            gray_pixels = grayscale.load()
            
            for y in range(img.height):
                for x in range(img.width):
                    gray = gray_pixels[x, y]
                    # Sepia formula: add warm brown tones
                    r = min(255, int(gray * 1.0))
                    g = min(255, int(gray * 0.95))
                    b = min(255, int(gray * 0.82))
                    pixels[x, y] = (r, g, b)
            
            # Blend with original based on intensity
            if op.intensity < 1.0:
                return Image.blend(img, sepia, op.intensity)
            return sepia
            return img.filter(ImageFilter.GaussianBlur(radius=op.intensity * 5))
        return img

    def _apply_text(self, img: Image.Image, op: TextOp) -> Image.Image:
        """
        Apply text overlay to the image.
        """
        # Create a copy to draw on
        img_copy = img.copy()
        draw = ImageDraw.Draw(img_copy)
        
        # Parse color from hex
        color_hex = op.color.lstrip('#')
        color_rgb = tuple(int(color_hex[i:i+2], 16) for i in (0, 2, 4))
        
        # Try to load a system font, fallback to default if not available
        try:
            # Try to find the font file
            font = ImageFont.truetype(op.font_family, op.font_size)
        except OSError:
            # Fallback to default font if specified font not found
            try:
                # Try common system font paths
                import platform
                system = platform.system()
                if system == "Darwin":  # macOS
                    font_path = f"/System/Library/Fonts/{op.font_family}.ttf"
                    if "Arial" in op.font_family:
                        font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
                elif system == "Linux":
                    font_path = f"/usr/share/fonts/truetype/dejavu/{op.font_family}.ttf"
                else:  # Windows
                    font_path = f"C:\\Windows\\Fonts\\{op.font_family}.ttf"
                
                font = ImageFont.truetype(font_path, op.font_size)
            except:
                # Final fallback to default PIL font
                font = ImageFont.load_default()
        
        # Draw text
        draw.text((op.x, op.y), op.text, font=font, fill=color_rgb)
        
        return img_copy

image_service = ImageService()
