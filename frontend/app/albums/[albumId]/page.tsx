'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import apiClient from '@/lib/api'
import { useAuth } from '@/lib/authContext'
import ShareButton from '@/components/ShareButton'

interface Photo {
    id: string
    filename: string
    blob_url: string
    thumbnail_url: string | null
}

interface AlbumDetails {
    id: string
    name: string
    description: string | null
    cover_photo_id: string | null
    photo_count: number
    created_at: string
}

export default function AlbumDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { isAuthenticated, loading: authLoading } = useAuth()
    const [album, setAlbum] = useState<AlbumDetails | null>(null)
    const [photos, setPhotos] = useState<Photo[]>([])
    const [loading, setLoading] = useState(true)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [updating, setUpdating] = useState(false)
    const [showAddPhotosModal, setShowAddPhotosModal] = useState(false)
    const [allPhotos, setAllPhotos] = useState<Photo[]>([])
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
    const [addingPhotos, setAddingPhotos] = useState(false)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login')
        } else if (isAuthenticated) {
            loadAlbumData()
        }
    }, [isAuthenticated, authLoading, router, params.albumId])

    const loadAlbumData = async () => {
        try {
            // Load album details
            const albumResponse = await apiClient.get(`/api/albums/${params.albumId}`)
            setAlbum(albumResponse.data)
            setEditName(albumResponse.data.name)
            setEditDescription(albumResponse.data.description || '')

            // Load photos in album
            const photosResponse = await apiClient.get(`/api/albums/${params.albumId}/photos`)
            setPhotos(Array.isArray(photosResponse.data) ? photosResponse.data : [])
        } catch (error) {
            console.error('Failed to load album:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadAllPhotos = async () => {
        try {
            const response = await apiClient.get('/api/photos')
            const photosList = response.data.photos || response.data || []
            setAllPhotos(Array.isArray(photosList) ? photosList : [])
        } catch (error) {
            console.error('Failed to load photos:', error)
        }
    }

    const handleUpdateAlbum = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        try {
            await apiClient.put(`/api/albums/${params.albumId}`, {
                name: editName,
                description: editDescription || null
            })
            setShowEditModal(false)
            loadAlbumData()
        } catch (error) {
            console.error('Failed to update album:', error)
            alert('Failed to update album')
        } finally {
            setUpdating(false)
        }
    }

    const handleDeleteAlbum = async () => {
        if (!confirm('Are you sure you want to delete this album? Photos will not be deleted.')) {
            return
        }

        try {
            await apiClient.delete(`/api/albums/${params.albumId}`)
            router.push('/albums')
        } catch (error) {
            console.error('Failed to delete album:', error)
            alert('Failed to delete album')
        }
    }

    const handleSetCover = async (photoId: string) => {
        try {
            await apiClient.put(`/api/albums/${params.albumId}/cover`, {
                photo_id: photoId
            })
            loadAlbumData()
        } catch (error) {
            console.error('Failed to set cover:', error)
        }
    }

    const handleRemovePhoto = async (photoId: string) => {
        try {
            await apiClient.delete(`/api/albums/${params.albumId}/photos/${photoId}`)
            loadAlbumData()
        } catch (error) {
            console.error('Failed to remove photo:', error)
        }
    }

    const handleOpenAddPhotos = () => {
        loadAllPhotos()
        setShowAddPhotosModal(true)
        setSelectedPhotoIds(new Set())
    }

    const handleTogglePhoto = (photoId: string) => {
        const newSelected = new Set(selectedPhotoIds)
        if (newSelected.has(photoId)) {
            newSelected.delete(photoId)
        } else {
            newSelected.add(photoId)
        }
        setSelectedPhotoIds(newSelected)
    }

    const handleAddPhotos = async () => {
        if (selectedPhotoIds.size === 0) return

        setAddingPhotos(true)
        try {
            await apiClient.post(`/api/albums/${params.albumId}/photos`, {
                photo_ids: Array.from(selectedPhotoIds)
            })
            setShowAddPhotosModal(false)
            setSelectedPhotoIds(new Set())
            loadAlbumData()
        } catch (error) {
            console.error('Failed to add photos:', error)
            alert('Failed to add photos to album')
        } finally {
            setAddingPhotos(false)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
            </div>
        )
    }

    if (!album) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Album not found</h2>
                    <button
                        onClick={() => router.push('/albums')}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Back to Albums
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/albums')}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Albums
                    </button>

                    {/* Album Info and Actions */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {album.name}
                            </h1>
                            {album.description && (
                                <p className="text-gray-600 dark:text-gray-400 mb-2">
                                    {album.description}
                                </p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <ShareButton
                                resourceType="album"
                                resourceId={params.albumId as string}
                                resourceName={album.name}
                            />
                            <button
                                onClick={handleOpenAddPhotos}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                + Add Photos
                            </button>
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={handleDeleteAlbum}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Photos Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {photos.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-gray-400 dark:text-gray-500 mb-4">
                            <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No photos in this album
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Add photos from your gallery
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {photos.map((photo) => (
                            <div key={photo.id} className="group relative aspect-square">
                                <img
                                    src={photo.blob_url}
                                    alt={photo.filename}
                                    className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => router.push(`/editor/${photo.id}`)}
                                />
                                {/* Actions Overlay */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSetCover(photo.id)
                                        }}
                                        className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="Set as cover"
                                    >
                                        <svg className="h-4 w-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemovePhoto(photo.id)
                                        }}
                                        className="p-1.5 bg-red-600 rounded-full shadow-lg hover:bg-red-700"
                                        title="Remove from album"
                                    >
                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                {album.cover_photo_id === photo.id && (
                                    <div className="absolute bottom-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        Cover
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Edit Album Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Album</h2>
                        <form onSubmit={handleUpdateAlbum} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Album Name *
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    {updating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Photos Modal */}
            {showAddPhotosModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full p-6 my-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Photos to Album</h2>

                        {allPhotos.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-600 dark:text-gray-400">No photos available to add</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Upload some photos first</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                    {selectedPhotoIds.size} photo{selectedPhotoIds.size !== 1 ? 's' : ''} selected
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto mb-4">
                                    {allPhotos.map((photo) => {
                                        const isSelected = selectedPhotoIds.has(photo.id)
                                        const isAlreadyInAlbum = photos.some(p => p.id === photo.id)
                                        return (
                                            <div
                                                key={photo.id}
                                                onClick={() => !isAlreadyInAlbum && handleTogglePhoto(photo.id)}
                                                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ${isAlreadyInAlbum
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'ring-4 ring-blue-500'
                                                        : 'hover:ring-2 hover:ring-blue-300'
                                                    }`}
                                            >
                                                <img
                                                    src={photo.blob_url}
                                                    alt={photo.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                                {isAlreadyInAlbum && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                        <span className="text-white text-xs font-semibold">Already in album</span>
                                                    </div>
                                                )}
                                                {isSelected && !isAlreadyInAlbum && (
                                                    <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setShowAddPhotosModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPhotos}
                                disabled={addingPhotos || selectedPhotoIds.size === 0}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {addingPhotos ? 'Adding...' : `Add ${selectedPhotoIds.size} Photo${selectedPhotoIds.size !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
