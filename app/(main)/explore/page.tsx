"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  SlidersHorizontal, 
  X 
} from "lucide-react"
import DatasetCard from "@/components/dataset-card"
import { Dataset } from "@/lib/types"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

// Category options
const CATEGORIES = [
  "All Categories",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Social Media",
  "IoT",
  "Geospatial",
  "Transportation",
  "Text Analytics",
  "Manufacturing",
  "Market Research",
  "Environmental",
]

// Data type options
const DATA_TYPES = [
  "All Types",
  "Structured",
  "Unstructured",
  "Time Series",
  "Text",
  "Images",
  "Audio",
  "Video",
]

// Sort options
const SORT_OPTIONS = [
  { label: "Latest", value: "createdAt-desc" },
  { label: "Oldest", value: "createdAt-asc" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Most Downloaded", value: "downloads-desc" },
  { label: "Most Popular", value: "popularity-desc" },
]

export default function ExplorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    pages: 1,
  })

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [category, setCategory] = useState(searchParams.get("category") || "All Categories")
  const [dataType, setDataType] = useState(searchParams.get("dataType") || "All Types")
  const [verified, setVerified] = useState<boolean | undefined>(
    searchParams.has("verified") 
      ? searchParams.get("verified") === "true" 
      : undefined
  )
  const [sortOption, setSortOption] = useState(searchParams.get("sort") || "createdAt-desc")
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : 0,
    max: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : 1000,
  })

  // Derived values for API
  const currentPage = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1
  
  // Effect to load datasets based on filters
  useEffect(() => {
    fetchDatasets()
  }, [searchParams])

  // Function to fetch datasets
  const fetchDatasets = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      // Add pagination
      params.append("page", currentPage.toString())
      params.append("limit", pagination.limit.toString())
      
      // Add search query if present
      if (searchQuery) params.append("search", searchQuery)
      
      // Add category filter
      if (category && category !== "All Categories") params.append("category", category)
      
      // Add data type filter
      if (dataType && dataType !== "All Types") params.append("dataType", dataType)
      
      // Add verified filter
      if (verified !== undefined) params.append("verified", verified.toString())
      
      // Add sorting
      if (sortOption) {
        const [field, direction] = sortOption.split("-")
        params.append("sortBy", field)
        params.append("sortOrder", direction)
      }
      
      // Fetch data with explore page header
      const response = await fetch(`/api/datasets?${params.toString()}`, {
        headers: {
          "x-explore": "true"
        }
      })
      
      if (!response.ok) throw new Error("Failed to fetch datasets")
      
      const data = await response.json()
      setDatasets(data.datasets)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error fetching datasets:", error)
      // In case of error, try to load from mock data
      await loadMockDatasets()
    } finally {
      setLoading(false)
    }
  }

  // Fallback to load mock data
  const loadMockDatasets = async () => {
    try {
      // Import mock data
      const { mockDatasets } = await import("@/lib/mock-data")
      setDatasets(mockDatasets)
      setPagination({
        total: mockDatasets.length,
        page: 1,
        limit: 12,
        pages: Math.ceil(mockDatasets.length / 12),
      })
    } catch (error) {
      console.error("Error loading mock data:", error)
      setDatasets([])
    }
  }

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchQuery, page: "1" })
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setCategory("All Categories")
    setDataType("All Types")
    setVerified(undefined)
    setSortOption("createdAt-desc")
    setPriceRange({ min: 0, max: 1000 })
    updateFilters({ page: "1" }, true)
  }

  // Update URL with filters
  const updateFilters = (newParams: Record<string, string | undefined>, clearAll = false) => {
    const params = new URLSearchParams(clearAll ? "" : searchParams.toString())
    
    // Update or delete parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    
    // Build the new URL
    const newUrl = `/explore${params.toString() ? `?${params.toString()}` : ""}`
    router.push(newUrl)
  }

  // Apply filter changes
  const applyFilters = () => {
    const newParams: Record<string, string | undefined> = { page: "1" }
    
    if (searchQuery) newParams.search = searchQuery
    if (category !== "All Categories") newParams.category = category
    if (dataType !== "All Types") newParams.dataType = dataType
    if (verified !== undefined) newParams.verified = verified.toString()
    if (sortOption) newParams.sort = sortOption
    if (priceRange.min > 0) newParams.minPrice = priceRange.min.toString()
    if (priceRange.max < 1000) newParams.maxPrice = priceRange.max.toString()
    
    updateFilters(newParams)
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const { page, pages: totalPages } = pagination
    
    // Always show first page
    pages.push(1)
    
    // Calculate range around current page
    const start = Math.max(2, page - 2)
    const end = Math.min(totalPages - 1, page + 2)
    
    // Add ellipsis after first page if needed
    if (start > 2) pages.push(-1) // -1 represents ellipsis
    
    // Add range of pages
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    // Add ellipsis before last page if needed
    if (end < totalPages - 1) pages.push(-2) // -2 represents ellipsis
    
    // Add last page if there's more than one page
    if (totalPages > 1) pages.push(totalPages)
    
    return pages
  }

  return (
    <main className="pt-24 pb-16">
      <div className="container mx-auto py-8 px-4 sm:px-6">
        <div className="flex flex-col space-y-6">
          {/* Header Section */}
          <div className="flex flex-col space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Explore Datasets</h1>
            <p className="text-muted-foreground">
              Discover and purchase high-quality datasets for your AI and data science projects
            </p>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <form 
              className="flex-grow relative" 
              onSubmit={handleSearch}
            >
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search datasets..."
                className="pl-10 pr-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-12 top-0 h-10"
                  onClick={() => {
                    setSearchQuery("")
                    if (searchParams.has("search")) {
                      updateFilters({ search: undefined })
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
              <Button 
                type="submit" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-0 h-10"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </form>
            
            <div className="flex items-center gap-2">
              <Select
                value={sortOption}
                onValueChange={(value) => {
                  setSortOption(value)
                  updateFilters({ sort: value, page: "1" })
                }}
              >
                <SelectTrigger className="md:w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="sr-only">Filters</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Narrow down your search results
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-6 flex flex-col gap-6">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="category">
                        <AccordionTrigger>Categories</AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col gap-2 mt-2">
                            {CATEGORIES.map((cat) => (
                              <div key={cat} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`category-${cat}`} 
                                  checked={category === cat}
                                  onCheckedChange={() => setCategory(cat)}
                                />
                                <Label htmlFor={`category-${cat}`}>{cat}</Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="data-type">
                        <AccordionTrigger>Data Types</AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col gap-2 mt-2">
                            {DATA_TYPES.map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`type-${type}`} 
                                  checked={dataType === type}
                                  onCheckedChange={() => setDataType(type)}
                                />
                                <Label htmlFor={`type-${type}`}>{type}</Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="verification">
                        <AccordionTrigger>Verification</AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="verified-true" 
                                checked={verified === true}
                                onCheckedChange={() => setVerified(verified === true ? undefined : true)}
                              />
                              <Label htmlFor="verified-true">Verified Only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="verified-false" 
                                checked={verified === false}
                                onCheckedChange={() => setVerified(verified === false ? undefined : false)}
                              />
                              <Label htmlFor="verified-false">Unverified Only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="verified-any" 
                                checked={verified === undefined}
                                onCheckedChange={() => setVerified(undefined)}
                              />
                              <Label htmlFor="verified-any">Any</Label>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={clearFilters}>
                        Clear All
                      </Button>
                      <Button onClick={applyFilters}>
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          {/* Active Filters */}
          {(searchParams.toString() && (
            searchParams.has("search") || 
            searchParams.has("category") || 
            searchParams.has("dataType") || 
            searchParams.has("verified")
          )) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              
              {searchParams.has("search") && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Search: {searchParams.get("search")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => updateFilters({ search: undefined })}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove filter</span>
                  </Button>
                </Badge>
              )}
              
              {searchParams.has("category") && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Category: {searchParams.get("category")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => updateFilters({ category: undefined })}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove filter</span>
                  </Button>
                </Badge>
              )}
              
              {searchParams.has("dataType") && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>Type: {searchParams.get("dataType")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => updateFilters({ dataType: undefined })}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove filter</span>
                  </Button>
                </Badge>
              )}
              
              {searchParams.has("verified") && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>
                    {searchParams.get("verified") === "true" ? "Verified" : "Unverified"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => updateFilters({ verified: undefined })}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove filter</span>
                  </Button>
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={clearFilters}
              >
                Clear All
              </Button>
            </div>
          )}
          
          {/* Dataset Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-2">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))
            ) : datasets.length > 0 ? (
              datasets.map((dataset) => (
                <DatasetCard key={dataset.id || (dataset as any)._id} dataset={dataset} />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="text-center">
                  <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No datasets found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {!loading && datasets.length > 0 && pagination.pages > 1 && (
            <div className="flex items-center justify-center mt-8">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => updateFilters({ page: (currentPage - 1).toString() })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                
                {getPageNumbers().map((pageNum, i) => (
                  pageNum === -1 || pageNum === -2 ? (
                    <span key={`ellipsis-${i}`} className="px-2">...</span>
                  ) : (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="icon"
                      className="w-9 h-9"
                      onClick={() => updateFilters({ page: pageNum.toString() })}
                    >
                      {pageNum}
                    </Button>
                  )
                ))}
                
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === pagination.pages}
                  onClick={() => updateFilters({ page: (currentPage + 1).toString() })}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
} 