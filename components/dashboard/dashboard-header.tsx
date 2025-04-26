"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Bell, Upload } from "lucide-react"
import { WalletConnector } from "@/components/wallet/wallet-connector"
import { WalletProvider } from "@/components/wallet/wallet-provider"
import Link from "next/link"

interface DashboardHeaderProps {
  title: string
  description: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { user } = useAuth()

  if (!user) return null

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/publish">
              <Upload className="mr-2 h-4 w-4" />
              Publish Dataset
            </Link>
          </Button>
          <WalletProvider>
            <WalletConnector />
          </WalletProvider>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
          </Button>
          <UserNav />
        </div>
      </div>
    </header>
  )
}

