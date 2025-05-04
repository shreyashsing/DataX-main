import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { TokenFactoryAbi } from '@/lib/contracts/abis/TokenFactoryAbi';
import { DataNFTAbi } from '@/lib/contracts/abis/DataNFTAbi';
import { getConfig } from '@/lib/contracts/config';
import { DatatokenBytecode, DatatokenAbi } from '@/lib/contracts/bytecode/DataToken';

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for JSON-RPC requests - maintained for read-only queries
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
    let { walletAddress, tokenName, tokenSymbol, nftId, initialSupply, tokenPrice, decimals, directDeploy } = body;

    // Default to direct deployment as it's more reliable
    directDeploy = directDeploy !== false;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    if (!nftId) {
      return NextResponse.json({ error: 'Missing NFT ID' }, { status: 400 });
    }

    console.log('Preparing transaction for creating token for NFT:', nftId);
    console.log('Token details:', { tokenName, tokenSymbol, walletAddress, directDeploy });

    // Get the network configuration
    const networkConfig = getConfig(1337);
    console.log('Using network config:', { 
      tokenFactoryAddress: networkConfig.tokenFactoryAddress,
      dataNFTAddress: networkConfig.dataNFTAddress 
    });
    
    // Validate the contract addresses
    if (!directDeploy && (!networkConfig.tokenFactoryAddress || 
        networkConfig.tokenFactoryAddress === '0x0000000000000000000000000000000000000000')) {
      return NextResponse.json({ 
        success: false, 
        message: 'TokenFactory contract address is not configured properly',
        error: 'The TokenFactory contract address is either not set or is set to the zero address',
        contractIssue: true,
        hint: "Update the TokenFactory address in the config.ts file with the correct deployed address"
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
      
      // Validate that the contracts exist at the specified addresses
      try {
        // Check DataNFT contract
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
        
        // Only check TokenFactory if not using direct deployment
        if (!directDeploy) {
          const tokenFactoryCode = await jsonRpcRequest('eth_getCode', [networkConfig.tokenFactoryAddress, 'latest']);
          if (tokenFactoryCode === '0x' || tokenFactoryCode === '') {
            return NextResponse.json({ 
              success: false, 
              message: 'TokenFactory contract not found at the specified address',
              error: `No contract detected at address ${networkConfig.tokenFactoryAddress}`,
              contractIssue: true,
              hint: "Update the TokenFactory address in the config.ts file with the correct deployed address"
            }, { status: 400 });
          }
          
          console.log('TokenFactory contract verified at', networkConfig.tokenFactoryAddress);
        }
      } catch (codeError: any) {
        console.error('Error checking contract code:', codeError);
      }
      
      // Check if token already exists for this NFT - this works for both approaches
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
          message: 'DataToken already exists for this NFT'
        });
      }
      
      // Default values if not provided
      // Create shorter token names to prevent memory allocation errors
      const MAX_TOKEN_NAME_LENGTH = 10; // Even smaller limit
      const MAX_TOKEN_SYMBOL_LENGTH = 5; // Even smaller limit
      
      // Use extremely short names to avoid memory issues
      let finalTokenName = "DTN" + nftId.slice(-3); // e.g. "DTN123"
      let finalTokenSymbol = "DT" + nftId.slice(-2); // e.g. "DT23"
      
      console.log(`Using minimal token name: ${finalTokenName} and symbol: ${finalTokenSymbol}`);
      
      const finalInitialSupply = 1000; // Much smaller initial supply (1,000 tokens)
      let finalTokenPrice;
      try {
        // If tokenPrice is provided, ensure it's a valid BigNumber
        finalTokenPrice = tokenPrice 
          ? (typeof tokenPrice === 'string' && tokenPrice.includes('.') 
              ? ethers.utils.parseEther(tokenPrice) 
              : ethers.BigNumber.from(tokenPrice))
          : ethers.utils.parseEther("0.01"); // Default to 0.01 ETH
      } catch (error) {
        console.warn("Invalid token price format, using default:", error);
        finalTokenPrice = ethers.utils.parseEther("0.01"); // Default to 0.01 ETH if parsing fails
      }
      const finalDecimals = decimals || 18; // Default to 18 decimals
      
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
      
      // DIRECT DEPLOYMENT APPROACH - bypass TokenFactory
      if (directDeploy) {
        console.log('Using direct token deployment approach...');
        
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
        
        // Get the DataToken contract bytecode and ABI
        // Using the proper bytecode from our generated file
        
        // Encode constructor parameters
        const dataTikenInterface = new ethers.utils.Interface(DatatokenAbi);
        const constructorData = dataTikenInterface.encodeDeploy([
          finalTokenName,
          finalTokenSymbol,
          ethers.BigNumber.from(finalInitialSupply),
          finalTokenPrice,
          finalDecimals
        ]);
        
        // Create transaction to deploy DataToken directly
        const deployData = DatatokenBytecode + constructorData.slice(2); // Remove 0x prefix from constructor data
        
        // Get gas price and nonce
        const gasPriceHex = await jsonRpcRequest('eth_gasPrice');
        const gasPrice = parseInt(gasPriceHex, 16);
        const nonceHex = await jsonRpcRequest('eth_getTransactionCount', [walletAddress, 'latest']);
        const nonce = parseInt(nonceHex, 16);
        
        // Prepare the transaction
        const unsignedTx = {
          from: walletAddress,
          gasLimit: ethers.utils.hexlify(9000000), // Increased gas limit for contract deployment from 5M to 9M
          gasPrice: ethers.utils.hexlify(gasPrice),
          data: deployData,
          chainId: 1337, // Hardhat's chainId
          nonce: nonce
        };
        
        // Calculate the expected contract address
        const expectedAddress = ethers.utils.getContractAddress({
          from: walletAddress,
          nonce: nonce
        });
        
        console.log('Expected deployed token address:', expectedAddress);
        
        return NextResponse.json({
          success: true,
          tokenExists: false,
          directDeploy: true,
          unsignedTransaction: unsignedTx,
          expectedTokenAddress: expectedAddress,
          nftId: nftId,
          message: 'Transaction prepared for direct DataToken deployment',
          hint: "After deployment, use the /api/token/link-token API to link this token to your NFT"
        });
      }
      
      // TOKENFACTORY APPROACH (original implementation)
      // Create contract interface for TokenFactory
      const tokenFactoryInterface = new ethers.utils.Interface(TokenFactoryAbi);
      
      // Create a direct transaction for TokenFactory.createToken
      const createTokenData = tokenFactoryInterface.encodeFunctionData("createToken", [
        nftIdBN,
        finalTokenName,
        finalTokenSymbol,
        ethers.BigNumber.from(finalInitialSupply),
        finalTokenPrice,
        finalDecimals
      ]);
      
      // Get gas price and nonce
      const gasPriceHex = await jsonRpcRequest('eth_gasPrice');
      const gasPrice = parseInt(gasPriceHex, 16);
      const nonceHex = await jsonRpcRequest('eth_getTransactionCount', [walletAddress, 'latest']);
      const nonce = parseInt(nonceHex, 16);
      
      // Prepare the transaction for the client to sign - attempting TokenFactory.createToken
      const unsignedTx = {
        to: networkConfig.tokenFactoryAddress,
        from: walletAddress,
        gasLimit: ethers.utils.hexlify(9000000), // Increased gas limit from 5M to 9M
        gasPrice: ethers.utils.hexlify(gasPrice),
        data: createTokenData,
        chainId: 1337, // Hardhat's chainId
        nonce: nonce
      };
      
      // Return the unsigned transaction for the client to sign and send
      return NextResponse.json({
        success: true,
        tokenExists: false,
        directDeploy: false,
        unsignedTransaction: unsignedTx,
        message: 'Transaction prepared for token creation attempt via TokenFactory.createToken',
        warning: 'This transaction may fail if you are not the owner of the NFT. Please ensure you own NFT #' + nftId + ' before proceeding.',
        hint: "If this approach fails, try setting directDeploy to true in your request"
      });
    } catch (contractError: any) {
      console.error('Contract interaction error:', contractError);
            
      // Return a helpful error message with clear instructions
      return NextResponse.json({ 
        success: false, 
        message: 'Error preparing token creation transaction',
        error: contractError instanceof Error ? contractError.message : String(contractError),
        hint: "1. Make sure you own the NFT before attempting to create a token for it.\n2. Try the direct deployment option."
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