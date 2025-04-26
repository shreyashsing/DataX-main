"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export interface MonthlyData {
  name: string
  downloads: number
  revenue: number
}

interface DatasetChartProps {
  data: MonthlyData[]
}

export function DatasetChart({ data = [] }: DatasetChartProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // If no data is provided, use empty placeholder data
  const chartData = data.length > 0
    ? data
    : Array(12).fill(0).map((_, i) => ({
        name: new Date(0, i).toLocaleString('default', { month: 'short' }),
        downloads: 0,
        revenue: 0
      }))

  if (!isMounted) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="downloads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Downloads" />
        <Bar dataKey="revenue" fill="hsl(var(--primary) / 0.3)" radius={[4, 4, 0, 0]} name="Revenue ($)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

