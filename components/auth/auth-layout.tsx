import type React from "react"
import Link from "next/link"
import { DatabaseIcon } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background z-10" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] z-[1]" />
      </div>

      <header className="relative z-10 py-6 px-4 container mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <DatabaseIcon className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">DataX</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center relative z-10 px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="relative z-10 py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} DataX. All rights reserved.</p>
      </footer>
    </div>
  )
}

