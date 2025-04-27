// Contract configuration for different networks

interface NetworkConfig {
  name: string;
  rpcUrl: string;
  dataNFTAddress: string;
  aiVerificationAddress: string;
  marketplaceAddress: string;
  explorerUrl: string;
}

interface ContractConfig {
  networks: {
    [key: number]: NetworkConfig;
  };
  defaultNetwork: number;
}

const config: ContractConfig = {
  networks: {
    1: {
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
      dataNFTAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      aiVerificationAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      marketplaceAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      explorerUrl: 'https://etherscan.io'
    },
    11155111: {
      name: 'Sepolia Testnet',
      rpcUrl: 'https://sepolia.infura.io/v3/your-infura-key',
      dataNFTAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      aiVerificationAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      marketplaceAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    80001: {
      name: 'Polygon Mumbai',
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
      dataNFTAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Replace with actual addresses when deployed
      aiVerificationAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      marketplaceAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      explorerUrl: 'https://mumbai.polygonscan.com'
    },
    43900: {
      name: 'Polygon Amoy Testnet',
      rpcUrl: 'https://rpc-amoy.polygon.technology',
      dataNFTAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Replace with actual addresses when deployed
      aiVerificationAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      marketplaceAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      explorerUrl: 'https://www.oklink.com/amoy'
    },
    31337: {
      name: 'Hardhat Local',
      rpcUrl: 'http://127.0.0.1:8545',
      dataNFTAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // From local deployment
      aiVerificationAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // From local deployment
      marketplaceAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', // From local deployment
      explorerUrl: ''
    }
  },
  defaultNetwork: 31337 // Set Hardhat local as default for development
};

export const getConfig = (chainId: number = config.defaultNetwork): NetworkConfig => {
  return config.networks[chainId] || config.networks[config.defaultNetwork];
};

export const getSupportedNetworks = () => {
  return Object.entries(config.networks).map(([chainId, network]) => ({
    id: parseInt(chainId),
    name: network.name
  }));
};

export default config; 