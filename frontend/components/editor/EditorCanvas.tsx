import React, { useEffect, useState, useRef } from 'react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Resizable } from 're-resizable'

interface EditorCanvasProps {
    imageUrl: string
    previewUrl?: string | null
    isLoading?: boolean
    mode: 'view' | 'crop' | 'resize' | 'filter' | 'rotate'
    onCropChange?: (area: any) => void
    onResizeChange?: (width: number, height: number) => void
    isProcessing?: boolean
    adjustments?: { [key: string]: number }
    enableInstantPreview?: boolean
}

export default function EditorCanvas({
    imageUrl,
    previewUrl,
    isLoading = false,
    mode,
    onCropChange,
    onResizeChange,
    adjustments,
    enableInstantPreview = true
}: EditorCanvasProps) {
    const [displayUrl, setDisplayUrl] = useState(imageUrl)
    const [instantPreviewUrl, setInstantPreviewUrl] = useState<string | null>(null)
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const [resizeSize, setResizeSize] = useState<{ width: number | string, height: number | string }>({ width: '100%', height: 'auto' })
    const imgRef = useRef<HTMLImageElement>(null)
    const filterEngineRef = useRef<any>(null) // Will hold WebGLFilterEngine instance

    // Update display URL from props
    useEffect(() => {
        if (previewUrl) {
            setDisplayUrl(previewUrl)
        } else {
            setDisplayUrl(imageUrl)
        }
    }, [previewUrl, imageUrl])

    // Apply instant WebGL filters/rotation when adjustments change
    useEffect(() => {
        // Enable instant preview for both filter and rotate modes
        if (!enableInstantPreview || !adjustments || (mode !== 'filter' && mode !== 'rotate')) {
            setInstantPreviewUrl(null)
            return
        }

        const applyInstantFilters = async () => {
            if (!imgRef.current) return

            try {
                // Dynamically import WebGL filter engine
                const { WebGLFilterEngine } = await import('@/lib/webglFilters')

                // Initialize engine if needed
                if (!filterEngineRef.current) {
                    filterEngineRef.current = new WebGLFilterEngine()
                }

                // Load image into engine
                await filterEngineRef.current.loadImage(displayUrl)

                // Apply filters/rotation and get result
                const filteredDataUrl = filterEngineRef.current.applyFilters(adjustments)

                setInstantPreviewUrl(filteredDataUrl)
            } catch (error) {
                console.error('Instant preview failed:', error)
                setInstantPreviewUrl(null)
            }
        }

        applyInstantFilters()
    }, [adjustments, displayUrl, enableInstantPreview, mode])

    // Cleanup filter engine on unmount
    useEffect(() => {
        return () => {
            const engine = filterEngineRef.current
            if (engine && typeof engine.dispose === 'function') {
                engine.dispose()
            }
            filterEngineRef.current = null
        }
    }, [])

    // Initialize crop when entering crop mode, reset resize when leaving resize mode
    useEffect(() => {
        if (mode === 'crop' && imgRef.current) {
            const { width, height } = imgRef.current
            // Default to 80% center crop
            const cropWidth = width * 0.8
            const cropHeight = height * 0.8
            const x = (width - cropWidth) / 2
            const y = (height - cropHeight) / 2

            setCrop({
                unit: 'px',
                x,
                y,
                width: cropWidth,
                height: cropHeight
            })
        }

        // Reset resize state when leaving resize mode
        if (mode !== 'resize') {
            setResizeSize({ width: '100%', height: 'auto' })
        }
    }, [mode]) // Removed displayUrl to prevent reset on instant preview

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget

        if (mode === 'crop') {
            // Set initial crop if not set
            if (!crop) {
                const cropWidth = width * 0.8
                const cropHeight = height * 0.8
                setCrop({
                    unit: 'px',
                    x: (width - cropWidth) / 2,
                    y: (height - cropHeight) / 2,
                    width: cropWidth,
                    height: cropHeight
                })
            }
        } else if (mode === 'resize') {
            // Initialize resize to actual image dimensions (fits screen via max-height)
            setResizeSize({ width: width, height: height })
        }
    }

    return (
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden flex items-center justify-center relative p-8">
            {/* Checkerboard background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(45deg, #808080 25%, transparent 25%), 
                                      linear-gradient(-45deg, #808080 25%, transparent 25%), 
                                      linear-gradient(45deg, transparent 75%, #808080 75%), 
                                      linear-gradient(-45deg, transparent 75%, #808080 75%)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
            />

            <div className="relative w-full h-full flex items-center justify-center overflow-auto">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-50 rounded-lg backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white"></div>
                    </div>
                )}

                {mode === 'crop' ? (
                    <div className="max-w-full max-h-full flex items-center justify-center p-4">
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => {
                                setCompletedCrop(c)
                                if (onCropChange && imgRef.current) {
                                    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
                                    const scaleY = imgRef.current.naturalHeight / imgRef.current.height
                                    onCropChange({
                                        x: c.x * scaleX,
                                        y: c.y * scaleY,
                                        width: c.width * scaleX,
                                        height: c.height * scaleY
                                    })
                                }
                            }}
                            className="max-h-[80vh]"
                            style={{ maxWidth: '100%' }}
                        >
                            <img
                                ref={imgRef}
                                src={displayUrl}
                                alt="Crop target"
                                onLoad={onImageLoad}
                                style={{ maxHeight: '80vh', maxWidth: '100%', display: 'block' }}
                                crossOrigin="anonymous"
                            />
                        </ReactCrop>
                    </div>
                ) : mode === 'resize' ? (
                    <Resizable
                        size={typeof resizeSize.width === 'number' ? { width: resizeSize.width, height: resizeSize.height } : undefined}
                        defaultSize={{
                            width: 'auto',
                            height: 'auto'
                        }}
                        onResizeStop={(e, direction, ref, d) => {
                            const newWidth = ref.offsetWidth
                            const newHeight = ref.offsetHeight
                            setResizeSize({ width: newWidth, height: newHeight })
                            if (onResizeChange) onResizeChange(newWidth, newHeight)
                        }}
                        className="relative flex items-center justify-center border-2 border-blue-500 shadow-2xl"
                        enable={{ top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }}
                    >
                        <img
                            src={displayUrl}
                            alt="Resizing"
                            className="w-full h-full max-h-[70vh] object-contain pointer-events-none"
                            crossOrigin="anonymous"
                            onLoad={onImageLoad}
                        />
                        {/* Resize Handles Overlay */}
                        <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 opacity-50"></div>
                    </Resizable>
                ) : (
                    <div className="relative inline-block">
                        <img
                            ref={imgRef}
                            src={instantPreviewUrl || displayUrl}
                            alt="Editor Canvas"
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
                            crossOrigin="anonymous"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
