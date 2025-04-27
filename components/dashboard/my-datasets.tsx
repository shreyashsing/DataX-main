"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Edit, MoreHorizontal, Plus, Search, Star, Trash, Upload, Users, Clock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useWallet } from "@/components/wallet/wallet-provider"

// Sample purchased datasets as a fallback
const purchasedDatasets = [
  {
    id: "4",
    title: "Global Climate Patterns",
    description: "Comprehensive dataset of global climate measurements including temperature and precipitation.",
    category: "Environmental",
    price: "0.25",
    downloads: 2300,
    rating: 4.8,
    owner: "ClimateResearch Inc.",
    purchasedAt: "2023-01-15T00:00:00Z",
  },
  {
    id: "5",
    title: "Healthcare Outcomes",
    description: "Anonymized patient data showing treatment outcomes across various medical conditions.",
    category: "Healthcare",
    price: "1.2",
    downloads: 3500,
    rating: 4.9,
    owner: "MedData Solutions",
    purchasedAt: "2023-03-10T00:00:00Z",
  },
]

// Add ACCESS_DURATION_LABELS to the file
const ACCESS_DURATION_LABELS: Record<string, string> = {
  'forever': 'Forever',
  '1y': '1 Year',
  '6m': '6 Months',
  '1m': '1 Month',
  '1w': '1 Week',
  '1d': '24 Hours',
};

export function MyDatasets() {
  const [searchQuery, setSearchQuery] = useState("")
  const [myDatasets, setMyDatasets] = useState<any[]>([])
  const [draftDatasets, setDraftDatasets] = useState<any[]>([])
  const { walletState } = useWallet()

  // Load datasets from localStorage on component mount
  useEffect(() => {
    const loadPublishedDatasets = () => {
      try {
        const savedDatasetsJSON = localStorage.getItem('publishedDatasets');
        const savedDatasets = savedDatasetsJSON ? JSON.parse(savedDatasetsJSON) : [];
        
        // Filter by current wallet address if available
        const filteredDatasets = walletState.address 
          ? savedDatasets.filter((ds: any) => ds.owner === walletState.address)
          : savedDatasets;
          
        // Process datasets with minimal default values if missing
        const processedDatasets = filteredDatasets.map((ds: any) => ({
          ...ds,
          status: ds.status || "active",
          createdAt: ds.createdAt || new Date().toISOString(),
          // Only add rating as a default value if not present
          rating: ds.rating || (Math.random() * (5 - 3.5) + 3.5).toFixed(1)
        }));
        
        // Separate active and draft datasets
        setMyDatasets(processedDatasets.filter((ds: any) => ds.status === "active"));
        setDraftDatasets(processedDatasets.filter((ds: any) => ds.status === "draft"));
      } catch (error) {
        console.error("Error loading datasets from localStorage:", error);
        setMyDatasets([]);
        setDraftDatasets([]);
      }
    };

    loadPublishedDatasets();
    
    // Listen for storage events to update datasets when they change
    window.addEventListener('storage', loadPublishedDatasets);
    return () => {
      window.removeEventListener('storage', loadPublishedDatasets);
    };
  }, [walletState.address]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search datasets..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button asChild>
          <Link href="/dashboard/publish">
            <Upload className="mr-2 h-4 w-4" />
            Publish New Dataset
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="my-datasets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-datasets">My Datasets</TabsTrigger>
          <TabsTrigger value="purchased">Purchased</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value="my-datasets" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myDatasets.length > 0 ? (
              myDatasets
                .filter(
                  (dataset) =>
                    dataset.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    dataset.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((dataset) => (
                  <DatasetCard key={dataset.id || dataset.tokenId} dataset={dataset} type="owned" />
                ))
            ) : (
              <Card className="border-dashed col-span-3 flex flex-col items-center justify-center py-12">
                <CardContent className="flex flex-col items-center justify-center h-full py-6">
                  <p className="text-muted-foreground mb-4">No published datasets found</p>
                  <Button asChild>
                    <Link href="/dashboard/publish">
                      <Upload className="mr-2 h-4 w-4" />
                      Publish Your First Dataset
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-dashed flex flex-col items-center justify-center h-[350px]">
              <CardContent className="flex flex-col items-center justify-center h-full py-6">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Upload New Dataset</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Share your data with the community and start earning
                </p>
                <Button asChild>
                  <Link href="/dashboard/publish">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Dataset
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="purchased" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {purchasedDatasets
              .filter(
                (dataset) =>
                  dataset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  dataset.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} type="purchased" />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {draftDatasets.length > 0 ? (
              draftDatasets
                .filter(
                  (dataset) =>
                    dataset.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    dataset.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((dataset) => (
                  <DatasetCard key={dataset.id || dataset.tokenId} dataset={dataset} type="owned" />
                ))
            ) : (
              <Card className="border-dashed col-span-3 flex flex-col items-center justify-center py-12">
                <CardContent className="flex flex-col items-center justify-center h-full py-6">
                  <p className="text-muted-foreground mb-4">No draft datasets found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface DatasetCardProps {
  dataset: any
  type: "owned" | "purchased"
}

function DatasetCard({ dataset, type }: DatasetCardProps) {
  // Determine the price display based on pricing model
  const getPriceDisplay = () => {
    if (!dataset.pricing) return "Free";
    
    switch (dataset.pricing.model) {
      case 'free':
        return "Free";
      case 'fixed':
        return `${dataset.pricing.price} ${dataset.pricing.token}`;
      case 'subscription':
        return `From ${dataset.pricing.tiers?.basic || '10'} ${dataset.pricing.token}`;
      default:
        return dataset.price ? `${dataset.price} ${dataset.pricing?.token || 'OCEAN'}` : "Free";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {dataset.category || "Data"}
          </Badge>
          <div className="flex items-center text-yellow-500">
            <Star className="h-3 w-3 fill-current" />
            <span className="text-xs ml-1">{dataset.rating}</span>
          </div>
        </div>
        <CardTitle className="text-xl mt-2">{dataset.title || dataset.name}</CardTitle>
        {type === "purchased" && (
          <p className="text-xs text-muted-foreground">
            By <span className="text-primary">{dataset.owner}</span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{dataset.description}</p>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-muted/30 rounded-md p-2">
            <Download className="h-4 w-4 mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">{dataset.downloads || 0}</span>
          </div>
          <div className="bg-muted/30 rounded-md p-2">
            <Clock className="h-4 w-4 mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">{ACCESS_DURATION_LABELS[dataset.accessDuration || 'forever']}</span>
          </div>
          <div className="bg-muted/30 rounded-md p-2">
            <span className="text-xs font-medium">{getPriceDisplay()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border/50 pt-4">
        <Button size="sm" variant="outline">
          View Details
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            {type === "owned" && (
              <>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}

