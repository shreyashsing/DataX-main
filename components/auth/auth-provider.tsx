"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"

type User = {
  _id: string
  name: string
  email: string
  avatar?: string
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = Cookies.get("auth-token")
        console.log('Checking auth state, token present:', !!token)
        
        if (token) {
          try {
            // Fetch user data from the API
            const response = await fetch("/api/auth/me", {
              headers: {
                Authorization: `Bearer ${token}`
              }
            })
            
            if (response.ok) {
              const data = await response.json()
              console.log('User data fetched successfully:', data.user.email)
              setUser(data.user)
            } else {
              console.log('Failed to fetch user data, removing token')
              // If the token is invalid, remove it
              Cookies.remove("auth-token")
              setUser(null)
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
            Cookies.remove("auth-token")
            setUser(null)
          }
        } else {
          console.log('No auth token found')
          setUser(null)
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      console.log('Attempting login for:', email)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Login failed:', error)
        throw new Error(error.error || "Login failed")
      }
      
      const { user, token } = await response.json()
      console.log('Login successful for:', user.email)
      
      // Save the token and user
      Cookies.set("auth-token", token, { expires: 7 }) // 7 days
      setUser(user)
      
      // Force a router refresh to ensure the new auth state is picked up
      router.refresh()
      
      // Add a small delay before navigation to ensure the cookie is set
      setTimeout(() => {
        console.log('Navigating to dashboard')
        router.push("/dashboard")
      }, 100)
    } catch (error) {
      console.error("Login error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    // This would typically redirect to Google OAuth
    // For simplicity, we'll just show how it would be handled on return
    console.warn("Google login not implemented in this demo")
    setIsLoading(true)
    try {
      // Google login would redirect to Google and then back to your site
      // Then you would handle the OAuth token here and exchange it for your JWT
      
      // Mock implementation:
      // const response = await fetch("/api/auth/google-callback", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json"
      //   },
      //   body: JSON.stringify({ token: googleToken })
      // })
      
      // const { user, token } = await response.json()
      // Cookies.set("auth-token", token, { expires: 7 })
      // setUser(user)
      
      // For demo, just show an error
      throw new Error("Google login not implemented in this demo")
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true)
    try {
      console.log('Attempting signup for:', email)
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Signup failed:', error)
        throw new Error(error.error || "Signup failed")
      }
      
      const { user, token } = await response.json()
      console.log('Signup successful for:', user.email)
      
      // Save the token and user
      Cookies.set("auth-token", token, { expires: 7 })
      setUser(user)
      
      // Force a router refresh to ensure the new auth state is picked up
      router.refresh()
      
      // Add a small delay before navigation to ensure the cookie is set
      setTimeout(() => {
        console.log('Navigating to dashboard')
        router.push("/dashboard")
      }, 100)
    } catch (error) {
      console.error("Signup error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = useCallback(async () => {
    try {
      console.log('Logging out user')
      // Remove the token and user first
      Cookies.remove("auth-token")
      setUser(null)
      
      // Use window.location instead of Next.js router to fully reload the page
      // This avoids React reconciliation issues
      window.location.href = "/"
    } catch (error) {
      console.error("Logout error:", error)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

