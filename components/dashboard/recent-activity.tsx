"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const activities = [
  {
    id: 1,
    type: "purchase",
    title: "Dataset Purchased",
    description: "Someone purchased your 'Financial Market Trends' dataset",
    timestamp: "2 hours ago",
    amount: "+$75.00",
    positive: true,
  },
  {
    id: 2,
    type: "download",
    title: "Dataset Downloaded",
    description: "Your 'Consumer Behavior Analytics' was downloaded",
    timestamp: "5 hours ago",
    amount: null,
  },
  {
    id: 3,
    type: "purchase",
    title: "Dataset Purchased",
    description: "You purchased 'Global Climate Patterns' dataset",
    timestamp: "1 day ago",
    amount: "-$25.00",
    positive: false,
  },
  {
    id: 4,
    type: "system",
    title: "System Update",
    description: "Your dataset was updated to comply with new standards",
    timestamp: "2 days ago",
    amount: null,
  },
]

export function RecentActivity() {
  return (
    <div className="space-y-8">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4">
          <Avatar className="h-9 w-9">
            <AvatarImage src="" alt="" />
            <AvatarFallback
              className={cn(
                "text-xs",
                activity.type === "purchase" && "bg-green-500/10 text-green-500",
                activity.type === "download" && "bg-blue-500/10 text-blue-500",
                activity.type === "system" && "bg-orange-500/10 text-orange-500",
              )}
            >
              {activity.type.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">{activity.title}</p>
              {activity.amount && (
                <p className={cn("text-sm font-medium", activity.positive ? "text-green-500" : "text-red-500")}>
                  {activity.amount}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{activity.description}</p>
            <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

