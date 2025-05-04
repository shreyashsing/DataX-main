import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { DataNFTAbi } from '@/lib/contracts/abis/DataNFTAbi';
import { getConfig } from '@/lib/contracts/config';

// Helper function for JSON-RPC requests
async function jsonRpcRequest(method: string, params: any[] = [], url: string = 'http://localhost:8545') {
  try {
    console.log(`Making JSON-RPC request: ${method}`, params);
    
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
    const { tokenAddress, nftId, walletAddress } = body;

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Missing token address' }, { status: 400 });
    }

    if (!nftId) {
      return NextResponse.json({ error: 'Missing NFT ID' }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    console.log('Linking token to NFT...');
    console.log('Details:', { tokenAddress, nftId, walletAddress });

    // Get the network configuration
    const networkConfig = getConfig(1337);
    console.log('Using network config:', { dataNFTAddress: networkConfig.dataNFTAddress });

    try {
      // Test if blockchain is reachable
      console.log('Testing blockchain connection...');
      const blockNumber = await jsonRpcRequest('eth_blockNumber');
      console.log(`Blockchain connection successful! Current block: ${parseInt(blockNumber, 16)}`);
      
      // Create a provider for encoding
      const dummyProvider = new ethers.providers.JsonRpcProvider();
      const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', dummyProvider);
      
      // Get gas price and nonce
      const gasPriceHex = await jsonRpcRequest('eth_gasPrice');
      const gasPrice = parseInt(gasPriceHex, 16);
      const nonceHex = await jsonRpcRequest('eth_getTransactionCount', [wallet.address, 'latest']);
      const nonce = parseInt(nonceHex, 16);
      console.log('Using nonce:', nonce, 'and gas price:', gasPrice);

      // Check if user owns the NFT
      const dataNFTInterface = new ethers.utils.Interface(DataNFTAbi);
      const ownerOfData = dataNFTInterface.encodeFunctionData("ownerOf", [
        ethers.BigNumber.from(nftId)
      ]);
      
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
      
      // Encode the function call for linking
      const linkTokenData = dataNFTInterface.encodeFunctionData("linkDatatoken", [
        ethers.BigNumber.from(nftId),
        tokenAddress
      ]);
      
      // Create transaction to link the token
      const linkTx = {
        to: networkConfig.dataNFTAddress,
        nonce: nonce,
        gasLimit: ethers.utils.hexlify(1000000),
        gasPrice: ethers.utils.hexlify(gasPrice),
        data: linkTokenData,
        chainId: 1337,
      };
      
      console.log('Signing linking transaction...');
      const signedLinkTx = await wallet.signTransaction(linkTx);
      
      console.log('Sending linking transaction...');
      const linkTxHash = await jsonRpcRequest('eth_sendRawTransaction', [signedLinkTx]);
      console.log('Linking transaction hash:', linkTxHash);
      
      // Wait for linking transaction to be mined
      let linkReceipt = null;
      let attempts = 0;
      
      while (!linkReceipt && attempts < 30) {
        linkReceipt = await jsonRpcRequest('eth_getTransactionReceipt', [linkTxHash]);
        if (!linkReceipt) {
          console.log(`Linking transaction not yet mined, checking again in 2 seconds... (attempt ${attempts + 1}/30)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }
      
      if (!linkReceipt) {
        throw new Error('Linking transaction was not mined within the timeout period');
      }
      
      if (linkReceipt.status !== '0x1') {
        console.error('Linking transaction failed:', linkReceipt);
        throw new Error('Linking transaction failed during execution');
      }
      
      console.log('Token linking successful!');
      
      // Return success
      return NextResponse.json({
        success: true,
        nftId: nftId,
        tokenAddress: tokenAddress,
        transactionHash: linkTxHash,
        message: 'Token successfully linked to NFT'
      });
    } catch (error: any) {
      console.error('Token linking error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error linking token to NFT',
        error: error.message || String(error)
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Request error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error processing request',
      error: error.message || String(error)
    }, { status: 500 });
  }
} 