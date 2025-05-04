import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { DataNFTAbi } from '@/lib/contracts/abis/DataNFTAbi';
import { getConfig } from '@/lib/contracts/config';

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
    const { walletAddress, nftId, tokenAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    if (!nftId) {
      return NextResponse.json({ error: 'Missing NFT ID' }, { status: 400 });
    }

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Missing token address' }, { status: 400 });
    }

    console.log('Preparing transaction for linking token to NFT:', nftId);
    console.log('Details:', { walletAddress, nftId, tokenAddress });

    // Get the network configuration
    const networkConfig = getConfig(1337);
    console.log('Using network config:', { dataNFTAddress: networkConfig.dataNFTAddress });
    
    // Validate the contract addresses
    if (!networkConfig.dataNFTAddress || 
        networkConfig.dataNFTAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ 
        success: false, 
        message: 'DataNFT contract address is not configured properly',
        error: 'The DataNFT contract address is either not set or is set to the zero address',
        contractIssue: true,
        hint: "Update the DataNFT address in the config.ts file with the correct deployed address"
      }, { status: 400 });
    }
    
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
          contractIssue: true,
          hint: "1. Make sure Hardhat node is running with: npx hardhat node --hostname 0.0.0.0\n2. Check network connectivity to localhost:8545"
        }, { status: 500 });
      }
      
      // Validate that the DataNFT contract exists
      try {
        const dataNFTCode = await jsonRpcRequest('eth_getCode', [networkConfig.dataNFTAddress, 'latest']);
        if (dataNFTCode === '0x' || dataNFTCode === '') {
          return NextResponse.json({ 
            success: false, 
            message: 'DataNFT contract not found at the specified address',
            error: `No contract detected at address ${networkConfig.dataNFTAddress}`,
            contractIssue: true,
            hint: "Update the DataNFT address in the config.ts file with the correct deployed address"
          }, { status: 400 });
        }
        
        console.log('DataNFT contract verified at', networkConfig.dataNFTAddress);
      } catch (codeError: any) {
        console.error('Error checking contract code:', codeError);
      }
      
      // Validate that the token contract exists
      try {
        const tokenCode = await jsonRpcRequest('eth_getCode', [tokenAddress, 'latest']);
        if (tokenCode === '0x' || tokenCode === '') {
          return NextResponse.json({ 
            success: false, 
            message: 'Token contract not found at the specified address',
            error: `No contract detected at address ${tokenAddress}`,
            contractIssue: true,
            hint: "Make sure the token was properly deployed before linking"
          }, { status: 400 });
        }
        
        console.log('Token contract verified at', tokenAddress);
      } catch (codeError: any) {
        console.error('Error checking token contract code:', codeError);
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
        if (existingTokenAddress.toLowerCase() === tokenAddress.toLowerCase()) {
          console.log('Token is already linked to this NFT');
          return NextResponse.json({
            success: true,
            tokenExists: true,
            tokenAddress: existingTokenAddress,
            nftId: nftId,
            message: 'Token is already linked to this NFT'
          });
        } else {
          console.log('A different token is already linked to this NFT');
          return NextResponse.json({
            success: false,
            tokenExists: true,
            existingTokenAddress: existingTokenAddress,
            nftId: nftId,
            error: 'A different token is already linked to this NFT',
            message: 'An NFT can only be linked to one token at a time'
          }, { status: 400 });
        }
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
          error: 'Only the NFT owner can link tokens to it'
        }, { status: 403 });
      }
      
      // Create transaction to link token to NFT
      const linkTokenData = dataNFTInterface.encodeFunctionData("linkDatatoken", [
        nftIdBN,
        tokenAddress
      ]);
      
      // Get gas price and nonce
      const gasPriceHex = await jsonRpcRequest('eth_gasPrice');
      const gasPrice = parseInt(gasPriceHex, 16);
      const nonceHex = await jsonRpcRequest('eth_getTransactionCount', [walletAddress, 'latest']);
      const nonce = parseInt(nonceHex, 16);
      
      // Prepare the transaction
      const unsignedTx = {
        to: networkConfig.dataNFTAddress,
        from: walletAddress,
        gasLimit: ethers.utils.hexlify(1000000), // Increased gas limit from 500k to 1M for safety
        gasPrice: ethers.utils.hexlify(gasPrice),
        data: linkTokenData,
        chainId: 1337, // Hardhat's chainId
        nonce: nonce
      };
      
      // Return the unsigned transaction for the client to sign and send
      return NextResponse.json({
        success: true,
        tokenExists: false,
        unsignedTransaction: unsignedTx,
        message: 'Transaction prepared for linking token to NFT'
      });
      
    } catch (contractError: any) {
      console.error('Contract interaction error:', contractError);
            
      // Return a helpful error message with clear instructions
      return NextResponse.json({ 
        success: false, 
        message: 'Error preparing token linking transaction',
        error: contractError instanceof Error ? contractError.message : String(contractError),
        hint: "Make sure you own the NFT and that the token address is valid"
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Token linking error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Error during token linking',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 