import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ethers } from 'ethers';
import { getDatasetById } from '@/lib/models/dataset';
import { getConfig } from '@/lib/contracts/config';
import { createProvider, getTokenBalance, detectPurchaseFunction } from '@/lib/contracts/provider';

// This API route handles dataset purchase initialization
export async function POST(request, { params }) {
  console.log('Purchase initialization requested for dataset:', params.id);
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      console.log('Authentication failed for purchase initialization');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    console.log('User authenticated:', userId);
    
    // Get request body
    let body;
    try {
      body = await request.json();
      console.log('Request body received:', JSON.stringify(body));
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    // Extract wallet address from body, ensuring it exists
    const walletAddress = body.address || body.walletAddress;
    const chainId = body.chainId || 1337;
    
    console.log('Wallet address:', walletAddress);
    console.log('Chain ID:', chainId);
    
    if (!walletAddress) {
      console.log('No wallet address provided');
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Connect to database
    console.log('Connecting to database...');
    const { db } = await connectToDatabase();
    console.log('Database connected');
    
    // Get dataset
    console.log('Fetching dataset:', params.id);
    const dataset = await getDatasetById(params.id);
    
    if (!dataset) {
      console.log('Dataset not found:', params.id);
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }
    console.log('Dataset found:', dataset.name);

    // Check if user is owner
    const isOwner = dataset.owner?.toString() === userId.toString();
    if (isOwner) {
      console.log('User is the owner, cannot purchase own dataset');
      return NextResponse.json(
        { error: "You cannot purchase your own dataset" },
        { status: 400 }
      );
    }

    // Check if user has already purchased this dataset
    console.log('Checking for existing purchase...');
    const existingPurchase = await db.collection("purchases").findOne({
      datasetId: params.id,
      userId: userId
    });

    if (existingPurchase) {
      console.log('User has already purchased this dataset');
      return NextResponse.json({
        success: true,
        message: "You have already purchased this dataset",
        purchaseId: existingPurchase._id.toString(),
        downloadAvailable: true,
        alreadyPurchased: true
      });
    }
    console.log('No existing purchase found, proceeding with initialization');

    // Get network configuration
    const networkConfig = getConfig(chainId);
    console.log('Using network config:', networkConfig.name);

    // Check if dataset is tokenized
    if ((!dataset.nftId && !dataset.tokenId) || !dataset.datatokenAddress) {
      console.log('Dataset is not tokenized, creating direct purchase record');
      // For non-tokenized datasets, create a purchase record and grant access immediately
      const purchaseResult = await db.collection("purchases").insertOne({
        datasetId: params.id,
        userId: userId,
        walletAddress: walletAddress.toLowerCase(),
        purchaseDate: new Date(),
        tokenized: false,
        chainId
      });
      
      // Update dataset purchase count
      await db.collection("datasets").updateOne(
        { _id: new ObjectId(params.id) },
        { $inc: { purchases: 1 } }
      );
      
      return NextResponse.json({
        success: true,
        message: "Purchase successful",
        purchaseId: purchaseResult.insertedId.toString(),
        downloadAvailable: true
      });
    }

    // Dataset is tokenized - log full tokenization details for debugging
    console.log('Dataset tokenization details:', {
      tokenId: dataset.tokenId,
      nftId: dataset.nftId,
      datatokenAddress: dataset.datatokenAddress,
      tokenName: dataset.tokenName,
      tokenSymbol: dataset.tokenSymbol
    });
    console.log('Dataset is tokenized, preparing token purchase transaction');

    // For tokenized datasets, prepare token purchase transaction
    try {
      // Connect to provider
      console.log('Connecting to blockchain provider using:', networkConfig.rpcUrl);
      let provider;
      try {
        // Use our comprehensive provider creation utility
        provider = await createProvider(chainId);
        console.log('Provider connected successfully');
      } catch (providerError) {
        console.error('Provider connection error:', providerError);
        
        // Even when provider connection fails, we can proceed with purchase for tokenized datasets
        // by creating a manual transaction for the frontend to process
        if (dataset.datatokenAddress) {
          console.log('Creating manual transaction despite provider connection failure');
          const tokenPrice = dataset.price || "0.01";
          
          return NextResponse.json({
            success: true,
            message: "Purchase prepared (provider connection issues detected)",
            tokenAddress: dataset.datatokenAddress,
            tokenName: dataset.tokenName || "Data Token",
            tokenSymbol: dataset.tokenSymbol || "DTK",
            tokensAmount: "1",
            cost: tokenPrice,
            transaction: {
              to: dataset.datatokenAddress,
              value: ethers.utils.parseEther(tokenPrice).toString(),
              // Cannot encode function data, but frontend will handle it
              data: "0x",
              gasLimit: 200000
            },
            requiresTokenPurchase: true,
            providerConnectionFailed: true
          });
        }
        
        return NextResponse.json(
          { 
            error: "Failed to connect to blockchain provider", 
            details: providerError.message,
            provider: networkConfig.rpcUrl
          },
          { status: 500 }
        );
      }
      
      // Get token contract
      console.log('Creating token contract instance for address:', dataset.datatokenAddress);
      try {
        // Instead of using Contract which requires a full provider implementation,
        // we'll use direct RPC calls via our simplified provider
        
        // First, try to get token info using direct calls
        console.log('Getting token info using direct calls...');
        
        // Check for symbol function
        let tokenSymbol, tokenDecimals;
        try {
          // Symbol function selector: 0x95d89b41
          const symbolData = '0x95d89b41';
          const symbolResult = await provider.send('eth_call', [
            { to: dataset.datatokenAddress, data: symbolData },
            'latest'
          ]);
          
          // Decode the result (string)
          if (symbolResult && symbolResult.length >= 66) {
            const offset = parseInt(symbolResult.slice(2 + 64), 16); // Skip first 32 bytes to get string offset
            const length = parseInt(symbolResult.slice(2 + 64 + offset * 2, 2 + 64 + offset * 2 + 64), 16);
            const hexData = symbolResult.slice(2 + 64 + offset * 2 + 64, 2 + 64 + offset * 2 + 64 + length * 2);
            tokenSymbol = Buffer.from(hexData, 'hex').toString();
            console.log('Token symbol (via direct call):', tokenSymbol);
          }
        } catch (symbolError) {
          console.error('Error getting token symbol:', symbolError);
          // Fallback to dataset value
          tokenSymbol = dataset.tokenSymbol || 'DTK';
          console.log('Using fallback token symbol:', tokenSymbol);
        }
        
        try {
          // Decimals function selector: 0x313ce567
          const decimalsData = '0x313ce567';
          const decimalsResult = await provider.send('eth_call', [
            { to: dataset.datatokenAddress, data: decimalsData },
            'latest'
          ]);
          
          // Decode the result (uint8)
          if (decimalsResult && decimalsResult.length >= 66) {
            tokenDecimals = parseInt(decimalsResult.slice(2), 16);
            console.log('Token decimals (via direct call):', tokenDecimals);
          }
        } catch (decimalsError) {
          console.error('Error getting token decimals:', decimalsError);
          // Default to 18 decimals
          tokenDecimals = 18;
          console.log('Using default token decimals:', tokenDecimals);
        }
        
        // Detect available purchase function using our helper
        console.log('Detecting available purchase function...');
        let purchaseFunction = null;
        try {
          const result = await detectPurchaseFunction(provider, dataset.datatokenAddress);
          if (result && result.success) {
            purchaseFunction = result.function;
          } else {
            console.log('No purchase function detected:', result?.error || 'Unknown reason');
          }
        } catch (detectError) {
          console.error('Error detecting purchase function:', detectError);
          console.log('Proceeding with direct ETH transfer as fallback');
        }
        console.log('Detected purchase function:', purchaseFunction || 'None (will use direct ETH transfer)');
        
        // Check if user already has tokens
        console.log('Checking token balance for address:', walletAddress);
        let tokenBalance;
        try {
          tokenBalance = await getTokenBalance(provider, dataset.datatokenAddress, walletAddress);
          console.log('Current token balance:', tokenBalance.toString());
        } catch (balanceError) {
          console.error('Token balance check failed completely:', balanceError);
          // Assume zero balance to proceed with purchase
          console.log('Assuming zero balance to proceed with purchase flow');
          tokenBalance = ethers.BigNumber.from(0);
        }
        
        if (!tokenBalance.isZero()) {
          console.log('User already has tokens, recording purchase directly');
          // User already has tokens, record purchase directly
          const purchaseResult = await db.collection("purchases").insertOne({
            datasetId: params.id,
            userId: userId,
            walletAddress: walletAddress.toLowerCase(),
            tokenAddress: dataset.datatokenAddress,
            purchaseDate: new Date(),
            tokenAmount: ethers.utils.formatEther(tokenBalance),
            tokenized: true,
            chainId
          });
          
          await db.collection("datasets").updateOne(
            { _id: new ObjectId(params.id) },
            { $inc: { purchases: 1 } }
          );
          
          return NextResponse.json({
            success: true,
            message: "You already have tokens for this dataset",
            purchaseId: purchaseResult.insertedId.toString(),
            downloadAvailable: true,
            tokenBalance: ethers.utils.formatEther(tokenBalance)
          });
        }
        
        // Create transaction for token purchase
        console.log('Creating transaction for token purchase');
        const tokenPrice = dataset.price || "0.01"; // Default price if not set
        
        // Determine which function to call based on detection
        let txData = "0x"; // Default to empty data for direct ETH transfer
        
        if (purchaseFunction) {
          // Based on detection result, create the appropriate function data
          if (purchaseFunction === 'buyTokens') {
            // buyTokens() selector: 0x3610724e
            txData = '0x3610724e';
            console.log('Using buyTokens() function');
          } else if (purchaseFunction === 'buy') {
            // buy() selector: 0xa6f2ae3a
            txData = '0xa6f2ae3a';
            console.log('Using buy() function');
          } else if (purchaseFunction === 'purchase') {
            // purchase() selector: 0x64420bb8
            txData = '0x64420bb8';
            console.log('Using purchase() function');
          } else if (purchaseFunction === 'mint') {
            // mint() selector: 0x1249c58b
            txData = '0x1249c58b';
            console.log('Using mint() function');
          }
        } else {
          console.log('No purchase function detected, sending plain ETH');
        }
        
        // Create transaction object
        const transaction = {
          to: dataset.datatokenAddress,
          value: ethers.utils.parseEther(tokenPrice).toString(),
          data: txData,
          gasLimit: 300000  // Increased gas limit for safety
        };
        
        console.log('Transaction prepared:', {
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
          gasLimit: transaction.gasLimit
        });
        
        return NextResponse.json({
          success: true,
          message: "Ready to purchase tokens",
          tokenAddress: dataset.datatokenAddress,
          tokenName: dataset.tokenName || "Data Token",
          tokenSymbol: tokenSymbol,
          tokensAmount: "1", // Default amount
          cost: tokenPrice,
          transaction,
          requiresTokenPurchase: true
        });
      } catch (contractError) {
        console.error('Error processing token contract:', contractError);
        
        // Even if we encounter an error, still provide a transaction object for client-side handling
        const tokenPrice = dataset.price || "0.01";
        
        return NextResponse.json({
          success: true,
          message: "Purchase prepared (server-side processing issues detected)",
          tokenAddress: dataset.datatokenAddress,
          tokenName: dataset.tokenName || "Data Token",
          tokenSymbol: dataset.tokenSymbol || "DTK",
          tokensAmount: "1",
          cost: tokenPrice,
          transaction: {
            to: dataset.datatokenAddress,
            value: ethers.utils.parseEther(tokenPrice).toString(),
            data: "0x", // Client will handle function detection
            gasLimit: 300000
          },
          requiresTokenPurchase: true,
          providerConnectionFailed: true
        });
      }
    } catch (error) {
      console.error("Error preparing token purchase:", error);
      return NextResponse.json(
        { 
          error: "Error preparing token purchase", 
          details: error.message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Purchase error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to process purchase",
        stack: error.stack,
        details: 'An unexpected error occurred during purchase initialization'
      },
      { status: 500 }
    );
  }
} 