"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Download, Upload, Users, DollarSign, TrendingUp, Clock, Database as DatabaseIcon } from "lucide-react"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { DatasetChart, MonthlyData } from "@/components/dashboard/dataset-chart"

interface DashboardData {
  datasetStats: {
    totalDatasets: number
    totalDownloads: number
    averagePrice: number
  }
  transactionSummary: {
    totalRevenue: number
    totalExpenses: number
    transactionCount: number
    purchaseCount: number
  }
  monthlyStats: MonthlyData[]
  recentActivities: any[]
  topDatasets: any[]
}

export function DashboardOverview() {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // Get auth token from cookies
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='))
          ?.split('=')[1];
        
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch dashboard data');
        }
        
        const data = await response.json()
        setDashboardData(data)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  if (!user) return null
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6 bg-destructive/10 rounded-lg">
        <h3 className="text-lg font-medium">Error loading dashboard data</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }
  
  // Use default values if data isn't available yet
  const {
    datasetStats = { totalDatasets: 0, totalDownloads: 0, averagePrice: 0 },
    transactionSummary = { totalRevenue: 0 },
    monthlyStats = [],
    recentActivities = [],
    topDatasets = []
  } = dashboardData || {}

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datasetStats.totalDatasets}</div>
            <p className="text-xs text-muted-foreground">Your published datasets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${transactionSummary.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total earnings from datasets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datasetStats.totalDownloads}</div>
            <p className="text-xs text-muted-foreground">Total downloads across all datasets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${datasetStats.averagePrice?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">Average price of your datasets</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Dataset Performance</CardTitle>
                <CardDescription>Monthly downloads and revenue across your datasets</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <DatasetChart data={monthlyStats} />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest transactions and events</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity activities={recentActivities} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Content</CardTitle>
              <CardDescription>Detailed analytics will be displayed here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border border-dashed rounded-md">
                <p className="text-muted-foreground">Analytics dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports Content</CardTitle>
              <CardDescription>Generated reports will be displayed here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border border-dashed rounded-md">
                <p className="text-muted-foreground">Reports dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button className="w-full justify-start" variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload New Dataset
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Schedule Updates
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Top Performing Datasets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topDatasets.length > 0 ? (
                topDatasets.map((dataset) => (
                  <div
                    key={dataset._id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                        <DatabaseIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{dataset.name}</p>
                        <p className="text-xs text-muted-foreground">{dataset.downloads} downloads</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/dashboard/datasets/${dataset._id}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No datasets found</p>
                  <Button variant="link" asChild className="mt-2">
                    <a href="/dashboard/datasets/new">Upload your first dataset</a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

