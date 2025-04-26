"use client"

import { WalletConnectModal } from "@/components/wallet/wallet-connect-modal"
import { WalletProfileButton } from "@/components/wallet/wallet-profile-button"
import { useWallet } from "@/components/wallet/wallet-provider"

export function WalletConnector() {
  const { walletState } = useWallet()
  
  return (
    <>
      {walletState.isConnected ? <WalletProfileButton /> : <WalletConnectModal />}
    </>
  )
} 