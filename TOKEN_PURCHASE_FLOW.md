# Dataset Token Purchase Flow

## Overview

This document explains the token-based purchase flow for buying datasets in the DataX marketplace. When datasets are tokenized as NFTs, they are associated with DataTokens that users can purchase to gain access to the dataset's content.

## Token Purchase Workflow

1. **Dataset Creation & Tokenization**
   - Creator uploads a dataset
   - Dataset is published as an NFT
   - An associated DataToken is created automatically
   - The dataset owner becomes the initial token holder

2. **Token Purchase Process**
   - Buyer views a dataset and clicks "Buy Now"
   - System checks if the dataset is tokenized
   - If tokenized, buyers purchase tokens with their wallet
   - MetaMask (or other wallet) pops up for transaction confirmation
   - Transaction is verified on-chain
   - Purchase is recorded in the database
   - Buyer can now download the dataset

3. **Token Balance & Access Control**
   - Tokens represent access rights to the dataset
   - Buyers can view their token balances
   - Token ownership can be verified on-chain
   - System checks token balance before allowing downloads

## Implementation Components

### API Endpoints

- `/api/datasets/[id]/purchase` - Initiates the purchase process
- `/api/datasets/[id]/purchase/confirm` - Confirms a completed purchase
- `/api/token/balance` - Checks a user's token balance

### Client-Side Functions

- `purchaseDataTokens(datasetId, walletAddress)` - Handles the purchase flow
- `checkTokenBalance(tokenAddress, walletAddress)` - Retrieves token balances

### Smart Contracts

- `DataToken.sol` - ERC20 token for dataset access rights
- Contains `buyTokens` function for direct token purchase
- Links to DataNFT for ownership verification

## Technical Flow

1. Client calls `purchaseDataTokens` with dataset ID and wallet address
2. Backend prepares token purchase transaction through `/api/datasets/[id]/purchase`
3. Client signs transaction with MetaMask, sending ETH to purchase tokens
4. After completion, client confirms purchase with backend
5. Backend verifies transaction on-chain:
   - Checks transaction receipt status is successful
   - Verifies the transaction was sent to the correct token contract
   - Checks the buyer now has tokens in their wallet
6. Purchase record is created in the database
7. Buyer can now access the dataset

## Testing the Flow

1. Deploy contract(s) with proper gas configuration
2. Create and publish an NFT dataset
3. Verify the DataToken was created
4. Using a different wallet, attempt to purchase the dataset
5. Confirm the wallet popup appears for the token purchase
6. Verify the transaction completes successfully
7. Check that the buyer now has tokens in their wallet
8. Confirm the buyer can download the dataset

## Troubleshooting

- If the wallet doesn't pop up, check:
  - MetaMask is installed and unlocked
  - The transaction includes a value parameter
  - The client-side code is properly triggering the signer

- If transactions fail with "out of gas" errors:
  - Increase gas limits in the API endpoints
  - Verify Hardhat configuration allows sufficient gas
  - Check transaction parameters for correctness 