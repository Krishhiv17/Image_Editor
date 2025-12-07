'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import apiClient from '@/lib/api'
import EditorCanvas from '@/components/editor/EditorCanvas'
import ToolPanel from '@/components/editor/ToolPanel'

interface Photo {
    id: string
    filename: string
    blob_url: string
}

interface Operation {
    op: string
    [key: string]: any
}

export default function EditorPage() {
    const params = useParams()
    const router = useRouter()
    const { isAuthenticated, loading: authLoading } = useAuth()
    const [photo, setPhoto] = useState<Photo | null>(null)
    const [loading, setLoading] = useState(true)
    const [appliedOperations, setAppliedOperations] = useState<Operation[]>([])
    const [pendingOperation, setPendingOperation] = useState<Operation | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [activeTab, setActiveTab] = useState<'view' | 'crop' | 'resize' | 'filter' | 'rotate'>('view')
    const [isComparing, setIsComparing] = useState(false)

    // Rotation state for instant preview
    const [rotation, setRotation] = useState(0)

    // State for multiple adjustments
    const [adjustments, setAdjustments] = useState<{ [key: string]: number }>({
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0,
        sharpness: 1.0,
        exposure: 1.0,
        temperature: 0.0,
        tint: 0.0,
        blur: 0.0,
        sepia: 0.0,
        grayscale: 0.0,
        vignette: 0.0
    })

    // Update adjustments when rotation changes for instant preview
    useEffect(() => {
        if (rotation !== 0) {
            setAdjustments(prev => ({ ...prev, rotation }))
        }
    }, [rotation])

    // Load photo details
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login')
            return
        }

        const loadPhoto = async () => {
            try {
                const response = await apiClient.get(`/api/photos/${params.photoId}`)
                setPhoto(response.data)
            } catch (error) {
                console.error('Failed to load photo:', error)
                alert('Failed to load photo')
                router.push('/gallery')
            } finally {
                setLoading(false)
            }
        }

        if (isAuthenticated && params.photoId) {
            loadPhoto()
        }
    }, [isAuthenticated, authLoading, params.photoId, router])

    // Modified updatePreview to include adjustments
    const updatePreview = useCallback(async () => {
        if (!photo) return

        // Build operations array
        const ops = [...appliedOperations]

        // Add pending operation if it exists
        if (pendingOperation && pendingOperation.op !== 'crop') {
            ops.push(pendingOperation)
        }

        // Add active adjustments (skip rotation and text operations when in text mode to avoid duplication)
        Object.entries(adjustments).forEach(([type, value]) => {
            // Skip rotation - it's handled separately via pendingOperation
            if (type === 'rotation') return

            let isNeutral = false

            // Check if this is a zero-based filter (blur, sepia, grayscale, vignette, temp, tint)
            if (['temperature', 'tint', 'blur', 'sepia', 'grayscale', 'vignette'].includes(type)) {
                if (Math.abs(value) < 0.01) isNeutral = true
            } else {
                // One-based adjustments (brightness, contrast, etc.)
                if (Math.abs(value - 1.0) < 0.01) isNeutral = true
            }

            if (!isNeutral) {
                // Special handling for filters vs adjustments
                if (['blur', 'sepia', 'grayscale', 'vignette'].includes(type)) {
                    ops.push({ op: 'filter', type: type, intensity: value })
                } else {
                    ops.push({ op: 'adjust', type: type, amount: value })
                }
            }
        })

        if (ops.length === 0) {
            setPreviewUrl(null)
            return
        }

        setIsProcessing(true)
        try {
            const response = await apiClient.post('/api/edits/preview', {
                photo_id: params.photoId,
                operations: ops,
                output_format: 'jpeg',
                quality: 85
            })
            setPreviewUrl(response.data.preview_url)
        } catch (error) {
            console.error('Preview failed:', error)
        } finally {
            setIsProcessing(false)
        }
    }, [photo, appliedOperations, pendingOperation, adjustments, params.photoId])

    // Effect to trigger preview when adjustments change
    useEffect(() => {
        // Longer debounce since instant preview handles UI feedback
        const timeoutId = setTimeout(() => {
            updatePreview()
        }, 2000) // 2 seconds for high-quality server validation
        return () => clearTimeout(timeoutId)
    }, [adjustments, updatePreview])

    // Effect to trigger preview when pending or applied ops change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updatePreview()
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [appliedOperations, pendingOperation, updatePreview])

    // Helper to check if adjustments have changed from defaults
    const hasAdjustmentChanges = () => {
        const defaults = {
            brightness: 1.0, contrast: 1.0, saturation: 1.0, sharpness: 1.0,
            exposure: 1.0, temperature: 0.0, tint: 0.0, blur: 0.0,
            sepia: 0.0, grayscale: 0.0, vignette: 0.0
        }
        return Object.entries(adjustments).some(([key, value]) => {
            const defaultValue = defaults[key as keyof typeof defaults] ?? 0
            return Math.abs(value - defaultValue) > 0.01
        })
    }

    // Handlers
    const handleTabChange = (tab: string) => {
        setActiveTab(tab as any)
        setPendingOperation(null)
        // Clear rotation to prevent zoom issues
        setRotation(0)
        setAdjustments(prev => ({ ...prev, rotation: 0 }))
    }

    const handleRotate = (degrees: number) => {
        // Set rotation for instant preview using callback to avoid race condition
        setRotation(prev => {
            const newRotation = prev + degrees

            // Also update pending operation with correct cumulative rotation
            if (pendingOperation?.op === 'rotate') {
                setPendingOperation({
                    ...pendingOperation,
                    degrees: pendingOperation.degrees + degrees
                })
            } else {
                setPendingOperation({ op: 'rotate', degrees: newRotation })
            }

            return newRotation
        })
    }

    const handleCropChange = (area: any) => {
        setPendingOperation({
            op: 'crop',
            x: Math.round(area.x),
            y: Math.round(area.y),
            width: Math.round(area.width),
            height: Math.round(area.height)
        })
    }

    const handleResizeChange = (width: number, height: number) => {
        setPendingOperation({
            op: 'resize',
            width: Math.round(width),
            height: Math.round(height)
        })
    }

    const handleAdjustmentChange = (type: string, value: number) => {
        setAdjustments(prev => ({ ...prev, [type]: value }))
    }

    const handleApply = () => {
        if (!pendingOperation) return

        setAppliedOperations([...appliedOperations, pendingOperation])
        setPendingOperation(null)
    }

    const buildFinalOperations = () => {
        const finalOps = [...appliedOperations]
        if (pendingOperation) {
            finalOps.push(pendingOperation)
        }

        Object.entries(adjustments).forEach(([type, value]) => {
            // Rotation is handled via rotate ops
            if (type === 'rotation') return

            let isNeutral = false
            if (['temperature', 'tint', 'blur', 'sepia', 'grayscale', 'vignette'].includes(type)) {
                if (Math.abs(value) < 0.01) isNeutral = true
            } else {
                if (Math.abs(value - 1.0) < 0.01) isNeutral = true
            }

            if (!isNeutral) {
                if (['blur', 'sepia', 'grayscale', 'vignette'].includes(type)) {
                    finalOps.push({ op: 'filter', type: type, intensity: value })
                } else {
                    finalOps.push({ op: 'adjust', type: type, amount: value })
                }
            }
        })

        return finalOps
    }

    const handleUndo = () => {
        if (appliedOperations.length > 0) {
            const newOps = [...appliedOperations]
            newOps.pop()
            setAppliedOperations(newOps)
        }
    }

    const handleRevert = () => {
        setAppliedOperations([])
        setPendingOperation(null)
        setAdjustments({
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0,
            sharpness: 1.0,
            exposure: 1.0,
            temperature: 0.0,
            tint: 0.0,
            blur: 0.0,
            sepia: 0.0,
            grayscale: 0.0,
            vignette: 0.0
        })
    }

    const handleSave = async () => {
        if (!photo) return
        const finalOps = buildFinalOperations()

        if (finalOps.length === 0) {
            alert('No changes to save!')
            return
        }

        setIsSaving(true)
        try {
            await apiClient.post('/api/edits/commit', {
                photo_id: params.photoId,
                operations: finalOps,
                output_format: 'jpeg',
                quality: 90
            })
            alert('Photo saved successfully!')
            router.push('/gallery')
        } catch (error) {
            console.error('Save failed:', error)
            alert('Failed to save photo')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDownload = async () => {
        if (!photo) return
        const finalOps = buildFinalOperations()

        if (finalOps.length === 0) {
            alert('No changes to download!')
            return
        }

        setIsDownloading(true)
        try {
            const response = await apiClient.post('/api/edits/preview', {
                photo_id: params.photoId,
                operations: finalOps,
                output_format: 'jpeg',
                quality: 90
            })

            const preview = response.data?.preview_url
            if (!preview) {
                throw new Error('No preview URL returned')
            }

            const res = await fetch(preview, { cache: 'no-store' })
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            const safeName = photo.filename?.replace(/\.[^/.]+$/, '') || 'edited-photo'
            link.href = url
            link.download = `${safeName}-edited.jpeg`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Download failed:', error)
            alert('Failed to download edited image')
        } finally {
            setIsDownloading(false)
        }
    }

    if (loading || !photo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            {/* Header */}
            <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/gallery')}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back to Gallery
                    </button>
                    <span className="text-gray-400">|</span>
                    <h1 className="text-white font-medium truncate max-w-md">{photo.filename}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                        {appliedOperations.length} applied • {pendingOperation ? '1 pending' : '0 pending'}
                    </span>
                </div>
            </header>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 relative bg-gray-50 dark:bg-gray-900">
                    <EditorCanvas
                        imageUrl={isComparing ? photo.blob_url : (previewUrl || photo.blob_url)}
                        mode={activeTab}
                        onCropChange={handleCropChange}
                        onResizeChange={handleResizeChange}
                        isProcessing={isProcessing}
                        adjustments={adjustments}
                        enableInstantPreview={true}
                    />
                </div>

                <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
                    <ToolPanel
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        onRotate={handleRotate}
                        onCrop={() => { }}
                        onResize={() => { }}
                        onFilter={() => { }} // Legacy
                        adjustments={adjustments}
                        onAdjustmentChange={handleAdjustmentChange}
                        onCompareStart={() => setIsComparing(true)}
                        onCompareEnd={() => setIsComparing(false)}
                        onApply={handleApply}
                        onReset={handleRevert}
                        onUndo={handleUndo}
                        onRevert={handleRevert}
                        canUndo={appliedOperations.length > 0 || hasAdjustmentChanges()}
                        canApply={!!pendingOperation}
                        isSaving={isSaving}
                        isDownloading={isDownloading}
                        onSave={handleSave}
                        onDownload={handleDownload}
                    />
                </div>
            </div>
        </div>
    )
}
