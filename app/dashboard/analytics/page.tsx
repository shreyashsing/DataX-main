import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Analytics } from "@/components/dashboard/analytics"

export const metadata: Metadata = {
  title: "Analytics | DataX",
  description: "View analytics for your datasets on DataX",
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Analytics" description="Track performance and usage of your datasets" />
      <main className="flex-1 p-6">
        <Analytics />
      </main>
    </div>
  )
}

