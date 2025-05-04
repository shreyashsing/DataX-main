import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { MinimalTokenAbi, MinimalTokenBytecode } from '@/lib/contracts/bytecode/TestMinimal';

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
    let { walletAddress, tokenName, tokenSymbol } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    // Set defaults for token name and symbol
    tokenName = tokenName || "SimpleToken";
    tokenSymbol = tokenSymbol || "STK";

    console.log('Testing minimal token deployment...');
    console.log('Token details:', { tokenName, tokenSymbol, walletAddress });

    try {
      // Test if blockchain is reachable
      console.log('Testing blockchain connection...');
      const blockNumber = await jsonRpcRequest('eth_blockNumber');
      console.log(`Blockchain connection successful! Current block: ${parseInt(blockNumber, 16)}`);
      
      // Create a minimal provider for encoding
      const dummyProvider = new ethers.providers.JsonRpcProvider();
      const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', dummyProvider);
      
      // Get gas price and nonce
      const gasPriceHex = await jsonRpcRequest('eth_gasPrice');
      const gasPrice = parseInt(gasPriceHex, 16);
      const nonceHex = await jsonRpcRequest('eth_getTransactionCount', [wallet.address, 'latest']);
      const nonce = parseInt(nonceHex, 16);
      console.log('Using nonce:', nonce, 'and gas price:', gasPrice);

      // Encode constructor parameters for the minimal token
      const tokenInterface = new ethers.utils.Interface(MinimalTokenAbi);
      const constructorData = tokenInterface.encodeDeploy([
        tokenName,
        tokenSymbol
      ]);
      
      // Create transaction to deploy token directly
      const deployData = MinimalTokenBytecode + constructorData.slice(2);
      
      // Create transaction object
      const deployTx = {
        nonce,
        gasLimit: ethers.utils.hexlify(5000000),
        gasPrice: ethers.utils.hexlify(gasPrice),
        data: deployData,
        chainId: 1337, // Hardhat's chainId
      };
      
      // Calculate the expected contract address
      const expectedAddress = ethers.utils.getContractAddress({
        from: wallet.address,
        nonce: nonce
      });
      
      console.log('Expected token address:', expectedAddress);
      
      // Sign the transaction
      console.log('Signing transaction...');
      const signedDeployTx = await wallet.signTransaction(deployTx);
      
      // Send the transaction
      console.log('Sending deployment transaction...');
      const deployTxHash = await jsonRpcRequest('eth_sendRawTransaction', [signedDeployTx]);
      console.log('Deployment transaction hash:', deployTxHash);
      
      // Wait for the transaction to be mined
      console.log('Waiting for transaction to be mined...');
      let receipt = null;
      let attempts = 0;
      
      while (!receipt && attempts < 30) {
        receipt = await jsonRpcRequest('eth_getTransactionReceipt', [deployTxHash]);
        if (!receipt) {
          console.log(`Transaction not yet mined, checking again in 2 seconds... (attempt ${attempts + 1}/30)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }
      
      if (!receipt) {
        throw new Error('Transaction was not mined within the timeout period');
      }
      
      if (receipt.status !== '0x1') {
        console.error('Transaction failed:', receipt);
        throw new Error('Transaction failed during execution');
      }
      
      console.log('Token deployment successful!');
      
      // Return the token address
      return NextResponse.json({
        success: true,
        tokenAddress: expectedAddress,
        transactionHash: deployTxHash,
        message: 'Simple token deployed successfully'
      });
    } catch (error: any) {
      console.error('Token deployment error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error deploying test token',
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