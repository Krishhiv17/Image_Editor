'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import apiClient from '@/lib/api'
import { User, AuthResponse } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken')
      if (token) {
        try {
          const response = await apiClient.get('/api/auth/me')
          setUser(response.data)
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    })

    const { access_token, refresh_token, user: userData } = response.data

    localStorage.setItem('accessToken', access_token)
    localStorage.setItem('refreshToken', refresh_token)
    setUser(userData)
  }

  const signup = async (email: string, password: string) => {
    const response = await apiClient.post<AuthResponse>('/api/auth/signup', {
      email,
      password,
    })

    const { access_token, refresh_token, user: userData } = response.data

    localStorage.setItem('accessToken', access_token)
    localStorage.setItem('refreshToken', refresh_token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
