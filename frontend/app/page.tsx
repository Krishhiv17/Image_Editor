import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
      <div className="text-center space-y-8 animate-fade-in max-w-4xl">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-7xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-slide-up">
            Photo Editor
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Professional cloud-based photo editing with AI-powered features
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <div className="p-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105">
            <div className="text-4xl mb-3">📸</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Smart Upload</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag-and-drop multiple photos with automatic organization
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Advanced Editing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Crop, rotate, filters, and professional adjustments
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105">
            <div className="text-4xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Easy Sharing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share albums with customizable permissions
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-6 justify-center pt-8 flex-wrap">
          <Link
            href="/login"
            className="group px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <span className="flex items-center gap-2">
              Get Started
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Link>

          <Link
            href="/signup"
            className="px-10 py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-xl font-semibold text-lg border-2 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg"
          >
            Sign Up Free
          </Link>
        </div>

        {/* Tech Stack Badge */}
        <div className="pt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>Built with Next.js, FastAPI, and Azure Cloud</p>
        </div>
      </div>
    </main>
  )
}
