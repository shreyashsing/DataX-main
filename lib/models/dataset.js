import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';
import slugify from 'slugify';
import { getUserById } from "./user";

// Helper function to normalize IDs
function normalizeId(id) {
  if (!id) return null;
  return typeof id === 'string' && id.length === 24 
    ? new ObjectId(id) 
    : id;
}

// Generate a unique slug from the title
async function generateUniqueSlug(db, title, existingSlug = null) {
  let baseSlug = slugify(title, { 
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });
  
  if (!baseSlug) {
    baseSlug = 'dataset';
  }
  
  // If we're updating and the slug hasn't changed, keep it
  if (existingSlug && existingSlug === baseSlug) {
    return existingSlug;
  }
  
  let slug = baseSlug;
  let counter = 1;
  let slugExists = true;
  
  // Check for existing slugs and append counter if needed
  while (slugExists) {
    const existingDataset = await db.collection('datasets').findOne({ slug });
    
    if (!existingDataset) {
      slugExists = false;
    } else {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
  
  return slug;
}

// Get all datasets with optional filtering and pagination
export async function getDatasets(options = {}) {
  const { db } = await connectToDatabase();
  
  const { 
    limit = 20, 
    page = 1, 
    category,
    owner,
    verified,
    search,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build filter query
  const query = {};
  if (category) query.category = category;
  
  // Handle owner filter with multiple possible owner field names
  if (owner) {
    // Try to convert to ObjectId if it's a valid ObjectId string
    let ownerId;
    try {
      ownerId = new ObjectId(owner);
    } catch (e) {
      // Not a valid ObjectId, use as is
      ownerId = owner;
    }
    
    // Query for either owner or ownerId field
    query.$or = [
      { owner: ownerId },
      { owner: owner.toString() },
      { ownerId: ownerId }
    ];
  }
  
  if (verified !== undefined) query.verified = verified;
  
  // Add search functionality
  if (search) {
    query.$or = query.$or || [];
    query.$or.push(
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { dataType: { $regex: search, $options: 'i' } }
    );
  }
  
  console.log('Final query:', JSON.stringify(query));
  
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
export async function createDataset(datasetData, userId) {
  try {
    const { db } = await connectToDatabase();
    const normalizedUserId = normalizeId(userId);
    
    // Skip user check if we're already authenticated
    let creatorId = normalizedUserId;
    
    // If userId is provided but doesn't match existing owner, try to get user
    if (userId && (!datasetData.owner || datasetData.owner.toString() !== userId.toString())) {
      try {
        const user = await getUserById(normalizedUserId);
        if (user) {
          creatorId = normalizedUserId;
        } else {
          console.warn("User not found but continuing with dataset creation");
          // Still continue with the provided userId if user not found
        }
      } catch (err) {
        console.warn("Error looking up user but continuing:", err);
      }
    }
    
    // Use existing owner or provided userId
    const owner = datasetData.owner || userId;
    
    // Generate slug for easier URL access
    let slug;
    if (datasetData.name) {
      slug = await generateUniqueSlug(db, datasetData.name);
    }
    
    const newDataset = {
      ...datasetData,
      owner,
      creatorId,
      slug,
      createdAt: new Date(datasetData.createdAt) || new Date(),
      updatedAt: new Date(),
      status: datasetData.status || "active",
      visibility: datasetData.visibility || "public",
      views: 0,
      downloads: 0,
      favoriteCount: 0,
      tags: datasetData.tags || [],
      collaborators: datasetData.collaborators || []
    };
    
    // Log dataset being created
    console.log('Creating dataset:', {
      name: newDataset.name,
      owner: newDataset.owner,
      status: newDataset.status
    });
    
    const result = await db.collection("datasets").insertOne(newDataset);
    
    if (!result.insertedId) {
      return { success: false, error: "Failed to create dataset" };
    }
    
    // Get the complete dataset with ID
    const insertedDataset = await db.collection("datasets").findOne({ _id: result.insertedId });
    
    return { 
      success: true, 
      datasetId: result.insertedId,
      dataset: insertedDataset
    };
  } catch (error) {
    console.error("Error creating dataset:", error);
    return { success: false, error: error.message };
  }
}

// Get dataset by slug
export async function getDatasetBySlug(slug) {
  try {
    const { db } = await connectToDatabase();
    
    return await db.collection('datasets').findOne({ slug });
  } catch (error) {
    console.error('Error getting dataset by slug:', error);
    return null;
  }
}

// Update dataset
export async function updateDataset(datasetId, updateData, userId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(datasetId);
    const normalizedUserId = normalizeId(userId);
    
    // Get dataset to check ownership
    const existingDataset = await getDatasetById(objectId);
    
    if (!existingDataset) {
      return { success: false, error: "Dataset not found" };
    }
    
    // Check if user is the creator or an admin (admin check should be done at API level)
    const creatorId = normalizeId(existingDataset.creatorId);
    
    if (creatorId.toString() !== normalizedUserId.toString()) {
      // Check if user is a collaborator with edit permissions
      const isCollaborator = Array.isArray(existingDataset.collaborators) && 
        existingDataset.collaborators.some(collab => {
          if (typeof collab === 'object') {
            const collabId = normalizeId(collab.userId);
            return collabId.toString() === normalizedUserId.toString() && 
                  ['editor', 'admin'].includes(collab.permission);
          }
          return false;
        });
      
      if (!isCollaborator) {
        return { success: false, error: "Not authorized to update this dataset" };
      }
    }
    
    // Prepare update data
    const datasetUpdate = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // Don't allow updating certain fields
    delete datasetUpdate._id;
    delete datasetUpdate.creatorId;
    delete datasetUpdate.createdAt;
    delete datasetUpdate.views;
    delete datasetUpdate.downloads;
    delete datasetUpdate.favoriteCount;
    
    const result = await db.collection("datasets").updateOne(
      { _id: objectId },
      { $set: datasetUpdate }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Failed to update dataset" };
    }
    
    const updatedDataset = await getDatasetById(objectId);
    
    return { 
      success: true, 
      dataset: updatedDataset
    };
  } catch (error) {
    console.error("Error updating dataset:", error);
    return { success: false, error: error.message };
  }
}

// Delete dataset
export async function deleteDataset(datasetId, userId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(datasetId);
    const normalizedUserId = normalizeId(userId);
    
    // Get dataset to check ownership
    const existingDataset = await getDatasetById(objectId);
    
    if (!existingDataset) {
      return { success: false, error: "Dataset not found" };
    }
    
    // Check if user is the creator or an admin (admin check should be done at API level)
    const creatorId = normalizeId(existingDataset.creatorId);
    
    if (creatorId.toString() !== normalizedUserId.toString()) {
      return { success: false, error: "Not authorized to delete this dataset" };
    }
    
    // Delete dataset files first (should be implemented based on storage solution)
    // TODO: Implement file deletion
    
    // Delete dataset
    const result = await db.collection("datasets").deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      return { success: false, error: "Failed to delete dataset" };
    }
    
    // Clean up references in other collections
    await Promise.all([
      db.collection("reviews").deleteMany({ datasetId: objectId }),
      db.collection("favorites").deleteMany({ datasetId: objectId }),
      db.collection("downloads").deleteMany({ datasetId: objectId })
    ]);
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting dataset:", error);
    return { success: false, error: error.message };
  }
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
    const userIdStr = objectId.toString();
    
    // Build query for user-specific datasets if userId is provided
    // Check both owner and ownerId fields with both string and ObjectId formats
    const query = userId ? {
      $or: [
        { owner: objectId },
        { owner: userIdStr },
        { ownerId: objectId },
        { ownerId: userIdStr }
      ]
    } : {};
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
    const userIdStr = objectId.toString();
    
    // Build pipeline for user-specific datasets if userId is provided
    const match = userId ? {
      $match: {
        $or: [
          { owner: objectId },
          { owner: userIdStr },
          { ownerId: objectId },
          { ownerId: userIdStr }
        ]
      }
    } : { $match: {} };
    
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
    const userIdStr = objectId.toString();
    
    // Build query for user-specific datasets if userId is provided
    const query = userId ? {
      $or: [
        { owner: objectId },
        { owner: userIdStr },
        { ownerId: objectId },
        { ownerId: userIdStr }
      ]
    } : {};
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

// Get datasets by owner
export async function getDatasetsByOwner(ownerId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const userIdObj = normalizeId(ownerId);
    
    // Query for datasets with either owner or ownerId field
    const query = {
      $or: [
        { ownerId: userIdObj },
        { ownerId: userIdObj.toString() },
        { owner: userIdObj },
        { owner: userIdObj.toString() }
      ]
    };
    
    console.log('Querying datasets with:', JSON.stringify(query));
    
    // Apply additional filters if provided
    if (options.status) {
      query.status = options.status;
    }
    
    // Setup pagination
    const limit = options.limit || 10;
    const skip = options.skip || 0;
    
    const datasets = await db
      .collection('datasets')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    console.log(`Found ${datasets.length} datasets for owner ${ownerId}`);
    
    return datasets;
  } catch (error) {
    console.error('Error getting datasets by owner:', error);
    return [];
  }
}

// Get public datasets
export async function getPublicDatasets(options = {}) {
  try {
    const { db } = await connectToDatabase();
    
    const query = { visibility: 'public' };
    
    // Apply additional filters if provided
    if (options.category) {
      query.category = options.category;
    }
    
    if (options.searchTerm) {
      query.$or = [
        { name: { $regex: options.searchTerm, $options: 'i' } },
        { description: { $regex: options.searchTerm, $options: 'i' } },
        { tags: { $regex: options.searchTerm, $options: 'i' } }
      ];
    }
    
    // Setup pagination
    const limit = options.limit || 10;
    const skip = options.skip || 0;
    
    const datasets = await db
      .collection('datasets')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    return datasets;
  } catch (error) {
    console.error('Error getting public datasets:', error);
    return [];
  }
}

// Get total dataset count for a user
export async function getUserDatasetCount(userId) {
  try {
    const { db } = await connectToDatabase();
    const userIdObj = normalizeId(userId);
    
    // Query for datasets with either owner or ownerId field
    const query = {
      $or: [
        { ownerId: userIdObj },
        { ownerId: userIdObj.toString() },
        { owner: userIdObj },
        { owner: userIdObj.toString() }
      ]
    };
    
    const count = await db.collection('datasets').countDocuments(query);
    console.log(`User ${userId} has ${count} datasets`);
    
    return count;
  } catch (error) {
    console.error('Error getting user dataset count:', error);
    return 0;
  }
}

// Get datasets by creator
export async function getDatasetsByCreator(creatorId, options = {}) {
  try {
    const normalizedCreatorId = normalizeId(creatorId);
    return listDatasets({
      ...options,
      creatorId: normalizedCreatorId
    });
  } catch (error) {
    console.error("Error getting datasets by creator:", error);
    return { datasets: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } };
  }
}

