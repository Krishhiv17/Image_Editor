'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import PhotoUpload from '@/components/PhotoUpload'
import TagInput from '@/components/TagInput'
import ShareButton from '@/components/ShareButton'
import apiClient from '@/lib/api'

interface Photo {
    id: string
    filename: string
    blob_url: string
    thumbnail_url: string | null
    created_at: string
    tags?: Array<{ id: string, name: string }>
    width?: number
    height?: number
    file_size: number
    content_type: string
}

export default function GalleryPage() {
    const router = useRouter()
    const { user, loading: authLoading, isAuthenticated } = useAuth()
    const [photos, setPhotos] = useState<Photo[]>([])
    const [loading, setLoading] = useState(true)
    const [showUpload, setShowUpload] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (isAuthenticated) {
            loadPhotos()
        }
    }, [isAuthenticated])

    // Real-time search with debounce
    useEffect(() => {
        if (!isAuthenticated) return

        const timeoutId = setTimeout(() => {
            loadPhotos()
        }, 300) // 300ms debounce

        return () => clearTimeout(timeoutId)
    }, [searchQuery, selectedTag, isAuthenticated])

    const loadPhotos = async () => {
        try {
            setLoading(true)

            // Build search params
            const params = new URLSearchParams()
            if (searchQuery.trim()) params.append('q', searchQuery.trim())
            if (selectedTag) params.append('tag_ids', selectedTag)

            const endpoint = (searchQuery.trim() || selectedTag)
                ? `/api/search/photos?${params.toString()}`
                : '/api/photos'

            const response = await apiClient.get(endpoint)
            const photoData = response.data.photos || response.data
            setPhotos(Array.isArray(photoData) ? photoData : [])
        } catch (error) {
            console.error('Failed to load photos:', error)
            setPhotos([])
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        loadPhotos()
    }

    const clearSearch = () => {
        setSearchQuery('')
        setSelectedTag(null)
    }

    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo)
    }

    const handleDelete = async (photoId: string) => {
        if (!confirm('Are you sure you want to delete this photo?')) return

        try {
            await apiClient.delete(`/api/photos/${photoId}`)
            setPhotos(photos.filter(p => p.id !== photoId))
            setSelectedPhoto(null)
        } catch (error) {
            console.error('Failed to delete photo:', error)
            alert('Failed to delete photo')
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
            {/* Navigation */}
            <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-6">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Photo Editor
                            </h1>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => router.push('/gallery')}
                                className="text-blue-600 dark:text-blue-400 font-semibold"
                            >
                                Gallery
                            </button>
                            <button
                                onClick={() => router.push('/albums')}
                                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                                Albums
                            </button>
                            <button
                                onClick={() => router.push('/shares')}
                                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                                My Shares
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search photos by name..."
                                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {(searchQuery || selectedTag) && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                        title="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {selectedTag && (
                                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-sm rounded-full">
                                    Filtering by tag
                                </div>
                            )}
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                {user?.email}
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            My Photos
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                        {showUpload ? 'Hide Upload' : '+ Upload Photos'}
                    </button>
                </div>

                {/* Upload Section */}
                {showUpload && (
                    <div className="mb-8">
                        <PhotoUpload
                            onUploadComplete={() => {
                                loadPhotos()
                                setShowUpload(false)
                            }}
                        />
                    </div>
                )}

                {/* Photo Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                        ))}
                    </div>
                ) : photos.length === 0 ? (
                    <div className="text-center py-16 text-gray-600 dark:text-gray-400">
                        <p className="text-lg">No photos yet. Upload some to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {photos.map((photo) => (
                            <div
                                key={photo.id}
                                className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
                                onClick={() => handlePhotoClick(photo)}
                            >
                                <img
                                    src={photo.blob_url}
                                    alt={photo.filename}
                                    className="w-full h-full object-cover"
                                />

                                {/* Tags Overlay */}
                                {photo.tags && photo.tags.length > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                                        <div className="flex flex-wrap gap-1">
                                            {photo.tags.slice(0, 3).map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedTag(selectedTag === tag.id ? null : tag.id)
                                                    }}
                                                    className="px-2 py-0.5 bg-blue-500/80 text-white text-xs rounded-full hover:bg-blue-600/90"
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                            {photo.tags.length > 3 && (
                                                <span className="px-2 py-0.5 bg-gray-500/80 text-white text-xs rounded-full">
                                                    +{photo.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Hover Actions */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(`/editor/${photo.id}`)
                                        }}
                                        className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="Edit"
                                    >
                                        <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelete(photo.id)
                                        }}
                                        className="p-2 bg-red-600 rounded-full shadow-lg hover:bg-red-700"
                                        title="Delete"
                                    >
                                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Photo Modal */}
                {selectedPhoto && (
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <div
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                            {selectedPhoto.filename}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(selectedPhoto.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedPhoto(null)}
                                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Photo Display - Constrained Size */}
                                <div className="mb-4 flex justify-center items-center bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                                    <img
                                        src={selectedPhoto.blob_url}
                                        alt={selectedPhoto.filename}
                                        className="max-w-full max-h-[50vh] object-contain"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Size:</span>
                                        <span className="ml-2 text-gray-900 dark:text-gray-100">
                                            {(selectedPhoto.file_size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                    {selectedPhoto.width && selectedPhoto.height && (
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Dimensions:</span>
                                            <span className="ml-2 text-gray-900 dark:text-gray-100">
                                                {selectedPhoto.width} × {selectedPhoto.height}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                                    <div className="mb-4">
                                        <span className="text-gray-500 dark:text-gray-400">Tags:</span>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedPhoto.tags.map(tag => (
                                                <span key={tag.id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tag Management */}
                                <div className="mb-4">
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Manage Tags</h4>
                                    <TagInput
                                        photoId={selectedPhoto.id}
                                        existingTags={selectedPhoto.tags || []}
                                        onTagAdded={(tag) => {
                                            setSelectedPhoto({
                                                ...selectedPhoto,
                                                tags: [...(selectedPhoto.tags || []), tag]
                                            })
                                            loadPhotos() // Refresh to update grid
                                        }}
                                        onTagRemoved={(tagId) => {
                                            setSelectedPhoto({
                                                ...selectedPhoto,
                                                tags: (selectedPhoto.tags || []).filter(t => t.id !== tagId)
                                            })
                                            loadPhotos() // Refresh to update grid
                                        }}
                                    />
                                </div>
                                {/* Action Buttons */}
                                <div className="flex gap-2 justify-end">
                                    <ShareButton
                                        resourceType="photo"
                                        resourceId={selectedPhoto.id}
                                        resourceName={selectedPhoto.filename}
                                    />
                                    <button
                                        onClick={() => router.push(`/editor/${selectedPhoto.id}`)}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                                    >
                                        Edit Photo
                                    </button>
                                    <button
                                        onClick={() => handleDelete(selectedPhoto.id)}
                                        className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
