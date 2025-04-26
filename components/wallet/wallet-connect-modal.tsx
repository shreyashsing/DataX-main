"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Wallet } from "lucide-react"
import Image from "next/image"
import { useWallet } from "@/components/wallet/wallet-provider"
import { SUPPORTED_WALLETS, SUPPORTED_CHAINS } from "@/lib/wallet/connectors"

export function WalletConnectModal() {
  const { walletState, connectWallet, selectedChain, switchNetwork } = useWallet()
  const [showDialog, setShowDialog] = useState(false)

  const handleConnect = async (walletId: string) => {
    const wallet = SUPPORTED_WALLETS.find(w => w.id === walletId)
    if (wallet) {
      await connectWallet(wallet)
      // Don't close the dialog if there was an error connecting
      if (walletState.error === null) {
        setShowDialog(false)
      }
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Select a wallet to connect to our application
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {SUPPORTED_WALLETS.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              className="flex items-center justify-between w-full p-4 h-auto"
              onClick={() => handleConnect(wallet.id)}
              disabled={walletState.isConnecting}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 relative overflow-hidden rounded-full">
                  <Image
                    src={wallet.icon}
                    alt={wallet.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-left">
                  <p className="font-medium">{wallet.name}</p>
                  <p className="text-xs text-muted-foreground">{wallet.description}</p>
                </div>
              </div>
              {walletState.isConnecting && walletState.walletId === wallet.id && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
            </Button>
          ))}
        </div>
        
        {walletState.error && (
          <div className="text-sm text-red-500 mt-2">
            {walletState.error}
          </div>
        )}

        {/* Chain Selection (only shown when wallet is connected) */}
        {walletState.isConnected && (
          <>
            <DialogTitle className="text-lg mt-4 mb-2">Select Network</DialogTitle>
            <div className="grid gap-3 py-2">
              {SUPPORTED_CHAINS.map((chain) => (
                <Button
                  key={chain.id}
                  variant={selectedChain?.id === chain.id ? "default" : "outline"}
                  className="flex items-center justify-between w-full"
                  onClick={() => switchNetwork(chain)}
                >
                  <span>{chain.name}</span>
                  {selectedChain?.id === chain.id && (
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  )}
                </Button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
} 