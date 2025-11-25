'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/authContext'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, logout, isAuthenticated } = useAuth()
  const [tokensProcessed, setTokensProcessed] = useState(false)

  // Handle OAuth callback tokens
  useEffect(() => {
    if (tokensProcessed) return

    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (accessToken && refreshToken) {
      // Store tokens from OAuth callback
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      setTokensProcessed(true)

      // Remove tokens from URL (clean URL)
      router.replace('/dashboard')
    }
  }, [searchParams, router, tokensProcessed])

  useEffect(() => {
    if (!loading && !isAuthenticated && !searchParams.get('access_token')) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router, searchParams])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
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
                className="text-blue-600 dark:text-blue-400 font-semibold"
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
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {user.email}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Welcome to Your Dashboard!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You're successfully logged in as <span className="font-semibold text-blue-600">{user.email}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upload Photos Card */}
            <button
              onClick={() => router.push('/gallery')}
              className="p-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl text-left hover:scale-105 transition-transform"
            >
              <div className="text-4xl mb-3">📷</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Upload & Manage Photos
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload, view, and manage your photo gallery
              </p>
            </button>

            <div className="p-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Edit Images
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Coming soon - Professional editing tools
              </p>
            </div>

            <button
              onClick={() => router.push('/albums')}
              className="p-6 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 rounded-xl text-left hover:scale-105 transition-transform"
            >
              <div className="text-4xl mb-3">📁</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                My Albums
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Organize photos into collections
              </p>
            </button>
          </div>

          {/* User Info */}
          <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Account Information
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono text-xs">{user.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(user.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Authentication Method</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user.oauth_provider || 'Email/Password'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  )
}
