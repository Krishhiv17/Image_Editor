/**
 * Client-side image filter utilities using Canvas API for instant previews
 * This provides fast, GPU-accelerated previews while the server processes high-quality versions
 */

export interface Adjustments {
    brightness: number
    contrast: number
    saturation: number
    sharpness: number
    exposure: number
    temperature: number
    tint: number
    blur: number
    sepia?: number
    grayscale?: number
    vignette?: number
    rotation?: number // degrees
}

export class WebGLFilterEngine {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private sourceImage: HTMLImageElement

    constructor() {
        this.canvas = document.createElement('canvas')
        const context = this.canvas.getContext('2d', {
            willReadFrequently: true,
            alpha: true
        })
        if (!context) {
            throw new Error('Could not create canvas context')
        }
        this.ctx = context
        this.sourceImage = new Image()
    }

    /**
     * Load an image from URL for processing
     */
    async loadImage(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.sourceImage.onload = () => {
                this.canvas.width = this.sourceImage.width
                this.canvas.height = this.sourceImage.height
                resolve()
            }
            this.sourceImage.onerror = reject
            this.sourceImage.crossOrigin = 'anonymous'
            this.sourceImage.src = url
        })
    }

    /**
     * Apply all adjustments to the loaded image and return a data URL
     */
    applyFilters(adjustments: Adjustments): string {
        if (!this.sourceImage) {
            throw new Error('No image loaded')
        }

        // Clear and redraw original image
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // Build CSS filter string for hardware-accelerated filters
        const filters: string[] = []

        // Brightness (0 to 2, default 1)
        if (Math.abs(adjustments.brightness - 1.0) > 0.01) {
            filters.push(`brightness(${adjustments.brightness})`)
        }

        // Contrast (0 to 2, default 1)
        if (Math.abs(adjustments.contrast - 1.0) > 0.01) {
            filters.push(`contrast(${adjustments.contrast})`)
        }

        // Saturation (0 to 2, default 1)
        if (Math.abs(adjustments.saturation - 1.0) > 0.01) {
            filters.push(`saturate(${adjustments.saturation})`)
        }

        // Blur (0 to 10px)
        if (Math.abs(adjustments.blur) > 0.01) {
            const blurPx = adjustments.blur * 10 // Scale to pixels
            filters.push(`blur(${blurPx}px)`)
        }

        // Apply CSS filters (GPU accelerated)
        this.ctx.filter = filters.length > 0 ? filters.join(' ') : 'none'
        this.ctx.drawImage(this.sourceImage, 0, 0)
        this.ctx.filter = 'none'

        // Apply pixel-level adjustments (temperature, tint, exposure)
        if (Math.abs(adjustments.temperature) > 0.01 ||
            Math.abs(adjustments.tint) > 0.01 ||
            Math.abs(adjustments.exposure - 1.0) > 0.01) {
            this.applyPixelAdjustments(adjustments)
        }

        // Sharpness requires convolution (expensive, skip for now or do simple)
        if (Math.abs(adjustments.sharpness - 1.0) > 0.1) {
            this.applySharpen(adjustments.sharpness)
        }

        // Apply Sepia filter
        if (adjustments.sepia && adjustments.sepia > 0.01) {
            this.applySepia(adjustments.sepia)
        }

        // Apply Grayscale filter
        if (adjustments.grayscale && adjustments.grayscale > 0.01) {
            this.applyGrayscale(adjustments.grayscale)
        }

        // Apply Vignette filter
        if (adjustments.vignette && adjustments.vignette > 0.01) {
            this.applyVignette(adjustments.vignette)
        }

        return this.canvas.toDataURL('image/jpeg', 0.92)
    }

    /**
     * Apply sepia filter
     */
    private applySepia(intensity: number): void {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            // Sepia transformation matrix
            const tr = 0.393 * r + 0.769 * g + 0.189 * b
            const tg = 0.349 * r + 0.686 * g + 0.168 * b
            const tb = 0.272 * r + 0.534 * g + 0.131 * b

            // Blend based on intensity
            data[i] = Math.min(255, r + (tr - r) * intensity)
            data[i + 1] = Math.min(255, g + (tg - g) * intensity)
            data[i + 2] = Math.min(255, b + (tb - b) * intensity)
        }

        this.ctx.putImageData(imageData, 0, 0)
    }

    /**
     * Apply grayscale filter
     */
    private applyGrayscale(intensity: number): void {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            // Luminosity method for grayscale
            const gray = 0.299 * r + 0.587 * g + 0.114 * b

            // Blend based on intensity
            data[i] = r + (gray - r) * intensity
            data[i + 1] = g + (gray - g) * intensity
            data[i + 2] = b + (gray - b) * intensity
        }

        this.ctx.putImageData(imageData, 0, 0)
    }

    /**
     * Apply vignette filter
     */
    private applyVignette(intensity: number): void {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        const data = imageData.data
        const width = this.canvas.width
        const height = this.canvas.height
        const centerX = width / 2
        const centerY = height / 2
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4

                // Calculate distance from center
                const dx = x - centerX
                const dy = y - centerY
                const distance = Math.sqrt(dx * dx + dy * dy)

                // Vignette factor (0 = darkest edge, 1 = bright center)
                const vignetteFactor = 1 - (distance / maxDist) * intensity

                // Apply darkening
                data[idx] *= vignetteFactor
                data[idx + 1] *= vignetteFactor
                data[idx + 2] *= vignetteFactor
            }
        }

        this.ctx.putImageData(imageData, 0, 0)
    }

    /**
     * Apply temperature and tint adjustments by manipulating pixel data
     */
    private applyPixelAdjustments(adjustments: Adjustments): void {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        const data = imageData.data

        const tempFactor = adjustments.temperature * 0.3 // Scale to -0.3 to 0.3
        const tintFactor = adjustments.tint * 0.3
        const exposureFactor = adjustments.exposure

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i]
            let g = data[i + 1]
            let b = data[i + 2]

            // Temperature: warm (increase red, decrease blue) or cool (opposite)
            r = Math.min(255, Math.max(0, r * (1 + tempFactor)))
            b = Math.min(255, Math.max(0, b * (1 - tempFactor)))

            // Tint: green/magenta balance
            g = Math.min(255, Math.max(0, g * (1 + tintFactor)))

            // Exposure: overall brightness multiplier
            r = Math.min(255, r * exposureFactor)
            g = Math.min(255, g * exposureFactor)
            b = Math.min(255, b * exposureFactor)

            data[i] = r
            data[i + 1] = g
            data[i + 2] = b
        }

        this.ctx.putImageData(imageData, 0, 0)
    }

    /**
     * Apply sharpening using an unsharp mask approximation
     */
    private applySharpen(amount: number): void {
        if (amount <= 1.0) return

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        const data = imageData.data
        const width = this.canvas.width
        const height = this.canvas.height

        // Simple 3x3 sharpen kernel
        const factor = (amount - 1.0) * 0.5 // Scale sharpness
        const kernel = [
            0, -factor, 0,
            -factor, 1 + 4 * factor, -factor,
            0, -factor, 0
        ]

        const output = new Uint8ClampedArray(data)

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // RGB only, skip alpha
                    let sum = 0
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c
                            const kernelIdx = (ky + 1) * 3 + (kx + 1)
                            sum += data[idx] * kernel[kernelIdx]
                        }
                    }
                    const idx = (y * width + x) * 4 + c
                    output[idx] = Math.min(255, Math.max(0, sum))
                }
            }
        }

        for (let i = 0; i < data.length; i += 4) {
            data[i] = output[i]
            data[i + 1] = output[i + 1]
            data[i + 2] = output[i + 2]
        }

        this.ctx.putImageData(imageData, 0, 0)
    }

    /**
     * Apply rotation using canvas transforms
     */
    private applyRotation(adjustments: Adjustments): string {
        const rotation = adjustments.rotation || 0
        const radians = (rotation * Math.PI) / 180

        // Calculate new canvas size after rotation
        const cos = Math.abs(Math.cos(radians))
        const sin = Math.abs(Math.sin(radians))
        const newWidth = this.sourceImage.width * cos + this.sourceImage.height * sin
        const newHeight = this.sourceImage.width * sin + this.sourceImage.height * cos

        // Resize canvas
        this.canvas.width = newWidth
        this.canvas.height = newHeight

        // Clear and prepare for rotation
        this.ctx.clearRect(0, 0, newWidth, newHeight)
        this.ctx.save()

        // Move to center, rotate, then draw
        this.ctx.translate(newWidth / 2, newHeight / 2)
        this.ctx.rotate(radians)
        this.ctx.drawImage(
            this.sourceImage,
            -this.sourceImage.width / 2,
            -this.sourceImage.height / 2
        )

        this.ctx.restore()

        return this.canvas.toDataURL('image/jpeg', 0.92)
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        this.sourceImage.src = ''
    }
}
