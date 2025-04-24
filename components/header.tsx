"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Database, Menu, X } from "lucide-react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useAuth } from "@/components/auth/auth-provider"
import { UserNav } from "./user-nav"

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { scrollY } = useScroll()
  const { user } = useAuth()

  const backgroundColor = useTransform(scrollY, [0, 50], ["rgba(9, 9, 11, 0)", "rgba(9, 9, 11, 0.8)"])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm transition-all duration-300 ${
        isScrolled ? "py-2" : "py-4"
      }`}
      style={{ backgroundColor }}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">DataX</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <nav className="flex gap-6">
            <Link href="#features" className="text-sm hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link href="#marketplace" className="text-sm hover:text-primary transition-colors">
              Marketplace
            </Link>
            <Link href="#testimonials" className="text-sm hover:text-primary transition-colors">
              Testimonials
            </Link>
          </nav>

          <div className="flex gap-3">
            {user ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <UserNav />
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <motion.div
          className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link
              href="#features"
              className="py-2 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="py-2 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#marketplace"
              className="py-2 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Marketplace
            </Link>
            <Link
              href="#testimonials"
              className="py-2 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Testimonials
            </Link>
            <div className="flex flex-col gap-2 pt-2">
              {user ? (
                <>
                  <Button variant="outline" className="w-full justify-center" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full justify-center"
                    onClick={() => {
                      setIsOpen(false)
                      // We don't call logout directly here because we need to use the useAuth hook outside this component
                    }}
                    asChild
                  >
                    <Link href="/profile">Profile</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full justify-center" asChild>
                    <Link href="/login">Log In</Link>
                  </Button>
                  <Button className="w-full justify-center" asChild>
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </motion.div>
      )}
    </motion.header>
  )
}

