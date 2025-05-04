import { ethers } from 'ethers';
import { getConfig } from './config';

/**
 * Creates a blockchain provider with robust error handling and connection strategies
 */
export const createProvider = async (chainId = 1337) => {
  const networkConfig = getConfig(chainId);
  const rpcUrl = networkConfig.rpcUrl;
  
  console.log(`Creating provider for network ${networkConfig.name} (${chainId}) at ${rpcUrl}`);
  
  // Detect if running in server context
  const isServer = typeof window === 'undefined';
  console.log(`Running in ${isServer ? 'server' : 'client'} context`);
  
  // Try different provider strategies in sequence until one works
  const strategies = isServer 
    ? [
        createNodeBasedProvider,
        createJsonRpcWithNoReferrer,
        createDirectCallProvider
      ]
    : [
        createDefaultProvider,
        createJsonRpcProvider,
        createDirectCallProvider
      ];
  
  let lastError = null;
  
  for (const strategyFn of strategies) {
    try {
      const provider = await strategyFn(rpcUrl, networkConfig);
      // Test the provider with a simple call
      await provider.getBlockNumber();
      console.log(`Provider strategy ${strategyFn.name} succeeded`);
      return provider;
    } catch (err) {
      console.warn(`Provider strategy ${strategyFn.name} failed: ${err.message}`);
      lastError = err;
    }
  }
  
  console.error(`All provider strategies failed, last error: ${lastError?.message}`);
  throw new Error(`Failed to connect to blockchain: ${lastError?.message}`);
};

/**
 * Basic browser provider
 */
async function createDefaultProvider(rpcUrl) {
  if (typeof window === 'undefined') {
    throw new Error('createDefaultProvider is only available in browser context');
  }
  console.log('Trying ethers default provider...');
  return ethers.getDefaultProvider(rpcUrl);
}

/**
 * Standard JsonRPC provider
 */
