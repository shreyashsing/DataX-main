"use client"

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import TokenCreator from "@/components/dashboard/TokenCreator"
import { WalletProvider } from "@/components/wallet/wallet-provider"
import { useToast } from "@/hooks/use-toast"

export default function CreateTokenPage() {
  const searchParams = useSearchParams()
  const nftId = searchParams.get('nftId')
  const datasetName = searchParams.get('name')
  const datasetCID = searchParams.get('cid')
  const { toast } = useToast()
  
  const [result, setResult] = useState<{
    success?: boolean;
    nftId?: string;
    tokenAddress?: string;
    error?: string;
  } | null>(null)
  
  // Prepare dataset details if we have them from the query params
  const datasetDetails = datasetName ? {
    name: datasetName,
    description: searchParams.get('description') || 'Dataset description',
    datasetCID: datasetCID || `ipfs://QmDataset${Math.floor(Math.random() * 10000)}`
  } : undefined

  const handleComplete = (result: {
    success: boolean;
    nftId?: string;
    tokenAddress?: string;
    error?: string;
  }) => {
    setResult(result)
    
    if (result.success) {
      toast({
        title: "Tokenization Complete",
        description: `NFT #${result.nftId} with token address ${result.tokenAddress?.substring(0, 8)}... was created successfully.`,
      })
    } else {
      toast({
        title: "Tokenization Failed",
        description: result.error || "An unknown error occurred.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Create Token" 
        description={nftId 
          ? `Create a token for your NFT #${nftId}` 
          : "Mint an NFT and create a token for your dataset"
        } 
      />
      <main className="flex-1 p-6">
        <WalletProvider>
          <TokenCreator 
            nftId={nftId || undefined}
            datasetDetails={datasetDetails}
            onComplete={handleComplete}
          />
        </WalletProvider>
      </main>
    </div>
  )
} 