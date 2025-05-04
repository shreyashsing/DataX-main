"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Star, Users, BarChart3, ArrowUpRight } from "lucide-react"

const datasets = [
  {
    title: "Global Climate Patterns",
    category: "Environmental",
    price: "0.25 ETH",
    downloads: "2.3k",
    rating: 4.8,
    users: 156,
    growth: "+12%",
  },
  {
    title: "Consumer Behavior Analytics",
    category: "Market Research",
    price: "0.75 ETH",
    downloads: "1.8k",
    rating: 4.6,
    users: 98,
    growth: "+24%",
  },
  {
    title: "Healthcare Outcomes",
    category: "Medical",
    price: "1.2 ETH",
    downloads: "3.5k",
    rating: 4.9,
    users: 210,
    growth: "+8%",
  },
]

export default function Marketplace() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [100, -100])

  return (
    <section id="marketplace" className="py-24 relative overflow-hidden" ref={containerRef}>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background z-0" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px] z-[1]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Explore the Marketplace</h2>
          <p className="text-muted-foreground text-lg">
            Discover high-quality datasets from trusted providers across various industries and domains.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {dataset.category}
                    </Badge>
                    <div className="flex items-center text-yellow-500">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-xs ml-1">{dataset.rating}</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-2">{dataset.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 rounded-md bg-muted/50 flex items-center justify-center mb-4">
                    <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-muted/30 rounded-md p-2">
                      <Download className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">{dataset.downloads}</span>
                    </div>
                    <div className="bg-muted/30 rounded-md p-2">
                      <Users className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">{dataset.users}</span>
                    </div>
                    <div className="bg-muted/30 rounded-md p-2">
                      <ArrowUpRight className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">{dataset.growth}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t border-border/50 pt-4">
                  <span className="font-medium">{dataset.price}</span>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button size="lg" variant="outline" className="mx-auto">
            View All Datasets
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