// Search datasets with simple or advanced parameters
export async function searchDatasets(searchTermOrParams, options = {}) {
  try {
    const { db } = await connectToDatabase();
    
    // Determine if this is a simple search by term or an advanced search with parameters
    const isSimpleSearch = typeof searchTermOrParams === 'string';
    const searchParams = isSimpleSearch ? { term: searchTermOrParams } : searchTermOrParams;
    
    // Build query
    const query = {};
    
    // By default, only show public, published datasets unless specified otherwise
    if (!options.visibility) {
      query.visibility = 'public';
    } else {
      query.visibility = options.visibility;
    }
    
    if (!options.status && !isSimpleSearch) {
      query.status = 'published';
    } else if (options.status) {
      query.status = options.status;
    }
    
    // Text search
    if (searchParams.term) {
      // If MongoDB text index exists and specified
      if (searchParams.useTextIndex) {
        query.$text = { $search: searchParams.term };
      } else {
        // Regular expression search in title, name, description, and tags
        query.$or = [
          { title: { $regex: searchParams.term, $options: 'i' } },
          { name: { $regex: searchParams.term, $options: 'i' } },
          { description: { $regex: searchParams.term, $options: 'i' } },
          { tags: { $regex: searchParams.term, $options: 'i' } }
        ];
      }
    }
    
    // Advanced filters (only applied for advanced search)
    if (!isSimpleSearch) {
      // Filter by category
      if (searchParams.category) {
        query.category = searchParams.category;
      }
      
      // Filter by tags
      if (searchParams.tags && searchParams.tags.length > 0) {
        query.tags = { $all: searchParams.tags };
      }
      
      // Filter by creator
      if (searchParams.creatorId) {
        query.creatorId = normalizeId(searchParams.creatorId);
      }
      
      // Advanced filters
      if (searchParams.fileTypes && searchParams.fileTypes.length > 0) {
        query.fileTypes = { $in: searchParams.fileTypes };
      }
      
      if (searchParams.minFileSize) {
        query.fileSize = { 
          ...query.fileSize || {},
          $gte: parseInt(searchParams.minFileSize)
        };
      }
      
      if (searchParams.maxFileSize) {
        query.fileSize = { 
          ...query.fileSize || {},
          $lte: parseInt(searchParams.maxFileSize)
        };
      }
      
      if (searchParams.dateFrom) {
        query.createdAt = { 
          ...query.createdAt || {},
          $gte: new Date(searchParams.dateFrom)
        };
      }
      
      if (searchParams.dateTo) {
        query.createdAt = { 
          ...query.createdAt || {},
          $lte: new Date(searchParams.dateTo)
        };
      }
    }
    
    // Setup pagination
    const limit = options.limit || 10;
    const skip = options.skip || 0;
    
    // Setup sorting
    let sort = {};
    if (searchParams.sortBy) {
      if (searchParams.sortBy === 'recent') {
        sort = { createdAt: -1 };
      } else if (searchParams.sortBy === 'popular') {
        sort = { accessCount: -1 };
      } else if (searchParams.sortBy === 'downloads') {
        sort = { downloadCount: -1 };
      } else if (searchParams.sortBy === 'favorites') {
        sort = { favorites: -1 };
      } else if (searchParams.sortBy === 'highest_rated') {
        sort = { averageRating: -1 };
      } else if (searchParams.sortBy === 'oldest') {
        sort = { createdAt: 1 };
      }
    } else {
      // Default sorting
      sort = { createdAt: -1 };
    }
    
    // If using text search, leverage text score for sorting
    if (searchParams.term && searchParams.useTextIndex) {
      sort = { score: { $meta: "textScore" } };
    }
    
    // Query datasets
    const datasets = await db
      .collection('datasets')
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
      
    // Get total count for pagination
    const total = await db.collection('datasets').countDocuments(query);
    
    // Return different format based on the type of search
    if (isSimpleSearch && !options.includePagination) {
      return datasets;
    } else {
      return {
        datasets,
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };
    }
  } catch (error) {
    console.error('Error searching datasets:', error);
    if (typeof searchTermOrParams === 'string' && !options.includePagination) {
      return [];
    } else {
      return {
        datasets: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
    }
  }
}

// Increment view count
export async function incrementDatasetViews(id) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(id);
    
    await db.collection('datasets').updateOne(
      { _id: objectId },
      { $inc: { views: 1 } }
    );
    
    return true;
  } catch (error) {
    console.error('Error incrementing dataset views:', error);
    return false;
  }
}

