// This file defines the wallet connectors supported by the app

export type WalletInfo = {
  id: string;
  name: string;
  description: string;
  icon: string;
  installed?: boolean; // For injected wallets like MetaMask, Coinbase, etc.
  url?: string; // For mobile wallets or to download browser extensions
}

// Common wallet icons - usually you'd import these from image files
// For simplicity, we're using URLs here
const WALLET_ICONS = {
  metamask: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MetaMask_Fox.svg/1200px-MetaMask_Fox.svg.png',
  walletconnect: 'https://1000logos.net/wp-content/uploads/2022/05/WalletConnect-Logo.jpg',
  coinbase: 'https://www.logo.wine/a/logo/Coinbase/Coinbase-Icon-Logo.wine.svg',
  trust: 'https://trustwallet.com/assets/images/media/assets/TWT.svg',
  phantom: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkw_XC3LVGwmVYYTgp_h7g7u_vUoAZ6ZQNwGfUTXxIX5t5PoKcqDYEeOWPWYZd24_Q-Qw&usqp=CAU'
};

// Type definition for injected wallet providers
type EthereumProvider = {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
}

type PhantomProvider = {
  solana?: unknown;
}

// Add wallet interfaces to the global Window type
declare global {
  interface Window {
    ethereum?: any; // Using 'any' type to avoid conflict with existing declarations
    phantom?: PhantomProvider;
  }
}

export const SUPPORTED_WALLETS: WalletInfo[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Connect to your MetaMask wallet',
    icon: WALLET_ICONS.metamask,
    installed: typeof window !== 'undefined' && !!window.ethereum?.isMetaMask,
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Scan with WalletConnect to connect',
    icon: WALLET_ICONS.walletconnect,
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    description: 'Connect to your Coinbase wallet',
    icon: WALLET_ICONS.coinbase,
    installed: typeof window !== 'undefined' && !!window.ethereum?.isCoinbaseWallet,
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    description: 'Connect to your Trust wallet',
    icon: WALLET_ICONS.trust,
    url: 'https://trustwallet.com/',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    description: 'Connect to your Phantom wallet',
    icon: WALLET_ICONS.phantom,
    installed: typeof window !== 'undefined' && !!window.phantom,
  }
];

// Chain configurations
export type ChainConfig = {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorers: {
    name: string;
    url: string;
  }[];
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum',
    network: 'mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorers: [
      {
        name: 'Etherscan',
        url: 'https://etherscan.io',
      },
    ],
  },
  {
    id: 137,
    name: 'Polygon',
    network: 'polygon',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorers: [
      {
        name: 'PolygonScan',
        url: 'https://polygonscan.com',
      },
    ],
  },
  {
    id: 43114,
    name: 'Avalanche',
    network: 'avalanche',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorers: [
      {
        name: 'SnowTrace',
        url: 'https://snowtrace.io',
      },
    ],
  },
  {
    id: 56,
    name: 'BNB Smart Chain',
    network: 'bsc',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorers: [
      {
        name: 'BscScan',
        url: 'https://bscscan.com',
      },
    ],
  },
  // Add more chains as needed
]; 