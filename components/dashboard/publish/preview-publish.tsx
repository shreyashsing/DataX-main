"use client"

import { useState } from "react"
import type { DatasetFormData } from "@/app/dashboard/publish/page"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Tag, Info, Shield, Coins, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"

interface PreviewPublishProps {
  formData: DatasetFormData
  aiVerification: {
    missingValues: number
    anomaliesDetected: number
    biasScore: number
    piiDetected: boolean
    overallQuality: number
  }
  onPublish: () => void
}

export default function PreviewPublish({ formData, aiVerification, onPublish }: PreviewPublishProps) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)

  // Mock data for dataset preview
  const previewData = [
    { id: 1, name: "John Doe", age: 32, city: "New York", income: 75000 },
    { id: 2, name: "Jane Smith", age: 28, city: "San Francisco", income: 82000 },
    { id: 3, name: "Bob Johnson", age: 45, city: "Chicago", income: 65000 },
    { id: 4, name: "Alice Williams", age: 36, city: "Boston", income: 90000 },
    { id: 5, name: "Charlie Brown", age: 41, city: "Seattle", income: 78000 },
  ]

  const handlePublishClick = () => {
    setIsPublishing(true)
    setShowWalletModal(true)

    // Simulate wallet confirmation
    setTimeout(() => {
      setShowWalletModal(false)
      onPublish()
      setIsPublishing(false)
    }, 2000)
  }

  const formatPricingModel = () => {
    switch (formData.pricing.model) {
      case "free":
        return "Free"
      case "fixed":
        return `${formData.pricing.price} ${formData.pricing.token}`
      case "subscription":
        return `Subscription (${formData.pricing.tiers.basic}-${formData.pricing.tiers.enterprise} ${formData.pricing.token}/month)`
      default:
        return "Free"
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Preview & Publish</h2>
        <p className="text-muted-foreground mb-6">
          Review your dataset details before publishing to the marketplace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dataset Preview
          </h3>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(previewData[0]).map((key) => (
                    <TableHead key={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value, i) => (
                      <TableCell key={i}>{value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Showing 5 of {formData.file?.name ? "1,000+ rows" : "0 rows"} from your dataset.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Dataset Summary
          </h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">File</p>
              <p className="font-medium">{formData.file?.name || "No file uploaded"}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Size</p>
              <p className="font-medium">
                {formData.file ? `${(formData.file.size / (1024 * 1024)).toFixed(2)} MB` : "N/A"}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Quality Score</p>
              <div className="flex items-center gap-2">
                <span className="font-medium">{aiVerification.overallQuality}/100</span>
                {aiVerification.overallQuality > 80 ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Excellent
                  </Badge>
                ) : aiVerification.overallQuality > 60 ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                    Good
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    Needs Improvement
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Pricing</p>
              <p className="font-medium">{formatPricingModel()}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Visibility</p>
              <p className="font-medium capitalize">{formData.visibility}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dataset Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              Metadata
            </h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{formData.name || "Untitled Dataset"}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="line-clamp-3">{formData.description || "No description provided"}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p>{formData.category || "Uncategorized"}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.tags.length > 0 ? (
                    formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No tags</span>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">License</p>
                <p>{formData.license}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              Data Quality
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm">Missing Values</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{aiVerification.missingValues.toFixed(1)}%</span>
                  {aiVerification.missingValues < 5 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm">Anomalies</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{aiVerification.anomaliesDetected}</span>
                  {aiVerification.anomaliesDetected === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm">Bias Score</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{aiVerification.biasScore}/100</span>
                  {aiVerification.biasScore > 80 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm">PII Detection</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">
                    {aiVerification.piiDetected ? "Detected" : "None"}
                  </span>
                  {!aiVerification.piiDetected ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
            
            <h4 className="font-medium flex items-center gap-2 mt-6 mb-2">
              <Coins className="h-4 w-4 text-primary" />
              Pricing & Access
            </h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Pricing Model</p>
                <p className="font-medium capitalize">{formData.pricing.model}</p>
              </div>
              
              {formData.pricing.model === "fixed" && (
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">{formData.pricing.price} {formData.pricing.token}</p>
                </div>
              )}
              
              {formData.pricing.model === "subscription" && (
                <div>
                  <p className="text-sm text-muted-foreground">Subscription Tiers</p>
                  <p className="text-sm">Basic: {formData.pricing.tiers.basic} {formData.pricing.token}/month</p>
                  <p className="text-sm">Premium: {formData.pricing.tiers.premium} {formData.pricing.token}/month</p>
                  <p className="text-sm">Enterprise: {formData.pricing.tiers.enterprise} {formData.pricing.token}/month</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground">NFT Minting</p>
                <p>{formData.nftMint ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Separator />
      
      <div className="flex flex-col items-center justify-center py-4">
        <p className="text-center text-muted-foreground mb-4">
          By publishing this dataset, you confirm that you have the rights to distribute this data
          and agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a>.
        </p>
        
        <Button 
          size="lg" 
          onClick={handlePublishClick}
          disabled={isPublishing || !formData.file || !formData.name || !formData.description}
          className="min-w-[200px]"
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish Dataset"
          )}
        </Button>
      </div>

      {showWalletModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-[400px] p-6">
            <h3 className="text-lg font-semibold mb-4">Confirm Transaction</h3>
            <p className="mb-4">Please confirm the transaction in your wallet to publish your dataset.</p>
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Waiting for wallet confirmation...
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}