// Update dataset rating based on reviews
export async function updateDatasetRating(id, rating) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(id);
    
    await db.collection('datasets').updateOne(
      { _id: objectId },
      { $set: { 
          averageRating: rating.average,
          ratingCount: rating.count
        } 
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error updating dataset rating:', error);
    return false;
  }
}

// Get featured datasets
export async function getFeaturedDatasets(limit = 5) {
  try {
    const { db } = await connectToDatabase();
    
    // Get the most popular public published datasets
    const featuredDatasets = await db.collection("datasets")
      .find({ 
        status: "published",
        visibility: "public"
      })
      .sort({ 
        featuredRank: -1, // If manually featured
        favoriteCount: -1, // Then by popularity
        downloads: -1,
        views: -1
      })
      .limit(limit)
      .toArray();
    
    return featuredDatasets;
  } catch (error) {
    console.error("Error getting featured datasets:", error);
    return [];
  }
}

// Get dataset count
export async function getDatasetCount(filter = {}) {
  try {
    const { db } = await connectToDatabase();
    
    return await db.collection('datasets').countDocuments(filter);
  } catch (error) {
    console.error('Error getting dataset count:', error);
    return 0;
  }
}

// List datasets with filtering and pagination
export async function listDatasets(options = {}) {
  try {
    const { 
      limit = 10, 
      page = 1, 
      status, 
      visibility,
      creatorId,
      tags,
      search,
      sort = { createdAt: -1 }
    } = options;
    
    const { db } = await connectToDatabase();
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (visibility) {
      query.visibility = visibility;
    }
    
    if (creatorId) {
      query.creatorId = normalizeId(creatorId);
    }
    
    if (tags && Array.isArray(tags) && tags.length > 0) {
      query.tags = { $in: tags };
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get datasets
    const datasets = await db.collection("datasets")
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get total count for pagination
    const total = await db.collection("datasets").countDocuments(query);
    
    return {
      datasets,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("Error listing datasets:", error);
    return { 
      datasets: [],
      pagination: {
        total: 0,
        page: options.page || 1,
        limit: options.limit || 10,
        pages: 0
      }
    };
  }
}

// Get datasets by user (created or owned)
export async function getDatasetsByUser(userId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    // Setup query to find datasets where user is creator or owner
    const query = {
      $or: [
        { creatorId: objectId },
        { ownerId: objectId }
      ]
    };
    
    // Add filters for visibility
    if (options.visibility) {
      query.visibility = options.visibility;
    }
    
    // Add filters for status
    if (options.status) {
      query.status = options.status;
    }
    
    // Setup pagination
    const limit = options.limit || 20;
    const skip = options.skip || 0;
    
    // Setup sorting
    const sort = options.sort || { updatedAt: -1 };
    
    // Query datasets
    const datasets = await db
      .collection('datasets')
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
      
    // Get total count for pagination
    const total = await db.collection('datasets').countDocuments(query);
    
    return {
      datasets,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting datasets by user:', error);
    return {
      datasets: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }
}

// Add access record for dataset
export async function incrementDatasetAccess(datasetId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(datasetId);
    
    await db.collection('datasets').updateOne(
      { _id: objectId },
      { $inc: { accessCount: 1 } }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error incrementing dataset access:', error);
    return { success: false };
  }
}

// Add download record for dataset
export async function incrementDatasetDownload(datasetId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(datasetId);
    
    await db.collection('datasets').updateOne(
      { _id: objectId },
      { $inc: { downloadCount: 1 } }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error incrementing dataset download:', error);
    return { success: false };
  }
}

// Toggle favorite status for a dataset
export async function toggleFavoriteDataset(datasetId, userId) {
  try {
    const { db } = await connectToDatabase();
    const datasetObjectId = normalizeId(datasetId);
    const userObjectId = normalizeId(userId);
    
    // Check if user already favorited this dataset
    const favorite = await db.collection('favorites').findOne({
      datasetId: datasetObjectId,
      userId: userObjectId
    });
    
    let result;
    
    if (favorite) {
      // Remove favorite
      await db.collection('favorites').deleteOne({
        datasetId: datasetObjectId,
        userId: userObjectId
      });
      
      // Decrement favorites count
      await db.collection('datasets').updateOne(
        { _id: datasetObjectId },
        { $inc: { favorites: -1 } }
      );
      
      result = { favorited: false };
    } else {
      // Add favorite
      await db.collection('favorites').insertOne({
        datasetId: datasetObjectId,
        userId: userObjectId,
        createdAt: new Date()
      });
      
      // Increment favorites count
      await db.collection('datasets').updateOne(
        { _id: datasetObjectId },
        { $inc: { favorites: 1 } }
      );
      
      result = { favorited: true };
    }
    
    return result;
  } catch (error) {
    console.error('Error toggling favorite dataset:', error);
    throw error;
  }
}

// Check if user has favorited a dataset
export async function hasUserFavoritedDataset(datasetId, userId) {
  try {
    const { db } = await connectToDatabase();
    const datasetObjectId = normalizeId(datasetId);
    const userObjectId = normalizeId(userId);
    
    const favorite = await db.collection('favorites').findOne({
      datasetId: datasetObjectId,
      userId: userObjectId
    });
    
    return { favorited: !!favorite };
  } catch (error) {
    console.error('Error checking dataset favorite status:', error);
    return { favorited: false };
  }
}

// Get user's favorite datasets
export async function getFavoriteDatasets(userId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const userObjectId = normalizeId(userId);
    
    // Setup pagination
    const limit = options.limit || 10;
    const skip = options.skip || 0;
    
    // Get favorite dataset IDs for this user
    const favorites = await db
      .collection('favorites')
      .find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const datasetIds = favorites.map(fav => fav.datasetId);
    
    if (datasetIds.length === 0) {
      return {
        datasets: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
    }
    
    // Get the actual datasets
    const datasets = await db
      .collection('datasets')
      .find({
        _id: { $in: datasetIds },
        // Only include published datasets that are public or owned by this user
        $or: [
          { visibility: 'public', status: 'published' },
          { ownerId: userObjectId }
        ]
      })
      .toArray();
    
    // Total count for pagination
    const total = await db.collection('favorites').countDocuments({
      userId: userObjectId
    });
    
    return {
      datasets,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting favorite datasets:', error);
    return {
      datasets: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }
}

// Add or update collaborator for a dataset
export async function addCollaborator(datasetId, collaboratorData) {
  try {
    const { db } = await connectToDatabase();
    const datasetObjectId = normalizeId(datasetId);
    
    // Normalize user ID
    const userId = normalizeId(collaboratorData.userId);
    
    // Check if collaborator already exists
    const dataset = await getDatasetById(datasetObjectId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }
    
    const collaborators = dataset.collaborators || [];
    const existingIndex = collaborators.findIndex(
      c => c.userId && c.userId.toString() === userId.toString()
    );
    
    if (existingIndex >= 0) {
      // Update existing collaborator
      collaborators[existingIndex] = {
        ...collaborators[existingIndex],
        ...collaboratorData,
        userId,
        updatedAt: new Date()
      };
    } else {
      // Add new collaborator
      collaborators.push({
        ...collaboratorData,
        userId,
        addedAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Update dataset
    await db.collection('datasets').updateOne(
      { _id: datasetObjectId },
      {
        $set: {
          collaborators,
          updatedAt: new Date()
        }
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error adding collaborator:', error);
    throw error;
  }
}

// Remove collaborator from a dataset
export async function removeCollaborator(datasetId, userId) {
  try {
    const { db } = await connectToDatabase();
    const datasetObjectId = normalizeId(datasetId);
    const userObjectId = normalizeId(userId);
    
    // Get current dataset
    const dataset = await getDatasetById(datasetObjectId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }
    
    const collaborators = dataset.collaborators || [];
    
    // Filter out the collaborator
    const updatedCollaborators = collaborators.filter(
      c => !c.userId || c.userId.toString() !== userObjectId.toString()
    );
    
    // Update dataset
    await db.collection('datasets').updateOne(
      { _id: datasetObjectId },
      {
        $set: {
          collaborators: updatedCollaborators,
          updatedAt: new Date()
        }
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error removing collaborator:', error);
    throw error;
  }
}

// Get datasets where user is a collaborator
export async function getCollaboratingDatasets(userId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const userObjectId = normalizeId(userId);
    
    // Setup query to find datasets where user is a collaborator
    const query = {
      "collaborators.userId": userObjectId
    };
    
    // Add filters for visibility
    if (options.visibility) {
      query.visibility = options.visibility;
    }
    
    // Add filters for status
    if (options.status) {
      query.status = options.status;
    }
    
    // Setup pagination
    const limit = options.limit || 20;
    const skip = options.skip || 0;
    
    // Setup sorting
    const sort = options.sort || { updatedAt: -1 };
    
    // Query datasets
    const datasets = await db
      .collection('datasets')
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get total count for pagination
    const total = await db.collection('datasets').countDocuments(query);
    
    return {
      datasets,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting collaborating datasets:', error);
    return {
      datasets: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }
}

// Get similar datasets
export async function getSimilarDatasets(datasetId, limit = 5) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(datasetId);
    
    // Get the dataset
    const dataset = await getDatasetById(objectId);
    if (!dataset) {
      return [];
    }
    
    // Extract tags, category to find similar datasets
    const { tags = [], category } = dataset;
    
    // Query to find datasets with similar tags or category
    const query = {
      _id: { $ne: objectId }, // Exclude the current dataset
      visibility: 'public',
      status: 'published',
      $or: []
    };
    
    // Add tags condition if available
    if (tags.length > 0) {
      query.$or.push({ tags: { $in: tags } });
    }
    
    // Add category condition if available
    if (category) {
      query.$or.push({ category });
    }
    
    // If no conditions, use fallback query to get popular datasets
    if (query.$or.length === 0) {
      delete query.$or;
    }
    
    // Get datasets
    const datasets = await db
      .collection('datasets')
      .find(query)
      .sort({ views: -1, downloads: -1 })
      .limit(limit)
      .toArray();
    
    return datasets;
  } catch (error) {
    console.error('Error getting similar datasets:', error);
    return [];
  }
}

// Record dataset download
export async function recordDatasetDownload(datasetId, userId) {
  try {
    const { db } = await connectToDatabase();
    const datasetObjectId = normalizeId(datasetId);
    const userObjectId = userId ? normalizeId(userId) : null;
    
    // Increment download count
    await db.collection('datasets').updateOne(
      { _id: datasetObjectId },
      { $inc: { downloads: 1 } }
    );
    
    // Record download record if userId provided
    if (userObjectId) {
      await db.collection('downloads').insertOne({
        datasetId: datasetObjectId,
        userId: userObjectId,
        timestamp: new Date()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error recording dataset download:', error);
    return { success: false };
  }
} 