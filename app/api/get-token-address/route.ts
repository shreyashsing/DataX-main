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
    const { nftId } = body;

    if (!nftId) {
      return NextResponse.json({ error: 'Missing NFT ID' }, { status: 400 });
    }

    console.log('Getting token address for NFT:', nftId);

    // Get the network configuration
    const networkConfig = getConfig(1337);
    
    try {
      // Test blockchain connection
      console.log('Testing blockchain connection...');
      try {
        const blockNumber = await jsonRpcRequest('eth_blockNumber');
        console.log(`Blockchain connection successful! Current block: ${parseInt(blockNumber, 16)}`);
      } catch (error: any) {
        console.error('Failed to connect to blockchain:', error.message);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to connect to blockchain',
          error: error.message
        }, { status: 500 });
      }
      
      // Create DataNFT contract interface
      const dataNFTInterface = new ethers.utils.Interface(DataNFTAbi);
      
      // Check if the NFT exists
      try {
        const ownerOfData = dataNFTInterface.encodeFunctionData("ownerOf", [
          ethers.BigNumber.from(nftId)
        ]);
        
        await jsonRpcRequest('eth_call', [{
          to: networkConfig.dataNFTAddress,
          data: ownerOfData
        }, 'latest']);
        
        // If we get here, the NFT exists
      } catch (e) {
        console.error('NFT does not exist:', e);
        return NextResponse.json({ 
          success: false, 
          message: 'NFT does not exist',
          error: 'The specified NFT ID does not exist'
        }, { status: 404 });
      }
      
      // Get token address for the NFT
      const getTokenData = dataNFTInterface.encodeFunctionData("getDatatoken", [
        ethers.BigNumber.from(nftId)
      ]);
      
      let tokenAddress = '0x0000000000000000000000000000000000000000';
      
      try {
        const getTokenResult = await jsonRpcRequest('eth_call', [{
          to: networkConfig.dataNFTAddress,
          data: getTokenData
        }, 'latest']);
        
        tokenAddress = ethers.utils.defaultAbiCoder.decode(['address'], getTokenResult)[0];
        console.log('Retrieved token address:', tokenAddress);
      } catch (error) {
        console.error('Error getting token address:', error);
        // Continue with zero address
      }
      
      const hasToken = tokenAddress !== '0x0000000000000000000000000000000000000000';
      
      return NextResponse.json({
        success: true,
        tokenAddress,
        hasToken,
        message: hasToken 
          ? `Found token address ${tokenAddress} for NFT ${nftId}` 
          : `No token found for NFT ${nftId}`
      });
      
    } catch (error: any) {
      console.error('Error getting token address:', error);
      
      return NextResponse.json({ 
        success: false, 
        message: 'Error getting token address',
        error: error.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error processing request:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Error processing request',
      error: error.message
    }, { status: 500 });
  }
} 