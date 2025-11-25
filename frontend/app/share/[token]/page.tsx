'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import apiClient from '@/lib/api'

export default function SharePage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [resource, setResource] = useState<any>(null)
    const [resourceType, setResourceType] = useState<'photo' | 'album' | null>(null)

    useEffect(() => {
        loadSharedResource()
    }, [token])

    const loadSharedResource = async () => {
        try {
            setLoading(true)
            console.log('Loading share with token:', token)
            const response = await apiClient.get(`/api/share/${token}`)
            console.log('Share response:', response.data)
            setResourceType(response.data.type)
            setResource(response.data.data)
            console.log('Resource loaded successfully:', response.data.data)
        } catch (err: any) {
            console.error('Error loading shared resource:', err)
            if (err.response?.status === 410) {
                setError('This share link has expired')
            } else if (err.response?.status === 404) {
                setError('Share link not found')
            } else {
                setError('Failed to load shared content')
            }
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
                    <div className="text-red-600 dark:text-red-400 mb-4">
                        <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {error}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Please check the link and try again.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
            {/* Header */}
            <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Photo Editor
                        </h1>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Shared {resourceType === 'photo' ? 'Photo' : 'Album'}
                        </span>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {resourceType === 'photo' && resource && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {resource.filename}
                            </h2>

                            <div className="mb-6 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden flex justify-center items-center">
                                <img
                                    src={resource.blob_url}
                                    alt={resource.filename}
                                    className="max-w-full max-h-[70vh] object-contain"
                                />
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {resource.width && resource.height && (
                                        <span>{resource.width} × {resource.height}</span>
                                    )}
                                </div>
                                <a
                                    href={resource.blob_url}
                                    download
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Download
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {resourceType === 'album' && resource && (
                    <div>
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {resource.name}
                            </h2>
                            {resource.description && (
                                <p className="text-gray-600 dark:text-gray-400">
                                    {resource.description}
                                </p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                {resource.photo_count} {resource.photo_count === 1 ? 'photo' : 'photos'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {resource.photos.map((photo: any) => (
                                <div
                                    key={photo.id}
                                    className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
                                >
                                    <img
                                        src={photo.blob_url}
                                        alt={photo.filename}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                Shared via <span className="font-semibold">Photo Editor</span>
            </div>
        </div>
    )
}
