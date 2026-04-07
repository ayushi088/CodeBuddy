'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import useSWR from 'swr'

export interface User {
  id: number
  email: string
  full_name: string
  avatar_url: string | null
  timezone: string
  notification_preferences: {
    email_daily_summary: boolean
    email_alerts: boolean
    push_notifications: boolean
  }
  created_at: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  register: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 401) return null
    throw new Error('Failed to fetch')
  }
  const data = await res.json()
  return data.user
}

interface AuthProviderProps {
  children: ReactNode
  initialUser?: User | null
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const shouldFetchUser = initialUser === undefined
  const { data: user, isLoading, mutate } = useSWR<User | null>('/api/auth/me', fetcher, {
    fallbackData: initialUser,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    revalidateOnMount: shouldFetchUser,
  })
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setIsAuthLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        return { error: data.error || 'Login failed' }
      }
      
      await mutate(data.user)
      return {}
    } catch {
      return { error: 'Network error' }
    } finally {
      setIsAuthLoading(false)
    }
  }, [mutate])

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setIsAuthLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        return { error: data.error || 'Registration failed' }
      }
      
      await mutate(data.user)
      return {}
    } catch {
      return { error: 'Network error' }
    } finally {
      setIsAuthLoading(false)
    }
  }, [mutate])

  const logout = useCallback(async () => {
    setIsAuthLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      await mutate(null)
    } finally {
      setIsAuthLoading(false)
    }
  }, [mutate])

  const refreshUser = useCallback(async () => {
    await mutate()
  }, [mutate])

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: isLoading || isAuthLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
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
