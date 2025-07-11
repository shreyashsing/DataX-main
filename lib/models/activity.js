import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Activity types
export const ACTIVITY_TYPES = {
  PURCHASE: 'purchase',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',
  SYSTEM: 'system',
};

// Normalize user ID handling
function normalizeUserId(userId) {
  if (!userId) return null;
  return typeof userId === 'string' && userId.length === 24 
    ? new ObjectId(userId) 
    : userId;
}

// Get recent activities for a user
export async function getRecentActivities(userId, limit = 5) {
  try {
    const { db } = await connectToDatabase();
    const userIdObj = normalizeUserId(userId);
    
    // Query for activities with either userId or user field
    const query = {
      $or: [
        { userId: userIdObj },
        { userId: userIdObj.toString() },
        { user: userIdObj },
        { user: userIdObj.toString() }
      ]
    };
    
    console.log('Querying activities with:', JSON.stringify(query));
    
    const activities = await db
      .collection('activities')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
      
    console.log(`Found ${activities.length} activities for user ${userId}`);
    
    return activities;
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
}

// Create a new activity
export async function createActivity(activityData) {
  const { db } = await connectToDatabase();
  
  // Normalize userId fields
  const normalizedData = { ...activityData };
  
  if (normalizedData.userId) {
    normalizedData.userId = normalizeUserId(normalizedData.userId);
    // Ensure consistent field naming
    normalizedData.user = normalizedData.userId;
  } else if (normalizedData.user) {
    normalizedData.user = normalizeUserId(normalizedData.user);
    // Ensure consistent field naming
    normalizedData.userId = normalizedData.user;
  }
  
  // Add timestamp if not provided
  if (!normalizedData.timestamp) {
    normalizedData.timestamp = new Date();
  }
  
  const result = await db.collection('activities').insertOne(normalizedData);
  return { ...normalizedData, _id: result.insertedId };
}

// Create a download activity and update dataset download count
export async function recordDownload(userId, datasetId, datasetName) {
  const { db } = await connectToDatabase();
  
  // Create activity
  const activity = {
    type: ACTIVITY_TYPES.DOWNLOAD,
    userId,
    datasetId: new ObjectId(datasetId),
    title: 'Dataset Downloaded',
    description: `You downloaded the '${datasetName}' dataset`,
    createdAt: new Date(),
  };
  
  // Insert activity
  await db.collection('activities').insertOne(activity);
  
  // Update dataset downloads count
  await db.collection('datasets').updateOne(
    { _id: new ObjectId(datasetId) },
    { $inc: { downloads: 1 } }
  );
  
  return activity;
}

// Create a purchase transaction and associated activity
export async function recordPurchase(userId, datasetId, datasetName, amount, sellerId) {
  const { db } = await connectToDatabase();
  
  // Create transaction
  const transaction = {
    userId: userId,
    datasetId: new ObjectId(datasetId),
    sellerId: sellerId,
    amount: amount,
    status: 'completed',
    createdAt: new Date(),
  };
  
  // Insert transaction
  const transactionResult = await db.collection('transactions').insertOne(transaction);
  
  // Create buyer activity
  const buyerActivity = {
    type: ACTIVITY_TYPES.PURCHASE,
    userId,
    datasetId: new ObjectId(datasetId),
    transactionId: transactionResult.insertedId,
    title: 'Dataset Purchased',
    description: `You purchased the '${datasetName}' dataset`,
    amount: -Math.abs(amount),
    positive: false,
    createdAt: new Date(),
  };
  
  // Create seller activity
  const sellerActivity = {
    type: ACTIVITY_TYPES.PURCHASE,
    userId: sellerId,
    datasetId: new ObjectId(datasetId),
    transactionId: transactionResult.insertedId,
    title: 'Dataset Sold',
    description: `Someone purchased your '${datasetName}' dataset`,
    amount: Math.abs(amount),
    positive: true,
    createdAt: new Date(),
  };
  
  // Insert activities
  await db.collection('activities').insertMany([buyerActivity, sellerActivity]);
  
  return {
    transaction: { ...transaction, _id: transactionResult.insertedId },
    buyerActivity,
    sellerActivity
  };
}

// Get user's transaction summary
export async function getUserTransactionSummary(userId) {
  try {
    const { db } = await connectToDatabase();
    const userIdObj = normalizeUserId(userId);
    
    // Query for transactions with either userId or user field
    const query = {
      $or: [
        { userId: userIdObj },
        { userId: userIdObj.toString() },
        { sellerId: userIdObj },
        { sellerId: userIdObj.toString() },
        { user: userIdObj },
        { user: userIdObj.toString() }
      ]
    };
    
    console.log('Querying transactions with:', JSON.stringify(query));
    
    const transactions = await db
      .collection('transactions')
      .find(query)
      .toArray();
      
    console.log(`Found ${transactions.length} transactions for user ${userId}`);
    
    // Calculate summary statistics
    let totalRevenue = 0;
    let totalSales = 0;
    
    transactions.forEach(transaction => {
      if (
        (transaction.sellerId && 
          (transaction.sellerId.toString() === userIdObj.toString() || 
           transaction.sellerId === userIdObj.toString())) ||
        (transaction.user && 
          (transaction.user.toString() === userIdObj.toString() ||
           transaction.user === userIdObj.toString()))
      ) {
        totalRevenue += transaction.amount || 0;
        totalSales += 1;
      }
    });
    
    return {
      totalTransactions: transactions.length,
      totalRevenue,
      totalSales
    };
  } catch (error) {
    console.error('Error getting user transaction summary:', error);
    return {
      totalTransactions: 0,
      totalRevenue: 0,
      totalSales: 0
    };
  }
}

// Get monthly transaction statistics for charts
export async function getMonthlyTransactionStats(userId, year = new Date().getFullYear()) {
  const { db } = await connectToDatabase();
  
  // Get monthly revenue
  const monthlyRevenue = await db.collection('transactions')
    .aggregate([
      { 
        $match: { 
          sellerId: userId,
          status: 'completed',
          createdAt: { 
            $gte: new Date(`${year}-01-01`), 
            $lt: new Date(`${year+1}-01-01`) 
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]).toArray();
  
  // Format the results to include all months
  const monthlyData = Array(12).fill().map((_, i) => ({
    name: new Date(0, i).toLocaleString('default', { month: 'short' }),
    revenue: 0,
    count: 0
  }));
  
  monthlyRevenue.forEach((data) => {
    if (data._id && data._id.month) {
      const monthIndex = data._id.month - 1;
      monthlyData[monthIndex].revenue = data.revenue || 0;
      monthlyData[monthIndex].count = data.count || 0;
    }
  });
  
  return monthlyData;
} 