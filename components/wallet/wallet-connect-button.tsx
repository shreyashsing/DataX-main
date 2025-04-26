"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Wallet, ExternalLink, Copy, LogOut, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { SUPPORTED_WALLETS, SUPPORTED_CHAINS, WalletInfo, ChainConfig } from "@/lib/wallet/connectors"

// Type for Phantom Wallet
type PhantomWallet = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
}

type WalletState = {
  address: string | null
  chainId: number | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  walletId: string | null
}

export function WalletConnectButton() {
  const { toast } = useToast()
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    error: null,
    walletId: null
  })
  const [showDialog, setShowDialog] = useState(false)
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null)

  // Helper to shorten address for display
  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Check if wallet is connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      // Skip if user manually disconnected
      if (localStorage.getItem('wallet-disconnected') === 'true') {
        return
      }

      // Check for ethereum provider
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          const chainId = await window.ethereum.request({ method: "eth_chainId" })
          
          if (accounts.length > 0) {
            // Get wallet type
            let walletId = 'metamask' // default 
            if (window.ethereum.isMetaMask) {
              walletId = 'metamask'
            } else if (window.ethereum.isCoinbaseWallet) {
              walletId = 'coinbase'
            }
            
            setWalletState({
              address: accounts[0],
              chainId: parseInt(chainId, 16),
              isConnecting: false,
              isConnected: true,
              error: null,
              walletId
            })

            // Find and set the selected chain
            const chain = SUPPORTED_CHAINS.find(c => c.id === parseInt(chainId, 16))
            if (chain) {
              setSelectedChain(chain)
            }
          }
        } catch (error) {
          console.error("Error checking connection:", error)
        }
      } else if (window.phantom?.solana) {
        // Check for Phantom connection
        try {
          // Use type assertion for phantom wallet
          const phantomWallet = window.phantom.solana as PhantomWallet;
          const phantomConnection = await phantomWallet.connect();
          
          setWalletState({
            address: phantomConnection.publicKey.toString(),
            chainId: null, // No chainId for Solana
            isConnecting: false,
            isConnected: true,
            error: null,
            walletId: 'phantom'
          });
        } catch (error) {
          console.error("Error checking Phantom connection:", error);
        }
      }
    }
    
    checkConnection()
  }, [])

  // Listen for account and chain changes
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Disconnected
        handleDisconnect()
      } else if (walletState.isConnected) {
        // Account changed
        setWalletState(prev => ({
          ...prev,
          address: accounts[0]
        }))

        toast({
          title: "Account Changed",
          description: `Connected to ${shortenAddress(accounts[0])}`,
        })
      }
    }

    const handleChainChanged = (chainIdHex: string) => {
      if (walletState.isConnected) {
        const chainId = parseInt(chainIdHex, 16)
        setWalletState(prev => ({
          ...prev,
          chainId
        }))

        // Find the chain in our supported chains
        const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
        setSelectedChain(chain || null)

        toast({
          title: "Network Changed",
          description: `Switched to ${chain?.name || 'Chain ID: ' + chainId}`,
        })
      }
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged)
    window.ethereum.on("chainChanged", handleChainChanged)

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
      window.ethereum?.removeListener("chainChanged", handleChainChanged)
    }
  }, [walletState.isConnected, toast])

  // Connect wallet handler
  const connectWallet = async (wallet: WalletInfo) => {
    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }))
    
    try {
      // Clear disconnect state
      localStorage.removeItem('wallet-disconnected')

      let accounts: string[] = []
      let chainId: string | null = null
      
      // Handle different wallet connections
      if (wallet.id === 'metamask' || wallet.id === 'coinbase') {
        if (!window.ethereum) {
          throw new Error(`${wallet.name} is not installed`)
        }
        
        accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        chainId = await window.ethereum.request({ method: "eth_chainId" })
      } 
      else if (wallet.id === 'phantom') {
        if (!window.phantom?.solana) {
          throw new Error('Phantom wallet is not installed')
        }
        
        // Use type assertion for phantom wallet
        const phantomWallet = window.phantom.solana as PhantomWallet;
        const phantomConnection = await phantomWallet.connect();
        accounts = [phantomConnection.publicKey.toString()];
        chainId = null; // Solana doesn't use chainId
      }
      else if (wallet.id === 'walletconnect') {
        // For a real implementation, you would use WalletConnect library
        throw new Error('WalletConnect integration requires additional setup')
      }
      else {
        throw new Error('Wallet not supported')
      }

      if (accounts.length > 0) {
        setWalletState({
          address: accounts[0],
          chainId: chainId ? parseInt(chainId, 16) : null,
          isConnecting: false,
          isConnected: true,
          error: null,
          walletId: wallet.id
        })

        // Find and set the selected chain
        if (chainId) {
          const chain = SUPPORTED_CHAINS.find(c => c.id === parseInt(chainId, 16))
          if (chain) {
            setSelectedChain(chain)
          }
        }

        toast({
          title: "Wallet Connected",
          description: `Connected to ${shortenAddress(accounts[0])}`,
        })

        setShowDialog(false) // Close the dialog after successful connection
      }
    } catch (error: any) {
      console.error("Error connecting to wallet:", error)
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || "Failed to connect wallet"
      }))

      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  // Disconnect wallet handler
  const handleDisconnect = () => {
    localStorage.setItem('wallet-disconnected', 'true')
    
    setWalletState({
      address: null,
      chainId: null,
      isConnecting: false,
      isConnected: false,
      error: null,
      walletId: null
    })
    
    setSelectedChain(null)

    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    })
  }

  // Copy address to clipboard
  const handleCopyAddress = () => {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  // View on explorer
  const handleViewOnExplorer = () => {
    if (!walletState.address || !selectedChain) return

    const explorer = selectedChain.blockExplorers[0]
    if (explorer) {
      window.open(`${explorer.url}/address/${walletState.address}`, "_blank")
    }
  }

  // Switch network
  const handleSwitchNetwork = async (chain: ChainConfig) => {
    if (!window.ethereum || !walletState.isConnected) return

    try {
      // Request chain switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chain.id.toString(16)}` }],
        })
      } catch (switchError: any) {
        // Chain doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${chain.id.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: chain.rpcUrls,
                blockExplorerUrls: chain.blockExplorers.map(explorer => explorer.url),
              },
            ],
          })
        } else {
          throw switchError
        }
      }

      setSelectedChain(chain)
      
      toast({
        title: "Network Changed",
        description: `Switched to ${chain.name}`,
      })
    } catch (error: any) {
      console.error("Error switching network:", error)
      toast({
        title: "Network Switch Failed",
        description: error.message || "Failed to switch network",
        variant: "destructive",
      })
    }
  }

  // Get current wallet info
  const getCurrentWalletInfo = () => {
    if (!walletState.walletId) return null
    return SUPPORTED_WALLETS.find(w => w.id === walletState.walletId)
  }

  return (
    <>
      {!walletState.isConnected ? (
        <Button 
          onClick={() => setShowDialog(true)} 
          className="flex items-center gap-2"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="hidden md:inline">{shortenAddress(walletState.address!)}</span>
              <span className="md:hidden">Wallet</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  {getCurrentWalletInfo()?.icon && (
                    <div className="h-5 w-5 relative overflow-hidden rounded-full">
                      <Image
                        src={getCurrentWalletInfo()!.icon}
                        alt={getCurrentWalletInfo()!.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="text-sm font-medium">{getCurrentWalletInfo()?.name || 'Connected Wallet'}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">{walletState.address}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {selectedChain && (
              <DropdownMenuItem 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setShowDialog(true)}
              >
                <span className="text-xs">{selectedChain.name}</span>
                <ChevronRight className="h-4 w-4" />
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleCopyAddress}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy Address</span>
            </DropdownMenuItem>
            
            {selectedChain && selectedChain.blockExplorers.length > 0 && (
              <DropdownMenuItem onClick={handleViewOnExplorer}>
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>View on {selectedChain.blockExplorers[0].name}</span>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleDisconnect} className="text-red-500">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Wallet Connection Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
                onClick={() => connectWallet(wallet)}
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
                    onClick={() => handleSwitchNetwork(chain)}
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
    </>
  )
} 