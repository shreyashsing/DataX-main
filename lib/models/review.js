import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

// Helper function to normalize ID
function normalizeId(id) {
  if (!id) return null;
  return typeof id === 'string' && id.length === 24 
    ? new ObjectId(id) 
    : id;
}

// Create a new review
export async function createReview(reviewData) {
  try {
    const { db } = await connectToDatabase();

    // Normalize IDs
    const normalizedReview = { ...reviewData };
    
    if (normalizedReview.authorId) {
      normalizedReview.authorId = normalizeId(normalizedReview.authorId);
    }
    
    if (normalizedReview.author) {
      normalizedReview.author = normalizeId(normalizedReview.author);
    }
    
    if (normalizedReview.datasetId) {
      normalizedReview.datasetId = normalizeId(normalizedReview.datasetId);
    }
    
    // Set timestamps
    const now = new Date();
    normalizedReview.createdAt = now;
    normalizedReview.updatedAt = now;
    
    // Set default values
    if (!normalizedReview.rating) {
      normalizedReview.rating = 0;
    }
    
    if (!normalizedReview.helpfulCount) {
      normalizedReview.helpfulCount = 0;
    }
    
    // Insert review
    const result = await db.collection('reviews').insertOne(normalizedReview);
    
    console.log(`Created review: ${result.insertedId}`);
    return { ...normalizedReview, _id: result.insertedId };
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}

// Get review by ID
export async function getReviewById(id) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(id);
    
    return await db.collection('reviews').findOne({ _id: objectId });
  } catch (error) {
    console.error('Error getting review by ID:', error);
    return null;
  }
}

// Get reviews by dataset ID
export async function getReviewsByDataset(datasetId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(datasetId);
    
    // Setup query to match either string or ObjectId
    const query = {
      $or: [
        { datasetId: objectId },
        { datasetId: objectId.toString() }
      ]
    };
    
    // Setup pagination
    const limit = options.limit || 10;
    const skip = options.skip || 0;
    const sort = options.sort || { createdAt: -1 };
    
    const reviews = await db
      .collection('reviews')
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
      
    // Calculate total count for pagination
    const total = await db.collection('reviews').countDocuments(query);
    
    return {
      reviews,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting reviews by dataset:', error);
    return {
      reviews: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }
}

// Get reviews by author ID
export async function getReviewsByAuthor(authorId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(authorId);
    
    // Setup query to match either string or ObjectId
    const query = {
      $or: [
        { authorId: objectId },
        { authorId: objectId.toString() },
        { author: objectId },
        { author: objectId.toString() }
      ]
    };
    
    // Setup pagination
    const limit = options.limit || 10;
    const skip = options.skip || 0;
    const sort = options.sort || { createdAt: -1 };
    
    const reviews = await db
      .collection('reviews')
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
      
    // Calculate total count for pagination
    const total = await db.collection('reviews').countDocuments(query);
    
    return {
      reviews,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting reviews by author:', error);
    return {
      reviews: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }
}

// Update review
export async function updateReview(id, reviewData) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(id);
    
    // Only allow updating of allowed fields
    const allowedFields = [
      'text', 
      'rating', 
      'title'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (reviewData[field] !== undefined) {
        updateData[field] = reviewData[field];
      }
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    await db.collection('reviews').updateOne(
      { _id: objectId },
      { $set: updateData }
    );
    
    return await getReviewById(objectId);
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
}

// Delete review
export async function deleteReview(id) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(id);
    
    await db.collection('reviews').deleteOne({ _id: objectId });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting review:', error);
    return { success: false, error: error.message };
  }
}

// Mark review as helpful
export async function markReviewAsHelpful(reviewId, userId) {
  try {
    const { db } = await connectToDatabase();
    const reviewObjectId = normalizeId(reviewId);
    const userObjectId = normalizeId(userId);
    
    // Add userId to review's helpfulVotes array
    await db.collection('reviews').updateOne(
      { _id: reviewObjectId },
      { 
        $addToSet: { helpfulVotes: userObjectId },
        $inc: { helpfulCount: 1 }
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    return { success: false, error: error.message };
  }
}

// Remove helpful mark from review
export async function removeHelpfulMark(reviewId, userId) {
  try {
    const { db } = await connectToDatabase();
    const reviewObjectId = normalizeId(reviewId);
    const userObjectId = normalizeId(userId);
    
    // Remove userId from review's helpfulVotes array
    const review = await db.collection('reviews').findOne({ 
      _id: reviewObjectId,
      helpfulVotes: userObjectId 
    });
    
    if (review) {
      await db.collection('reviews').updateOne(
        { _id: reviewObjectId },
        { 
          $pull: { helpfulVotes: userObjectId },
          $inc: { helpfulCount: -1 }
        }
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error removing helpful mark from review:', error);
    return { success: false, error: error.message };
  }
}

// Get dataset rating statistics
export async function getDatasetRatingStats(datasetId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(datasetId);
    
    // Setup query to match either string or ObjectId
    const query = {
      $or: [
        { datasetId: objectId },
        { datasetId: objectId.toString() }
      ]
    };
    
    // Get all ratings
    const reviews = await db.collection('reviews')
      .find(query)
      .project({ rating: 1 })
      .toArray();
      
    if (!reviews || reviews.length === 0) {
      return {
        average: 0,
        count: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      };
    }
    
    // Calculate average
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    const average = sum / reviews.length;
    
    // Calculate distribution
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    
    reviews.forEach(review => {
      const rating = Math.round(review.rating || 0);
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });
    
    return {
      average,
      count: reviews.length,
      distribution
    };
  } catch (error) {
    console.error('Error getting dataset rating stats:', error);
    return {
      average: 0,
      count: 0,
      distribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      }
    };
  }
} 