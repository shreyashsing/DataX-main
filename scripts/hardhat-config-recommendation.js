// Script to generate Hardhat configuration recommendations for the Contracts folder
const fs = require('fs');
const path = require('path');

const configTemplate = `// This is a recommended hardhat.config.js with increased gas limits
// Copy this file to your Contracts folder and rename it to hardhat.config.js
// or modify your existing hardhat.config.js with these settings

require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 5000
      },
      allowUnlimitedContractSize: true,
      blockGasLimit: 30000000,  // Increased from default 30M (vs default 8M)
      gas: 25000000,            // Increased from default to 25M
      timeout: 60000            // Longer timeout for large contract deployments
    },
    localhost: {
      url: "http://127.0.0.1:8545/",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20
      },
      gas: 25000000,            // Increased gas for local testing
      blockGasLimit: 30000000,  // Higher block gas limit
      allowUnlimitedContractSize: true
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
`;

// Output file path
const outputPath = path.join(__dirname, '..', '..', 'Contracts', 'hardhat.config.recommended.js');

try {
  // Ensure we don't overwrite the existing hardhat.config.js
  const outputDir = path.dirname(outputPath);
  
  // Check if Contracts directory exists
  if (fs.existsSync(outputDir)) {
    fs.writeFileSync(outputPath, configTemplate, 'utf8');
    console.log(`Hardhat configuration recommendation written to: ${outputPath}`);
    console.log(`To use this configuration, copy it to hardhat.config.js or merge the settings with your existing config.`);
  } else {
    console.log(`Contracts directory not found at ${outputDir}`);
    console.log('Writing configuration recommendation to the local directory instead.');
    
    // Write to the current directory instead
    const localPath = path.join(__dirname, 'hardhat.config.recommended.js');
    fs.writeFileSync(localPath, configTemplate, 'utf8');
    console.log(`Hardhat configuration recommendation written to: ${localPath}`);
  }
  
  console.log('\n===== IMPORTANT =====');
  console.log('After updating the Hardhat configuration, you need to:');
  console.log('1. Stop any running Hardhat nodes');
  console.log('2. Start a new Hardhat node with: npx hardhat node --hostname 0.0.0.0');
  console.log('3. Re-deploy contracts with: npx hardhat run scripts/deploy-local.js --network localhost');
  console.log('4. Update the contract config with: node scripts/update-contract-config.js');
  console.log('\nThe new configuration increases gas limits for contract deployments, which should resolve the "Transaction ran out of gas" errors.');
} catch (error) {
  console.error('Error creating hardhat configuration recommendation:', error);
} 