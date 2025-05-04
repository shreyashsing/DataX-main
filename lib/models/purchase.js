import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

// Normalize user ID handling
function normalizeUserId(userId) {
  if (!userId) return null;
  return typeof userId === 'string' && userId.length === 24 
    ? new ObjectId(userId) 
    : userId;
}

// Create a new purchase
export async function createPurchase(purchaseData) {
  try {
    const { db } = await connectToDatabase();
    
    // Normalize buyer/buyerId fields
    const normalizedData = { ...purchaseData };
    
    if (normalizedData.buyerId) {
      normalizedData.buyerId = normalizeUserId(normalizedData.buyerId);
      // Ensure consistent field naming
      normalizedData.buyer = normalizedData.buyerId;
    } else if (normalizedData.buyer) {
      normalizedData.buyer = normalizeUserId(normalizedData.buyer);
      // Ensure consistent field naming
      normalizedData.buyerId = normalizedData.buyer;
    }
    
    // Normalize dataset id if present
    if (normalizedData.datasetId && typeof normalizedData.datasetId === 'string') {
      normalizedData.datasetId = new ObjectId(normalizedData.datasetId);
    }
    
    // Add timestamp if not provided
    if (!normalizedData.purchaseDate) {
      normalizedData.purchaseDate = new Date();
    }
    
    const result = await db.collection('purchases').insertOne(normalizedData);
    console.log(`Created purchase with ID: ${result.insertedId}`);
    
    return { ...normalizedData, _id: result.insertedId };
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
}

// Get purchase by ID
export async function getPurchaseById(id) {
  try {
    const { db } = await connectToDatabase();
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    return await db.collection('purchases').findOne({ _id: objectId });
  } catch (error) {
    console.error('Error getting purchase by ID:', error);
    return null;
  }
}

// Get purchases by buyer
export async function getPurchasesByBuyer(buyerId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const userIdObj = normalizeUserId(buyerId);
    
    // Query for purchases with either buyer or buyerId field
    const query = {
      $or: [
        { buyerId: userIdObj },
        { buyerId: userIdObj.toString() },
        { buyer: userIdObj },
        { buyer: userIdObj.toString() }
      ]
    };
    
    console.log('Querying purchases with:', JSON.stringify(query));
    
    // Setup pagination
    const limit = options.limit || 10;
    const skip = options.skip || 0;
    
    const purchases = await db
      .collection('purchases')
      .find(query)
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    console.log(`Found ${purchases.length} purchases for buyer ${buyerId}`);
    
    return purchases;
  } catch (error) {
    console.error('Error getting purchases by buyer:', error);
    return [];
  }
}

// Get purchases by dataset
export async function getPurchasesByDataset(datasetId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const datasetIdObj = typeof datasetId === 'string' ? new ObjectId(datasetId) : datasetId;
    
    const query = { datasetId: datasetIdObj };
    
    // Setup pagination
    const limit = options.limit || 10;
    const skip = options.skip || 0;
    
    const purchases = await db
      .collection('purchases')
      .find(query)
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    return purchases;
  } catch (error) {
    console.error('Error getting purchases by dataset:', error);
    return [];
  }
}

// Check if user has purchased a dataset
export async function hasUserPurchasedDataset(userId, datasetId) {
  try {
    const { db } = await connectToDatabase();
    const userIdObj = normalizeUserId(userId);
    const datasetIdObj = typeof datasetId === 'string' ? new ObjectId(datasetId) : datasetId;
    
    // Query with both buyer and buyerId fields
    const query = {
      datasetId: datasetIdObj,
      $or: [
        { buyerId: userIdObj },
        { buyerId: userIdObj.toString() },
        { buyer: userIdObj },
        { buyer: userIdObj.toString() }
      ]
    };
    
    const count = await db.collection('purchases').countDocuments(query);
    return count > 0;
  } catch (error) {
    console.error('Error checking if user purchased dataset:', error);
    return false;
  }
}

// Get purchase count by dataset
export async function getPurchaseCountByDataset(datasetId) {
  try {
    const { db } = await connectToDatabase();
    const datasetIdObj = typeof datasetId === 'string' ? new ObjectId(datasetId) : datasetId;
    
    const count = await db.collection('purchases').countDocuments({ datasetId: datasetIdObj });
    return count;
  } catch (error) {
    console.error('Error getting purchase count by dataset:', error);
    return 0;
  }
} 