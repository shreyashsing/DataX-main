"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, AlertCircle, ShieldCheck, Key, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/components/wallet/wallet-provider"
import type { DatasetFormData } from "@/app/dashboard/publish/page"

interface PreviewPublishProps {
  formData: DatasetFormData
  aiVerification: any
  onPublish: () => void
}

type AccessDurationKey = 'forever' | '1y' | '6m' | '1m' | '1w' | '1d';

const ACCESS_DURATION_LABELS: Record<AccessDurationKey, string> = {
  'forever': 'Forever (Permanent Access)',
  '1y': '1 Year',
  '6m': '6 Months',
  '1m': '1 Month',
  '1w': '1 Week',
  '1d': '24 Hours',
};

export default function PreviewPublish({ formData, aiVerification, onPublish }: PreviewPublishProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { walletState } = useWallet()
  const [isPublishing, setIsPublishing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'idle' | 'minting' | 'complete' | 'failed'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mintResult, setMintResult] = useState<any>(null)

  const handlePublish = async () => {
    if (!walletState.isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to publish your dataset",
        variant: "destructive",
      })
      return
    }

    try {
      setIsPublishing(true)
      setErrorMessage(null)

      // Skip verification as it's already been performed in the Data Quality step
      
      // If NFT minting is enabled, proceed with minting
      if (formData.nftMint) {
        setCurrentStep('minting')

        // Prepare token details based on pricing model
        const tokenName = `DT-${formData.name.substring(0, 10)}`.replace(/\s+/g, '')
        const tokenSymbol = tokenName.substring(0, 5).toUpperCase()
        
        // Call minting API with simplified payload
        const mintResponse = await fetch('/api/mint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: walletState.address,
            tokenName,
            tokenSymbol
          }),
        })

        const mintData = await mintResponse.json()
        
        if (!mintResponse.ok) {
          throw new Error(mintData.error || mintData.message || 'Minting failed')
        }

        setMintResult(mintData)
        
        // Save the dataset to localStorage with updated schema
        const datasetToSave = {
          id: mintData.tokenId,
          tokenId: mintData.tokenId,
          datatokenAddress: mintData.datatokenAddress,
          tokenName,
          tokenSymbol,
          name: formData.name,
          title: formData.name,
          description: formData.description,
          category: formData.category || "General",
          accessDuration: formData.accessDuration || "forever",
          tags: formData.tags,
          pricing: formData.pricing,
          downloads: 0,
          rating: (Math.random() * (5 - 4) + 4).toFixed(1),
          owner: walletState.address,
          status: "active",
          createdAt: new Date().toISOString(),
          verificationData: aiVerification
        };
        
        // Get existing datasets or initialize empty array
        const existingDatasetsJSON = localStorage.getItem('publishedDatasets');
        const existingDatasets = existingDatasetsJSON ? JSON.parse(existingDatasetsJSON) : [];
        
        // Add new dataset and save back to localStorage
        existingDatasets.push(datasetToSave);
        localStorage.setItem('publishedDatasets', JSON.stringify(existingDatasets));
        
        // Trigger storage event for other components to update
        window.dispatchEvent(new Event('storage'));
      }

      setCurrentStep('complete')
      toast({
        title: "Dataset Published Successfully!",
        description: "Your dataset is now available on the marketplace.",
      })

      // Call the onPublish callback
      onPublish()

      // Redirect to the dataset page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/datasets')
      }, 2000)
    } catch (error) {
      console.error('Publication error:', error)
      setCurrentStep('failed')
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
      
      toast({
        title: "Publication Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const renderStatusIndicator = () => {
    switch (currentStep) {
      case 'idle':
        return (
          <div className="flex items-center justify-center my-6">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-green-600">Dataset Verified</h3>
              <p className="text-sm text-muted-foreground">Your dataset has passed our verification checks.</p>
            </div>
          </div>
        )
      case 'minting':
        return (
          <div className="flex items-center justify-center my-6">
            <div className="bg-primary/10 p-3 rounded-full">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium">Minting NFT</h3>
              <p className="text-sm text-muted-foreground">Creating your DataNFT and Datatoken...</p>
            </div>
          </div>
        )
      case 'complete':
        return (
          <div className="flex items-center justify-center my-6">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-green-600">Publication Complete</h3>
              <p className="text-sm text-muted-foreground">Your dataset is now available on the marketplace!</p>
              {mintResult && (
                <p className="text-xs text-primary mt-1">Token ID: {mintResult.tokenId}</p>
              )}
            </div>
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center justify-center my-6">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-red-600">Publication Failed</h3>
              <p className="text-sm text-muted-foreground">{errorMessage || "An error occurred during publication."}</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Preview & Publish</h2>
        <p className="text-muted-foreground mb-6">
          Review your dataset details before publishing to the marketplace.
        </p>
      </div>

      {renderStatusIndicator()}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Dataset Details</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm">Name</h4>
              <p>{formData.name}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">Description</h4>
              <p className="text-sm text-muted-foreground">{formData.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">File</h4>
              <p className="text-sm">{formData.file?.name} ({formData.file?.size ? Math.round(formData.file.size / 1024) + ' KB' : ''})</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">Tags</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm">Category</h4>
                <p className="text-sm">{formData.category}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm">Access Duration</h4>
                <p className="text-sm">{ACCESS_DURATION_LABELS[formData.accessDuration as AccessDurationKey] || 'Forever'}</p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Publishing Settings</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm">Access Duration</h4>
              <p className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {ACCESS_DURATION_LABELS[formData.accessDuration as AccessDurationKey] || 'Forever'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Time period buyers can download after purchase
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">Pricing Model</h4>
              <p className="text-sm">
                {formData.pricing.model === 'free' ? 'Free access' : 
                 formData.pricing.model === 'fixed' ? `Fixed price (${formData.pricing.price} ${formData.pricing.token})` : 
                 'Subscription tiers'}
              </p>
              
              {formData.pricing.model === 'subscription' && (
                <div className="mt-2 space-y-2 text-xs">
                  <p>Basic: {formData.pricing.tiers.basic} {formData.pricing.token}</p>
                  <p>Premium: {formData.pricing.tiers.premium} {formData.pricing.token}</p>
                  <p>Enterprise: {formData.pricing.tiers.enterprise} {formData.pricing.token}</p>
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-medium text-sm">NFT Minting</h4>
              <div className="flex items-center mt-1">
                {formData.nftMint ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">Create NFT and Datatokens</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-sm">No NFT will be created</span>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">Connected Wallet</h4>
              {walletState.isConnected ? (
                <p className="text-sm font-mono">{walletState.address?.substring(0, 8)}...{walletState.address?.substring(walletState.address.length - 6)}</p>
              ) : (
                <p className="text-sm text-yellow-600">No wallet connected</p>
              )}
            </div>

            <div>
              <h4 className="font-medium text-sm">AI Verification</h4>
              <div className="mt-2 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                <div className="flex justify-between">
                  <span>Quality Score:</span>
                  <span className="font-medium">{aiVerification.overallQuality}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Bias Score:</span>
                  <span className="font-medium">{aiVerification.biasScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Missing Values:</span>
                  <span className="font-medium">{aiVerification.missingValues}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Anomalies:</span>
                  <span className="font-medium">{aiVerification.anomaliesDetected}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span>PII Detection:</span>
                  <span className={`font-medium ${aiVerification.piiDetected ? 'text-red-500' : 'text-green-500'}`}>
                    {aiVerification.piiDetected ? 'Detected' : 'None detected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {currentStep === 'idle' && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing || !walletState.isConnected}
            className="w-full md:w-auto"
          >
            {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {walletState.isConnected ? 'Publish Dataset' : 'Connect Wallet to Publish'}
          </Button>
        </div>
      )}

      {(currentStep === 'complete' || currentStep === 'failed') && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={() => router.push('/dashboard/datasets')}
            variant={currentStep === 'failed' ? 'outline' : 'default'}
            className="w-full md:w-auto"
          >
            {currentStep === 'failed' ? 'Return to Dashboard' : 'View My Datasets'}
          </Button>
        </div>
      )}
    </div>
  )
}

