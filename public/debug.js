/**
 * DataX Debug Utilities
 * 
 * This script provides debugging tools for the DataX application.
 * To use it, load it in your browser console:
 * 
 * 1. Open your browser console (F12 or right-click > Inspect > Console)
 * 2. Type: fetch('/debug.js').then(res => res.text()).then(js => eval(js))
 * 3. Now you can use the debug functions like: DataXDebug.fixTokenPurchase('123', '0x...')
 */

const DataXDebug = {
  // Store current state
  state: {
    datasetId: null,
    walletAddress: null,
    purchaseData: null,
    lastError: null
  },
  
  /**
   * Reset WebGL context to fix THREE.WebGLRenderer context loss
   */
  resetWebGL: function() {
    console.log('Attempting to reset WebGL context...');
    
    // Force canvas disposal if it exists
    try {
      const canvases = document.querySelectorAll('canvas');
      console.log(`Found ${canvases.length} canvas elements`);
      
      canvases.forEach((canvas, i) => {
        console.log(`Forcing canvas ${i} to clear context...`);
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          console.log('WebGL context forcibly lost, should trigger recovery on next render');
        }
      });
      
      // Force page redraw
      setTimeout(() => {
        console.log('Triggering page redraw...');
        window.dispatchEvent(new Event('resize'));
      }, 1000);
      
      return 'WebGL context reset attempted, please check if visualization works now';
    } catch (error) {
      console.error('Error resetting WebGL:', error);
      return `WebGL reset failed: ${error.message}`;
    }
  },
  
  /**
   * Get current MetaMask status
   */
  checkMetaMask: async function() {
    console.log('Checking MetaMask status...');
    
    if (!window.ethereum) {
      console.error('MetaMask not installed!');
      return {
        installed: false,
        message: 'MetaMask is not installed. Please install MetaMask extension.'
      };
    }
    
    try {
      // Check if MetaMask is unlocked
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (!accounts || accounts.length === 0) {
        console.warn('MetaMask is locked or no accounts available');
        return {
          installed: true,
          unlocked: false,
          message: 'MetaMask is installed but locked. Please unlock your wallet.'
        };
      }
      
      // Get network info
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      return {
        installed: true,
        unlocked: true,
        accounts,
        chainId,
        message: `MetaMask is installed and unlocked. Active account: ${accounts[0]}, Chain ID: ${chainId}`
      };
    } catch (error) {
      console.error('Error checking MetaMask:', error);
      return {
        installed: true,
        error: error.message,
        message: `Error checking MetaMask status: ${error.message}`
      };
    }
  },
  
  /**
   * Diagnose token purchase issues
   */
  diagnoseTokenPurchase: async function(datasetId, walletAddress) {
    console.log(`Diagnosing token purchase for dataset ${datasetId} and wallet ${walletAddress}...`);
    
    // Store state
    this.state.datasetId = datasetId;
    this.state.walletAddress = walletAddress;
    
    try {
      // First check MetaMask
      const metamaskStatus = await this.checkMetaMask();
      if (!metamaskStatus.installed) {
        return {
          success: false,
          error: 'MetaMask not installed',
          message: 'Please install MetaMask to purchase tokens'
        };
      }
      
      if (!metamaskStatus.unlocked) {
        return {
          success: false,
          error: 'MetaMask locked',
          message: 'Please unlock MetaMask to purchase tokens'
        };
      }
      
      // Check if wallet matches
      if (walletAddress.toLowerCase() !== metamaskStatus.accounts[0].toLowerCase()) {
        console.warn(`Wallet mismatch! Expected: ${walletAddress}, Active: ${metamaskStatus.accounts[0]}`);
      }
      
      // Check network
      if (metamaskStatus.chainId !== '0x539' && metamaskStatus.chainId !== '1337') {
        console.warn(`Chain ID mismatch! Expected 0x539 (1337), Active: ${metamaskStatus.chainId}`);
      }
      
      // Call purchase API
      console.log('Calling purchase API...');
      try {
        const response = await fetch(`/api/datasets/${datasetId}/purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress })
        });
        
        const data = await response.json();
        console.log('Purchase API response:', data);
        
        // Store purchase data for future use
        this.state.purchaseData = data;
        
        if (!data.success) {
          return {
            success: false,
            error: data.error || data.message || 'Unknown API error',
            apiResponse: data,
            message: `API Error: ${data.error || data.message || 'Unknown API error'}`
          };
        }
        
        if (data.alreadyPurchased) {
          return {
            success: true,
            alreadyPurchased: true,
            purchaseId: data.purchaseId,
            message: 'Dataset already purchased'
          };
        }
        
        if (!data.requiresTokenPurchase || !data.transaction) {
          return {
            success: false,
            error: 'No purchase transaction returned',
            apiResponse: data,
            message: 'The API did not return the token purchase transaction'
          };
        }
        
        return {
          success: true,
          message: 'Dataset is ready for purchase',
          tokenAddress: data.tokenAddress,
          tokenName: data.tokenName,
          cost: data.cost,
          transaction: {
            available: true,
            to: data.transaction.to,
            value: data.transaction.value,
            dataLength: data.transaction.data.length
          }
        };
      } catch (error) {
        console.error('API request error:', error);
        this.state.lastError = error;
        
        return {
          success: false,
          error: error.message,
          message: `API request failed: ${error.message}`
        };
      }
    } catch (error) {
      console.error('Diagnosis error:', error);
      this.state.lastError = error;
      
      return {
        success: false,
        error: error.message,
        message: `Diagnosis failed: ${error.message}`
      };
    }
  },
  
  /**
   * Execute the token purchase directly
   */
  executePurchase: async function() {
    console.log('Executing token purchase...');
    
    if (!this.state.purchaseData || !this.state.purchaseData.requiresTokenPurchase) {
      console.error('No purchase data available. Run diagnoseTokenPurchase first!');
      return {
        success: false,
        error: 'No purchase data available',
        message: 'Please run DataXDebug.diagnoseTokenPurchase first'
      };
    }
    
    try {
      const data = this.state.purchaseData;
      
      // Create a Web3Provider from the ethereum object
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Ensure the user is connected
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Log transaction details
      console.log('Sending transaction:', {
        to: data.tokenAddress,
        value: data.cost,
        data: data.transaction.data.substring(0, 30) + '...'
      });
      
      // This should trigger the MetaMask popup
      const tx = await signer.sendTransaction({
        to: data.tokenAddress,
        value: ethers.utils.parseEther(data.cost),
        data: data.transaction.data,
        gasLimit: ethers.BigNumber.from(data.transaction.gasLimit || '300000').mul(2) // Double for safety
      });
      
      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);
      
      // Confirm the purchase
      console.log('Confirming purchase with backend...');
      const confirmResponse = await fetch(`/api/datasets/${this.state.datasetId}/purchase/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.state.walletAddress,
          transactionHash: tx.hash
        })
      });
      
      const confirmData = await confirmResponse.json();
      console.log('Confirmation response:', confirmData);
      
      if (!confirmData.success) {
        return {
          success: false,
          error: confirmData.error || confirmData.message || 'Unknown confirmation error',
          transactionHash: tx.hash,
          message: `Purchase confirmed but backend verification failed: ${confirmData.error || confirmData.message}`
        };
      }
      
      return {
        success: true,
        message: 'Purchase completed successfully',
        transactionHash: tx.hash,
        downloadAvailable: confirmData.downloadAvailable,
        purchaseId: confirmData.purchaseId
      };
    } catch (error) {
      console.error('Purchase execution error:', error);
      this.state.lastError = error;
      
      return {
        success: false,
        error: error.message,
        message: `Purchase execution failed: ${error.message}`
      };
    }
  },
  
  /**
   * Fix token purchase issues in one command
   */
  fixTokenPurchase: async function(datasetId, walletAddress) {
    console.log(`Attempting to fix token purchase for dataset ${datasetId}...`);
    
    // First diagnose the issue
    const diagnosis = await this.diagnoseTokenPurchase(datasetId, walletAddress);
    console.log('Diagnosis result:', diagnosis);
    
    if (!diagnosis.success) {
      console.error('Diagnosis failed:', diagnosis.error);
      return diagnosis;
    }
    
    if (diagnosis.alreadyPurchased) {
      console.log('Dataset already purchased, nothing to do');
      return diagnosis;
    }
    
    // Execute the purchase
    console.log('Proceeding with purchase execution...');
    const result = await this.executePurchase();
    
    return result;
  }
};

// Helper function to make it easy to check for errors
function checkWebGLError() {
  return DataXDebug.resetWebGL();
}

// Log success message
console.log('DataX Debug Utilities loaded successfully!');
console.log('Available commands:');
console.log('- DataXDebug.checkMetaMask() - Check MetaMask status');
console.log('- DataXDebug.diagnoseTokenPurchase(datasetId, walletAddress) - Diagnose purchase issues');
console.log('- DataXDebug.executePurchase() - Execute token purchase with stored data');
console.log('- DataXDebug.fixTokenPurchase(datasetId, walletAddress) - Fix purchase in one step');
console.log('- checkWebGLError() - Fix THREE.WebGLRenderer context loss');

// Return the DataXDebug object for easy access
DataXDebug; 