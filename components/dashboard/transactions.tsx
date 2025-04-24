"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data for transactions
const transactions = [
  {
    id: "TX123456",
    date: "2023-06-15",
    description: "Purchase: Global Climate Patterns",
    amount: -25.0,
    status: "completed",
    type: "purchase",
  },
  {
    id: "TX123457",
    date: "2023-06-10",
    description: "Sale: Financial Market Trends",
    amount: 75.0,
    status: "completed",
    type: "sale",
  },
  {
    id: "TX123458",
    date: "2023-06-05",
    description: "Sale: Consumer Behavior Analytics",
    amount: 85.0,
    status: "completed",
    type: "sale",
  },
  {
    id: "TX123459",
    date: "2023-05-28",
    description: "Purchase: Healthcare Outcomes",
    amount: -120.0,
    status: "completed",
    type: "purchase",
  },
  {
    id: "TX123460",
    date: "2023-05-20",
    description: "Sale: Financial Market Trends",
    amount: 75.0,
    status: "completed",
    type: "sale",
  },
  {
    id: "TX123461",
    date: "2023-05-15",
    description: "Withdrawal to wallet",
    amount: -200.0,
    status: "completed",
    type: "withdrawal",
  },
  {
    id: "TX123462",
    date: "2023-05-10",
    description: "Deposit from wallet",
    amount: 300.0,
    status: "completed",
    type: "deposit",
  },
  {
    id: "TX123463",
    date: "2023-05-05",
    description: "Sale: Urban Transportation Flows",
    amount: 50.0,
    status: "pending",
    type: "sale",
  },
]

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredTransactions = transactions.filter((transaction) => {
    // Filter by search query
    if (searchQuery && !transaction.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Filter by status
    if (statusFilter !== "all" && transaction.status !== statusFilter) {
      return false
    }

    // Filter by type
    if (typeFilter !== "all" && transaction.type !== typeFilter) {
      return false
    }

    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search transactions..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="h-10 w-10">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={cn("font-medium", transaction.amount > 0 ? "text-green-500" : "text-red-500")}>
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount.toFixed(2)} OCEAN
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        transaction.status === "completed" && "bg-green-500/10 text-green-500 border-green-500/20",
                        transaction.status === "pending" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                        transaction.status === "failed" && "bg-red-500/10 text-red-500 border-red-500/20",
                      )}
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

