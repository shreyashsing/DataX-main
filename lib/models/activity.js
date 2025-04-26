import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

// Activity types
export const ACTIVITY_TYPES = {
  PURCHASE: 'purchase',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',
  SYSTEM: 'system',
};

// Get recent activities for a user
export async function getRecentActivities(userId, limit = 10) {
  const { db } = await connectToDatabase();
  
  try {
    // Convert string ID to ObjectId if needed
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    console.log('Getting activities for user ID:', objectId);
    
    const activities = await db.collection('activities')
      .find({ userId: objectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
      
    console.log(`Found ${activities.length} recent activities`);
    return activities;
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
}

// Create a new activity
export async function createActivity(activityData) {
  const { db } = await connectToDatabase();
  
  const activity = {
    ...activityData,
    createdAt: new Date(),
  };
  
  const result = await db.collection('activities').insertOne(activity);
  return { ...activity, _id: result.insertedId };
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
  const { db } = await connectToDatabase();
  
  try {
    // Convert string ID to ObjectId if needed
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    console.log('Getting transaction summary for user ID:', objectId);
    
    // Get revenue (money received from selling datasets)
    const revenueResult = await db.collection('transactions')
      .aggregate([
        { $match: { sellerId: objectId, status: 'completed' } },
        { $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 }
          }
        }
      ])
      .toArray();
      
    // Get expenses (money spent on purchasing datasets)
    const expensesResult = await db.collection('transactions')
      .aggregate([
        { $match: { userId: objectId, status: 'completed' } },
        { $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            purchaseCount: { $sum: 1 }
          }
        }
      ])
      .toArray();
    
    const revenue = revenueResult[0] || { totalRevenue: 0, transactionCount: 0 };
    const expenses = expensesResult[0] || { totalExpenses: 0, purchaseCount: 0 };
    
    const result = {
      totalRevenue: revenue.totalRevenue || 0,
      totalExpenses: expenses.totalExpenses || 0,
      transactionCount: revenue.transactionCount || 0,
      purchaseCount: expenses.purchaseCount || 0,
      netAmount: (revenue.totalRevenue || 0) - (expenses.totalExpenses || 0)
    };
    
    console.log('Transaction summary:', result);
    return result;
  } catch (error) {
    console.error('Error getting transaction summary:', error);
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      transactionCount: 0,
      purchaseCount: 0,
      netAmount: 0
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