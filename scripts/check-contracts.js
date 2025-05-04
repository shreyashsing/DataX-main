// Script to check the status of deployed contracts
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Get the network configuration
const configPath = path.join(__dirname, '..', 'lib', 'contracts', 'config.ts');
let networkConfig;

// Extract addresses from config.ts
try {
  const configContent = fs.readFileSync(configPath, 'utf8');
  const addressMatches = configContent.match(/dataNFTAddress: ['"]([^'"]+)['"]/);
  const tokenFactoryMatches = configContent.match(/tokenFactoryAddress: ['"]([^'"]+)['"]/);
  const marketplaceMatches = configContent.match(/marketplaceAddress: ['"]([^'"]+)['"]/);

  networkConfig = {
    dataNFTAddress: addressMatches && addressMatches[1],
    tokenFactoryAddress: tokenFactoryMatches && tokenFactoryMatches[1],
    marketplaceAddress: marketplaceMatches && marketplaceMatches[1]
  };
} catch (error) {
  console.error('Error reading configuration:', error);
  process.exit(1);
}

// Create a provider
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

async function main() {
  console.log('Checking contract deployments and gas limits...');
  console.log('================================================');
  
  // Test blockchain connection
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Blockchain connection successful! Current block: ${blockNumber}`);
  } catch (error) {
    console.error('❌ Failed to connect to blockchain:', error.message);
    console.error('Make sure your Hardhat node is running with: npx hardhat node --hostname 0.0.0.0');
    process.exit(1);
  }
  
  // Check network parameters
  try {
    const block = await provider.getBlock('latest');
    console.log(`\nNetwork Parameters:`);
    console.log(`-----------------`);
    console.log(`Gas Limit: ${block.gasLimit.toString()} units`);
    
    if (block.gasLimit.lt(ethers.BigNumber.from('15000000'))) {
      console.warn(`⚠️ Block gas limit (${block.gasLimit.toString()}) may be too low for complex contracts.`);
      console.warn('Consider updating Hardhat config to increase block gas limit.');
    } else {
      console.log(`✅ Block gas limit is adequate for complex contracts.`);
    }
    
    const gasPrice = await provider.getGasPrice();
    console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  } catch (error) {
    console.error('Error checking network parameters:', error);
  }
  
  // Check contract deployments
  console.log(`\nContract Deployments:`);
  console.log(`-------------------`);
  
  const contracts = [
    { name: 'DataNFT', address: networkConfig.dataNFTAddress },
    { name: 'TokenFactory', address: networkConfig.tokenFactoryAddress },
    { name: 'Marketplace', address: networkConfig.marketplaceAddress }
  ];
  
  for (const contract of contracts) {
    try {
      if (!contract.address || contract.address === '0x0000000000000000000000000000000000000000') {
        console.log(`❌ ${contract.name}: Not configured`);
        continue;
      }
      
      const code = await provider.getCode(contract.address);
      if (code === '0x') {
        console.log(`❌ ${contract.name}: No contract at address ${contract.address}`);
      } else {
        // Try to estimate gas for a simple call to verify the contract
        try {
          console.log(`✅ ${contract.name}: Deployed at ${contract.address}`);
        } catch (error) {
          console.log(`⚠️ ${contract.name}: Deployed but may have issues`);
        }
      }
    } catch (error) {
      console.log(`❌ ${contract.name}: Error checking - ${error.message}`);
    }
  }
  
  console.log(`\nBytecode Availability:`);
  console.log(`-------------------`);
  
  // Check if Datatoken bytecode is available
  const bytecodeFile = path.join(__dirname, '..', 'lib', 'contracts', 'bytecode', 'DataToken.js');
  if (fs.existsSync(bytecodeFile)) {
    try {
      const content = fs.readFileSync(bytecodeFile, 'utf8');
      if (content.includes('DatatokenBytecode') && content.includes('0x')) {
        console.log('✅ Datatoken bytecode is available for direct deployment');
      } else {
        console.log('⚠️ Datatoken bytecode file exists but may be incomplete');
      }
    } catch (error) {
      console.log('❌ Error reading Datatoken bytecode file');
    }
  } else {
    console.log('❌ Datatoken bytecode file is missing');
    console.log('   Run: node scripts/compile-datatoken.js');
  }
  
  console.log('\nRecommendations:');
  console.log('---------------');
  
  if (!contracts[0].address || contracts[0].address === '0x0000000000000000000000000000000000000000') {
    console.log('1. Deploy contracts:');
    console.log('   cd ../Contracts');
    console.log('   npx hardhat node --hostname 0.0.0.0');
    console.log('   npx hardhat run scripts/deploy-local.js --network localhost');
  }
  
  if (contracts[0].address && await provider.getCode(contracts[0].address) !== '0x') {
    console.log('1. Update contract configuration:');
    console.log('   node scripts/update-contract-config.js');
  }
  
  console.log('2. Generate Hardhat configuration with higher gas limits:');
  console.log('   node scripts/hardhat-config-recommendation.js');
  
  if (!fs.existsSync(bytecodeFile)) {
    console.log('3. Compile Datatoken for direct deployment:');
    console.log('   node scripts/compile-datatoken.js');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error in contract check:', error);
    process.exit(1);
  }); 