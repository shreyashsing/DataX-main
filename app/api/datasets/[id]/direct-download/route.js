import { NextResponse } from 'next/server';
import { getDatasetById } from '@/lib/models/dataset';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ethers } from 'ethers';
import { getDownloadHeaders } from '@/lib/storage/directDownload';
import fs from 'fs';
import path from 'path';

/**
 * Direct download endpoint for datasets
 * This acts as a fallback for datasets without proper download URLs
 * It either generates sample data or retrieves stored data based on the dataset
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
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
    const hasAccess = await checkAccess(db, dataset, userId);
    
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'You do not have permission to download this dataset',
          requiresPurchase: true
        },
        { status: 403 }
      );
    }
    
    // At this point, user has access, prepare download data
    // Record download attempt
    await db.collection("datasets").updateOne(
      { _id: new ObjectId(id) },
      { $inc: { downloads: 1 } }
    );
    
    // Get any custom headers
    const customHeaders = getDownloadHeaders(id) || {};
    
    // Generate or retrieve the file data
    const { fileData, contentType, fileName } = await getDatasetContent(dataset);
    
    // Create a response with the file data
    return new Response(fileData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
        ...customHeaders
      }
    });
  } catch (error) {
    console.error('Error with direct download:', error);
    return NextResponse.json(
      { error: 'Error downloading dataset: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Check if user has access to the dataset
 */
async function checkAccess(db, dataset, userId) {
  // Case 1: User is the owner or collaborator (always has access)
  const isOwner = dataset.owner === userId || 
                  dataset.owner === userId.toString() || 
                  dataset.ownerId === userId ||
                  dataset.ownerId === userId.toString();
  
  const isCollaborator = Array.isArray(dataset.collaborators) && 
                        dataset.collaborators.some(c => 
                          c.userId === userId || c.userId === userId.toString());
  
  if (isOwner || isCollaborator) {
    return true;
  }
  
  // Case 2: Check purchase records
  const purchase = await db.collection("purchases").findOne({
    datasetId: dataset._id.toString(),
    userId: userId
  });
  
  if (purchase) {
    return true;
  }
  
  // Case 3: Check token ownership for tokenized datasets
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
          datasetId: dataset._id.toString(),
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
      // Continue to next check
    }
  }
  
  return false;
}

/**
 * Generate or retrieve dataset content
 */
async function getDatasetContent(dataset) {
  // Default file information
  const fileName = dataset.file?.name || `${dataset.name}.csv`;
  const contentType = dataset.file?.type || 'text/csv';
  
  // Try to find the dataset file in storage
  try {
    // Check if we have a local file in storage
    const storagePath = process.env.DATASET_STORAGE_PATH || './storage/datasets';
    const filePath = path.join(storagePath, `${dataset._id.toString()}.csv`);
    
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath);
      return { fileData, contentType, fileName };
    }
  } catch (error) {
    console.warn('Error reading local file, falling back to generated data:', error.message);
  }
  
  // If no file exists, generate sample data based on dataset schema or metadata
  return generateSampleData(dataset);
}

/**
 * Generate sample data for a dataset when the actual file is not available
 */
function generateSampleData(dataset) {
  let fileData;
  const fileName = `${dataset.name}.csv`;
  
  // Get schema if available
  const schema = dataset.schema || [];
  const fields = schema.length > 0 
    ? schema.map(field => field.name) 
    : ['id', 'value1', 'value2', 'timestamp'];
  
  // Create header row
  let csvContent = fields.join(',') + '\n';
  
  // Generate 10 rows of sample data
  for (let i = 1; i <= 10; i++) {
    const row = fields.map(field => {
      if (field.toLowerCase().includes('id')) return i;
      if (field.toLowerCase().includes('name')) return `Sample ${i}`;
      if (field.toLowerCase().includes('date') || field.toLowerCase().includes('time')) 
        return new Date().toISOString();
      if (field.toLowerCase().includes('price') || field.toLowerCase().includes('amount'))
        return (Math.random() * 1000).toFixed(2);
      return `Value ${i}`;
    });
    csvContent += row.join(',') + '\n';
  }
  
  // Add a note about this being sample data
  csvContent += '\n# This is sample data generated for demonstration purposes.\n';
  csvContent += `# Dataset ID: ${dataset._id}\n`;
  csvContent += `# Dataset Name: ${dataset.name}\n`;
  csvContent += '# To get the actual data, please contact the dataset owner.\n';
  
  fileData = Buffer.from(csvContent, 'utf-8');
  
  return { fileData, contentType: 'text/csv', fileName };
} 