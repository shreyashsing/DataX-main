"use client"

import { notFound } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Download,
  ExternalLink,
  File,
  Users,
  Clock,
  BarChart4,
  Edit,
  Share2,
  Database,
  Tag,
  Info,
  FileJson,
  FileText,
  Calendar,
  Loader2,
  ChevronLeft,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"
import { SellDataset } from "@/components/dashboard/sell-dataset"

// Note: We can't use generateMetadata in client components
// Metadata is handled by a default title/description

export default function DatasetDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const [dataset, setDataset] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { toast } = useToast()
  
  // Format date function
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }
      return date.toLocaleDateString(undefined, options)
    } catch (error) {
      return dateString || 'Unknown date'
    }
  }
  
  // Format file size function
  const formatFileSize = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '0 Bytes'
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
  }

  // Fetch dataset data
  useEffect(() => {
    const fetchDataset = async () => {
      try {
        setLoading(true)
        const token = Cookies.get("auth-token")
        
        // Check if params.id is valid
        if (!params.id || params.id === 'undefined') {
          throw new Error("Invalid dataset ID")
        }
        
        const response = await fetch(`/api/datasets/${params.id}`, {
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch dataset')
        }
        
        const data = await response.json()
        setDataset(data)
      } catch (err: any) {
        setError(err.message)
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchDataset()
  }, [params.id, toast])
  
  // Handle download function
  const handleDownload = () => {
    toast({
      title: "Download started",
      description: "Your dataset is being prepared for download."
    })
    // Implement actual download logic here
    // Could use a fetch to an API endpoint that returns the dataset files
  }
  
  // Handle view on explorer function
  const handleViewOnExplorer = () => {
    if (!dataset?.tokenAddress) return

    const explorerUrl = dataset.networkExplorerUrl || "https://sepolia.etherscan.io"
    window.open(`${explorerUrl}/address/${dataset.tokenAddress}`, "_blank")
  }
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader
          title="Dataset Details"
          description="View and manage your dataset information"
        />
        
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading dataset...</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (error || !dataset) {
    return (
      <div className="flex flex-col min-h-screen">
        <DashboardHeader
          title="Dataset Details"
          description="View and manage your dataset information"
        />
        
        <div className="px-6 py-4 flex items-center border-b border-border/50">
          <Link href="/dashboard/datasets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Datasets
            </Button>
          </Link>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Dataset Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || "This dataset doesn't exist or you don't have permission to view it."}
            </p>
            <Button asChild>
              <Link href="/dashboard/datasets">Return to My Datasets</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Dataset Details"
        description="View and manage your dataset information"
      />
      
      <div className="px-6 py-4 flex items-center border-b border-border/50">
        <Link href="/dashboard/datasets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Datasets
          </Button>
        </Link>
      </div>

      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Dataset information */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="mb-2">{dataset.category || "Uncategorized"}</Badge>
                    <CardTitle className="text-2xl">{dataset.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {dataset.description || "No description available"}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="default" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="text-xs">Created</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatDate(dataset.createdAt)}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center text-muted-foreground mb-1">
                      <Database className="h-4 w-4 mr-1" />
                      <span className="text-xs">Size</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatFileSize(dataset.size || 0)}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center text-muted-foreground mb-1">
                      <Users className="h-4 w-4 mr-1" />
                      <span className="text-xs">Access</span>
                    </div>
                    <div className="text-sm font-medium">
                      {dataset.visibility === 'public' ? 'Public' : 'Private'}
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center text-muted-foreground mb-1">
                      <Tag className="h-4 w-4 mr-1" />
                      <span className="text-xs">Status</span>
                    </div>
                    <div className="text-sm font-medium">
                      {dataset.status || 'Active'}
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="schema">Schema</TabsTrigger>
                    <TabsTrigger value="usage">Usage & License</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground text-sm">
                        {dataset.description || "No description provided for this dataset."}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {dataset.tags && dataset.tags.length > 0 ? (
                          dataset.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="outline">{tag}</Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No tags specified</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Data Collection Methodology</h3>
                      <p className="text-muted-foreground text-sm">
                        {dataset.methodology || "No methodology information provided."}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="files" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-lg font-medium">Files</h3>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Download All
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {dataset.files && dataset.files.length > 0 ? (
                          dataset.files.map((file: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/40 rounded-md">
                              <div className="flex items-center">
                                <FileJson className="h-5 w-5 mr-2 text-blue-500" />
                                <div>
                                  <div className="font-medium">{file.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)} • {file.description || "Data file"}
                                  </div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <p>No files found in this dataset</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="schema" className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Data Schema</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {dataset.schemaDescription || "No schema information available for this dataset."}
                        </p>
                        
                        {dataset.schema ? (
                          <div className="rounded-md border p-4 space-y-4">
                            {Object.entries(dataset.schema).map(([table, fields]: [string, any], tableIndex: number) => (
                              <div key={tableIndex}>
                                {tableIndex > 0 && <Separator />}
                                <h4 className="font-medium text-primary">{table}</h4>
                                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                  {Object.entries(fields).map(([field, type]: [string, any], fieldIndex: number) => (
                                    <>
                                      <div className="text-muted-foreground">{field}</div>
                                      <div className="col-span-2">{type}</div>
                                    </>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <p>Detailed schema not available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="usage" className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Usage Terms</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {dataset.license ? `This dataset is licensed under ${dataset.license}:` : "This dataset is licensed under a custom license with the following terms:"}
                        </p>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          {dataset.terms ? (
                            dataset.terms.map((term: string, index: number) => (
                              <li key={index}>{term}</li>
                            ))
                          ) : (
                            <>
                              <li>For non-commercial research and educational purposes only</li>
                              <li>Attribution required for any publications using this data</li>
                              <li>No redistribution without explicit permission</li>
                              <li>No attempt should be made to re-identify individuals</li>
                            </>
                          )}
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">Citation Format</h3>
                        <div className="bg-muted/30 p-3 rounded-lg text-sm font-mono">
                          <p>{dataset.citation || `Author, A. (${new Date().getFullYear()}). ${dataset.name} [Data set]. DataX. https://datax.io/datasets/${params.id}`}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">Usage Analytics</h3>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Downloads</span>
                              <span className="font-medium">{dataset.downloads || 0}</span>
                            </div>
                            <Progress value={Math.min((dataset.downloads || 0) / 2, 100)} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Views</span>
                              <span className="font-medium">{dataset.views || 0}</span>
                            </div>
                            <Progress value={Math.min((dataset.views || 0) / 5, 100)} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Favorites</span>
                              <span className="font-medium">{dataset.favoriteCount || 0}</span>
                            </div>
                            <Progress value={Math.min((dataset.favoriteCount || 0) / 1, 100)} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Stats and metadata */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Dataset Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Download className="h-4 w-4 mr-2" />
                      <span>Downloads</span>
                    </div>
                    <span className="font-medium">{dataset.downloads || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      <span>Viewers</span>
                    </div>
                    <span className="font-medium">{dataset.views || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Last Updated</span>
                    </div>
                    <span className="font-medium">
                      {dataset.updatedAt ? formatDate(dataset.updatedAt) : 'Never'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-muted-foreground">
                      <File className="h-4 w-4 mr-2" />
                      <span>File Count</span>
                    </div>
                    <span className="font-medium">{dataset.files?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {dataset.tokenName && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>NFT Information</CardTitle>
                  <CardDescription>
                    This dataset has been tokenized as an NFT
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Token Name</div>
                      <div className="font-medium">{dataset.tokenName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Token Symbol</div>
                      <div className="font-medium">{dataset.tokenSymbol}</div>
                    </div>
                    {dataset.contractAddress && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Contract Address</div>
                        <div className="flex items-center">
                          <code className="text-xs bg-muted p-1 rounded font-mono truncate max-w-[180px]">
                            {dataset.contractAddress}
                          </code>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {dataset.ownerWallet && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Owner Wallet</div>
                        <div className="flex items-center">
                          <code className="text-xs bg-muted p-1 rounded font-mono truncate max-w-[180px]">
                            {dataset.ownerWallet}
                          </code>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <Button variant="outline" className="w-full" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Block Explorer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {!dataset.tokenName && !dataset.tokenSymbol && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Tokenize Dataset</CardTitle>
                  <CardDescription>
                    Create an NFT and token for this dataset
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      This dataset is not tokenized yet. Create an NFT and token to enable decentralized access control and monetization.
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        const url = `/dashboard/create-token?nftId=${params.id}&name=${encodeURIComponent(dataset.name)}&description=${encodeURIComponent(dataset.description || '')}&cid=${encodeURIComponent(dataset.cid || '')}`;
                        window.location.href = url;
                      }}
                    >
                      Create NFT & Token
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Dataset
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <BarChart4 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Metadata
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" size="sm">
                    <Info className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mt-6">
          <Button className="flex items-center" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Dataset
          </Button>
          
          {/* Add SellDataset component if NFT exists */}
          {dataset.nftId && (
            <SellDataset 
              datasetId={dataset._id}
              nftId={dataset.nftId}
              isOwner={true}
              alreadyListed={dataset.isListed}
              currentPrice={dataset.listingPrice}
            />
          )}
          
          {dataset.nftId && dataset.tokenAddress && (
            <Button variant="outline" onClick={handleViewOnExplorer}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Block Explorer
            </Button>
          )}
        </div>
      </main>
    </div>
  )
} 