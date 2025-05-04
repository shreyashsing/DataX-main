import { ethers } from 'ethers';

/**
 * Signs and sends a transaction using the browser's Ethereum provider (MetaMask or similar)
 * @param unsignedTx The unsigned transaction object from the server
 * @returns The transaction hash and receipt
 */
export async function signAndSendTransaction(unsignedTx: any): Promise<{
  success: boolean;
  txHash?: string;
  receipt?: any;
  error?: string;
}> {
  try {
    // Check if ethereum is available (MetaMask or other wallet)
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet detected. Please install MetaMask or another wallet provider.');
    }

    // Request account access if needed
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create a Web3Provider from the ethereum object
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    console.log('Preparing to send transaction with data:', {
      to: unsignedTx.to,
      gasLimit: unsignedTx.gasLimit,
      gasPrice: unsignedTx.gasPrice,
      chainId: unsignedTx.chainId,
      data: unsignedTx.data.substring(0, 64) + '...' // Log only part of the data to keep logs clean
    });
    
    // Get the current network to make sure we're on the right chain
    const network = await provider.getNetwork();
    console.log('Connected to network:', { chainId: network.chainId, name: network.name });
    
    if (network.chainId !== unsignedTx.chainId) {
      console.warn(`Network mismatch: Transaction expects chainId ${unsignedTx.chainId} but connected to ${network.chainId}`);
    }
    
    // Format transaction parameters properly for different wallets
    const txParams: any = {
      to: unsignedTx.to,
      data: unsignedTx.data,
    };
    
    // Only include these if they're hex strings
    if (typeof unsignedTx.gasLimit === 'string') {
      txParams.gasLimit = unsignedTx.gasLimit;
    } else {
      txParams.gasLimit = ethers.utils.hexlify(unsignedTx.gasLimit);
    }
    
    if (typeof unsignedTx.gasPrice === 'string') {
      txParams.gasPrice = unsignedTx.gasPrice;
    } else {
      txParams.gasPrice = ethers.utils.hexlify(unsignedTx.gasPrice); 
    }
    
    // Try direct sending with ethers.js
    try {
      console.log('Sending transaction via ethers.js...');
      
      // Estimate gas if possible
      try {
        console.log('Estimating gas for transaction...');
        const estimatedGas = await provider.estimateGas({
          to: txParams.to,
          data: txParams.data,
          value: txParams.value || "0x0"  // Include value for token purchases
        });
        
        // If the estimated gas is higher than our current limit, increase it
        const currentGasLimit = typeof txParams.gasLimit === 'string' 
          ? ethers.BigNumber.from(txParams.gasLimit)
          : ethers.BigNumber.from(0);
          
        if (estimatedGas.gt(currentGasLimit)) {
          console.log(`Increasing gas limit from ${currentGasLimit.toString()} to ${estimatedGas.mul(12).div(10).toString()}`);
          txParams.gasLimit = ethers.utils.hexlify(estimatedGas.mul(12).div(10)); // Add 20% buffer
        }
      } catch (error) {
        console.warn('Error estimating gas, using default limit:', error);
      }
      
      // For transactions with value (token purchases), we need to ensure we're using the right parameters
      if (txParams.value && txParams.value !== "0x0") {
        console.log('Transaction has value, ensuring correct parameters for wallet prompt');
        
        // Create a transaction request that will trigger the MetaMask popup
        const txRequest = {
          to: txParams.to,
          from: await signer.getAddress(),
          data: txParams.data,
          value: txParams.value,
          gasLimit: txParams.gasLimit
        };
        
        console.log('Sending transaction with value:', 
          ethers.utils.formatEther(ethers.BigNumber.from(txParams.value)), 'ETH');
        
        // This will trigger the MetaMask popup
        const response = await signer.sendTransaction(txRequest);
        console.log('Transaction sent:', response.hash);
        
        return {
          success: true,
          txHash: response.hash
        };
      }
      
      // Regular transaction flow for non-value transactions
      const tx = await signer.sendTransaction(txParams);
      console.log('Transaction hash:', tx.hash);
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.error('Failed to send transaction directly:', error);
      throw error; // Let the outer catch handle this
    }
  } catch (error: any) {
    console.error('Transaction error:', error);
    
    // Extract more detailed error information
    let errorMessage = error.message || 'Unknown error occurred while signing or sending the transaction';
    
    // Check for internal JSON-RPC error
    if (error.code && error.code === -32603) {
      console.error('Internal JSON-RPC error details:', error.data || error);
      errorMessage = `Internal JSON-RPC error: ${error.data?.message || errorMessage}`;
    }
    
    // Check for user rejection
    if (error.code && error.code === 4001) {
      errorMessage = 'Transaction was rejected by the user';
    }
    
    // Add more info if available
    if (error.reason) {
      errorMessage += ` - Reason: ${error.reason}`;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Creates a token for an NFT by using either TokenFactory contract or direct deployment
 */
export async function createTokenForNFT(
  nftId: string,
  tokenName?: string,
  tokenSymbol?: string
): Promise<{
  success: boolean;
  tokenAddress?: string;
  txHash?: string;
  error?: string;
  contractIssue?: boolean;
  recoverable?: boolean;
}> {
  try {
    console.log('Preparing to create token for NFT:', nftId);
    
    // Check if the browser has an Ethereum provider (MetaMask)
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet detected. Please install MetaMask or another wallet provider.');
    }
    
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const walletAddress = accounts[0];

    console.log('Using wallet address:', walletAddress);

    // First check if a token has been automatically created during minting
    try {
      console.log('Checking if token already exists for NFT:', nftId);
      const checkResponse = await fetch('/api/get-token-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          nftId,
        }),
      });

      const checkData = await checkResponse.json();
      
      if (checkData.success && checkData.tokenAddress && 
          checkData.tokenAddress !== '0x0000000000000000000000000000000000000000') {
        console.log('Token already exists for NFT:', checkData.tokenAddress);
        return { 
          success: true, 
          tokenAddress: checkData.tokenAddress,
          txHash: 'existing-token'
        };
      }
    } catch (checkError) {
      console.warn('Error checking for existing token:', checkError);
      // Continue to token creation if check fails
    }
    
    // Try using the simplified token approach if it's available
    try {
      console.log('Attempting to use simplified token deployment...');
      const simplifiedResponse = await fetch('/api/simplified-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          nftId,
          tokenName: tokenName || `DT${nftId}`,
          tokenSymbol: tokenSymbol || `DT${nftId}`
        }),
      });
      
      // Check if the endpoint exists and returns valid data
      if (simplifiedResponse.ok) {
        const simplifiedData = await simplifiedResponse.json();
        
        if (simplifiedData.success) {
          console.log('Simplified token approach available');
          
          if (simplifiedData.tokenExists) {
            console.log('Token already exists:', simplifiedData.tokenAddress);
            return {
              success: true,
              tokenAddress: simplifiedData.tokenAddress,
              txHash: 'existing-token'
            };
          }
          
          // Send the transaction
          console.log('Signing simplified token transaction...');
          const txResult = await signAndSendTransaction(simplifiedData.unsignedTransaction);
          
          if (!txResult.success) {
            console.error('Simplified token transaction signing failed:', txResult.error);
            console.log('Falling back to standard token creation...');
          } else {
            console.log('Simplified token transaction sent successfully:', txResult.txHash);
            
            // Wait for transaction to be mined (simple polling)
            console.log('Waiting for transaction to be mined...');
            let mined = false;
            let attempts = 0;
            
            while (!mined && attempts < 30) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              try {
                const receipt = await window.ethereum.request({
                  method: 'eth_getTransactionReceipt',
                  params: [txResult.txHash],
                });
                
                if (receipt && receipt.blockNumber) {
                  mined = true;
                  console.log('Transaction mined in block:', parseInt(receipt.blockNumber, 16));
                  
                  if (receipt.status === '0x1') {
                    console.log('Transaction successful!');
                  } else {
                    console.error('Transaction failed!');
                    throw new Error('Transaction execution failed');
                  }
                }
              } catch (err) {
                console.log('Error checking receipt, retrying...');
              }
              
              attempts++;
            }
            
            if (!mined) {
              console.warn('Transaction not mined within timeout, continuing anyway...');
            }
            
            // Link the token to the NFT
            console.log('Linking token to NFT...');
            const linkResponse = await fetch('/api/link-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                walletAddress,
                nftId,
                tokenAddress: simplifiedData.expectedTokenAddress,
              }),
            });
            
            const linkData = await linkResponse.json();
            
            if (!linkData.success) {
              console.error('Error preparing link token transaction:', linkData.error);
              return {
                success: true, // We still created the token, just didn't link it
                tokenAddress: simplifiedData.expectedTokenAddress,
                txHash: txResult.txHash,
                error: `Token created but not linked: ${linkData.error || 'unknown error'}`,
                recoverable: true
              };
            }
            
            // Send the link transaction
            console.log('Sending link token transaction...');
            const linkTxResult = await signAndSendTransaction(linkData.unsignedTransaction);
            
            if (!linkTxResult.success) {
              console.error('Link transaction signing failed:', linkTxResult.error);
              return {
                success: true, // We still created the token, just didn't link it
                tokenAddress: simplifiedData.expectedTokenAddress,
                txHash: txResult.txHash,
                error: `Token created but not linked: ${linkTxResult.error || 'Transaction signing failed'}`,
                recoverable: true
              };
            }
            
            console.log('Link transaction sent successfully:', linkTxResult.txHash);
            
            return {
              success: true,
              tokenAddress: simplifiedData.expectedTokenAddress,
              txHash: txResult.txHash
            };
          }
        }
      }
    } catch (simplifiedError) {
      console.warn('Simplified token approach failed or not available:', simplifiedError);
      console.log('Falling back to standard token creation...');
    }
    
    // Fall back to the original approach
    console.log('Using standard token creation approach...');
    
    // Call our API to prepare the transaction
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        nftId,
        tokenName: tokenName || `DataToken-${nftId}`,
        tokenSymbol: tokenSymbol || `DT${nftId}`,
        directDeploy: true // Tell API to use direct deployment instead of TokenFactory
      }),
    });
    
    const data = await response.json();
    
    // If token already exists, return its address
    if (data.success && data.tokenExists) {
      console.log('Token already exists for NFT:', data.tokenAddress);
      return {
        success: true,
        tokenAddress: data.tokenAddress,
        txHash: 'existing-token'
      };
    }
    
    // If preparing the transaction failed
    if (!data.success) {
      console.error('Error preparing token creation:', data.error || data.message);
      
      // Check for specific contract issues
      const error = data.error || data.message || 'Failed to prepare token creation transaction';
      const isContractIssue = 
        error.includes('not a contract') || 
        error.includes('invalid address') || 
        error.includes('out-of-bounds') ||
        error.includes('Failed to connect to blockchain');
      
      return {
        success: false,
        error: error,
        contractIssue: isContractIssue,
        recoverable: true
      };
    }
    
    // Transaction preparation was successful
    console.log('Transaction prepared:', data.message);
    
    try {
      // Send the transaction
      const txResult = await signAndSendTransaction(data.unsignedTransaction);
      
      if (!txResult.success) {
        console.error('Transaction signing failed:', txResult.error);
        return {
          success: false,
          error: txResult.error || 'Failed to sign or send transaction',
          recoverable: true
        };
      }
      
      console.log('Transaction sent successfully:', txResult.txHash);
      
      // For direct deployment, we need to wait and then link the token
      if (data.directDeploy && data.expectedTokenAddress) {
        console.log('Direct deployment detected. Expected token address:', data.expectedTokenAddress);
      
        // Wait for transaction confirmation
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Link the token to the NFT
        console.log('Linking token to NFT...');
        const linkResponse = await fetch('/api/link-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress,
            nftId,
            tokenAddress: data.expectedTokenAddress,
          }),
        });
        
        const linkData = await linkResponse.json();
        
        if (!linkData.success) {
          console.error('Error preparing link token transaction:', linkData.error);
          return {
            success: true, // We still created the token, just didn't link it
            tokenAddress: data.expectedTokenAddress,
            txHash: txResult.txHash,
            error: `Token created but not linked: ${linkData.error || 'unknown error'}`,
            recoverable: true
          };
        }
        
        // Send the link transaction
        console.log('Sending link token transaction...');
        const linkTxResult = await signAndSendTransaction(linkData.unsignedTransaction);
        
        if (!linkTxResult.success) {
          console.error('Link transaction signing failed:', linkTxResult.error);
          return {
            success: true, // We still created the token, just didn't link it
            tokenAddress: data.expectedTokenAddress,
            txHash: txResult.txHash,
            error: `Token created but not linked: ${linkTxResult.error || 'Transaction signing failed'}`,
            recoverable: true
          };
        }
        
        console.log('Link transaction sent successfully:', linkTxResult.txHash);
        
        return {
          success: true,
          tokenAddress: data.expectedTokenAddress,
          txHash: txResult.txHash
        };
      }
      
      // For TokenFactory deployment, the token address is returned directly
      return {
        success: true,
        tokenAddress: data.expectedTokenAddress || 'Created via TokenFactory, check DataNFT contract',
        txHash: txResult.txHash
      };
    } catch (txError: any) {
      console.error('Transaction error:', txError);
      
      return {
        success: false,
        error: txError.message || 'Error sending token creation transaction',
        recoverable: true
      };
    }
  } catch (error: any) {
    console.error('Error in createTokenForNFT:', error);
    
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred',
      recoverable: false
    };
  }
}

// Define window ethereum type
declare global {
  interface Window {
    ethereum?: any;
  }
} 