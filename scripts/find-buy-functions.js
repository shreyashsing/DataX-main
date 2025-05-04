const { ethers } = require('ethers');

// Configuration
const TOKEN_ADDRESS = '0xe70f935c32dA4dB13e7876795f1e175465e6458e';
const USER_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const RPC_URL = 'http://localhost:8545';

// From decompiled bytecode and contract verification info, 
// these are the potential function signatures to test
const POTENTIAL_FUNCTIONS = [
  // Direct buy functions with various parameter formats
  { name: 'buyTokens()', selector: '3610724e' },
  { name: 'buyTokens(uint256)', selector: 'b7ec1a33' },
  { name: 'buy()', selector: 'a6f2ae3a' },
  { name: 'buy(uint256)', selector: '6ea056a9' },
  { name: 'purchase()', selector: '64420bb8' },
  { name: 'mint()', selector: '1249c58b' },
  { name: 'mint(address)', selector: '40c10f19' },
  { name: 'mint(address,uint256)', selector: '40c10f19' },
  
  // Check for related token contract functions
  { name: 'tokenPrice()', selector: '8d978d7c' },
  { name: 'calculateTokenAmount(uint256)', selector: 'ca9c45ed' },
  { name: 'owner()', selector: '8da5cb5b' },
  { name: 'redeem()', selector: '1e9a6950' }
];

// Test parameters with different formats
const TEST_PARAMETERS = [
  // No parameters
  '',
  
  // uint256 amount parameter (1 token with 18 decimals)
  '000000000000000000000000000000000000000000000000000de0b6b3a7640000',
  
  // address parameter (the user's address)
  '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  
  // address + uint256 parameter
  '000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000de0b6b3a7640000',
];

async function main() {
  console.log('Connecting to blockchain...');
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Get code to verify it's a contract
  const code = await provider.getCode(TOKEN_ADDRESS);
  console.log('Contract bytecode size:', (code.length - 2) / 2, 'bytes');
  
  console.log('\n--- Checking function signatures ---');
  
  // Try all function signatures
  for (const func of POTENTIAL_FUNCTIONS) {
    console.log(`\nTesting ${func.name}...`);
    
    // First check if function exists (dry run call with no parameters)
    try {
      const result = await provider.call({
        to: TOKEN_ADDRESS,
        data: `0x${func.selector}`
      });
      
      console.log(`✅ Function call succeeded!`);
      console.log(`Result: ${result}`);
      
      // If function returns data, try to decode it
      if (result && result !== '0x') {
        // For numbers, try to parse
        try {
          const value = ethers.BigNumber.from(result);
          console.log(`Decoded value: ${value.toString()} (${ethers.utils.formatEther(value)} ETH)`);
        } catch (e) {
          // Not a number, might be encoded data
          console.log(`Raw result: ${result}`);
        }
      }
      
      // For successful read functions, we'll now test with different parameters
      if (func.name.includes('(uint256)') || 
          func.name.includes('(address)') || 
          func.name.includes('(address,uint256)')) {
        
        console.log('  Testing with different parameters:');
        for (const params of TEST_PARAMETERS) {
          if (params) {
            try {
              const paramResult = await provider.call({
                to: TOKEN_ADDRESS,
                data: `0x${func.selector}${params}`
              });
              
              console.log(`  ✅ Parameters ${params.slice(0, 10)}... worked!`);
              console.log(`  Result: ${paramResult}`);
            } catch (e) {
              console.log(`  ❌ Parameters ${params.slice(0, 10)}... failed: ${e.message.split('\n')[0]}`);
            }
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Function call failed: ${error.message.split('\n')[0]}`);
      
      // If it's a payable function, it might require ETH
      if (func.name.includes('buy') || func.name.includes('mint') || func.name.includes('purchase')) {
        console.log('  Trying with ETH value...');
        
        // Test each parameter format
        for (const params of TEST_PARAMETERS) {
          try {
            await provider.estimateGas({
              to: TOKEN_ADDRESS,
              data: `0x${func.selector}${params}`,
              value: ethers.utils.parseEther('0.1') // 0.1 ETH
            });
            
            console.log(`  ✅ Function ${func.name} with params ${params ? params.slice(0,10) + '...' : 'none'} and ETH value might work!`);
            console.log(`  👉 To execute: sendTransaction with data=0x${func.selector}${params} and value=0.1 ETH`);
            
            // Create potential fix for the application
            console.log(`\n  POTENTIAL FIX FOR YOUR APP:`);
            console.log(`  In provider.js: detectPurchaseFunction should include the following:`);
            console.log(`  {
    name: '${func.name.split('(')[0]}',
    selector: '0x${func.selector}',
    args: [${params ? (func.name.includes('uint256') ? 'ethers.utils.parseEther("1")' : 'userAddress') : ''}]
  }`);
          } catch (e) {
            if (e.message.includes('incorrect parameters')) {
              console.log(`  ⚠️ Function exists but needs correct parameters: ${e.message.split('\n')[0]}`);
            } else {
              console.log(`  ❌ Function with ETH value failed: ${e.message.split('\n')[0]}`);
            }
          }
        }
      }
    }
  }
  
  // Check token balance before and after
  console.log('\n--- Checking token balance for user ---');
  try {
    // balanceOf function selector + address parameter
    const balanceData = `0x70a08231000000000000000000000000${USER_ADDRESS.substring(2)}`;
    
    const balance = await provider.call({
      to: TOKEN_ADDRESS,
      data: balanceData
    });
    
    const balanceNumber = ethers.BigNumber.from(balance);
    console.log('Current token balance:', ethers.utils.formatEther(balanceNumber));
    
    if (!balanceNumber.isZero()) {
      console.log('⚠️ User already has tokens before purchase!');
      console.log('This explains why first purchase shows user already has tokens.');
    }
  } catch (error) {
    console.error('Error checking balance:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 