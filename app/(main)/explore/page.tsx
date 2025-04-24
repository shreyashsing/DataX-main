"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export default function ExplorePage() {
  return (
    <main className="pt-24 pb-16">
      <div className="container mx-auto py-8 px-4 sm:px-6">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Explore Datasets</h1>
            <p className="text-muted-foreground">
              Discover and purchase high-quality datasets for your AI and data science projects
            </p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search datasets..."
              className="pl-10"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border rounded-lg p-4 bg-card">
                <h3 className="text-lg font-medium">Sample Dataset {i}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  This is a sample dataset description for the explore page.
                </p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="font-medium">${Math.floor(Math.random() * 300) + 50}</span>
                  <Button size="sm">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
} 