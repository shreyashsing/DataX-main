import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { AuthProvider } from "@/components/auth/auth-provider"
import { WalletProvider } from "@/components/wallet/wallet-provider"
import { usePathname } from "next/navigation"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} dark`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <WalletProvider>
              <div className="dark min-h-screen bg-background text-foreground">
                {/* Header rendered in individual layouts where needed */}
                {children}
              </div>
              <Toaster />
            </WalletProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

