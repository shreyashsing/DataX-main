import { NextResponse } from 'next/server';
import { getDatasetStats, getMonthlyStats, getTopPerformingDatasets } from '@/lib/models/dataset';
import { getRecentActivities, getUserTransactionSummary } from '@/lib/models/activity';
import { verifyAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      console.log('Auth verification failed:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    
    const { userId } = authResult;
    console.log('Fetching dashboard stats for user ID:', userId);
    
    // Direct database access for debugging
    const { db } = await connectToDatabase();
    
    // Check if user exists in the database
    const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const user = await db.collection('users').findOne({ _id: userIdObj });
    console.log('User found in database:', !!user);
    
    // Build query to match datasets with either owner or ownerId
    const ownerQuery = {
      $or: [
        { owner: userIdObj },
        { owner: userIdObj.toString() },
        { ownerId: userIdObj }
      ]
    };
    
    // Check if datasets exist for this user
    const datasets = await db.collection('datasets').find(ownerQuery).toArray();
    console.log('Datasets count for user:', datasets.length);
    if (datasets.length > 0) {
      console.log('First dataset:', {
        name: datasets[0].name,
        owner: datasets[0].owner,
        ownerId: datasets[0].ownerId,
        downloads: datasets[0].downloads
      });
    }
    
    // Check for activities
    const activitiesQuery = {
      $or: [
        { userId: userIdObj },
        { userId: userIdObj.toString() },
        { user: userIdObj },
        { user: userIdObj.toString() }
      ]
    };
    const activities = await db.collection('activities').find(activitiesQuery).toArray();
    console.log('Activities count for user:', activities.length);
    
    // Check for transactions
    const transactionsQuery = {
      $or: [
        { userId: userIdObj },
        { userId: userIdObj.toString() },
        { sellerId: userIdObj },
        { sellerId: userIdObj.toString() }
      ]
    };
    const transactions = await db.collection('transactions').find(transactionsQuery).toArray();
    console.log('Transactions count for user:', transactions.length);
    
    // Get all stats in parallel
    const [
      datasetStats,
      monthlyStats,
      recentActivities,
      topDatasets,
      transactionSummary
    ] = await Promise.all([
      getDatasetStats(userIdObj),
      getMonthlyStats(userIdObj),
      getRecentActivities(userIdObj, 10),
      getTopPerformingDatasets(userIdObj, 3),
      getUserTransactionSummary(userIdObj)
    ]);
    
    console.log('Stats retrieved:', {
      datasets: datasetStats?.totalDatasets || 0,
      downloads: datasetStats?.totalDownloads || 0,
      revenue: transactionSummary?.totalRevenue || 0,
      activities: recentActivities?.length || 0,
      topDatasets: topDatasets?.length || 0
    });
    
    // Return all dashboard data
    return NextResponse.json({
      datasetStats,
      monthlyStats,
      recentActivities,
      topDatasets,
      transactionSummary
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching dashboard statistics' },
      { status: 500 }
    );
  }
} 