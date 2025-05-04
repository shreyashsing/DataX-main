"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { LayoutDashboard, Database, BarChart, CreditCard, Settings, LogOut, Upload, Wallet } from "lucide-react"

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "My Datasets",
    href: "/dashboard/datasets",
    icon: <Database className="h-5 w-5" />,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart className="h-5 w-5" />,
  },
  {
    title: "Transactions",
    href: "/dashboard/transactions",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Token Fix Tool",
    href: "/token-fix",
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="w-64 border-r border-border bg-card/50 backdrop-blur-sm h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">DataNexus</span>
        </Link>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1 overflow-auto">
        {sidebarItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 font-normal",
                pathname === item.href && "bg-primary/10 text-primary hover:bg-primary/20",
              )}
            >
              {item.icon}
              {item.title}
            </Button>
          </Link>
        ))}

        <Link href="/dashboard/publish">
          <Button variant="default" className="w-full justify-start gap-2 mt-6">
            <Upload className="h-5 w-5" />
            Publish Dataset
          </Button>
        </Link>
      </div>

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => logout()}
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </Button>
      </div>
    </div>
  )
}

