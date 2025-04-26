"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

export interface Activity {
  _id: string
  type: 'purchase' | 'download' | 'upload' | 'system'
  title: string
  description: string
  createdAt: string
  amount?: number
  positive?: boolean
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {activities.map((activity) => (
        <div key={activity._id} className="flex items-start gap-4">
          <Avatar className="h-9 w-9">
            <AvatarImage src="" alt="" />
            <AvatarFallback
              className={cn(
                "text-xs",
                activity.type === "purchase" && "bg-green-500/10 text-green-500",
                activity.type === "download" && "bg-blue-500/10 text-blue-500",
                activity.type === "upload" && "bg-purple-500/10 text-purple-500",
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
                  {activity.positive ? '+' : ''}{activity.amount.toFixed(2)}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{activity.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

