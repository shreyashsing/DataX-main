"use client"

import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { useAuth } from "@/components/auth/auth-provider"
import { useEffect, useState } from "react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  // This is needed because we can't redirect during SSR
  useEffect(() => {
    console.log('DashboardLayout mounted, setting isClient to true')
    setIsClient(true)
  }, [])

  // Handle authentication state changes
  useEffect(() => {
    if (isClient && !isLoading && !user) {
      console.log('DashboardLayout: No user found, should redirect to login')
      setShouldRedirect(true)
    }
  }, [isClient, isLoading, user])

  // Handle redirect in a separate effect to avoid React state updates during render
  useEffect(() => {
    if (shouldRedirect) {
      window.location.href = "/login"
    }
  }, [shouldRedirect])

  // Show loading state while checking authentication
  if (isLoading || !isClient) {
    console.log('DashboardLayout: Showing loading state', { isLoading, isClient })
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render content if we should redirect
  if (!user) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  console.log('DashboardLayout: Rendering dashboard for user:', user.email)
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}

