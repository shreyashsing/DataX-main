import { ethers } from 'ethers';

/**
 * Checks the user's balance of a specific DataToken
 * @param tokenAddress The address of the DataToken contract
 * @param walletAddress The user's wallet address
 * @returns Object containing token details and balance
 */
export async function checkTokenBalance(tokenAddress: string, walletAddress: string) {
  try {
    const response = await fetch('/api/token/balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokenAddress,
        walletAddress,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch token balance');
    }
    
    return data.token;
  } catch (error) {
    console.error('Error checking token balance:', error);
    throw error;
  }
}

/**
 * Debug function to diagnose token purchase issues
 * @param datasetId The ID of the dataset
 * @param walletAddress The user's wallet address
 * @returns Debug information about the dataset and token
 */
export async function debugTokenPurchase(datasetId: string, walletAddress: string) {
  try {
    console.log('Debugging token purchase for dataset:', datasetId, 'and wallet:', walletAddress);
    
    // Check if MetaMask is available
    if (!window.ethereum) {
      return {
        success: false,
        error: 'MetaMask not detected',
        metamaskInstalled: false
      };
    }
    
    // Check if MetaMask is unlocked
    let accounts;
    try {
      accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          error: 'MetaMask is locked or no accounts available',
          metamaskInstalled: true,
          metamaskUnlocked: false
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Error accessing MetaMask accounts: ' + (error instanceof Error ? error.message : String(error)),
        metamaskInstalled: true,
        metamaskAccessible: false
      };
    }
    
    // Check network connection
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    let chainId;
    try {
      const network = await provider.getNetwork();
      chainId = network.chainId;
    } catch (error) {
      return {
        success: false,
        error: 'Error getting network: ' + (error instanceof Error ? error.message : String(error)),
        metamaskInstalled: true,
        metamaskUnlocked: true,
        networkAccessible: false
      };
    }
    
    // Check dataset purchase endpoint
    try {
      const purchaseResponse = await fetch(`/api/datasets/${datasetId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress,
        }),
      });

      const purchaseData = await purchaseResponse.json();
      
      if (!purchaseData.success) {
        return {
          success: false,
          error: 'Purchase API error: ' + (purchaseData.error || purchaseData.message || 'Unknown error'),
          metamaskInstalled: true,
          metamaskUnlocked: true,
          networkAccessible: true,
          apiError: true,
          apiResponse: purchaseData
        };
      }
      
      // If we got a successful response but no transaction data
      if (!purchaseData.requiresTokenPurchase || !purchaseData.transaction) {
        return {
          success: false,
          error: 'Purchase API did not return transaction data',
          metamaskInstalled: true,
          metamaskUnlocked: true,
          networkAccessible: true,
          apiError: false,
          apiResponse: purchaseData,
          hasPurchaseTransaction: false
        };
      }
      
      return {
        success: true,
        metamaskInstalled: true,
        metamaskUnlocked: true,
        networkAccessible: true,
        chainId,
        walletAddress: accounts[0],
        purchaseData,
        transactionReady: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error calling purchase API: ' + (error instanceof Error ? error.message : String(error)),
        metamaskInstalled: true,
        metamaskUnlocked: true,
        networkAccessible: true,
        apiCallFailed: true
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Debug function error: ' + (error instanceof Error ? error.message : String(error)),
    };
  }
}

/**
 * Purchases DataTokens for a specific dataset
 * @param datasetId The ID of the dataset
 * @param walletAddress The user's wallet address
 * @param options Additional options like chainId
 * @returns Object containing purchase details
 */
export async function purchaseDataTokens(
  datasetId: string, 
  walletAddress: string, 
  options: { chainId?: number } = {}
) {
  try {
    console.log('[tokenUtils] Starting token purchase for dataset:', datasetId);
    console.log('[tokenUtils] Options:', options);
    
    // First initiate the purchase
    console.log('[tokenUtils] Calling purchase API endpoint...');
    const purchaseResponse = await fetch(`/api/datasets/${datasetId}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: walletAddress,
        chainId: options.chainId || 1337
      }),
    });

    if (!purchaseResponse.ok) {
      console.error('[tokenUtils] Purchase API error status:', purchaseResponse.status);
      throw new Error(`Purchase API responded with status: ${purchaseResponse.status} ${purchaseResponse.statusText}`);
    }

    const purchaseData = await purchaseResponse.json();
    console.log('[tokenUtils] Purchase API response:', purchaseData);
    
    if (!purchaseData.success) {
      console.error('[tokenUtils] Purchase API returned error:', purchaseData.error || purchaseData.message);
      throw new Error(purchaseData.error || purchaseData.message || 'Failed to initiate token purchase');
    }
    
    // If the dataset is already purchased, return that info
    if (purchaseData.alreadyPurchased) {
      console.log('[tokenUtils] Dataset already purchased');
      return {
        success: true,
        message: purchaseData.message,
        alreadyPurchased: true,
        purchaseId: purchaseData.purchaseId
      };
    }
    
    // If a token purchase transaction is required
    if (purchaseData.requiresTokenPurchase && purchaseData.transaction) {
      console.log('[tokenUtils] Token purchase transaction required. Details:', {
        tokenAddress: purchaseData.tokenAddress,
        tokenName: purchaseData.tokenName,
        tokenAmount: purchaseData.tokensAmount,
        cost: purchaseData.cost
      });
      
      // We need to sign and send the transaction
      if (!window.ethereum) {
        console.error('[tokenUtils] MetaMask not detected!');
        throw new Error('No Ethereum wallet detected. Please install MetaMask or another wallet provider.');
      }
      
      // Request account access - this should trigger the MetaMask popup
      console.log('[tokenUtils] Requesting MetaMask account access...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('[tokenUtils] MetaMask accounts:', accounts);
      
      // Create a Web3Provider from the ethereum object
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Ensure the user is connected with the right wallet address
      const connectedAddress = await signer.getAddress();
      console.log('[tokenUtils] Connected wallet address:', connectedAddress);
      if (connectedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(`Connected wallet address (${connectedAddress}) doesn't match expected address (${walletAddress})`);
      }
      
      // Display info about the token purchase to the user
      console.log(`[tokenUtils] Purchasing ${purchaseData.tokensAmount} ${purchaseData.tokenSymbol} tokens for ${purchaseData.cost} ETH`);
      
      // Create a transaction to buy tokens that will trigger the wallet popup
      console.log('[tokenUtils] Preparing transaction with the following parameters:', {
        to: purchaseData.transaction.to || purchaseData.tokenAddress,
        value: purchaseData.transaction.value || ethers.utils.parseEther(purchaseData.cost).toString(),
        data: purchaseData.transaction.data?.substring(0, 20) + '...',
        gasLimit: purchaseData.transaction.gasLimit
      });
      
      // Validate transaction data
      if (!purchaseData.transaction.to) {
        console.error('[tokenUtils] Transaction is missing destination address');
        throw new Error('Transaction is missing destination address');
      }

      if (!purchaseData.transaction.data) {
        console.warn('[tokenUtils] Transaction data is empty - this might be a simple ETH transfer');
      }
      
      // This should trigger the MetaMask popup
      console.log('[tokenUtils] Sending transaction - MetaMask popup should appear...');
      try {
        const tx = await signer.sendTransaction({
          to: purchaseData.transaction.to || purchaseData.tokenAddress,
          value: purchaseData.transaction.value ? 
            (purchaseData.transaction.value.startsWith('0x') ? 
              purchaseData.transaction.value : 
              ethers.utils.parseEther(purchaseData.cost)) : 
            ethers.utils.parseEther(purchaseData.cost),
          data: purchaseData.transaction.data || '0x',
          gasLimit: ethers.BigNumber.from(purchaseData.transaction.gasLimit || 200000).mul(2) // Double gas limit for safety
        });
        
        console.log('[tokenUtils] Token purchase transaction sent:', tx.hash);
        
        // Wait for transaction to be mined
        console.log('[tokenUtils] Waiting for token purchase transaction to be mined...');
        const receipt = await tx.wait();
        console.log('[tokenUtils] Token purchase confirmed in block:', receipt.blockNumber);
        
        // Now confirm the purchase with the backend
        console.log('[tokenUtils] Confirming purchase with backend...');
        const confirmResponse = await fetch(`/api/datasets/${datasetId}/purchase/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress,
            transactionHash: tx.hash,
            chainId: options.chainId || 1337
          }),
        });
        
        if (!confirmResponse.ok) {
          console.error('[tokenUtils] Confirmation API error status:', confirmResponse.status);
          throw new Error(`Confirmation API responded with status: ${confirmResponse.status} ${confirmResponse.statusText}`);
        }
        
        const confirmData = await confirmResponse.json();
        console.log('[tokenUtils] Purchase confirmation response:', confirmData);
        
        if (!confirmData.success) {
          console.error('[tokenUtils] Confirmation API returned error:', confirmData.error || confirmData.message);
          throw new Error(confirmData.error || confirmData.message || 'Failed to confirm token purchase');
        }
        
        return {
          success: true,
          message: confirmData.message,
          purchaseId: confirmData.purchaseId,
          downloadAvailable: confirmData.downloadAvailable,
          tokenBalance: confirmData.tokenBalance,
          transactionHash: tx.hash
        };
      } catch (txError: unknown) {
        console.error('[tokenUtils] Transaction error:', txError);
        const errorMessage = txError instanceof Error 
          ? txError.message 
          : typeof txError === 'object' && txError !== null && 'message' in txError
            ? String(txError.message)
            : 'Unknown error';
        throw new Error('Transaction failed: ' + errorMessage);
      }
    } else if (purchaseData.requiresTokenization) {
      console.log('[tokenUtils] Dataset requires tokenization before purchase');
      return {
        success: false,
        requiresTokenization: true,
        message: 'This dataset needs to be tokenized before purchase'
      };
    }
    
    return purchaseData;
  } catch (error) {
    console.error('[tokenUtils] Error during token purchase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

declare global {
  interface Window {
    ethereum?: any;
  }
} 