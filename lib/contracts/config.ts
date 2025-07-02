// Contract configuration for different networks

interface NetworkConfig {
  name: string;
  rpcUrl: string;
  dataNFTAddress: string;
  aiVerificationAddress: string;
  marketplaceAddress: string;
  tokenFactoryAddress: string;
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
      tokenFactoryAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      explorerUrl: 'https://etherscan.io'
    },
    11155111: {
      name: 'Sepolia Testnet',
      rpcUrl: 'https://sepolia.infura.io/v3/your-infura-key',
      dataNFTAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      aiVerificationAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      marketplaceAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      tokenFactoryAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    80001: {
      name: 'Polygon Mumbai',
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
      dataNFTAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Replace with actual addresses when deployed
      aiVerificationAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      marketplaceAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      tokenFactoryAddress: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      explorerUrl: 'https://mumbai.polygonscan.com'
    },
    43900: {
      name: 'Polygon Amoy Testnet',
      rpcUrl: 'https://rpc-amoy.polygon.technology',
      dataNFTAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Replace with actual addresses when deployed
      aiVerificationAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      marketplaceAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      tokenFactoryAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      explorerUrl: 'https://www.oklink.com/amoy'
    },
    31337: {
      name: 'Hardhat Node',
      rpcUrl: 'http://localhost:8545',
      dataNFTAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      aiVerificationAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      marketplaceAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      tokenFactoryAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      explorerUrl: ''
    },
    // For Hardhat Node (chainId 1337)
    1337: {
      name: 'Hardhat Node',
      rpcUrl: 'http://localhost:8545',
      dataNFTAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Updated from new deployment
      aiVerificationAddress: '0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f', // Updated from new deployment (using LINK token address)
      marketplaceAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', // Updated from new deployment
      tokenFactoryAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // Updated from new deployment
      explorerUrl: ''
    }
  },
  defaultNetwork: 1337 // Set Hardhat node as default for development
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