"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useWallet } from "@/components/wallet/wallet-provider"
import { ethers } from "ethers"
import { getConfig } from "@/lib/contracts/config"
import { DataNFTAbi } from "@/lib/contracts/abis/DataNFTAbi"
// @ts-ignore - MarketplaceAbi exists but TypeScript can't find type definitions
import { MarketplaceAbi } from "@/lib/contracts/abis/MarketplaceAbi"
// @ts-ignore - ERC20Abi exists but TypeScript can't find type definitions
import { ERC20Abi } from "@/lib/contracts/abis/ERC20Abi"
import Cookies from 'js-cookie'

import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  ExternalLink, 
  FileText, 
  Info, 
  Share2, 
  Shield, 
  ShoppingCart, 
  Tag, 
  User 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

const getToken = () => {
  // Try to get token from js-cookie
  const cookieToken = Cookies.get('auth-token');
  if (cookieToken) return cookieToken;
    
  // Fallback to document.cookie parsing if available
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
    return match ? match[2] : '';
  }
  
  return '';
};

export default function DatasetPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { walletState, selectedChain } = useWallet()
  const { isConnected, address } = walletState
  const chain = selectedChain
  
  const [dataset, setDataset] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [nftInfo, setNftInfo] = useState<any>(null)
  const [purchaseState, setPurchaseState] = useState<'idle' | 'loading' | 'tokenApproval' | 'confirmPurchase' | 'purchasing' | 'success' | 'completed' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchDataset(id)
    } else {
      setLoading(false)
      setError("Dataset ID is missing or invalid")
    }
  }, [id])

  // Fetch blockchain data when dataset is loaded and wallet is connected
  useEffect(() => {
    if (dataset?.nftId && isConnected) {
      fetchBlockchainInfo(dataset.nftId)
    }
  }, [dataset, isConnected, address])

  const fetchDataset = async (datasetId: string) => {
    setLoading(true)
    try {
      if (!datasetId || datasetId === 'undefined') {
        throw new Error("Invalid dataset ID")
      }
      
      const response = await fetch(`/api/datasets/${datasetId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dataset: ${response.statusText}`)
      }
      
      const data = await response.json()
      setDataset(data)
    } catch (error) {
      console.error("Error fetching dataset:", error)
      setError("Failed to load dataset details")
    } finally {
      setLoading(false)
    }
  }

  const fetchBlockchainInfo = async (nftId: string) => {
    try {
      const networkConfig = getConfig(selectedChain?.id || 1337)
      
      // Create provider
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      
      // Create contract instances
      const dataNFT = new ethers.Contract(
        networkConfig.dataNFTAddress,
        DataNFTAbi,
        provider
      )
      
      const marketplace = new ethers.Contract(
        networkConfig.marketplaceAddress,
        MarketplaceAbi,
        provider
      )
      
      // Fetch NFT details
      const owner = await dataNFT.ownerOf(nftId)
      const tokenAddress = await dataNFT.getDatatoken(nftId)
      const datasetCID = await dataNFT.datasetCIDs(nftId)
      
      // Fetch marketplace listing
      const [listing, listingCid] = await marketplace.getDataset(nftId)
      
      // Format the NFT info
      setNftInfo({
        nftId,
        owner,
        tokenAddress,
        datasetCID,
        isOwner: owner.toLowerCase() === address?.toLowerCase(),
        listing: {
          id: listing.id.toString(),
          price: ethers.utils.formatEther(listing.price),
          isForSale: listing.isForSale,
          owner: listing.owner
        },
        listingCid
      })
      
    } catch (error) {
      console.error("Error fetching blockchain info:", error)
      // Don't set error state here, as it might be that the NFT doesn't exist yet
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date)
    } catch (error) {
      return dateString
    }
  }

  // View transaction on block explorer
  const viewOnBlockExplorer = () => {
    if (!nftInfo?.nftId) return
    
    const networkConfig = getConfig(selectedChain?.id || 1337)
    const explorerUrl = networkConfig.explorerUrl || "https://sepolia.etherscan.io" 
    const marketplaceAddress = networkConfig.marketplaceAddress
    window.open(`${explorerUrl}/address/${marketplaceAddress}`, "_blank")
  }
  
  // Handle dataset download
  const handleDownload = async () => {
    if (!dataset) return
    
    // If user isn't the owner and hasn't purchased, show error
    if (!nftInfo?.isOwner && purchaseState !== 'success') {
      toast.error("You must purchase this dataset to download it")
      return
    }
    
    toast.success("Preparing dataset for download...", {
      duration: 3000,
    })
    
    try {
      // Call API to get download URL or data
      const response = await fetch(`/api/datasets/${id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'X-Wallet-Address': address || ''
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to download dataset")
      }
      
      const data = await response.json()
      
      // Create a download link for the dataset
      if (data.downloadUrl) {
        // Open download URL in new tab
        window.open(data.downloadUrl, '_blank')
      } else if (data.fileContent) {
        // Create blob and download it
        const blob = new Blob([data.fileContent], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${dataset.name}.zip`
        document.body.appendChild(a)
        a.click()
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
      
      toast.success("Download successful!")
    } catch (error: any) {
      console.error("Download error:", error)
      toast.error(error.message || "Failed to download dataset")
    }
  }

  const handlePurchaseClick = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet to purchase this dataset")
      return
    }
    
    setPurchaseState('loading')
    console.log("Starting purchase flow for dataset:", dataset)
    console.log("Dataset tokenization details:", {
      nftId: dataset?.nftId,
      tokenId: dataset?.tokenId, 
      tokenAddress: dataset?.datatokenAddress, 
      tokenName: dataset?.tokenName,
      tokenSymbol: dataset?.tokenSymbol,
      isTokenized: Boolean(dataset?.nftId || dataset?.tokenId) && Boolean(dataset?.datatokenAddress)
    })
    
    try {
      // Check if dataset is tokenized (has token contract address)
      if (dataset?.datatokenAddress) {
        
        console.log(`Dataset is tokenized with contract ${dataset.datatokenAddress}`)
        
        try {
          // Try to purchase through the API endpoint first
          const response = await fetch(`/api/datasets/${dataset._id}/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              address
            }),
          })
          
          const data = await response.json()
          
          if (response.ok) {
            if (data.clientSideNeeded) {
              console.log('Server responded with client-side purchase needed')
              await handleClientSidePurchase(data)
            } else {
              // Server successfully completed the purchase
              console.log('Server completed purchase successfully:', data)
              setPurchaseState('success')
              toast.success("Purchase successful! You can now download this dataset.")
            }
          } else {
            throw new Error(data.error || 'Failed to purchase dataset')
          }
        } catch (error) {
          console.error("API purchase error:", error)
          
          // Log more details about the error for debugging
          if (error instanceof Error) {
            console.error("Error details:", error.message, error.stack)
          }
          
          // Fall back to direct client-side contract interaction
          console.log("Falling back to client-side purchase")
          await handleClientSidePurchase({
            datatokenAddress: dataset.datatokenAddress,
            tokenPrice: dataset.tokenPrice || '0.01'  // Default to 0.01 ETH if not specified
          })
        }
      } else if (dataset?.nftId && nftInfo?.listing?.isForSale) {
        // Handle NFT purchase flow (existing code)
        // ... existing code ...
      } else {
        // If dataset is not tokenized, proceed with direct download
        console.log("Dataset is not tokenized, proceeding with direct download")
        setPurchaseState('success')
        toast.success("Dataset access granted, you can now download this dataset")
      }
    } catch (error) {
      console.error("Purchase error:", error)
      setPurchaseState('idle')
      toast.error(error instanceof Error ? error.message : "Failed to purchase dataset")
    }
  }
  
  // Handle client-side token purchase
  const handleClientSidePurchase = async (purchaseData: any) => {
    console.log("Handling client-side purchase:", purchaseData)
    
    if (!purchaseData.datatokenAddress) {
      throw new Error("Token address not provided for client-side purchase")
    }
    
    try {
      // Get provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Get contract ABI (or just the needed methods)
      const tokenContract = new ethers.Contract(
        purchaseData.datatokenAddress,
        [
          'function balanceOf(address) view returns (uint256)',
          'function buyTokens() payable',
          'function buyTokens(uint256) payable',
          'function buy() payable',
          'function purchase() payable',
          'function mint() payable',
          'function mint(address) payable',
          'function tokenPrice() view returns (uint256)'
        ],
        signer
      )
      
      // Check if the user already has tokens
      const balance = await tokenContract.balanceOf(address)
      console.log(`Current token balance: ${ethers.utils.formatEther(balance)}`)
      
      if (!balance.isZero()) {
        console.log("User already has tokens, skipping purchase")
        setPurchaseState('success')
        toast.success("You already own tokens for this dataset")
        
        // Confirm purchase in database
        await confirmPurchaseInDatabase(dataset?._id as string)
        return
      }
      
      // Get token price if available
      let price = ethers.utils.parseEther(purchaseData.tokenPrice || "0.01")
      try {
        const contractPrice = await tokenContract.tokenPrice()
        if (contractPrice && !contractPrice.isZero()) {
          console.log(`Using contract price: ${ethers.utils.formatEther(contractPrice)} ETH`)
          price = contractPrice
        }
      } catch (e) {
        console.log("Could not get token price from contract, using default:", e)
      }
      
      console.log(`Purchasing tokens at ${ethers.utils.formatEther(price)} ETH`)
      
      // Try multiple purchase functions in sequence with proper parameters
      const purchaseFunctions = [
        // buyTokens with parameter (this is the one that likely works)
        async () => {
          console.log("Trying buyTokens(uint256) with amount parameter...")
          return await tokenContract.buyTokens(ethers.utils.parseEther("1"), {
            value: price,
            gasLimit: 300000
          })
        },
        // Standard functions without parameters
        async () => {
          console.log("Trying buyTokens()...")
          return await tokenContract.buyTokens({
            value: price,
            gasLimit: 300000
          })
        },
        async () => {
          console.log("Trying buy()...")
          return await tokenContract.buy({
            value: price,
            gasLimit: 300000
          })
        },
        async () => {
          console.log("Trying purchase()...")
          return await tokenContract.purchase({
            value: price,
            gasLimit: 300000
          })
        },
        async () => {
          console.log("Trying mint()...")
          return await tokenContract.mint({
            value: price,
            gasLimit: 300000
          })
        },
        // Fallback to direct ETH transfer
        async () => {
          console.log("Trying direct ETH transfer...")
          const tx = await signer.sendTransaction({
            to: purchaseData.datatokenAddress,
            value: price,
            gasLimit: 300000
          })
          return tx
        }
      ]
      
      // Try each function until one works
      let tx = null
      let txError: Error | null = null
      
      for (const purchaseFunction of purchaseFunctions) {
        try {
          tx = await purchaseFunction()
          console.log("Purchase transaction sent:", tx.hash)
          break
        } catch (error) {
          console.warn("Function attempt failed:", error)
          txError = error as Error
          // Continue to next function
        }
      }
      
      if (!tx) {
        throw new Error(txError ? `All purchase methods failed: ${txError.message}` : "All purchase methods failed")
      }
      
      // Wait for transaction confirmation
      console.log("Waiting for transaction confirmation...")
      const receipt = await tx.wait()
      console.log("Transaction confirmed:", receipt)
      
      // Check token balance after purchase
      const newBalance = await tokenContract.balanceOf(address)
      console.log(`New token balance: ${ethers.utils.formatEther(newBalance)}`)
      
      if (newBalance.gt(balance)) {
        // Successfully purchased tokens
        console.log("Token purchase successful")
        setPurchaseState('success')
        toast.success("Purchase successful! You can now download this dataset.")
        
        // Confirm purchase in database
        await confirmPurchaseInDatabase(dataset?._id as string)
      } else {
        // Something went wrong, transaction succeeded but no tokens received
        console.warn("Transaction successful but token balance didn't increase")
        setPurchaseState('idle')
        toast.error("Transaction completed but token balance didn't increase. Contact support.")
      }
      
    } catch (error) {
      console.error("Client-side purchase error:", error)
      setPurchaseState('idle')
      toast.error(error instanceof Error ? error.message : "Failed to purchase dataset")
      throw error
    }
  }
  
  // Helper to confirm purchase in the database
  const confirmPurchaseInDatabase = async (datasetId: string) => {
    try {
      const response = await fetch(`/api/datasets/${datasetId}/purchase/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error("Purchase record error:", data.error)
        toast.error("Your purchase was successful, but we couldn't record it in our database. Please contact support.")
      } else {
        console.log("Purchase recorded in database:", data)
      }
    } catch (error) {
      console.error("Error confirming purchase in database:", error)
    }
  }

  const confirmPurchase = async () => {
    setPurchaseState('purchasing');
    console.log("Starting purchase confirmation process...");
    console.log("Dataset tokenization details:", {
      nftId: dataset?.nftId,
      tokenId: dataset?.tokenId, 
      tokenAddress: dataset?.datatokenAddress, 
      tokenName: dataset?.tokenName,
      tokenSymbol: dataset?.tokenSymbol,
      isTokenized: Boolean(dataset?.nftId || dataset?.tokenId) && Boolean(dataset?.datatokenAddress)
    })
    
    try {
      // Check if dataset is tokenized (has nftId)
      if (dataset?.nftId && nftInfo?.listing?.isForSale) {
        console.log("Processing blockchain purchase for tokenized dataset");
        // Handle blockchain purchase
        const networkConfig = getConfig(selectedChain?.id || 1337)
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        
        // Create marketplace contract instance
        const marketplace = new ethers.Contract(
          networkConfig.marketplaceAddress,
          MarketplaceAbi,
          signer
        )
        
        // Execute purchase transaction
        const purchaseTx = await marketplace.buyDataset(dataset.nftId)
        
        // Wait for transaction to complete
        const receipt = await purchaseTx.wait()
        
        // Transaction successful
        setPurchaseState('success')
        toast.success("Dataset purchased successfully!")
        
        // Reload NFT info to reflect the new ownership
        await fetchBlockchainInfo(dataset.nftId)
      } else {
        console.log("Processing non-tokenized dataset purchase via API");
        // Handle API-based purchase for non-tokenized datasets
        const token = getToken();
        console.log("Using auth token:", token ? "Token present" : "No token");
        
        const response = await fetch(`/api/datasets/${id}/purchase/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            walletAddress: address,
            chainId: selectedChain?.id || 1337,
            transactionHash: "manual-confirmation" // Add dummy transaction hash for API validation
          })
        });
        
        console.log("Purchase confirmation API response status:", response.status);
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error("Purchase confirmation API error:", data);
          throw new Error(data.error || data.message || "Purchase confirmation failed");
        }
        
        console.log("Purchase confirmation API response data:", data);
        
        // If API gave us a transaction to execute
        if (data.transaction) {
          console.log("Executing blockchain transaction from API");
          const provider = new ethers.providers.Web3Provider(window.ethereum)
          const signer = provider.getSigner()
          
          // Execute the purchase transaction
          const tx = await signer.sendTransaction(data.transaction)
          await tx.wait()
        } else {
          console.log("No blockchain transaction needed, purchase recorded in database");
        }
        
        // Purchase successful
        setPurchaseState('success')
        toast.success("Dataset purchased successfully!")
        
        // Reload dataset info
        await fetchDataset(id)
      }
    } catch (error: any) {  // Add proper type annotation
      console.error("Purchase confirmation error:", error)
      toast.error(error.message || "Purchase failed")
      setPurchaseState('idle')
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-8" />
            
            <div className="flex gap-2 mb-6">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-24" />
            </div>
            
            <Skeleton className="h-64 w-full rounded-lg mb-8" />
            
            <div className="mb-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          
          <div className="lg:w-1/3">
            <Skeleton className="h-64 w-full rounded-lg mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        
        <Card className="p-8 text-center">
          <CardHeader>
            <CardTitle>Error Loading Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Failed to load dataset details"}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => fetchDataset(id)}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Explore
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl lg:text-4xl font-bold">{dataset.name}</h1>
              <Button variant="ghost" size="icon">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-2">{dataset.description}</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge>{dataset.category}</Badge>
            <Badge variant="outline">{dataset.dataType}</Badge>
            {dataset.verified && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
          
          <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-8">
            <img 
              src={dataset.previewImage || "/placeholder.svg?height=400&width=600"} 
              alt={dataset.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          <Tabs defaultValue="overview" className="mb-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="samples">Samples</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h3 className="text-xl font-semibold">About this Dataset</h3>
                <p>{dataset.longDescription || dataset.description}</p>
                
                <h4 className="text-lg font-semibold mt-4">Use Cases</h4>
                <ul>
                  {dataset.useCases ? (
                    dataset.useCases.map((useCase: string, index: number) => (
                      <li key={index}>{useCase}</li>
                    ))
                  ) : (
                    <>
                      <li>Machine Learning model training</li>
                      <li>Data analysis and insights generation</li>
                      <li>Market research</li>
                      <li>Product development</li>
                    </>
                  )}
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="metadata">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">Size</h4>
                    <p>{dataset.size || "Unknown"}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">Format</h4>
                    <p>{dataset.format || "CSV"}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">License</h4>
                    <p>{dataset.license || "MIT"}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">Last Updated</h4>
                    <p>{formatDate(dataset.updatedAt || dataset.createdAt)}</p>
                  </div>
                </div>
                
                {dataset.schema && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">Schema</h4>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                      {typeof dataset.schema === 'string' 
                        ? dataset.schema 
                        : JSON.stringify(dataset.schema, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="samples">
              {dataset.sampleData ? (
                <div className="border rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs">
                    {typeof dataset.sampleData === 'string' 
                      ? dataset.sampleData 
                      : JSON.stringify(dataset.sampleData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p>No sample data available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="lg:w-1/3">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dataset Details</span>
                {nftInfo?.isOwner && (
                  <Badge variant="outline">You own this</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Published on {formatDate(dataset.createdAt)}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Publisher</span>
                </div>
                <span className="font-medium">{dataset.ownerName || "Anonymous"}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Downloads</span>
                </div>
                <span className="font-medium">{dataset.downloads || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Last Updated</span>
                </div>
                <span className="font-medium">{formatDate(dataset.updatedAt || dataset.createdAt)}</span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Price</span>
                </div>
                <span className="font-medium">
                  {nftInfo?.listing?.isForSale 
                    ? `${nftInfo.listing.price} LINK` 
                    : (dataset.price === 0 || !dataset.price) 
                      ? "Free" 
                      : `${dataset.price} ETH`}
                </span>
              </div>
              
              {nftInfo?.nftId && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Info className="h-3 w-3" />
                    <span>Blockchain Details</span>
                  </div>
                  <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>NFT ID:</span>
                      <span className="font-mono">{nftInfo.nftId}</span>
                    </div>
                    {nftInfo.tokenAddress && (
                      <div className="flex justify-between">
                        <span>Token:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="font-mono truncate max-w-[120px]">
                              {nftInfo.tokenAddress.substring(0, 6)}...{nftInfo.tokenAddress.substring(38)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs">{nftInfo.tokenAddress}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex-col gap-3">
              {nftInfo?.isOwner ? (
                <Button className="w-full" variant="secondary" disabled>
                  You already own this dataset
                </Button>
              ) : nftInfo?.listing?.isForSale ? (
                <>
                  <Button 
                    className="w-full" 
                    onClick={handlePurchaseClick}
                    disabled={purchaseState !== 'idle' && purchaseState !== 'confirmPurchase'}
                  >
                    {purchaseState === 'loading' ? 'Checking...' : 
                     purchaseState === 'tokenApproval' ? 'Approving Tokens...' : 
                     purchaseState === 'confirmPurchase' ? 'Confirm Purchase' : 
                     purchaseState === 'purchasing' ? 'Processing Purchase...' : 
                     purchaseState === 'success' ? 'Purchase Complete' : 
                     'Buy Now'}
                  </Button>
                  
                  <AlertDialog open={purchaseState === 'confirmPurchase'}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                        <AlertDialogDescription>
                          You are about to purchase "{dataset.name}" for {nftInfo.listing.price} LINK tokens.
                          This action cannot be undone. Are you sure you want to proceed?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPurchaseState('idle')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmPurchase}>Confirm Purchase</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={handlePurchaseClick}
                  disabled={purchaseState !== 'idle' && purchaseState !== 'confirmPurchase'}
                >
                  {purchaseState === 'loading' ? 'Checking...' : 
                   purchaseState === 'tokenApproval' ? 'Approving Tokens...' : 
                   purchaseState === 'confirmPurchase' ? 'Confirm Purchase' : 
                   purchaseState === 'purchasing' ? 'Processing Purchase...' : 
                   purchaseState === 'success' ? 'Purchase Complete' : 
                   'Buy Now'}
                </Button>
              )}
              
              {/* Additional actions */}
              <div className="flex w-full gap-3">
                {purchaseState === 'success' || nftInfo?.isOwner ? (
                  <Button variant="outline" className="flex-1" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" disabled>
                    <FileText className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                )}
                
                {nftInfo?.listing?.isForSale && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={viewOnBlockExplorer}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View on Block Explorer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
} 