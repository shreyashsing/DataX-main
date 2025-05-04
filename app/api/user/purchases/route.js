import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      console.log('Authentication failed when fetching purchases');
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    console.log(`Fetching purchases for user: ${userId}`);
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Get purchases for this user
    let purchases = await db.collection('purchases')
      .find({ userId })
      .sort({ purchaseDate: -1 })
      .toArray();
    
    console.log(`Found ${purchases.length} purchases for user ${userId}`);
    
    // Get all dataset IDs
    const datasetIds = purchases.map(purchase => {
      try {
        return new ObjectId(purchase.datasetId);
      } catch (e) {
        console.error(`Invalid dataset ID in purchase: ${purchase._id}, datasetId: ${purchase.datasetId}`);
        return null;
      }
    }).filter(id => id !== null);
    
    console.log(`Processing ${datasetIds.length} valid dataset IDs`);
    
    // Get dataset details
    let datasets = {};
    if (datasetIds.length > 0) {
      const datasetsList = await db.collection('datasets')
        .find({ _id: { $in: datasetIds } })
        .toArray();
      
      console.log(`Found ${datasetsList.length} datasets out of ${datasetIds.length} IDs`);
      
      // Log any missing datasets
      if (datasetsList.length < datasetIds.length) {
        const foundIds = datasetsList.map(d => d._id.toString());
        const missingIds = purchases
          .filter(p => !foundIds.includes(p.datasetId))
          .map(p => p.datasetId);
        console.warn(`Missing datasets: ${missingIds.join(', ')}`);
      }
      
      // Create a map of dataset ID to dataset for quick lookup
      datasetsList.forEach(dataset => {
        datasets[dataset._id.toString()] = dataset;
      });
    }
    
    // Enrich purchases with dataset details
    const enrichedPurchases = purchases.map(purchase => {
      const datasetId = purchase.datasetId;
      const dataset = datasets[datasetId];
      
      if (!dataset) {
        console.log(`Dataset not found for purchase: ${purchase._id}, dataset: ${datasetId}`);
      }
      
      return {
        ...purchase,
        dataset: dataset || {
          name: 'Unknown Dataset',
          description: 'This dataset may have been deleted',
          _id: datasetId
        }
      };
    });
    
    return NextResponse.json({
      success: true,
      purchases: enrichedPurchases
    });
  } catch (error) {
    console.error('Error fetching user purchases:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'An error occurred while fetching purchases',
        message: error.message
      },
      { status: 500 }
    );
  }
} 