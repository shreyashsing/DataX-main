import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { DataNFTAbi } from '@/lib/contracts/abis/DataNFTAbi';
import { getConfig } from '@/lib/contracts/config';
import { SimplifiedTokenFactoryAbi, SimplifiedTokenFactoryBytecode } from '@/lib/contracts/bytecode/SimplifiedTokenFactory';

// Helper function for JSON-RPC requests
async function jsonRpcRequest(method: string, params: any[] = [], url: string = 'http://localhost:8545') {
  try {
    console.log(`Making JSON-RPC request: ${method}`, params[0] ? { to: params[0].to, data: params[0].data?.substring(0, 64) + '...' } : params);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Math.floor(Math.random() * 1000000)
      })
    });
    
    const data = await response.json();
    if (data.error) {
      console.error(`JSON-RPC error in ${method}:`, data.error);
      throw new Error(`JSON-RPC error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    console.log(`JSON-RPC response for ${method}:`, data.result ? 'Success' : 'No result');
    return data.result;
  } catch (error: any) {
    console.error(`JSON-RPC request failed for method ${method}:`, error.message);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get request body
    const body = await req.json();
    let { walletAddress, tokenName, tokenSymbol, nftId } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    if (!nftId) {
      return NextResponse.json({ error: 'Missing NFT ID' }, { status: 400 });
    }

    console.log('Preparing transaction for creating token via factory for NFT:', nftId);
    console.log('Token details:', { tokenName, tokenSymbol, walletAddress });

    // Get the network configuration
    const networkConfig = getConfig(1337);
    console.log('Using network config:', { 
      dataNFTAddress: networkConfig.dataNFTAddress 
    });
    
    try {
      // Test if the blockchain is reachable using raw JSON-RPC
      console.log('Testing blockchain connection via raw JSON-RPC...');
      
      try {
        const blockNumber = await jsonRpcRequest('eth_blockNumber');
        console.log(`Blockchain connection successful! Current block: ${parseInt(blockNumber, 16)}`);
      } catch (error: any) {
        console.error('Failed to connect to blockchain:', error.message);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to connect to blockchain',
          error: error.message,
          hint: "Make sure Hardhat node is running with: npx hardhat node --hostname 0.0.0.0"
        }, { status: 500 });
      }
      
      // Validate that DataNFT contract exists
      try {
        // Check DataNFT contract
        const dataNFTCode = await jsonRpcRequest('eth_getCode', [networkConfig.dataNFTAddress, 'latest']);
        if (dataNFTCode === '0x' || dataNFTCode === '') {
          return NextResponse.json({ 
            success: false, 
            message: 'DataNFT contract not found at the specified address',
            error: `No contract detected at address ${networkConfig.dataNFTAddress}`,
            hint: "Update the DataNFT address in the config.ts file with the correct deployed address"
          }, { status: 400 });
        }
        
        console.log('DataNFT contract verified at', networkConfig.dataNFTAddress);
      } catch (codeError: any) {
        console.error('Error checking contract code:', codeError);
      }
      
      // Check if token already exists for this NFT
      const dataNFTInterface = new ethers.utils.Interface(DataNFTAbi);
      const getTokenData = dataNFTInterface.encodeFunctionData("getDatatoken", [
        ethers.BigNumber.from(nftId)
      ]);
      
      let tokenExists = false;
      let existingTokenAddress = null;
      
      try {
        const getTokenResult = await jsonRpcRequest('eth_call', [{
          to: networkConfig.dataNFTAddress,
          data: getTokenData
        }, 'latest']);
        
        existingTokenAddress = ethers.utils.defaultAbiCoder.decode(['address'], getTokenResult)[0];
        tokenExists = existingTokenAddress && existingTokenAddress !== '0x0000000000000000000000000000000000000000';
      } catch (error) {
        console.log('Error checking for existing token, assuming none exists');
      }
      
      if (tokenExists && existingTokenAddress) {
        console.log('Token already exists for NFT:', existingTokenAddress);
        return NextResponse.json({
          success: true,
          tokenExists: true,
          tokenAddress: existingTokenAddress,
          nftId: nftId,
          message: 'Token already exists for this NFT'
        });
      }
      
      // Default values if not provided
      // Use extremely short names to avoid memory issues
      tokenName = tokenName || `DT${nftId}`;
      tokenSymbol = tokenSymbol || `DT${nftId}`;
      
      // Ensure token name and symbol are not too long
      if (tokenName.length > 10) {
        tokenName = tokenName.substring(0, 10);
        console.log(`Token name truncated to 10 characters: ${tokenName}`);
      }
      
      if (tokenSymbol.length > 5) {
        tokenSymbol = tokenSymbol.substring(0, 5);
        console.log(`Token symbol truncated to 5 characters: ${tokenSymbol}`);
      }
      
      // Validate NFT ID format
      let nftIdBN;
      try {
        nftIdBN = ethers.BigNumber.from(nftId);
        console.log(`NFT ID validated: ${nftIdBN.toString()} (decimal), 0x${nftIdBN.toHexString()} (hex)`);
      } catch (error) {
        console.error('Invalid NFT ID format:', error);
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid NFT ID format',
          error: `NFT ID must be a valid number: ${error}`,
        }, { status: 400 });
      }
      
      // Check if the user owns the NFT
      const ownerOfData = dataNFTInterface.encodeFunctionData("ownerOf", [nftIdBN]);
      const ownerResult = await jsonRpcRequest('eth_call', [{
        to: networkConfig.dataNFTAddress,
        data: ownerOfData
      }, 'latest']);
      
      const owner = ethers.utils.defaultAbiCoder.decode(['address'], ownerResult)[0];
      if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json({ 
          success: false, 
          message: 'Not the owner of the NFT',
          error: 'Only the NFT owner can create tokens for it'
        }, { status: 403 });
      }

      // Check if SimplifiedTokenFactory is already deployed
      let tokenFactoryAddress = networkConfig.tokenFactoryAddress;
      let needsToDeploy = false;
      
      try {
        if (tokenFactoryAddress) {
          const factoryCode = await jsonRpcRequest('eth_getCode', [tokenFactoryAddress, 'latest']);
          needsToDeploy = factoryCode === '0x' || factoryCode === '';
        } else {
          needsToDeploy = true;
        }
      } catch (error) {
        console.warn('Error checking factory contract, will deploy a new one:', error);
        needsToDeploy = true;
      }
      
      // Get gas price and initial nonce
      const gasPriceHex = await jsonRpcRequest('eth_gasPrice');
      const gasPrice = parseInt(gasPriceHex, 16);
      const nonceHex = await jsonRpcRequest('eth_getTransactionCount', [walletAddress, 'latest']);
      let nonce = parseInt(nonceHex, 16);
      
      // If factory needs to be deployed, create a transaction for that
      if (needsToDeploy) {
        console.log('SimplifiedTokenFactory not found, preparing deployment transaction');
        
        // Encode constructor parameters
        const factoryInterface = new ethers.utils.Interface(SimplifiedTokenFactoryAbi);
        const constructorData = factoryInterface.encodeDeploy([
          networkConfig.dataNFTAddress
        ]);
        
        // Create transaction to deploy SimplifiedTokenFactory contract
        const deployData = SimplifiedTokenFactoryBytecode + constructorData.slice(2); // Remove 0x prefix from constructor data
        
        // Prepare the transaction for factory deployment
        const deployFactoryTx = {
          from: walletAddress,
          gasLimit: ethers.utils.hexlify(5000000),
          gasPrice: ethers.utils.hexlify(gasPrice),
          data: deployData,
          chainId: 1337, // Hardhat's chainId
          nonce: nonce
        };
        
        // Calculate the expected factory address
        tokenFactoryAddress = ethers.utils.getContractAddress({
          from: walletAddress,
          nonce: nonce
        });
        
        nonce++; // Increment nonce for the next transaction
        
        console.log('Prepared factory deployment transaction. Expected address:', tokenFactoryAddress);
        
        // Return both transactions
        return NextResponse.json({
          success: true,
          tokenExists: false,
          deployFactoryTransaction: deployFactoryTx,
          expectedFactoryAddress: tokenFactoryAddress,
          // After factory is deployed, client should call this API again with the new factory address
          message: 'Factory deployment transaction prepared',
          hint: "Deploy the factory first, then call this API again to create the token"
        });
      }
      
      // Use existing factory to create token
      console.log('Using existing SimplifiedTokenFactory at:', tokenFactoryAddress);
      
      // Encode the createToken function call
      const factoryInterface = new ethers.utils.Interface(SimplifiedTokenFactoryAbi);
      const createTokenData = factoryInterface.encodeFunctionData("createToken", [
        nftIdBN,
        tokenName,
        tokenSymbol
      ]);
      
      // Prepare the transaction to create token via factory
      const createTokenTx = {
        from: walletAddress,
        to: tokenFactoryAddress,
        gasLimit: ethers.utils.hexlify(5000000),
        gasPrice: ethers.utils.hexlify(gasPrice),
        data: createTokenData,
        chainId: 1337, // Hardhat's chainId
        nonce: nonce
      };
      
      console.log('Prepared token creation transaction via factory');
      
      // Return transaction for client-side signing
      return NextResponse.json({
        success: true,
        tokenExists: false,
        unsignedTransaction: createTokenTx,
        nftId: nftId,
        message: 'Transaction prepared for token creation via SimplifiedTokenFactory',
        hint: "The token will be automatically linked to your NFT after creation"
      });
      
    } catch (contractError: any) {
      console.error('Contract interaction error:', contractError);
            
      // Return a helpful error message with clear instructions
      return NextResponse.json({ 
        success: false, 
        message: 'Error preparing token creation transaction',
        error: contractError instanceof Error ? contractError.message : String(contractError),
        hint: "1. Make sure you own the NFT before attempting to create a token for it.\n2. Check network configuration."
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Token creation error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Error during token creation',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 