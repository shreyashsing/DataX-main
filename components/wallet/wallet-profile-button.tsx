"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExternalLink, Copy, LogOut, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useWallet } from "@/components/wallet/wallet-provider"

export function WalletProfileButton() {
  const { 
    walletState, 
    selectedChain, 
    disconnectWallet, 
    copyAddressToClipboard, 
    viewOnExplorer, 
    shortenAddress,
    getCurrentWalletInfo
  } = useWallet()
  
  if (!walletState.isConnected || !walletState.address) {
    return null
  }
  
  const walletInfo = getCurrentWalletInfo()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="hidden md:inline">{shortenAddress(walletState.address)}</span>
          <span className="md:hidden">Wallet</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              {walletInfo?.icon && (
                <div className="h-5 w-5 relative overflow-hidden rounded-full">
                  <Image
                    src={walletInfo.icon}
                    alt={walletInfo.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <p className="text-sm font-medium">{walletInfo?.name || 'Connected Wallet'}</p>
            </div>
            <p className="text-xs text-muted-foreground truncate">{walletState.address}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {selectedChain && (
          <DropdownMenuItem 
            className="flex justify-between items-center cursor-pointer"
          >
            <span className="text-xs">{selectedChain.name}</span>
            <ChevronRight className="h-4 w-4" />
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={copyAddressToClipboard}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy Address</span>
        </DropdownMenuItem>
        
        {selectedChain && selectedChain.blockExplorers.length > 0 && (
          <DropdownMenuItem onClick={viewOnExplorer}>
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>View on {selectedChain.blockExplorers[0].name}</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={disconnectWallet} className="text-red-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 