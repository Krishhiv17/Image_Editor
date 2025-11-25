'use client'

import { useState, useRef, useEffect } from 'react'
import apiClient from '@/lib/api'

interface Tag {
    id: string
    name: string
    user_id?: string
    created_at?: string
}

interface TagInputProps {
    photoId: string
    existingTags: Array<{ id: string, name: string, user_id?: string, created_at?: string }>
    onTagAdded?: (tag: Tag) => void
    onTagRemoved?: (tagId: string) => void
}

export default function TagInput({ photoId, existingTags, onTagAdded, onTagRemoved }: TagInputProps) {
    const [input, setInput] = useState('')
    const [suggestions, setSuggestions] = useState<Tag[]>([])
    const [allTags, setAllTags] = useState<Tag[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [adding, setAdding] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadAllTags()
    }, [])

    const loadAllTags = async () => {
        try {
            const response = await apiClient.get('/api/tags')
            setAllTags(response.data)
        } catch (error) {
            console.error('Failed to load tags:', error)
        }
    }

    const handleInputChange = (value: string) => {
        setInput(value)

        if (value.trim()) {
            // Filter suggestions based on input
            const filtered = allTags.filter(tag =>
                tag.name.toLowerCase().includes(value.toLowerCase()) &&
                !existingTags.some(et => et.id === tag.id)
            )
            setSuggestions(filtered)
            setShowSuggestions(true)
        } else {
            setShowSuggestions(false)
        }
    }

    const handleAddTag = async (tagName: string) => {
        if (!tagName.trim() || adding) return

        setAdding(true)
        try {
            const response = await apiClient.post(`/api/tags/photos/${photoId}/tags/create`, {
                name: tagName.trim()
            })

            if (onTagAdded) {
                onTagAdded(response.data)
            }

            setInput('')
            setShowSuggestions(false)
            loadAllTags()
        } catch (error) {
            console.error('Failed to add tag:', error)
        } finally {
            setAdding(false)
        }
    }

    const handleSelectExisting = async (tag: Tag) => {
        setAdding(true)
        try {
            await apiClient.post(`/api/tags/photos/${photoId}/tags`, {
                tag_id: tag.id
            })

            if (onTagAdded) {
                onTagAdded(tag)
            }

            setInput('')
            setShowSuggestions(false)
        } catch (error) {
            console.error('Failed to add tag:', error)
        } finally {
            setAdding(false)
        }
    }

    const handleRemoveTag = async (tagId: string) => {
        try {
            await apiClient.delete(`/api/tags/photos/${photoId}/tags/${tagId}`)

            if (onTagRemoved) {
                onTagRemoved(tagId)
            }
        } catch (error) {
            console.error('Failed to remove tag:', error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (input.trim()) {
                handleAddTag(input)
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false)
        }
    }

    return (
        <div className="space-y-2">
            {/* Existing Tags */}
            {existingTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {existingTags.map((tag) => (
                        <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-sm rounded-full"
                        >
                            {tag.name}
                            <button
                                onClick={() => handleRemoveTag(tag.id)}
                                className="hover:text-red-600 dark:hover:text-red-400"
                                title="Remove tag"
                            >
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Tag Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => input && setShowSuggestions(true)}
                    placeholder="Add tags..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={adding}
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && (suggestions.length > 0 || input.trim()) && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((tag) => (
                            <button
                                key={tag.id}
                                onClick={() => handleSelectExisting(tag)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {tag.name}
                            </button>
                        ))}

                        {input.trim() && !suggestions.some(s => s.name.toLowerCase() === input.toLowerCase()) && (
                            <button
                                onClick={() => handleAddTag(input)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
                            >
                                <span className="text-blue-600 dark:text-blue-400">+ Create "{input}"</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
