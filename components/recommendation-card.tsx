"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Sparkles, DollarSign, Tag, ThumbsUp } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Dataset } from "@/lib/types"

interface RecommendationCardProps {
  dataset: Dataset
}

export default function RecommendationCard({ dataset }: RecommendationCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Determine the price display based on pricing model
  const getPriceDisplay = () => {
    if (!dataset.pricing) {
      return dataset.price === 0 || dataset.price === undefined ? "Free" : `${dataset.price} ETH`;
    }
    
    switch (dataset.pricing.model) {
      case 'free':
        return "Free";
      case 'fixed':
        return `${dataset.pricing.price} ${dataset.pricing.token || 'ETH'}`;
      case 'subscription':
        return `From ${dataset.pricing.tiers?.basic || '10'} ${dataset.pricing.token || 'ETH'}`;
      default:
        return dataset.price ? `${dataset.price} ${dataset.pricing?.token || 'ETH'}` : "Free";
    }
  };

  // Ensure values are defined to prevent hydration errors
  const recommendationReason = dataset.recommendationReason || "This dataset matches your previous interests and has high quality metrics."
  const matchScore = dataset.matchScore || "98"

  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <Card
        className="overflow-hidden h-full flex flex-col border-primary/20 bg-card/80 backdrop-blur-sm hover:border-primary/40 transition-all duration-300"
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
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
            <Badge className="bg-primary text-primary-foreground font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Recommended
            </Badge>
          </div>
          <div className="absolute bottom-2 left-2 z-20">
            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
              {dataset.category}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg line-clamp-1">{dataset.name}</h3>
            <div className="flex items-center text-primary font-bold">
              <span>{getPriceDisplay()}</span>
            </div>
          </div>

          <p className="text-muted-foreground text-sm line-clamp-2 mb-2">{dataset.description}</p>

          <div className="bg-primary/10 rounded-lg p-2 text-sm mb-2">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-xs">
                <span className="font-medium text-primary">Why we recommend this:</span>{" "}
                {recommendationReason}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              <span>{matchScore}% match</span>
            </div>
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>{dataset.dataType}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          {(dataset.id || dataset._id) ? (
            <Link href={`/dataset/${dataset.id || dataset._id}`} className="w-full">
              <Button size="sm" className="w-full">
                View Details
              </Button>
            </Link>
          ) : (
            <Button size="sm" className="w-full" disabled>
              View Details
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

