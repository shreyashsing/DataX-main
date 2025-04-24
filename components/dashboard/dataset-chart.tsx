"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Mock data for the chart
const mockData = [
  {
    name: "Jan",
    downloads: 120,
    revenue: 240,
  },
  {
    name: "Feb",
    downloads: 170,
    revenue: 320,
  },
  {
    name: "Mar",
    downloads: 210,
    revenue: 380,
  },
  {
    name: "Apr",
    downloads: 190,
    revenue: 350,
  },
  {
    name: "May",
    downloads: 230,
    revenue: 410,
  },
  {
    name: "Jun",
    downloads: 290,
    revenue: 520,
  },
]

export function DatasetChart() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={mockData}>
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

