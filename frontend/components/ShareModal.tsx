'use client'

import { useState } from 'react'
import apiClient from '@/lib/api'

interface ShareModalProps {
    resourceType: 'photo' | 'album'
    resourceId: string
    resourceName: string
    onClose: () => void
}

export default function ShareModal({ resourceType, resourceId, resourceName, onClose }: ShareModalProps) {
    const [expiryDays, setExpiryDays] = useState<number | null>(null)
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCreateShare = async () => {
        setLoading(true)
        try {
            const response = await apiClient.post(`/api/${resourceType}s/${resourceId}/share`, {
                resource_type: resourceType,
                resource_id: resourceId,
                scope: 'view',  // Always view-only
                expires_in_days: expiryDays
            })

            setShareUrl(response.data.share_url)
        } catch (error) {
            console.error('Failed to create share:', error)
            alert('Failed to create share link')
        } finally {
            setLoading(false)
        }
    }

    const handleCopyLink = async () => {
        if (shareUrl) {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const expiryOptions = [
        { label: 'Never', value: null },
        { label: '1 Hour', value: 0.04 },
        { label: '1 Day', value: 1 },
        { label: '1 Week', value: 7 },
        { label: '1 Month', value: 30 },
    ]

    return (
        <div
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Share {resourceType === 'photo' ? 'Photo' : 'Album'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {resourceName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        ✕
                    </button>
                </div>

                {!shareUrl ? (
                    <>
                        {/* Expiry Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Link Expiry
                            </label>
                            <select
                                value={expiryDays || ''}
                                onChange={(e) => setExpiryDays(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {expiryOptions.map((option) => (
                                    <option key={option.label} value={option.value || ''}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={handleCreateShare}
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Generating...' : 'Generate Share Link'}
                        </button>
                    </>
                ) : (
                    <>
                        {/* Share Link Display */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Share Link
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {copied ? '✓ Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        {/* Success Message */}
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                            <p className="text-green-800 dark:text-green-200 text-sm">
                                ✓ Share link created successfully! Anyone with this link can access the {resourceType}.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Done
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
