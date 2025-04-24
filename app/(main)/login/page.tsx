import type { Metadata } from "next"
import LoginForm from "@/components/auth/login-form"
import AuthLayout from "@/components/auth/auth-layout"

export const metadata: Metadata = {
  title: "Login | DataX",
  description: "Login to your DataX account",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 py-32">
      <div className="max-w-md w-full">
        <LoginForm />
      </div>
    </main>
  )
} 