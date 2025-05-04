"use client"

import { useState } from "react"
import { useWallet } from "@/components/wallet/wallet-provider"
import { ethers } from "ethers"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Info, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react"

interface SellDatasetProps {
  datasetId: string
  nftId: string
  isOwner: boolean
  alreadyListed?: boolean
  currentPrice?: string
}

export function SellDataset({ datasetId, nftId, isOwner, alreadyListed, currentPrice }: SellDatasetProps) {
  const { toast } = useToast()
  const { walletState, selectedChain } = useWallet()
  const { isConnected, address } = walletState

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [price, setPrice] = useState(currentPrice || "")
  const [selling, setSelling] = useState<'idle' | 'approving' | 'listing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  if (!isOwner) {
    return null
  }

  const handleSellDataset = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to sell this dataset",
        variant: "destructive"
      })
      return
    }

    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive"
      })
      return
    }

    setSelling('approving')
    setError(null)
    setTxHash(null)

    try {
      // Prepare the listing transaction
      const response = await fetch('/api/datasets/list-for-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nftId,
          price,
          walletAddress: address,
          chainId: selectedChain?.id || 1337
        })
      })

      const data = await response.json()

      if (!data.success && data.requiresApproval) {
        // NFT needs approval first
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum)
          const signer = provider.getSigner()
          
          // Send approval transaction
          const tx = await signer.sendTransaction(data.approvalTransaction)
          await tx.wait()
          
          // After approval, try listing again
          return handleSellDataset()
        } catch (approvalError: any) {
          console.error("Approval error:", approvalError)
          setError(`Failed to approve NFT: ${approvalError.message || "Unknown error"}`)
          setSelling('error')
          return
        }
      }

      if (!data.success) {
        setError(data.message || "Failed to prepare listing")
        setSelling('error')
        return
      }

      // All good, now send the transaction
      setSelling('listing')
      
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      
      // Send the listing transaction
      const tx = await signer.sendTransaction(data.transaction)
      setTxHash(tx.hash)
      
      // Wait for confirmation
      await tx.wait()
      
      setSelling('success')
      
      toast({
        title: "Dataset Listed",
        description: "Your dataset has been successfully listed for sale!",
      })
      
      // Close dialog after success
      setTimeout(() => {
        setIsDialogOpen(false)
        // Force page refresh to show updated listing
        window.location.reload()
      }, 3000)
      
    } catch (err: any) {
      console.error("Error listing dataset:", err)
      setError(err.message || "Failed to list dataset")
      setSelling('error')
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={alreadyListed ? "outline" : "default"}>
          {alreadyListed ? "Update Price" : "Sell Dataset"}
        </Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alreadyListed ? "Update Listing Price" : "Sell Your Dataset"}</DialogTitle>
          <DialogDescription>
            {alreadyListed 
              ? "Change the price of your dataset listing on the marketplace." 
              : "List your dataset for sale on the blockchain marketplace."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {selling === 'idle' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="price">Price (in LINK tokens)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the price you want to sell your dataset for.
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Listing your dataset requires blockchain transactions that will cost gas.
                  Make sure your wallet has enough funds to cover gas fees.
                </AlertDescription>
              </Alert>
            </>
          )}
          
          {selling === 'approving' && (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <h3 className="text-lg font-medium">Approving NFT...</h3>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please confirm the approval transaction in your wallet.
                This allows the marketplace to transfer your NFT when it sells.
              </p>
            </div>
          )}
          
          {selling === 'listing' && (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <h3 className="text-lg font-medium">Listing Dataset...</h3>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please confirm the listing transaction in your wallet.
                Your dataset will be available for purchase once confirmed.
              </p>
              {txHash && (
                <p className="text-xs font-mono mt-4 bg-muted p-2 rounded break-all">
                  TX: {txHash}
                </p>
              )}
            </div>
          )}
          
          {selling === 'success' && (
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircle className="h-8 w-8 mb-4 text-green-500" />
              <h3 className="text-lg font-medium">Listing Successful!</h3>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Your dataset has been successfully listed for sale at {price} LINK.
                Buyers can now purchase it through the marketplace.
              </p>
              {txHash && (
                <p className="text-xs font-mono mt-4 bg-muted p-2 rounded break-all">
                  TX: {txHash}
                </p>
              )}
            </div>
          )}
          
          {selling === 'error' && (
            <div className="flex flex-col items-center justify-center py-4">
              <XCircle className="h-8 w-8 mb-4 text-red-500" />
              <h3 className="text-lg font-medium">Listing Failed</h3>
              <p className="text-sm text-red-500 text-center mt-2">
                {error || "There was an error listing your dataset."}
              </p>
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription>
                  {error || "Unknown error"}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {selling === 'idle' && (
            <>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSellDataset}>
                {alreadyListed ? "Update Listing" : "List for Sale"}
              </Button>
            </>
          )}
          
          {selling === 'error' && (
            <>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setSelling('idle')}>
                Try Again
              </Button>
            </>
          )}
          
          {selling === 'success' && (
            <Button onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 