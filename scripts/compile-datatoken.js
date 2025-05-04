// Script to compile the Datatoken contract and extract its bytecode
const fs = require('fs');
const path = require('path');

// Path to Contracts project
const contractsPath = path.join(__dirname, '..', '..', 'Contracts');
const artifactsPath = path.join(contractsPath, 'artifacts', 'contracts', 'Datatoken.sol', 'DataToken.json');
const outputPath = path.join(__dirname, '..', 'lib', 'contracts', 'bytecode', 'DataToken.js');

// Ensure the directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function extractBytecode() {
  try {
    console.log(`Looking for contract artifacts at ${artifactsPath}`);

    if (!fs.existsSync(artifactsPath)) {
      console.error('Datatoken contract artifacts not found.');
      console.error('Please compile the contracts first:');
      console.error('cd ../Contracts && npx hardhat compile');
      return 1;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
    const bytecode = artifact.bytecode;
    
    console.log(`Bytecode length: ${bytecode.length} characters`);
    
    // Create a JavaScript module that exports the bytecode
    const content = `// Auto-generated from Datatoken contract compilation
// This file contains the full bytecode of the Datatoken contract for direct deployment

export const DatatokenBytecode = "${bytecode}";

// Also export the ABI for creating interfaces
export const DatatokenAbi = ${JSON.stringify(artifact.abi, null, 2)};
`;

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`Bytecode successfully exported to ${outputPath}`);
    
    return 0;
  } catch (error) {
    console.error('Error extracting bytecode:', error);
    return 1;
  }
}

// Run the extract function
extractBytecode()
  .then(code => process.exit(code))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 