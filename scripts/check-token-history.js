const { ethers } = require('ethers');

// Configuration
const TOKEN_ADDRESS = '0xe70f935c32dA4dB13e7876795f1e175465e6458e';
const USER_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const RPC_URL = 'http://localhost:8545';

// Simple ABI
const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)', 
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
  'function transferFrom(address,address,uint256) returns (bool)',
  'function approve(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)',
  'function owner() view returns (address)',
  'function tokenPrice() view returns (uint256)',
  'function buyTokens() payable',
  'function buyTokens(uint256) payable'
];

async function main() {
  console.log('Connecting to blockchain...');
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Try to create the contract using ABI
  try {
    const contract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    console.log('Contract instance created');
    
    // Get basic info
    console.log('\n--- Token Information ---');
    try {
      const name = await contract.name();
      console.log('Name:', name);
    } catch (e) {
      console.log('Name: Error -', e.message);
    }
    
    try {
      const symbol = await contract.symbol();
      console.log('Symbol:', symbol);
    } catch (e) {
      console.log('Symbol: Error -', e.message);
    }
    
    try {
      const decimals = await contract.decimals();
      console.log('Decimals:', decimals.toString());
    } catch (e) {
      console.log('Decimals: Error -', e.message);
    }
    
    try {
      const totalSupply = await contract.totalSupply();
      console.log('Total Supply:', ethers.utils.formatEther(totalSupply));
    } catch (e) {
      console.log('Total Supply: Error -', e.message);
    }
    
    try {
      const balance = await contract.balanceOf(USER_ADDRESS);
      console.log('User Balance:', ethers.utils.formatEther(balance));
    } catch (e) {
      console.log('User Balance: Error -', e.message);
    }
    
    try {
      const owner = await contract.owner();
      console.log('Owner:', owner);
    } catch (e) {
      console.log('Owner: Error -', e.message);
    }
    
    try {
      const price = await contract.tokenPrice();
      console.log('Token Price:', ethers.utils.formatEther(price), 'ETH');
    } catch (e) {
      console.log('Token Price: Error -', e.message);
    }
    
  } catch (error) {
    console.error('Error creating contract instance:', error.message);
  }
  
  // Find out when this contract was created
  console.log('\n--- Contract Creation History ---');
  try {
    const code = await provider.getCode(TOKEN_ADDRESS);
    if (code === '0x') {
      console.log('No contract found at the address');
      return;
    }
    
    console.log('Contract exists with bytecode length:', (code.length - 2) / 2, 'bytes');
    
    // Try to find transaction that created the contract
    console.log('Looking for contract creation transaction...');
    
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    console.log('Current block:', currentBlock);
    
    // Look for transactions to this contract
    console.log('Checking for transactions involving this contract...');
    let found = false;
    
    // First try to get transaction history of the token contract
    // We'll check the most recent 50 blocks only (for performance)
    const startBlock = Math.max(0, currentBlock - 50);
    
    for (let i = currentBlock; i >= startBlock; i--) {
      const block = await provider.getBlockWithTransactions(i);
      
      for (const tx of block.transactions) {
        if (tx.to === TOKEN_ADDRESS || tx.from === TOKEN_ADDRESS || 
            (tx.creates && tx.creates.toLowerCase() === TOKEN_ADDRESS.toLowerCase())) {
          console.log(`\nFound transaction in block ${i}:`);
          console.log('- Hash:', tx.hash);
          console.log('- From:', tx.from);
          console.log('- To:', tx.to || 'Contract Creation');
          console.log('- Value:', ethers.utils.formatEther(tx.value), 'ETH');
          
          // Get receipt to check for events
          const receipt = await provider.getTransactionReceipt(tx.hash);
          if (receipt && receipt.logs && receipt.logs.length > 0) {
            console.log('- Logs:', receipt.logs.length);
            
            // Check for Transfer events which might indicate initial token distribution
            for (const log of receipt.logs) {
              if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                // This is a Transfer event
                const from = '0x' + log.topics[1].substring(26);
                const to = '0x' + log.topics[2].substring(26);
                const value = ethers.BigNumber.from(log.data);
                
                console.log('  Transfer Event:');
                console.log('  - From:', from);
                console.log('  - To:', to);
                console.log('  - Value:', ethers.utils.formatEther(value));
                
                if (from === '0x0000000000000000000000000000000000000000') {
                  console.log('  ⚠️ This is a mint transaction - tokens created');
                }
              }
            }
          }
          
          found = true;
        }
      }
      
      if (found) break;
    }
    
    if (!found) {
      console.log('No transactions found in the last 50 blocks');
    }
    
  } catch (error) {
    console.error('Error getting contract history:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 