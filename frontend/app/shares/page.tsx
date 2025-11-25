'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import apiClient from '@/lib/api'

interface Share {
    id: string
    share_token: string
    share_url: string
    resource_type: string
    resource_id: string
    resource_name: string
    scope: string
    expires_at: string | null
    created_at: string
    last_accessed_at: string | null
    access_count: number
    is_expired: boolean
}

export default function SharesPage() {
    const router = useRouter()
    const { isAuthenticated, loading: authLoading } = useAuth()
    const [shares, setShares] = useState<Share[]>([])
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (isAuthenticated) {
            loadShares()
        }
    }, [isAuthenticated])

    const loadShares = async () => {
        try {
            setLoading(true)
            const response = await apiClient.get('/api/shares')
            setShares(response.data)
        } catch (error) {
            console.error('Failed to load shares:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async (url: string, id: string) => {
        await navigator.clipboard.writeText(url)
        setCopied(id)
        setTimeout(() => setCopied(null), 2000)
    }

    const handleRevoke = async (shareId: string) => {
        if (!confirm('Are you sure you want to revoke this share link?')) return

        try {
            await apiClient.delete(`/api/shares/${shareId}`)
            setShares(shares.filter(s => s.id !== shareId))
        } catch (error) {
            console.error('Failed to revoke share:', error)
            alert('Failed to revoke share')
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const activeShares = shares.filter(s => !s.is_expired)
    const expiredShares = shares.filter(s => s.is_expired)

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
                </div>
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
                                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                                Gallery
                            </button>
                            <button
                                onClick={() => router.push('/albums')}
                                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                                Albums
                            </button>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                My Shares
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                    My Shared Links
                </h2>

                {shares.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="h-24 w-24 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400">
                            You haven't shared anything yet
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Active Shares */}
                        {activeShares.length > 0 && (
                            <div className="mb-12">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    Active Shares ({activeShares.length})
                                </h3>
                                <div className="space-y-4">
                                    {activeShares.map(share => (
                                        <div
                                            key={share.id}
                                            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {share.resource_name}
                                                        </h4>
                                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                                                            {share.resource_type}
                                                        </span>
                                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full">
                                                            {share.scope}
                                                        </span>
                                                    </div>

                                                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                        <p>Created: {formatDate(share.created_at)}</p>
                                                        {share.expires_at && (
                                                            <p>Expires: {formatDate(share.expires_at)}</p>
                                                        )}
                                                        <p>Access count: {share.access_count}</p>
                                                        {share.last_accessed_at && (
                                                            <p>Last accessed: {formatDate(share.last_accessed_at)}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2 mt-4">
                                                        <input
                                                            type="text"
                                                            value={share.share_url}
                                                            readOnly
                                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        />
                                                        <button
                                                            onClick={() => handleCopy(share.share_url, share.id)}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                        >
                                                            {copied === share.id ? '✓ Copied' : 'Copy'}
                                                        </button>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleRevoke(share.id)}
                                                    className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                                >
                                                    Revoke
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Expired Shares */}
                        {expiredShares.length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-4">
                                    Expired Shares ({expiredShares.length})
                                </h3>
                                <div className="space-y-4 opacity-60">
                                    {expiredShares.map(share => (
                                        <div
                                            key={share.id}
                                            className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                                        {share.resource_name}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Expired: {share.expires_at && formatDate(share.expires_at)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRevoke(share.id)}
                                                    className="text-red-600 dark:text-red-400 text-sm hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
