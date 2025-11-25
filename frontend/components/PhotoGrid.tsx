'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Photo {
    id: string
    filename: string
    blob_url: string
    created_at: string
    width?: number
    height?: number
    file_size: number
}

interface PhotoGridProps {
    photos: Photo[]
    onPhotoClick: (photo: Photo) => void
    loading?: boolean
}

export default function PhotoGrid({ photos, onPhotoClick, loading = false }: PhotoGridProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                    />
                ))}
            </div>
        )
    }

    if (photos.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No photos yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                    Upload your first photo to get started!
                </p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
                <div
                    key={photo.id}
                    onClick={() => onPhotoClick(photo)}
                    className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-4 hover:ring-blue-500 transition-all shadow-md"
                >
                    {photo.blob_url ? (
                        <img
                            src={photo.blob_url}
                            alt={photo.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            crossOrigin="anonymous"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                            <div className="text-center">
                                <div className="text-4xl mb-2">🖼️</div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Upload incomplete</p>
                            </div>
                        </div>
                    )}

                    {/* Text Overlay - Always visible gradient at bottom for readability */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex justify-between items-end">
                            <div className="flex-1 min-w-0 mr-2">
                                <p className="text-white font-semibold text-sm truncate drop-shadow-md">
                                    {photo.filename}
                                </p>
                                <p className="text-gray-300 text-xs mt-0.5">
                                    {new Date(photo.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = `/editor/${photo.id}`;
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
