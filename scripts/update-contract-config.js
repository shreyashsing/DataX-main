// Script to update contract addresses in config.ts based on deployment-local.json
const fs = require('fs');
const path = require('path');

// Path to the config file
const configPath = path.join(__dirname, '..', 'lib', 'contracts', 'config.ts');

// Path to the deployment-local.json file
const deploymentPath = path.join(__dirname, '..', '..', 'Contracts', 'deployment-local.json');

// Function to read and parse a file
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return null;
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

// Function to update config.ts with new contract addresses
function updateConfig() {
  try {
    // Read the deployment file
    const deployment = readJsonFile(deploymentPath);
    if (!deployment) {
      console.error('Could not read deployment file. Make sure contracts are deployed.');
      return;
    }

    console.log('Deployment data found:', deployment);

    // Read the config file
    if (!fs.existsSync(configPath)) {
      console.error(`Config file not found: ${configPath}`);
      return;
    }
    
    let configContent = fs.readFileSync(configPath, 'utf8');

    // Extract network configurations for Hardhat and local networks
    const hardhatNetworkRegex = /(31337: {[^}]*})/s;
    const localNetworkRegex = /(1337: {[^}]*})/s;

    // Create updated network configs
    const hardhatNetworkConfig = `31337: {
      name: 'Hardhat Local',
      rpcUrl: 'http://127.0.0.1:8545',
      dataNFTAddress: '${deployment.dataNFT}',
      aiVerificationAddress: '${deployment.linkToken}',
      marketplaceAddress: '${deployment.marketplace}',
      tokenFactoryAddress: '${deployment.tokenFactory}',
      explorerUrl: ''
    }`;

    const localNetworkConfig = `1337: {
      name: 'Hardhat Node',
      rpcUrl: 'http://localhost:8545',
      dataNFTAddress: '${deployment.dataNFT}',
      aiVerificationAddress: '${deployment.linkToken}',
      marketplaceAddress: '${deployment.marketplace}',
      tokenFactoryAddress: '${deployment.tokenFactory}',
      explorerUrl: ''
    }`;

    // Replace the configurations in the file
    configContent = configContent.replace(hardhatNetworkRegex, hardhatNetworkConfig);
    configContent = configContent.replace(localNetworkRegex, localNetworkConfig);

    // Write the updated content back to the file
    fs.writeFileSync(configPath, configContent, 'utf8');

    console.log('Contract configuration updated successfully!');
    console.log('New addresses:');
    console.log('- DataNFT:', deployment.dataNFT);
    console.log('- TokenFactory:', deployment.tokenFactory);
    console.log('- Marketplace:', deployment.marketplace);
    console.log('- LinkToken:', deployment.linkToken);
  } catch (error) {
    console.error('Error updating config:', error);
  }
}

// Run the update function
updateConfig(); 