async function createJsonRpcProvider(rpcUrl) {
  if (typeof window === 'undefined') {
    throw new Error('createJsonRpcProvider is only available in browser context'); 
  }
  console.log('Trying JsonRpcProvider...');
  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

/**
 * Server compatible JSON RPC provider
 */
async function createJsonRpcWithNoReferrer(rpcUrl) {
  console.log('Trying JsonRpcProvider with no referrer...');
  return new ethers.providers.JsonRpcProvider({
    url: rpcUrl,
    // These headers help avoid the "Referrer client is not a valid URL" error
    headers: {
      'Origin': 'https://localhost',
      'Referrer': '',
    }
  });
}

/**
 * Node.js based provider for server-side
 */
async function createNodeBasedProvider(rpcUrl) {
  if (typeof window !== 'undefined') {
    throw new Error('createNodeBasedProvider is only available in server context');
  }
  
  try {
    console.log('Trying StaticJsonRpcProvider...');
    return new ethers.providers.StaticJsonRpcProvider(rpcUrl);
  } catch (err) {
    console.warn('StaticJsonRpcProvider failed, trying JsonRpcProvider...');
    return new ethers.providers.JsonRpcProvider(rpcUrl);
  }
}

/**
 * Direct RPC call provider - minimal implementation that works in all contexts
 * This is a fallback when other strategies fail
 */
async function createDirectCallProvider(rpcUrl) {
  console.log('Falling back to DirectCallProvider...');
  
  const makeRpcCall = async (method, params) => {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://localhost',
          'Referrer': '',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (error) {
      console.error(`Direct RPC call failed (${method}):`, error);
      throw error;
    }
  };

  // Create a minimal provider interface
  return {
    _isDirectCallProvider: true,
    
    async getBlockNumber() {
      return parseInt(await makeRpcCall('eth_blockNumber', []), 16);
    },
    
    async getBalance(address, blockTag = 'latest') {
      const result = await makeRpcCall('eth_getBalance', [address, blockTag]);
      return ethers.BigNumber.from(result);
    },
    
    async call(transaction, blockTag = 'latest') {
      return await makeRpcCall('eth_call', [transaction, blockTag]);
    },
    
    async estimateGas(transaction) {
      const result = await makeRpcCall('eth_estimateGas', [transaction]);
      return ethers.BigNumber.from(result);
    },
    
    async getCode(address, blockTag = 'latest') {
      return await makeRpcCall('eth_getCode', [address, blockTag]);
    },
    
    async send(method, params) {
      return await makeRpcCall(method, params);
    }
  };
}

/**
 * Helper to detect which purchase function a token contract supports
 */
export const detectPurchaseFunction = async (provider, tokenAddress) => {
  // Functions to test, in order of preference
  const functions = [
    // ✅ THIS IS THE ONE! (With a 1 ETH value parameter)
    { name: 'buyTokens', selector: '0xb7ec1a33', args: [ethers.utils.parseEther('1')], params: '000000000000000000000000000000000000000000000000000de0b6b3a7640000' },
    
    // No-parameter alternatives
    { name: 'buyTokens', selector: '0x3610724e' },
    { name: 'buy', selector: '0xa6f2ae3a' },
    { name: 'purchase', selector: '0x64420bb8' },
    { name: 'mint', selector: '0x1249c58b' }
  ];
  
  console.log(`Detecting available purchase function on token contract ${tokenAddress}`);
  
  // First, try to detect standard ERC20 functions to verify contract exists and responds
  try {
    const symbolSelector = '0x95d89b41'; // symbol()
    await provider.call({
      to: tokenAddress,
      data: symbolSelector
    });
    
    console.log(`Token contract at ${tokenAddress} is responsive`);
  } catch (error) {
    console.error(`Token contract at ${tokenAddress} failed basic call:`, error.message);
    return { success: false, error: 'Token contract not responsive' };
  }
  
  // Next, check if user already has tokens (important for UX)
  try {
    // This needs to check if we're in browser context
    const userAddress = typeof window !== 'undefined' && window?.ethereum?.selectedAddress;
    if (userAddress) {
      // balanceOf function selector with address parameter
      const balanceSelector = `0x70a08231000000000000000000000000${userAddress.substring(2)}`;
      const balanceResult = await provider.call({
        to: tokenAddress,
        data: balanceSelector
      });
      
      const balance = ethers.BigNumber.from(balanceResult || '0x0');
      console.log(`User token balance: ${ethers.utils.formatEther(balance)} tokens`);
      
      // User already has tokens, might not need to purchase
      if (!balance.isZero()) {
        console.log('User already has tokens, may not need to purchase');
      }
    }
  } catch (error) {
    console.warn('Could not check token balance:', error.message);
  }
  
  // Try each purchase function with better error handling
  let functionErrors = [];
  let testedFunctions = 0;
  
  for (const func of functions) {
    try {
      testedFunctions++;
      console.log(`Testing ${func.name} function...`);
      
      // Special case for functions with parameters
      const callData = func.params 
        ? `${func.selector}${func.params}`
        : func.selector;
      
      // Try to estimate gas as a way to test if function exists and works
      try {
        await provider.estimateGas({
          to: tokenAddress,
          data: callData,
          value: ethers.utils.parseEther('0.01') // Small test amount
        });
        
        console.log(`✅ ${func.name} function works!`);
        return { 
          success: true, 
          function: func.name,
          selector: func.selector,
          hasParams: !!func.params
        };
      } catch (estimateError) {
        // If this is a revert but not "function not found", it might be a valid function
        // that just needs different parameters
        const errorMsg = estimateError?.message || '';
        if (errorMsg.includes('revert') && !errorMsg.includes('function not found')) {
          console.log(`${func.name} function exists but reverted. May need different parameters.`);
          functionErrors.push({ function: func.name, error: errorMsg });
        } else {
          console.log(`Function ${func.name} not available: ${errorMsg}`);
          functionErrors.push({ function: func.name, error: errorMsg });
        }
      }
    } catch (error) {
      console.error(`Error testing ${func.name} function:`, error);
      functionErrors.push({ function: func.name, error: error.message });
    }
  }
  
  // Check if the contract can receive ETH directly (fallback function)
  try {
    await provider.estimateGas({
      to: tokenAddress,
      value: ethers.utils.parseEther('0.01'),
      data: '0x'
    });
    console.log('Contract can receive ETH directly via fallback function');
    return {
      success: true,
      function: 'fallback',
      directEthTransfer: true
    };
  } catch (fallbackError) {
    console.error('Contract cannot receive ETH directly:', fallbackError.message);
  }

  // If we've tested functions but none worked, we still need to return something useful
  if (testedFunctions > 0) {
    console.log('No purchase function detected on token contract!');
    return { 
      success: false, 
      error: 'No purchase function found',
      testedFunctions,
      functionErrors 
    };
  }
  
  // For safety, return a minimally valid response even if all detection failed
  return { 
    success: false, 
    error: 'Failed to detect purchase methods',
    fallbackToDirectTransfer: true
  };
};

/**
 * Helper to check token balance with robust error handling
 */
export const getTokenBalance = async (provider, tokenAddress, userAddress) => {
  console.log(`Checking token balance for ${userAddress} on token ${tokenAddress}`);
  
  if (!provider || !tokenAddress || !userAddress) {
    console.error('Missing required parameters');
    return ethers.BigNumber.from(0);
  }
  
  try {
    // Approach 1: Use contract if we have a proper provider
    if (!provider._isDirectCallProvider) {
      try {
        const abi = ['function balanceOf(address) view returns (uint256)'];
        const token = new ethers.Contract(tokenAddress, abi, provider);
        return await token.balanceOf(userAddress);
      } catch (err) {
        console.warn('Contract-based balance check failed:', err.message);
        // Fall through to next approach
      }
    }
    
    // Approach 2: Direct call
    try {
      // balanceOf function selector with address parameter
      const data = `0x70a08231000000000000000000000000${userAddress.substring(2)}`;
      const result = await provider.call({
        to: tokenAddress,
        data
      });
      
      return ethers.BigNumber.from(result || '0x0');
    } catch (err) {
      console.warn('Direct call balance check failed:', err.message);
      // Fall through to default
    }
  } catch (error) {
    console.error('All balance check approaches failed:', error);
  }
  
  // Approach 3: Hard-coded default - return 0
  console.warn('All balance retrieval approaches failed, assuming zero balance');
  return ethers.BigNumber.from(0);
}; 