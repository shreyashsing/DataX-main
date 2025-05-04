const { ethers } = require('ethers');

// Configuration
const TOKEN_ADDRESS = '0xe70f935c32dA4dB13e7876795f1e175465e6458e';
const USER_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const RPC_URL = 'http://localhost:8545';

async function main() {
  console.log('Connecting to blockchain...');
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Check token balance
  console.log(`Checking balance for user: ${USER_ADDRESS}`);
  
  // balanceOf function selector + address parameter
  const balanceData = `0x70a08231000000000000000000000000${USER_ADDRESS.substring(2)}`;
  
  try {
    const balance = await provider.call({
      to: TOKEN_ADDRESS,
      data: balanceData
    });
    
    const balanceNumber = ethers.BigNumber.from(balance);
    console.log('Token balance (hex):', balance);
    console.log('Token balance (decimal):', balanceNumber.toString());
    console.log('Token balance (readable):', ethers.utils.formatEther(balance));
    
    if (!balanceNumber.isZero()) {
      console.log('⚠️ User already has tokens before purchase!');
    }
  } catch (error) {
    console.error('Error checking balance:', error.message);
  }
  
  // Check bytecode to understand the contract
  console.log('\nFetching contract bytecode...');
  const code = await provider.getCode(TOKEN_ADDRESS);
  console.log(`Contract code length: ${(code.length - 2) / 2} bytes`);
  
  // Try to detect buyTokens implementation
  console.log('\nAttempting to find buyTokens implementation...');
  try {
    // Look for different buyTokens signatures
    const signatures = [
      { name: 'buyTokens()', selector: '0x3610724e' },
      { name: 'buyTokens(uint256)', selector: '0xb7ec1a33' }
    ];
    
    for (const sig of signatures) {
      console.log(`Testing ${sig.name}...`);
      try {
        // Try to call with no parameters
        await provider.call({
          to: TOKEN_ADDRESS,
          data: sig.selector,
          value: ethers.utils.parseEther('0.1')
        });
        console.log(`✅ ${sig.name} works!`);
      } catch (error) {
        console.log(`❌ ${sig.name} error: ${error.message}`);
        
        // Look for specific error patterns
        if (error.message.includes('incorrect parameters')) {
          console.log('   Function exists but needs correct parameters');
        } else if (error.message.includes('not recognized')) {
          console.log('   Function does not exist');
        }
      }
    }
  } catch (error) {
    console.error('Error testing functions:', error);
  }
  
  // Try to get source code via constructor args
  console.log('\nGetting token construction info...');
  try {
    // Name
    const nameData = '0x06fdde03';
    const nameResult = await provider.call({
      to: TOKEN_ADDRESS,
      data: nameData
    });
    
    if (nameResult && nameResult.length >= 66) {
      // Attempt to decode string
      try {
        const offset = parseInt(nameResult.slice(2 + 64), 16);
        const length = parseInt(nameResult.slice(2 + 64 + offset * 2, 2 + 64 + offset * 2 + 64), 16);
        const hexData = nameResult.slice(2 + 64 + offset * 2 + 64, 2 + 64 + offset * 2 + 64 + length * 2);
        const name = Buffer.from(hexData, 'hex').toString();
        console.log('Token name:', name);
      } catch (e) {
        console.log('Name result (raw):', nameResult);
      }
    }
  } catch (error) {
    console.error('Error getting name:', error.message);
  }
  
  console.log('\nChecking for tokenPrice() function...');
  try {
    // Try tokenPrice function (0x8d978d7c)
    const priceData = '0x8d978d7c';
    const priceResult = await provider.call({
      to: TOKEN_ADDRESS,
      data: priceData
    });
    
    if (priceResult) {
      const price = ethers.BigNumber.from(priceResult);
      console.log('Token price (wei):', price.toString());
      console.log('Token price (ETH):', ethers.utils.formatEther(price));
    }
  } catch (error) {
    console.log('Token price error:', error.message);
  }

  // Try to buy tokens
  console.log('\nAttempting to buy tokens...');
  // We need a signer to send transactions
  try {
    const signer = provider.getSigner(USER_ADDRESS);
    
    // buyTokens with amount parameter
    const buyData = '0xb7ec1a33000000000000000000000000000000000000000000000000000de0b6b3a7640000'; // 1 token with 18 decimals
    
    try {
      const tx = await signer.sendTransaction({
        to: TOKEN_ADDRESS,
        data: buyData,
        value: ethers.utils.parseEther('0.1'),
        gasLimit: 300000
      });
      
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction mined:', receipt);
    } catch (error) {
      console.error('Error buying tokens:', error.message);
    }
    
  } catch (error) {
    console.error('Signer error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 