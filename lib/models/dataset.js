import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

// Get all datasets with optional filtering and pagination
export async function getDatasets(options = {}) {
  const { db } = await connectToDatabase();
  
  const { 
    limit = 20, 
    page = 1, 
    category,
    owner,
    verified,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build filter query
  const query = {};
  if (category) query.category = category;
  if (owner) query.owner = owner;
  if (verified !== undefined) query.verified = verified;
  
  // Get datasets with pagination and sorting
  const datasets = await db
    .collection('datasets')
    .find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  // Get total count for pagination
  const totalCount = await db.collection('datasets').countDocuments(query);
  
  return {
    datasets,
    pagination: {
      total: totalCount,
      page,
      limit,
      pages: Math.ceil(totalCount / limit)
    }
  };
}

// Get a dataset by ID
export async function getDatasetById(id) {
  const { db } = await connectToDatabase();
  return db.collection('datasets').findOne({ _id: new ObjectId(id) });
}

// Get datasets belonging to a specific user
export async function getUserDatasets(userId) {
  const { db } = await connectToDatabase();
  
  try {
    // Convert string ID to ObjectId if needed
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    console.log('Getting datasets for user ID:', objectId);
    return db.collection('datasets').find({ ownerId: objectId }).toArray();
  } catch (error) {
    console.error('Error getting user datasets:', error);
    return [];
  }
}

// Create a new dataset
export async function createDataset(datasetData) {
  const { db } = await connectToDatabase();
  
  const dataset = {
    ...datasetData,
    downloads: 0,
    popularity: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await db.collection('datasets').insertOne(dataset);
  return { ...dataset, _id: result.insertedId };
}

// Update a dataset
export async function updateDataset(id, updateData) {
  const { db } = await connectToDatabase();
  
  const update = {
    ...updateData,
    updatedAt: new Date()
  };
  
  await db.collection('datasets').updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );
  
  return getDatasetById(id);
}

// Delete a dataset
export async function deleteDataset(id) {
  const { db } = await connectToDatabase();
  
  const result = await db.collection('datasets').deleteOne({ 
    _id: new ObjectId(id) 
  });
  
  return result.deletedCount > 0;
}

// Increment dataset download count
export async function incrementDownloads(id) {
  const { db } = await connectToDatabase();
  
  await db.collection('datasets').updateOne(
    { _id: new ObjectId(id) },
    { 
      $inc: { downloads: 1 },
      $set: { updatedAt: new Date() }
    }
  );
  
  return getDatasetById(id);
}

// Get dataset statistics (total count, downloads, etc.)
export async function getDatasetStats(userId) {
  const { db } = await connectToDatabase();
  
  try {
    // Convert string ID to ObjectId if needed
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    // Build query for user-specific datasets if userId is provided
    const query = userId ? { ownerId: objectId } : {};
    console.log('Dataset stats query:', JSON.stringify(query));
    
    const stats = await db.collection('datasets').aggregate([
      { $match: query },
      { $group: {
          _id: null,
          totalDatasets: { $sum: 1 },
          totalDownloads: { $sum: '$downloads' },
          averagePrice: { $avg: '$price' }
        }
      }
    ]).toArray();
    
    console.log('Dataset stats result:', stats.length > 0 ? stats[0] : 'No results');
    
    return stats[0] || {
      totalDatasets: 0,
      totalDownloads: 0,
      averagePrice: 0
    };
  } catch (error) {
    console.error('Error getting dataset stats:', error);
    return {
      totalDatasets: 0,
      totalDownloads: 0,
      averagePrice: 0
    };
  }
}

// Get monthly dataset statistics for charts
export async function getMonthlyStats(userId, year = new Date().getFullYear()) {
  const { db } = await connectToDatabase();
  
  try {
    // Convert string ID to ObjectId if needed
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    // Build pipeline for user-specific datasets if userId is provided
    const match = userId ? { $match: { ownerId: objectId } } : { $match: {} };
    
    const monthlyStats = await db.collection('datasets')
      .aggregate([
        match,
        { 
          $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'datasetId',
            as: 'transactions'
          }
        },
        { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { 'transactions': { $exists: false } },
              { 'transactions.createdAt': { 
                  $gte: new Date(`${year}-01-01`), 
                  $lt: new Date(`${year+1}-01-01`) 
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: { 
              month: { $month: '$transactions.createdAt' },
              year: { $year: '$transactions.createdAt' }
            },
            downloads: { $sum: 1 },
            revenue: { $sum: '$transactions.amount' }
          }
        },
        { $sort: { '_id.month': 1 } }
      ]).toArray();
      
    // Format the results to include all months
    const monthlyData = Array(12).fill().map((_, i) => ({
      name: new Date(0, i).toLocaleString('default', { month: 'short' }),
      downloads: 0,
      revenue: 0
    }));
    
    monthlyStats.forEach((stat) => {
      if (stat._id && stat._id.month) {
        const monthIndex = stat._id.month - 1;
        monthlyData[monthIndex].downloads = stat.downloads || 0;
        monthlyData[monthIndex].revenue = stat.revenue || 0;
      }
    });
    
    return monthlyData;
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    return Array(12).fill().map((_, i) => ({
      name: new Date(0, i).toLocaleString('default', { month: 'short' }),
      downloads: 0,
      revenue: 0
    }));
  }
}

// Get top performing datasets
export async function getTopPerformingDatasets(userId, limit = 5) {
  const { db } = await connectToDatabase();
  
  try {
    // Convert string ID to ObjectId if needed
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    // Build query for user-specific datasets if userId is provided
    const query = userId ? { ownerId: objectId } : {};
    console.log('Top datasets query:', JSON.stringify(query));
    
    const topDatasets = await db.collection('datasets')
      .find(query)
      .sort({ downloads: -1 })
      .limit(limit)
      .toArray();
      
    console.log(`Found ${topDatasets.length} top datasets`);
    return topDatasets;
  } catch (error) {
    console.error('Error getting top performing datasets:', error);
    return [];
  }
} 