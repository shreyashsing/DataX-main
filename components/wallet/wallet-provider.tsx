"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"
import { SUPPORTED_WALLETS, SUPPORTED_CHAINS, WalletInfo, ChainConfig } from "@/lib/wallet/connectors"

// Type for Phantom Wallet
type PhantomWallet = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
}

export type WalletState = {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  walletId: string | null;
}

type WalletContextType = {
  walletState: WalletState;
  selectedChain: ChainConfig | null;
  connectWallet: (wallet: WalletInfo) => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chain: ChainConfig) => Promise<void>;
  shortenAddress: (address: string) => string;
  copyAddressToClipboard: () => void;
  viewOnExplorer: () => void;
  getCurrentWalletInfo: () => WalletInfo | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    error: null,
    walletId: null
  })
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
        disconnectWallet()
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
  const disconnectWallet = () => {
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
  const copyAddressToClipboard = () => {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  // View on explorer
  const viewOnExplorer = () => {
    if (!walletState.address || !selectedChain) return

    const explorer = selectedChain.blockExplorers[0]
    if (explorer) {
      window.open(`${explorer.url}/address/${walletState.address}`, "_blank")
    }
  }

  // Switch network
  const switchNetwork = async (chain: ChainConfig) => {
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
    return SUPPORTED_WALLETS.find(w => w.id === walletState.walletId) || null
  }

  return (
    <WalletContext.Provider 
      value={{
        walletState,
        selectedChain,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        shortenAddress,
        copyAddressToClipboard,
        viewOnExplorer,
        getCurrentWalletInfo,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
} 