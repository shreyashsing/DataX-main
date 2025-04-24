import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Settings } from "@/components/dashboard/settings"

export const metadata: Metadata = {
  title: "Settings | DataX",
  description: "Manage your account settings on DataX",
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Settings" description="Manage your account preferences and profile" />
      <main className="flex-1 p-6">
        <Settings />
      </main>
    </div>
  )
}

