import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export const metadata: Metadata = {
  title: "Dashboard | DataX",
  description: "Manage your data assets and account on DataX",
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Dashboard" description="Overview of your data assets and activity" />
      <main className="flex-1 p-6">
        <DashboardOverview />
      </main>
    </div>
  )
}

