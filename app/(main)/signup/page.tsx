import type { Metadata } from "next"
import SignupForm from "@/components/auth/signup-form"

export const metadata: Metadata = {
  title: "Sign Up | DataX",
  description: "Create a new DataX account",
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 py-32">
      <div className="max-w-md w-full">
        <SignupForm />
      </div>
    </main>
  )
} 