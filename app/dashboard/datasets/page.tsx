import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MyDatasets } from "@/components/dashboard/my-datasets"

export const metadata: Metadata = {
  title: "My Datasets | DataX",
  description: "Manage your datasets on DataX",
}

export default function DatasetsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="My Datasets" description="Manage your uploaded and purchased datasets" />
      <main className="flex-1 p-6">
        <MyDatasets />
      </main>
    </div>
  )
}

