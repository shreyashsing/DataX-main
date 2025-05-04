"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { useWallet } from '@/components/wallet/wallet-provider'
import { createTokenForNFT } from '@/lib/blockchain/clientSigner'
import { useToast } from '@/hooks/use-toast'

interface TokenCreatorProps {
  // If NFT ID is provided, we only do token creation
  nftId?: string
  // If dataset details are provided, we do the full flow starting with NFT minting
  datasetDetails?: {
    name: string
    description: string
    datasetCID: string
  }
  onComplete?: (result: {
    success: boolean
    nftId?: string
    tokenAddress?: string
    error?: string
  }) => void
}

export default function TokenCreator({ nftId: initialNftId, datasetDetails, onComplete }: TokenCreatorProps) {
  const { walletState } = useWallet()
  const { toast } = useToast()
  
  // State for form inputs
  const [tokenName, setTokenName] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')
  
  // State for process tracking
  const [nftId, setNftId] = useState<string | undefined>(initialNftId)
  const [mintTxHash, setMintTxHash] = useState<string | null>(null)
  const [tokenAddress, setTokenAddress] = useState<string | null>(null)
  const [tokenTxHash, setTokenTxHash] = useState<string | null>(null)
  
  // Loading states
  const [isMinting, setIsMinting] = useState(false)
  const [isCreatingToken, setIsCreatingToken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Current step tracking
  const [currentStep, setCurrentStep] = useState<'connect' | 'mint' | 'create-token' | 'complete' | 'error'>(
    initialNftId ? 'create-token' : 'mint'
  )

  // Initialize token name/symbol from dataset name if available
  useEffect(() => {
    if (datasetDetails?.name) {
      // Generate token name from dataset name
      const generatedName = `DT-${datasetDetails.name.substring(0, 15).replace(/\s+/g, '')}`
      setTokenName(generatedName)
      
      // Generate token symbol from dataset name (up to 5 chars)
      const generatedSymbol = datasetDetails.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 5)
        .toUpperCase()
      setTokenSymbol(generatedSymbol)
    }
  }, [datasetDetails])

  // Step 1: Mint NFT
  const handleMintNFT = async () => {
    if (!walletState.address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint an NFT",
        variant: "destructive",
      })
      setCurrentStep('connect')
      return
    }
    
    setIsMinting(true)
    setError(null)
    
    try {
      // Prepare dataset details
      const mintPayload = {
        walletAddress: walletState.address,
        tokenName: tokenName || `DT-Dataset${Date.now()}`,
        tokenSymbol: tokenSymbol || `DT${Date.now() % 10000}`,
        datasetCID: datasetDetails?.datasetCID || `ipfs://QmDataset${Math.floor(Math.random() * 10000)}`,
        datasetHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
      }
      
      // Call the mint API
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mintPayload),
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to mint NFT')
      }
      
      // Save the NFT details
      setNftId(data.tokenId)
      setMintTxHash(data.txHash)
      setCurrentStep('create-token')
      
      toast({
        title: "NFT Minted Successfully",
        description: `NFT #${data.tokenId} has been minted on the blockchain`,
      })
    } catch (err: any) {
      console.error('Minting error:', err)
      setError(err.message || 'Failed to mint NFT')
      setCurrentStep('error')
      
      toast({
        title: "NFT Minting Failed",
        description: err.message || 'An unexpected error occurred',
        variant: "destructive",
      })
    } finally {
      setIsMinting(false)
    }
  }
  
  // Step 2: Create token for the NFT
  const handleCreateToken = async () => {
    if (!walletState.address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a token",
        variant: "destructive",
      })
      setCurrentStep('connect')
      return
    }
    
    if (!nftId) {
      toast({
        title: "Missing NFT ID",
        description: "No NFT ID available. Please mint an NFT first.",
        variant: "destructive",
      })
      return
    }
    
    setIsCreatingToken(true)
    setError(null)
    
    try {
      // Call the createTokenForNFT function from clientSigner
      const result = await createTokenForNFT(
        nftId, 
        tokenName || undefined, 
        tokenSymbol || undefined
      )
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create token')
      }
      
      // Save token details
      setTokenAddress(result.tokenAddress || null)
      setTokenTxHash(result.txHash || null)
      setCurrentStep('complete')
      
      // Notify completion
      if (onComplete) {
        onComplete({
          success: true,
          nftId,
          tokenAddress: result.tokenAddress,
        })
      }
      
      toast({
        title: "Token Created Successfully",
        description: `Token has been created at address ${result.tokenAddress?.substring(0, 8)}...`,
      })
    } catch (err: any) {
      console.error('Token creation error:', err)
      setError(err.message || 'Failed to create token')
      setCurrentStep('error')
      
      // Notify failure
      if (onComplete) {
        onComplete({
          success: false,
          nftId,
          error: err.message || 'Failed to create token',
        })
      }
      
      toast({
        title: "Token Creation Failed",
        description: err.message || 'An unexpected error occurred',
        variant: "destructive",
      })
    } finally {
      setIsCreatingToken(false)
    }
  }
  
  const renderStep = () => {
    switch (currentStep) {
      case 'connect':
        return (
          <div className="flex flex-col items-center py-6 space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500" />
            <h3 className="text-xl font-medium">Wallet Not Connected</h3>
            <p className="text-center text-muted-foreground max-w-md">
              Please connect your wallet to continue with the token creation process.
            </p>
          </div>
        )
      
      case 'mint':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Token Name</label>
                <Input 
                  value={tokenName} 
                  onChange={(e) => setTokenName(e.target.value)} 
                  placeholder="DT-YourDataset"
                  disabled={isMinting}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Token Symbol</label>
                <Input 
                  value={tokenSymbol} 
                  onChange={(e) => setTokenSymbol(e.target.value)} 
                  placeholder="DTKN"
                  disabled={isMinting}
                  maxLength={5}
                />
              </div>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleMintNFT} 
              disabled={isMinting || !walletState.address}
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 
                  Minting NFT...
                </>
              ) : 'Mint NFT'}
            </Button>
          </div>
        )
      
      case 'create-token':
        return (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-1 mr-3">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">NFT Minted Successfully</p>
                  <p className="text-xs text-muted-foreground">NFT ID: {nftId}</p>
                </div>
                {mintTxHash && (
                  <a 
                    href={`https://localhost:8545/tx/${mintTxHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs flex items-center text-blue-600 hover:underline"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Token Name</label>
                <Input 
                  value={tokenName} 
                  onChange={(e) => setTokenName(e.target.value)} 
                  placeholder="DT-YourDataset"
                  disabled={isCreatingToken}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Token Symbol</label>
                <Input 
                  value={tokenSymbol} 
                  onChange={(e) => setTokenSymbol(e.target.value)} 
                  placeholder="DTKN"
                  disabled={isCreatingToken}
                  maxLength={5}
                />
              </div>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleCreateToken} 
              disabled={isCreatingToken || !walletState.address}
            >
              {isCreatingToken ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 
                  Creating Token...
                </>
              ) : 'Create Token'}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              This requires signing a transaction with your wallet.
            </p>
          </div>
        )
      
      case 'complete':
        return (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-1 mr-3">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">NFT Minted Successfully</p>
                  <p className="text-xs text-muted-foreground">NFT ID: {nftId}</p>
                </div>
                {mintTxHash && (
                  <a 
                    href={`https://localhost:8545/tx/${mintTxHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs flex items-center text-blue-600 hover:underline"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-1 mr-3">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Token Created Successfully</p>
                  <p className="text-xs text-muted-foreground">
                    {tokenAddress ? `Address: ${tokenAddress.substring(0, 8)}...${tokenAddress.substring(tokenAddress.length - 6)}` : 'Token created'}
                  </p>
                </div>
                {tokenTxHash && tokenTxHash !== 'existing-token' && (
                  <a 
                    href={`https://localhost:8545/tx/${tokenTxHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs flex items-center text-blue-600 hover:underline"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-center py-4">
              <div className="bg-green-100 rounded-full p-2 mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-medium">Process Complete</h3>
              <p className="text-center text-muted-foreground max-w-md mt-2">
                Your dataset has been successfully tokenized and is now available on the blockchain.
              </p>
            </div>
            
            {/* Add buttons for next steps */}
            <div className="flex space-x-4">
              <Button variant="outline" className="flex-1" onClick={() => window.location.href = '/dashboard/datasets'}>
                View My Datasets
              </Button>
              <Button className="flex-1" onClick={() => window.location.href = '/dashboard'}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        )
      
      case 'error':
        return (
          <div className="flex flex-col items-center py-6 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <h3 className="text-xl font-medium">Process Failed</h3>
            <p className="text-center text-muted-foreground max-w-md">
              {error || 'An unexpected error occurred during the process.'}
            </p>
            <Button variant="outline" onClick={() => setCurrentStep(nftId ? 'create-token' : 'mint')}>
              Try Again
            </Button>
          </div>
        )
    }
  }
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Tokenize Your Dataset
          {currentStep === 'complete' && <Badge className="bg-green-600">Complete</Badge>}
        </CardTitle>
        <CardDescription>
          Create an NFT and an ERC-20 token for your dataset on the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'error' ? 'bg-red-100 text-red-600' : 
                (currentStep === 'mint' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600')
              }`}>
                {currentStep === 'error' ? <AlertCircle className="w-4 h-4" /> : (mintTxHash ? <Check className="w-4 h-4" /> : '1')}
              </div>
              <span className="text-xs mt-1">Mint NFT</span>
            </div>
            
            <div className={`h-0.5 flex-1 mx-2 ${mintTxHash ? 'bg-green-200' : 'bg-gray-200'}`} />
            
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'error' && mintTxHash ? 'bg-red-100 text-red-600' :
                (currentStep === 'create-token' ? 'bg-blue-100 text-blue-600' : 
                (tokenAddress ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'))
              }`}>
                {currentStep === 'error' && mintTxHash ? <AlertCircle className="w-4 h-4" /> : (tokenAddress ? <Check className="w-4 h-4" /> : '2')}
              </div>
              <span className="text-xs mt-1">Create Token</span>
            </div>
          </div>
        </div>
        
        {renderStep()}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <div className="text-xs text-muted-foreground">
          {walletState.address ? (
            <>Connected: {`${walletState.address.substring(0, 6)}...${walletState.address.substring(walletState.address.length - 4)}`}</>
          ) : (
            <>Please connect your wallet to continue</>
          )}
        </div>
      </CardFooter>
    </Card>
  )
} 