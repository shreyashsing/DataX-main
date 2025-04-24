"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Wallet, ExternalLink, Copy, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Define the window ethereum property
declare global {
  interface Window {
    ethereum?: any
  }
}

type WalletState = {
  address: string | null
  chainId: string | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
}

export function Web3WalletConnector() {
  const { toast } = useToast()
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    error: null,
  })

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== "undefined" && Boolean(window.ethereum)

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      setWalletState((prev) => ({
        ...prev,
        error: "MetaMask is not installed. Please install MetaMask to connect your wallet.",
      }))

      toast({
        title: "Wallet Error",
        description: "MetaMask is not installed. Please install MetaMask to connect your wallet.",
        variant: "destructive",
      })

      return
    }

    setWalletState((prev) => ({ ...prev, isConnecting: true, error: null }))

    try {
      // Clear disconnection preference
      localStorage.removeItem('wallet-disconnected');
      
      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const chainId = await window.ethereum.request({ method: "eth_chainId" })

      if (accounts.length > 0) {
        setWalletState({
          address: accounts[0],
          chainId,
          isConnecting: false,
          isConnected: true,
          error: null,
        })

        toast({
          title: "Wallet Connected",
          description: `Connected to ${shortenAddress(accounts[0])}`,
        })
      }
    } catch (error: any) {
      console.error("Error connecting to wallet:", error)
      setWalletState({
        address: null,
        chainId: null,
        isConnecting: false,
        isConnected: false,
        error: error.message || "Failed to connect wallet",
      })

      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  // Disconnect wallet (for UI purposes only, MetaMask doesn't actually support programmatic disconnection)
  const disconnectWallet = () => {
    // Store disconnection preference in localStorage
    localStorage.setItem('wallet-disconnected', 'true');
    
    setWalletState({
      address: null,
      chainId: null,
      isConnecting: false,
      isConnected: false,
      error: null,
    })

    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected. To reconnect, click 'Connect Wallet'.",
    })
    
    // Don't reload the page, as this can cause log out issues
    // Instead let the state update handle the UI
  }

  // Copy address to clipboard
  const copyAddressToClipboard = () => {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (isMetaMaskInstalled) {
      // Check if user manually disconnected
      const isManuallyDisconnected = localStorage.getItem('wallet-disconnected') === 'true';
      
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setWalletState({
            address: null,
            chainId: null,
            isConnecting: false,
            isConnected: false,
            error: null,
          })
        } else if (walletState.isConnected && !isManuallyDisconnected) {
          // Account changed while connected and not manually disconnected
          setWalletState((prev) => ({
            ...prev,
            address: accounts[0],
          }))

          toast({
            title: "Account Changed",
            description: `Switched to ${shortenAddress(accounts[0])}`,
          })
        }
      }

      const handleChainChanged = (chainId: string) => {
        if (walletState.isConnected && !isManuallyDisconnected) {
          setWalletState((prev) => ({
            ...prev,
            chainId,
          }))

          toast({
            title: "Network Changed",
            description: `Switched to chain ID: ${Number.parseInt(chainId, 16)}`,
          })

          // Only reload if we're in a connected state
          window.location.reload()
        }
      }

      // Subscribe to events
      window.ethereum?.on("accountsChanged", handleAccountsChanged)
      window.ethereum?.on("chainChanged", handleChainChanged)

      // Check if already connected, but respect the disconnected preference
      const checkConnection = async () => {
        if (isManuallyDisconnected) {
          // User previously disconnected, don't auto-connect
          return;
        }
        
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          const chainId = await window.ethereum.request({ method: "eth_chainId" })

          if (accounts.length > 0) {
            setWalletState({
              address: accounts[0],
              chainId,
              isConnecting: false,
              isConnected: true,
              error: null,
            })
          }
        } catch (error) {
          console.error("Error checking connection:", error)
        }
      }

      checkConnection()

      // Cleanup
      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum?.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [isMetaMaskInstalled, walletState.isConnected])

  // Helper to shorten address for display
  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Get network name based on chainId
  const getNetworkName = (chainId: string | null) => {
    if (!chainId) return "Unknown Network"

    const networks: Record<string, string> = {
      "0x1": "Ethereum Mainnet",
      "0x3": "Ropsten Testnet",
      "0x4": "Rinkeby Testnet",
      "0x5": "Goerli Testnet",
      "0x2a": "Kovan Testnet",
      "0x89": "Polygon Mainnet",
      "0x13881": "Polygon Mumbai",
      "0xa86a": "Avalanche Mainnet",
      "0xa869": "Avalanche Fuji",
    }

    return networks[chainId] || `Chain ID: ${Number.parseInt(chainId, 16)}`
  }

  // View transaction on Etherscan
  const viewOnExplorer = () => {
    if (!walletState.address || !walletState.chainId) return

    const explorerUrls: Record<string, string> = {
      "0x1": "https://etherscan.io/address/",
      "0x3": "https://ropsten.etherscan.io/address/",
      "0x4": "https://rinkeby.etherscan.io/address/",
      "0x5": "https://goerli.etherscan.io/address/",
      "0x2a": "https://kovan.etherscan.io/address/",
      "0x89": "https://polygonscan.com/address/",
      "0x13881": "https://mumbai.polygonscan.com/address/",
      "0xa86a": "https://snowtrace.io/address/",
      "0xa869": "https://testnet.snowtrace.io/address/",
    }

    const baseUrl = explorerUrls[walletState.chainId] || "https://etherscan.io/address/"
    window.open(`${baseUrl}${walletState.address}`, "_blank")
  }

  return (
    <>
      {!walletState.isConnected ? (
        <Button onClick={connectWallet} disabled={walletState.isConnecting} className="flex items-center gap-2">
          {walletState.isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </>
          )}
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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Connected Wallet</p>
                <p className="text-xs text-muted-foreground truncate">{walletState.address}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground">
              {getNetworkName(walletState.chainId)}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copyAddressToClipboard}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy Address</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={viewOnExplorer}>
              <ExternalLink className="mr-2 h-4 w-4" />
              <span>View on Explorer</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={disconnectWallet} className="text-red-500">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}

