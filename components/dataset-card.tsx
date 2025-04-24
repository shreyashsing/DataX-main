"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, Download, DollarSign, Calendar, User, BarChart2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Dataset } from "@/lib/types"

interface DatasetCardProps {
  dataset: Dataset
}

export default function DatasetCard({ dataset }: DatasetCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]
      const day = date.getDate()
      return `${month} ${day}, ${year}`
    } catch (error) {
      return dateString
    }
  }

  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <Card
        className="overflow-hidden h-full flex flex-col border-border/40 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardHeader className="p-0 overflow-hidden h-48 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
          <img
            src={dataset.previewImage || `/placeholder.svg?height=400&width=600`}
            alt={dataset.name}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: isHovered ? "scale(1.05)" : "scale(1)" }}
          />
          <div className="absolute top-2 right-2 z-20">
            <Badge variant={dataset.verified ? "default" : "secondary"} className="font-medium">
              {dataset.verified ? "Verified" : "Unverified"}
            </Badge>
          </div>
          <div className="absolute bottom-2 left-2 z-20 flex gap-2">
            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
              {dataset.category}
            </Badge>
            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
              {dataset.dataType}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg line-clamp-1">{dataset.name}</h3>
            <div className="flex items-center text-primary font-bold">
              <DollarSign className="h-4 w-4" />
              <span>{dataset.price}</span>
            </div>
          </div>

          <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{dataset.description}</p>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{dataset.owner}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(dataset.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{dataset.downloads} downloads</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart2 className="h-3 w-3" />
              <span>{dataset.size}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="w-10 p-0">
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Preview</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preview Dataset</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Link href={`/dataset/${dataset.id}`} className="flex-grow">
            <Button size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

