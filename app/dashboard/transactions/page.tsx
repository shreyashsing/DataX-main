import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Transactions } from "@/components/dashboard/transactions"

export const metadata: Metadata = {
  title: "Transactions | DataX",
  description: "View your transaction history on DataX",
}

export default function TransactionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title="Transactions" description="View your purchase and sale history" />
      <main className="flex-1 p-6">
        <Transactions />
      </main>
    </div>
  )
}

