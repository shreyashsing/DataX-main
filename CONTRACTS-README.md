# Contract Deployment and Configuration

This document outlines the steps to properly deploy the contracts and update the DataX web application configuration.

## Prerequisites

- Node.js and npm installed
- Hardhat environment set up

## Deploying Contracts

1. First, make sure the Hardhat node is running:

```bash
cd Contracts
npx hardhat node --hostname 0.0.0.0
```

2. In a separate terminal, deploy the contracts:

```bash
cd Contracts
npx hardhat clean
npx hardhat compile
npx hardhat run scripts/deploy-local.js --network localhost
```

This will deploy all the required contracts and create a `deployment-local.json` file with the contract addresses.

## Updating Contract Configuration

There are two ways to update the contract configuration in the web application:

### Automatic Update

Run the update script that reads the deployment file and updates the configuration:

```bash
cd DataX-WebApplication
node scripts/update-contract-config.js
```

### Manual Update

If the automatic update doesn't work:

1. Open the `deployment-local.json` file in the Contracts directory
2. Copy the contract addresses for `dataNFT`, `tokenFactory`, `marketplace`, and `linkToken`
3. Open the `lib/contracts/config.ts` file in the DataX-WebApplication directory
4. Update the addresses in both the `31337` and `1337` network configurations

## Troubleshooting

If you encounter issues with contract calls (especially the DataToken creation), check for these common problems:

### 1. Contract Address Mismatch

Make sure the addresses in `config.ts` match the addresses in `deployment-local.json`.

### 2. Gas Limit Issues

If transactions are failing with "out of gas" errors, you may need to increase the gas limit in the API routes:
- Edit `app/api/mint/route.ts` and increase the `gasLimit` parameter for the transactions

The current codebase has been updated with higher gas limits to address this issue:
- Mint transactions now use 8,000,000 gas (up from 4,000,000)
- Token creation uses 10,000,000 gas (up from 7,000,000) 
- Direct token deployment uses 9,000,000 gas
- Token linking operations use 1,000,000 gas
- Marketplace listings use 1,000,000 gas

Additionally, the client-side code now dynamically estimates gas requirements and increases the limit if needed.

You can use the provided utility script to automatically adjust all gas limits:

```bash
cd DataX-WebApplication
node scripts/adjust-gas-limits.js
```

This script allows you to adjust all gas limits in one place by modifying the `gasLimits` object in the script.

If you still encounter "Transaction ran out of gas" errors, you can further increase these limits in the respective API routes.

#### Using the Hardhat Configuration Recommendation

For complete solution to gas limit issues, we've created a script that generates a recommended Hardhat configuration with much higher gas limits:

```bash
cd DataX-WebApplication
node scripts/hardhat-config-recommendation.js
```

This will generate a `hardhat.config.recommended.js` file in your Contracts directory. Follow these steps to use it:

1. In your Contracts directory, copy the recommended config:
   ```bash
   cp hardhat.config.recommended.js hardhat.config.js
   ```

2. Restart your Hardhat node:
   ```bash
   npx hardhat node --hostname 0.0.0.0
   ```

3. Re-deploy your contracts:
   ```bash
   npx hardhat run scripts/deploy-local.js --network localhost
   ```

4. Update your contract configuration:
   ```bash
   cd ../DataX-WebApplication
   node scripts/update-contract-config.js
   ```

#### Direct Token Deployment Improvements

If you continue to have issues with the TokenFactory, we've added improvements to the direct token deployment process:

1. A script to extract the complete Datatoken bytecode:
   ```bash
   cd DataX-WebApplication
   node scripts/compile-datatoken.js
   ```

2. The token API now uses the full bytecode for direct deployments, which should resolve the "Transaction ran out of gas" errors.

### 3. Nonce Management

If you see errors about nonce being too low or incorrect:
- Stop the Hardhat node and restart it
- Clear the browser cache and MetaMask transaction history
- Redeploy the contracts

### 4. TokenFactory Contract Issues

If the TokenFactory contract is causing errors, you can still mint NFTs without auto-creating tokens:
- The updated mint API will gracefully handle missing TokenFactory contracts
- You can manually create tokens later using the `/api/token` endpoint

## Restarting the Environment

If you're having persistent issues, try a complete restart:

1. Stop the Hardhat node and web application
2. Delete Hardhat cache and artifacts: `cd Contracts && npx hardhat clean`
3. Restart Hardhat node: `npx hardhat node --hostname 0.0.0.0`
4. Redeploy contracts: `npx hardhat run scripts/deploy-local.js --network localhost`
5. Update configuration: `cd ../DataX-WebApplication && node scripts/update-contract-config.js`
6. Restart web application: `npm run dev` 