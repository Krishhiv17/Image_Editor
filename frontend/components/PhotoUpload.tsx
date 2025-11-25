'use client'

import { useState, useRef, DragEvent } from 'react'
import apiClient from '@/lib/api'

interface UploadProgress {
    file: File
    progress: number
    status: 'uploading' | 'processing' | 'complete' | 'error'
    error?: string
    photoId?: string
}

interface PhotoUploadProps {
    onUploadComplete?: () => void
}

export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
    const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        handleFiles(files)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            handleFiles(files)
        }
    }

    const handleFiles = (files: File[]) => {
        const validFiles = files.filter(file => {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert(`${file.name} is not an image file`)
                return false
            }

            // Validate file size (50MB max)
            if (file.size > 50 * 1024 * 1024) {
                alert(`${file.name} is too large (max 50MB)`)
                return false
            }

            return true
        })

        validFiles.forEach(file => uploadFile(file))
    }

    const uploadFile = async (file: File) => {
        const fileId = `${file.name}-${Date.now()}`

        // Add to uploads map
        setUploads(prev => new Map(prev).set(fileId, {
            file,
            progress: 0,
            status: 'uploading'
        }))

        try {
            // Step 1: Initialize upload
            const initResponse = await apiClient.post('/api/photos/upload/init', {
                filename: file.name,
                content_type: file.type,
                file_size: file.size
            })

            const { upload_url, blob_name, photo_id } = initResponse.data

            // Step 2: Upload to Azure Blob Storage
            const uploadResponse = await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: {
                    'x-ms-blob-type': 'BlockBlob',
                    'Content-Type': file.type
                }
            })

            if (!uploadResponse.ok) {
                throw new Error('Upload to storage failed')
            }

            // Update progress
            setUploads(prev => {
                const updated = new Map(prev)
                const current = updated.get(fileId)
                if (current) {
                    updated.set(fileId, { ...current, progress: 100, status: 'processing' })
                }
                return updated
            })

            // Step 3: Complete upload (extract EXIF)
            await apiClient.post('/api/photos/upload/complete', {
                photo_id,
                blob_name
            })

            // Mark as complete
            setUploads(prev => {
                const updated = new Map(prev)
                const current = updated.get(fileId)
                if (current) {
                    updated.set(fileId, { ...current, status: 'complete', photoId: photo_id })
                }
                return updated
            })

            // Notify parent
            if (onUploadComplete) {
                onUploadComplete()
            }

            // Remove from list after 3 seconds
            setTimeout(() => {
                setUploads(prev => {
                    const updated = new Map(prev)
                    updated.delete(fileId)
                    return updated
                })
            }, 3000)

        } catch (error: any) {
            console.error('Upload error:', error)
            setUploads(prev => {
                const updated = new Map(prev)
                const current = updated.get(fileId)
                if (current) {
                    updated.set(fileId, {
                        ...current,
                        status: 'error',
                        error: error.response?.data?.detail || 'Upload failed'
                    })
                }
                return updated
            })
        }
    }

    return (
        <div className="w-full">
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                    }
        `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <div className="space-y-4">
                    <div className="text-6xl">📷</div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Drop photos here or click to browse
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Supports JPEG, PNG, GIF, WebP (max 50MB per file)
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Progress */}
            {uploads.size > 0 && (
                <div className="mt-6 space-y-3">
                    {Array.from(uploads.values()).map((upload, index) => (
                        <div
                            key={`${upload.file.name}-${index}`}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="text-2xl">
                                        {upload.status === 'complete' && '✅'}
                                        {upload.status === 'error' && '❌'}
                                        {upload.status === 'uploading' && '⬆️'}
                                        {upload.status === 'processing' && '⚙️'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {upload.file.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm font-medium">
                                    {upload.status === 'uploading' && `${upload.progress}%`}
                                    {upload.status === 'processing' && 'Processing...'}
                                    {upload.status === 'complete' && 'Complete!'}
                                    {upload.status === 'error' && 'Failed'}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {(upload.status === 'uploading' || upload.status === 'processing') && (
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: upload.status === 'processing' ? '100%' : `${upload.progress}%` }}
                                    />
                                </div>
                            )}

                            {/* Error Message */}
                            {upload.error && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                                    {upload.error}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
