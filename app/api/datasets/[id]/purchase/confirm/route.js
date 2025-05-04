import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ethers } from 'ethers';
import { getDatasetById } from '@/lib/models/dataset';
import { getConfig } from '@/lib/contracts/config';
import { createProvider, getTokenBalance } from '@/lib/contracts/provider';

/**
 * API route to confirm token purchases and record them in the database
 */
export async function POST(request, { params }) {
  console.log('Purchase confirmation requested for dataset:', params.id);
  
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      console.log('Authentication failed for purchase confirmation');
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
    const transactionHash = body.transactionHash || body.txHash;
    
    console.log('Wallet address:', walletAddress);
    console.log('Chain ID:', chainId);
    console.log('Transaction hash:', transactionHash);
    
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
    
    // Record purchase confirmation in the database
    console.log('Recording purchase confirmation with transaction hash:', transactionHash);
    
    const purchaseResult = await db.collection("purchases").insertOne({
      datasetId: params.id,
      userId: userId,
      walletAddress: walletAddress.toLowerCase(),
      transactionHash: transactionHash,
      purchaseDate: new Date(),
      tokenized: Boolean(dataset.datatokenAddress),
      tokenAddress: dataset.datatokenAddress || null,
      chainId,
      confirmed: true
    });
    
    // Update dataset purchase count
    await db.collection("datasets").updateOne(
      { _id: new ObjectId(params.id) },
      { $inc: { purchases: 1 } }
    );
    
    console.log('Purchase recorded successfully');
    
    return NextResponse.json({
      success: true,
      message: "Purchase confirmed successfully",
      purchaseId: purchaseResult.insertedId.toString(),
      downloadAvailable: true
    });
  } catch (error) {
    console.error("Purchase confirmation error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to confirm purchase",
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 