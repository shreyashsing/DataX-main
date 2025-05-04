import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

/**
 * API to update a dataset that's missing its download URL
 * This is a utility endpoint to fix datasets that were created without proper URLs
 */
export async function POST(request) {
  try {
    // Verify authentication (only allow authenticated users)
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { datasetId, downloadUrl } = body;
    
    if (!datasetId) {
      return NextResponse.json(
        { error: 'Dataset ID is required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Find the dataset
    let dataset;
    try {
      dataset = await db.collection('datasets').findOne({
        _id: new ObjectId(datasetId)
      });
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid dataset ID format' },
        { status: 400 }
      );
    }
    
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }
    
    // Create a download URL if one wasn't provided
    let finalDownloadUrl = downloadUrl;
    
    if (!finalDownloadUrl) {
      // Use tokenAddress if available
      if (dataset.datatokenAddress) {
        // Create an IPFS gateway URL based on the token address
        const ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
        const ipfsCid = `Qm${dataset.datatokenAddress.substring(2, 34)}`;
        finalDownloadUrl = `${ipfsGateway}${ipfsCid}`;
      } else {
        return NextResponse.json(
          { error: 'No download URL provided and cannot generate one' },
          { status: 400 }
        );
      }
    }
    
    // Update the dataset with the download URL
    const result = await db.collection('datasets').updateOne(
      { _id: new ObjectId(datasetId) },
      { 
        $set: { 
          downloadUrl: finalDownloadUrl,
          // Update file info if it doesn't exist
          file: dataset.file || {
            name: `${dataset.name}.csv`,
            type: 'text/csv',
            size: 0  // We don't know the size
          }
        }
      }
    );
    
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update dataset' },
        { status: 500 }
      );
    }
    
    // Get the updated dataset
    const updatedDataset = await db.collection('datasets').findOne({
      _id: new ObjectId(datasetId)
    });
    
    return NextResponse.json({
      success: true,
      message: 'Dataset updated successfully',
      dataset: updatedDataset
    });
  } catch (error) {
    console.error('Error updating dataset:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the dataset' },
      { status: 500 }
    );
  }
} 