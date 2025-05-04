"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, AlertCircle, ShieldCheck, Key, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@/components/wallet/wallet-provider"
import { useAuth } from "@/components/auth/auth-provider"
import type { DatasetFormData } from "@/app/dashboard/publish/page"
import Cookies from "js-cookie"
import { WalletState } from '@/components/wallet/wallet-provider'
import { createTokenForNFT } from "@/lib/blockchain/clientSigner"
import PublishStepper from "@/components/dashboard/publish/publish-stepper"
import UploadDataset from "@/components/dashboard/publish/upload-dataset"
import MetadataInput from "@/components/dashboard/publish/metadata-input"
import DataQuality from "@/components/dashboard/publish/data-quality"
import PricingAccess from "@/components/dashboard/publish/pricing-access"

// Define types for token creation result
interface TokenResult {
  success: boolean;
  tokenAddress?: string;
  txHash?: string;
  error?: string;
  contractIssue?: boolean;
  recoverable?: boolean;
}

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
  const { user } = useAuth()
  const [isPublishing, setIsPublishing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'idle' | 'minting' | 'creating-token' | 'complete' | 'failed'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mintResult, setMintResult] = useState<any>(null)
  const [tokenResult, setTokenResult] = useState<TokenResult | null>(null)
  
  // Handler for token creation - updated with better error handling
  const handleTokenCreation = useCallback(async (nftId: string, tokenName: string, tokenSymbol: string): Promise<TokenResult> => {
    try {
      setCurrentStep('creating-token')
      
      // Call the createTokenForNFT function
      const result = await createTokenForNFT(nftId, tokenName, tokenSymbol)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create token')
      }
      
      console.log('Token created successfully:', result)
      setTokenResult(result)
      
      toast({
        title: "Token Created Successfully",
        description: `Token for NFT #${nftId} has been created`,
      })
      
      return result
    } catch (error: any) {
      console.error('Token creation error:', error)
      
      // Check for specific error types to provide better feedback
      let errorMessage = error.message || 'Failed to create token'
      let isContractIssue = false
      let isRecoverable = true
      
      // Check for contract not deployed or contract call errors
      if (errorMessage.includes('out-of-bounds') || 
          errorMessage.includes('not a contract') ||
          errorMessage.includes('BUFFER_OVERRUN')) {
        errorMessage = 'Contract error: The TokenFactory contract might not be properly deployed or the address is incorrect. The NFT was created successfully, but the token could not be linked.'
        isContractIssue = true
        
        // Log detailed error for debugging
        console.error('Contract interaction error details:', error)
      } else if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        errorMessage = 'Transaction was rejected by the user. You can try creating the token later from your dashboard.'
      } else if (errorMessage.includes('gas')) {
        errorMessage = 'Transaction failed due to gas estimation issues. You can try creating the token later with higher gas limits.'
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'Transaction nonce error. Please reset your wallet connection and try again later.'
      }
      
      toast({
        title: "Token Creation Warning",
        description: `NFT was minted but token creation failed: ${errorMessage}. You can create a token for this NFT later from your dashboard.`,
        variant: "destructive",
      })
      
      // Store information that allows recovery
      const errorResult: TokenResult = { 
        success: false, 
        error: errorMessage, 
        tokenAddress: undefined,
        contractIssue: isContractIssue,
        recoverable: isRecoverable
      }
      
      setTokenResult(errorResult)
      return errorResult
    }
  }, [toast, setCurrentStep, setTokenResult])
  
  // Main publish handler
  const handlePublish = async () => {
    if (!walletState.address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to publish this dataset",
        variant: "destructive",
      })
      return
    }

    setIsPublishing(true)
    setErrorMessage(null)
    
    try {
      // If NFT minting is enabled, proceed with minting
      if (formData.nftMint) {
        setCurrentStep('minting')

        // Prepare token details based on pricing model
        const tokenName = `DT-${formData.name.substring(0, 10)}`.replace(/\s+/g, '')
        const tokenSymbol = tokenName.substring(0, 5).toUpperCase()
        
        // Generate a hash for the dataset - use a more reliable hash format
        const datasetCID = `ipfs://QmDataset${Math.floor(Math.random() * 10000)}` // Simulated CID
        
        // Call minting API with complete payload
        const mintResponse = await fetch('/api/mint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: walletState.address,
            tokenName,
            tokenSymbol,
            datasetCID,
            // Generate a bytes32 compatible hash directly instead of UUID
            datasetHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
          }),
        })

        const mintData = await mintResponse.json()
        console.log('Mint API response:', mintData)
        
        if (!mintResponse.ok) {
          throw new Error(mintData.error || mintData.message || 'Minting failed')
        }

        setMintResult(mintData)
        
        // Automatically create token for the minted NFT
        const tokenData = await handleTokenCreation(mintData.tokenId, tokenName, tokenSymbol)
        
        // Save the dataset to localStorage with updated schema
        const datasetToSave = {
          id: mintData.tokenId,
          tokenId: mintData.tokenId,
          datatokenAddress: tokenData.success && tokenData.tokenAddress ? tokenData.tokenAddress : null,
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

        // Get auth token for authenticated request
        const token = Cookies.get("auth-token");
        if (!token) {
          throw new Error('Authentication token not found. Please log in again.');
        }
        
        // Create active dataset directly
        console.log('Creating new active dataset directly');
        
        const saveResponse = await fetch('/api/datasets', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            walletAddress: walletState.address,
            verificationData: aiVerification,
            verified: aiVerification?.isVerified || false,
            createdAt: new Date().toISOString(),
            tokenId: mintData.tokenId,
            datatokenAddress: tokenData.success && tokenData.tokenAddress ? tokenData.tokenAddress : null,
            tokenName,
            tokenSymbol,
            status: 'active'
          })
        });
        
        if (!saveResponse.ok) {
          const errorData = await saveResponse.json();
          console.error('Dataset save error:', errorData);
          throw new Error(errorData.error || 'Failed to save dataset to the database');
        }
        
        const saveResult = await saveResponse.json();
        console.log('Dataset saved successfully:', saveResult);

        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Unknown error while saving dataset');
        }

        console.log('Publishing dataset with verification status:', aiVerification?.isVerified);
      }

      setCurrentStep('complete')
      toast({
        title: "Dataset Published Successfully!",
        description: "Your dataset is now available on the marketplace.",
      })

      // Call the onPublish callback
      if (onPublish) {
        onPublish();
      }

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
            <div className={`p-3 rounded-full ${aiVerification.isVerified ? 'bg-green-100' : 'bg-amber-100'}`}>
              {aiVerification.isVerified ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-amber-600" />
              )}
            </div>
            <div className="ml-4">
              {aiVerification.isVerified ? (
                <>
                  <h3 className="font-medium text-green-600">Dataset Verified</h3>
                  <p className="text-sm text-muted-foreground">Your dataset has passed our verification checks.</p>
                </>
              ) : (
                <>
                  <h3 className="font-medium text-amber-600">Verification Issues</h3>
                  <p className="text-sm text-muted-foreground">Your dataset has some quality issues but can still be published.</p>
                </>
              )}
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
      case 'creating-token':
        return (
          <div className="flex items-center justify-center my-6">
            <div className="bg-primary/10 p-3 rounded-full">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium">Creating Token</h3>
              <p className="text-sm text-muted-foreground">Creating token for the minted NFT...</p>
            </div>
          </div>
        )
      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center my-6">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-3 text-center">
              <h3 className="font-medium text-green-600">Publication Complete</h3>
              <p className="text-sm text-muted-foreground mb-2">Your dataset is now available on the marketplace!</p>
              
              {mintResult && (
                <div className="mt-3 border border-green-200 rounded-md p-3 bg-green-50 text-left max-w-sm mx-auto">
                  <h4 className="text-sm font-medium text-green-700 mb-2">Blockchain Assets Created:</h4>
                  <div className="grid gap-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NFT ID:</span>
                      <span className="font-mono font-medium">{mintResult.tokenId}</span>
                    </div>
                    
                    {tokenResult && tokenResult.success && tokenResult.tokenAddress && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token Address:</span>
                        <span className="font-mono font-medium truncate max-w-[150px]">
                          {tokenResult.tokenAddress.substring(0, 10)}...{tokenResult.tokenAddress.substring(tokenResult.tokenAddress.length - 8)}
                        </span>
                      </div>
                    )}
                    
                    {(!tokenResult || !tokenResult.success) && (
                      <div className="mt-1 text-xs text-amber-600">
                        {tokenResult && tokenResult.contractIssue ? (
                          <>
                            <p className="font-medium mb-1">Contract Deployment Issue</p>
                            <p>The NFT was created successfully, but the token could not be created due to a contract deployment issue.</p>
                            <p className="mt-1">You can retry token creation from the dataset details page when the contracts are properly deployed.</p>
                          </>
                        ) : (
                          <>Note: Token creation was not completed. You can create the token later from the dataset details page.</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
      default:
        return null;
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

