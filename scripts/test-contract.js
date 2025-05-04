// Test script to debug token contract interactions
const { ethers } = require('ethers');

// The address of the token contract to test
const TOKEN_ADDRESS = '0xe70f935c32dA4dB13e7876795f1e175465e6458e';
const RPC_URL = 'http://localhost:8545';

// Helper to turn hex to string
function hexToString(hex) {
  // Remove 0x prefix
  hex = hex.startsWith('0x') ? hex.slice(2) : hex;
  
  // Convert hex to buffer then to string
  const bytes = Buffer.from(hex, 'hex');
  return bytes.toString();
}

async function main() {
  console.log('Connecting to the blockchain...');
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  try {
    // Test blockchain connection
    const blockNumber = await provider.getBlockNumber();
    console.log(`Connected successfully! Current block: ${blockNumber}`);
    
    // Check if contract exists
    const code = await provider.getCode(TOKEN_ADDRESS);
    if (!code || code === '0x') {
      console.error('Contract not found at the specified address!');
      return;
    }
    console.log(`Contract exists at ${TOKEN_ADDRESS} (code length: ${code.length})`);

    // Test standard ERC20 functions
    console.log('\nTesting standard ERC20 functions:');
    
    // Try symbol()
    try {
      const symbolData = '0x95d89b41'; // symbol() function selector
      const symbolResult = await provider.call({
        to: TOKEN_ADDRESS,
        data: symbolData
      });
      console.log('symbol() result:', symbolResult);
      
      // Try to decode the symbol (ERC20 strings are encoded as dynamic bytes)
      if (symbolResult && symbolResult.length >= 66) {
        try {
          // Basic ABI decoding
          const stringPos = parseInt(symbolResult.slice(2 + 64), 16);
          const stringLen = parseInt(symbolResult.slice(2 + 64 + stringPos * 2, 2 + 64 + stringPos * 2 + 64), 16);
          const stringData = symbolResult.slice(2 + 64 + stringPos * 2 + 64, 2 + 64 + stringPos * 2 + 64 + stringLen * 2);
          const symbol = hexToString(stringData);
          console.log('Decoded symbol:', symbol);
        } catch (decodeError) {
          console.error('Error decoding symbol:', decodeError.message);
        }
      }
    } catch (error) {
      console.error('symbol() call failed:', error.message);
    }
    
    // Try decimals()
    try {
      const decimalsData = '0x313ce567'; // decimals() function selector
      const decimalsResult = await provider.call({
        to: TOKEN_ADDRESS,
        data: decimalsData
      });
      console.log('decimals() result:', decimalsResult);
      
      // Decode the result (uint8)
      if (decimalsResult && decimalsResult.length >= 66) {
        const decimals = parseInt(decimalsResult.slice(2), 16);
        console.log('Decoded decimals:', decimals);
      }
    } catch (error) {
      console.error('decimals() call failed:', error.message);
    }
    
    // Test purchase functions
    console.log('\nTesting purchase functions:');
    
    // Array of common purchase functions to test
    const purchaseFunctions = [
      { name: 'buyTokens()', selector: '0x3610724e' },
      { name: 'buy()', selector: '0xa6f2ae3a' },
      { name: 'purchase()', selector: '0x64420bb8' },
      { name: 'mint()', selector: '0x1249c58b' }
    ];
    
    // Test each function
    for (const func of purchaseFunctions) {
      console.log(`\nTesting ${func.name}...`);
      
      try {
        // First try to call (this will likely fail but show the error)
        try {
          const callResult = await provider.call({
            to: TOKEN_ADDRESS,
            data: func.selector,
            value: ethers.utils.parseEther('0.000001') // Small amount for testing
          });
          console.log(`${func.name} call succeeded:`, callResult);
        } catch (callError) {
          console.log(`${func.name} call failed:`, callError.message);
          
          // If it contains a revert message, the function might exist but require different params
          if (callError.message.includes('revert') && 
              !callError.message.includes('function selector was not recognized')) {
            console.log(`${func.name} might exist but reverted`);
          }
        }
        
        // Try to estimate gas (this is what our detection uses)
        try {
          const gasEstimate = await provider.estimateGas({
            to: TOKEN_ADDRESS,
            data: func.selector,
            value: ethers.utils.parseEther('0.000001') // Small amount for testing
          });
          console.log(`${func.name} estimateGas succeeded:`, gasEstimate.toString());
        } catch (estimateError) {
          console.log(`${func.name} estimateGas failed:`, estimateError.message);
        }
      } catch (error) {
        console.error(`Error testing ${func.name}:`, error.message);
      }
    }
    
    // Test raw ETH transfer to the contract
    console.log('\nTesting raw ETH transfer to the contract...');
    try {
      const gasEstimate = await provider.estimateGas({
        to: TOKEN_ADDRESS,
        value: ethers.utils.parseEther('0.000001'), // Small amount for testing
        data: '0x' // Empty data = raw ETH transfer
      });
      console.log('ETH transfer estimateGas succeeded:', gasEstimate.toString());
      console.log('The contract can receive ETH transfers!');
    } catch (error) {
      console.error('ETH transfer estimateGas failed:', error.message);
      console.log('The contract may not be able to receive ETH transfers');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 