import { NextResponse } from 'next/server';
import { getDatasetById } from '@/lib/models/dataset';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ethers } from 'ethers';
import { getDirectDownloadUrl } from '@/lib/storage/directDownload';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid dataset ID' },
        { status: 400 }
      );
    }

    // Verify authentication (required for downloads)
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required to download datasets' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    
    // Get the dataset
    const dataset = await getDatasetById(id);
    
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Connect to database for additional checks
    const { db } = await connectToDatabase();

    // Check access permissions
    // Case 1: User is the owner or collaborator (always has access)
    const isOwner = dataset.owner === userId || 
                    dataset.owner === userId.toString() || 
                    dataset.ownerId === userId ||
                    dataset.ownerId === userId.toString();
    
    const isCollaborator = Array.isArray(dataset.collaborators) && 
                          dataset.collaborators.some(c => 
                            c.userId === userId || c.userId === userId.toString());
    
    // Prepare the response with access check
    const hasAccess = isOwner || isCollaborator || await checkPurchasedAccess(db, id, userId, dataset);
    
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'You do not have permission to download this dataset',
          requiresPurchase: true
        },
        { status: 403 }
      );
    }
    
    // At this point, user has access, prepare download info
    console.log(`Preparing download for dataset: ${id}, user: ${userId}`);
    
    // Get download URL using our direct download system
    const directDownloadResult = await getDirectDownloadUrl(id, dataset);
    
    if (!directDownloadResult.success) {
      return NextResponse.json(
        { error: directDownloadResult.error },
        { status: 500 }
      );
    }
    
    // Record download
    await db.collection("datasets").updateOne(
      { _id: new ObjectId(id) },
      { $inc: { downloads: 1 } }
    );
    
    // Return download info with CORS headers for cross-origin access
    return NextResponse.json({
      success: true,
      downloadUrl: directDownloadResult.downloadUrl,
      filename: directDownloadResult.fileName,
      fileType: directDownloadResult.contentType,
      datasetName: dataset.name
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Error accessing dataset:', error);
    return NextResponse.json(
      { error: 'An error occurred while accessing the dataset' },
      { status: 500 }
    );
  }
}

// Helper function to check purchase-based access
async function checkPurchasedAccess(db, datasetId, userId, dataset) {
  try {
    // Check purchase records
    const purchase = await db.collection("purchases").findOne({
      datasetId: datasetId,
      userId: userId
    });
    
    if (purchase) {
      return true;
    }
    
    // If no purchase record, check token ownership for tokenized datasets
    if (dataset.nftId && dataset.datatokenAddress) {
      try {
        // Get user wallet address
        const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
        
        if (!user || !user.walletAddress) {
          return false;
        }
        
        // Connect to provider
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
        
        // Get token contract
        const tokenContract = new ethers.Contract(
          dataset.datatokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        
        // Check token balance
        const balance = await tokenContract.balanceOf(user.walletAddress);
        
        if (balance.gt(0)) {
          // User has tokens - create purchase record if it doesn't exist
          await db.collection("purchases").insertOne({
            datasetId: datasetId,
            userId: userId,
            walletAddress: user.walletAddress.toLowerCase(),
            purchaseDate: new Date(),
            tokenAddress: dataset.datatokenAddress,
            tokenAmount: ethers.utils.formatEther(balance),
            tokenized: true
          });
          
          return true;
        }
      } catch (error) {
        console.error('Error verifying token ownership:', error);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking access:', error);
    return false;
  }
} 