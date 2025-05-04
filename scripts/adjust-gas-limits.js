// Script to adjust gas limits in API routes based on contract complexity
const fs = require('fs');
const path = require('path');

// Files to check and update
const apiFiles = [
  path.join(__dirname, '..', 'app', 'api', 'mint', 'route.ts'),
  path.join(__dirname, '..', 'app', 'api', 'token', 'route.ts'),
  path.join(__dirname, '..', 'app', 'api', 'token', 'link-token', 'route.ts'),
  path.join(__dirname, '..', 'app', 'api', 'link-token', 'route.ts'),
  path.join(__dirname, '..', 'app', 'api', 'datasets', 'list-for-sale', 'route.ts')
];

// Gas limit configuration - customize as needed
const gasLimits = {
  'mint': 8000000,
  'tokenCreation': 10000000,
  'tokenDeploy': 9000000,
  'tokenLink': 1000000,
  'marketplace': 1000000
};

function updateGasLimits() {
  console.log('Updating gas limits in API routes...');
  
  // Process each file
  apiFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Check which type of file we're dealing with
      if (filePath.includes('mint/route.ts')) {
        // Handle mint API
        content = updateGasLimitInContent(content, 'mintTx', gasLimits.mint, 'Mint transaction');
        content = updateGasLimitInContent(content, 'createTokenTx', gasLimits.tokenCreation, 'Token creation');
        modified = true;
      } else if (filePath.includes('token/route.ts')) {
        // Handle token API
        content = updateGasLimitInContent(content, 'unsignedTx', gasLimits.tokenDeploy, 'Token deployment');
        modified = true;
      } else if (filePath.includes('link-token/route.ts') || filePath.includes('link-token/route.ts')) {
        // Handle token linking API
        content = updateGasLimitInContent(content, 'unsignedTx', gasLimits.tokenLink, 'Token linking');
        modified = true;
      } else if (filePath.includes('list-for-sale/route.ts')) {
        // Handle marketplace listing API
        content = updateGasLimitInContent(content, 'listingTransaction', gasLimits.marketplace, 'Marketplace listing');
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated gas limits in ${path.basename(filePath)}`);
      } else {
        console.log(`No changes needed in ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`Error updating ${filePath}:`, error);
    }
  });
  
  console.log('\nGas limit update complete!');
  console.log('Current gas limit configuration:');
  console.log(`- Mint transactions: ${gasLimits.mint}`);
  console.log(`- Token creation: ${gasLimits.tokenCreation}`);
  console.log(`- Direct token deployment: ${gasLimits.tokenDeploy}`);
  console.log(`- Token linking: ${gasLimits.tokenLink}`);
  console.log(`- Marketplace listings: ${gasLimits.marketplace}`);
  console.log('\nIf you still encounter "Transaction ran out of gas" errors,');
  console.log('edit this script to increase the limits and run it again.');
}

// Helper function to update gas limit in content
function updateGasLimitInContent(content, variableName, newGasLimit, operationName) {
  const gasLimitRegex = new RegExp(`(${variableName}\\s*=\\s*{[^}]*gasLimit:\\s*ethers\\.utils\\.hexlify\\()([0-9]+)(\\))`, 'g');
  
  // Check if the pattern is found
  if (gasLimitRegex.test(content)) {
    // Replace with new gas limit
    content = content.replace(gasLimitRegex, (match, prefix, currentLimit, suffix) => {
      console.log(`  - ${operationName}: updating gas limit from ${currentLimit} to ${newGasLimit}`);
      return `${prefix}${newGasLimit}${suffix}`;
    });
  } else {
    console.log(`  - Could not find gas limit pattern for ${operationName}`);
  }
  
  return content;
}

// Run the update
updateGasLimits(); 