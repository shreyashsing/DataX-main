import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

// Helper function to normalize IDs
function normalizeId(id) {
  if (!id) return null;
  return typeof id === 'string' && id.length === 24 
    ? new ObjectId(id) 
    : id;
}

// Create user
export async function createUser(userData) {
  try {
    const { db } = await connectToDatabase();
    
    // Check if email already exists
    const existingUser = await db.collection("users").findOne({ email: userData.email });
    if (existingUser) {
      return { success: false, error: "Email already in use" };
    }
    
    const newUser = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: userData.role || "user",
      verifiedEmail: userData.verifiedEmail || false,
      status: userData.status || "active",
      preferences: userData.preferences || {
        theme: "light",
        notifications: true
      },
      favorites: [],
      followers: [],
      following: []
    };
    
    const result = await db.collection("users").insertOne(newUser);
    
    if (!result.insertedId) {
      return { success: false, error: "Failed to create user" };
    }
    
    return {
      success: true,
      userId: result.insertedId,
      user: { ...newUser, _id: result.insertedId }
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message };
  }
}

// Get user by ID
export async function getUserById(userId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    const user = await db.collection("users").findOne({ _id: objectId });
    
    if (!user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
}

// Get user by email
export async function getUserByEmail(email) {
  try {
  const { db } = await connectToDatabase();
    
    const user = await db.collection("users").findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

// Update user
export async function updateUser(userId, updateData) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    // Don't allow updating certain fields
    const userUpdate = {
      ...updateData,
      updatedAt: new Date()
    };
    
    delete userUpdate._id;
    delete userUpdate.createdAt;
    delete userUpdate.email; // Email updates should be handled separately with verification
    delete userUpdate.role; // Role changes should be handled by admin functions
    
    const result = await db.collection("users").updateOne(
      { _id: objectId },
      { $set: userUpdate }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "User not found or no changes made" };
    }
    
    const updatedUser = await getUserById(objectId);
    
    return {
      success: true,
      user: updatedUser
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error.message };
  }
}

// Delete user (admin function)
export async function deleteUser(userId, adminId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    const normalizedAdminId = normalizeId(adminId);
    
    // Check if admin
    const admin = await getUserById(normalizedAdminId);
    if (!admin || admin.role !== 'admin') {
      return { success: false, error: "Not authorized" };
    }
    
    // Check if user exists
    const user = await getUserById(objectId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    // Delete user
    const result = await db.collection("users").deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      return { success: false, error: "Failed to delete user" };
    }
    
    // TODO: Cascade delete or handle related user data
    // - Datasets created by user
    // - Files uploaded by user
    // - Comments, likes, etc.
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
}

// List users (admin function)
export async function listUsers(options = {}, adminId) {
  try {
    const { db } = await connectToDatabase();
    const normalizedAdminId = normalizeId(adminId);
    
    // Check if admin
    const admin = await getUserById(normalizedAdminId);
    if (!admin || admin.role !== 'admin') {
      return { 
        success: false, 
        error: "Not authorized" 
      };
    }
    
    const { 
      limit = 50, 
      page = 1,
      sortBy = "createdAt",
      sortOrder = -1,
      role,
      status,
      search
    } = options;
    
    // Build query
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder;
    
    // Get users
    const users = await db.collection("users")
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get total count for pagination
    const total = await db.collection("users").countDocuments(query);
    
    return {
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("Error listing users:", error);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Toggle following a user
export async function toggleFollow(userId, targetUserId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    const targetObjectId = normalizeId(targetUserId);
    
    // Check if users exist
    const user = await getUserById(objectId);
    const targetUser = await getUserById(targetObjectId);
    
    if (!user || !targetUser) {
      return { success: false, error: "User not found" };
    }
    
    // Check if user is already following target
    const isFollowing = Array.isArray(user.following) && 
      user.following.some(id => id.toString() === targetObjectId.toString());
    
    // Update user's following list
    if (isFollowing) {
      // Unfollow
      await db.collection("users").updateOne(
        { _id: objectId },
        { $pull: { following: targetObjectId } }
      );
      
      // Update target's followers list
      await db.collection("users").updateOne(
        { _id: targetObjectId },
        { $pull: { followers: objectId } }
      );
    } else {
      // Follow
      await db.collection("users").updateOne(
        { _id: objectId },
        { $addToSet: { following: targetObjectId } }
      );
      
      // Update target's followers list
      await db.collection("users").updateOne(
        { _id: targetObjectId },
        { $addToSet: { followers: objectId } }
      );
    }
    
    return {
      success: true,
      isFollowing: !isFollowing
    };
  } catch (error) {
    console.error("Error toggling follow:", error);
    return { success: false, error: error.message };
  }
}

// Get user's followers
export async function getUserFollowers(userId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    const { 
      limit = 50, 
      page = 1
    } = options;
    
    // Get user to check followers
    const user = await getUserById(objectId);
    
    if (!user) {
      return { 
        success: false, 
        error: "User not found" 
      };
    }
    
    if (!Array.isArray(user.followers) || user.followers.length === 0) {
      return {
        success: true,
        followers: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0
        }
      };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get followers
    const followers = await db.collection("users")
      .find({ _id: { $in: user.followers } })
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .project({ password: 0, verificationToken: 0 }) // Exclude sensitive data
      .toArray();
    
    return {
      success: true,
      followers,
      pagination: {
        total: user.followers.length,
        page,
        limit,
        pages: Math.ceil(user.followers.length / limit)
      }
    };
  } catch (error) {
    console.error("Error getting user followers:", error);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Get user's following
export async function getUserFollowing(userId, options = {}) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    const { 
      limit = 50, 
      page = 1
    } = options;
    
    // Get user to check following
    const user = await getUserById(objectId);
    
    if (!user) {
      return { 
        success: false, 
        error: "User not found" 
      };
    }
    
    if (!Array.isArray(user.following) || user.following.length === 0) {
      return {
        success: true,
        following: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0
        }
      };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get following
    const following = await db.collection("users")
      .find({ _id: { $in: user.following } })
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .project({ password: 0, verificationToken: 0 }) // Exclude sensitive data
      .toArray();
    
    return {
      success: true,
      following,
      pagination: {
        total: user.following.length,
        page,
        limit,
        pages: Math.ceil(user.following.length / limit)
      }
    };
  } catch (error) {
    console.error("Error getting user following:", error);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Search for users
export async function searchUsers(query, options = {}) {
  try {
  const { db } = await connectToDatabase();
  
    const { 
      limit = 10, 
      page = 1,
      excludeIds = []
    } = options;
    
    // Normalize excluded IDs
    const normalizedExcludeIds = Array.isArray(excludeIds) 
      ? excludeIds.map(id => normalizeId(id))
      : [];
    
    // Build query
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Exclude specific users if needed
    if (normalizedExcludeIds.length > 0) {
      searchQuery._id = { $nin: normalizedExcludeIds };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get users
    const users = await db.collection("users")
      .find(searchQuery)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .project({ 
        _id: 1, 
        name: 1, 
        username: 1, 
        email: 1, 
        avatar: 1,
        role: 1
      }) // Only include necessary fields
      .toArray();
    
    // Get total count for pagination
    const total = await db.collection("users").countDocuments(searchQuery);
    
    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("Error searching users:", error);
    return { 
      users: [],
      pagination: {
        total: 0,
        page: options.page || 1,
        limit: options.limit || 10,
        pages: 0
      }
    };
  }
}

// Get user stats
export async function getUserStats(userId) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    // Get datasets count
    const datasetsCount = await db.collection("datasets").countDocuments({ creatorId: objectId });
    
    // Get followers count
    const user = await getUserById(objectId);
    const followersCount = user && Array.isArray(user.followers) ? user.followers.length : 0;
    const followingCount = user && Array.isArray(user.following) ? user.following.length : 0;
    
    // Get downloads count
    const downloadStats = await db.collection("datasets").aggregate([
      { $match: { creatorId: objectId } },
      { $group: { 
        _id: null, 
        totalDownloads: { $sum: "$downloads" }
      }}
    ]).toArray();
    
    const totalDownloads = downloadStats.length > 0 ? downloadStats[0].totalDownloads : 0;
    
    return {
      datasets: datasetsCount,
      followers: followersCount,
      following: followingCount,
      downloads: totalDownloads
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    return {
      datasets: 0,
      followers: 0,
      following: 0,
      downloads: 0
    };
  }
}

// Get user profile (public data)
export async function getUserProfile(id) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(id);
    
    // Get user with limited fields for public profile
    const user = await db.collection('users').findOne(
      { _id: objectId },
      { 
        projection: { 
          name: 1,
          bio: 1,
          profileImage: 1,
          organization: 1,
          website: 1,
          location: 1,
          createdAt: 1
        }
      }
    );
    
    if (!user) return null;
    
    // Get dataset stats (count of published datasets)
    const datasetCount = await db.collection('datasets').countDocuments({
      creatorId: objectId,
      visibility: 'public',
      status: 'published'
    });
    
    return {
      ...user,
      datasetCount
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Get user activity (reviews, favorites, etc.)
export async function getUserActivity(userId) {
  try {
  const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    // Get recent user activity
    const [reviews, favorites, datasets] = await Promise.all([
      // Get recent reviews by user
      db.collection('reviews')
        .find({ authorId: objectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
        
      // Get recent favorites
      db.collection('favorites')
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
        
      // Get recent datasets by user
      db.collection('datasets')
        .find({ 
          creatorId: objectId,
          visibility: 'public',
          status: 'published'
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()
    ]);
    
    // For favorites, get the actual dataset details
    const datasetIds = favorites.map(fav => fav.datasetId);
    
    let favoriteDatasets = [];
    if (datasetIds.length > 0) {
      favoriteDatasets = await db
        .collection('datasets')
        .find({ 
          _id: { $in: datasetIds },
          visibility: 'public',
          status: 'published'
        })
        .toArray();
    }
    
    return {
      reviews,
      favoriteDatasets,
      datasets
    };
  } catch (error) {
    console.error('Error getting user activity:', error);
    return {
      reviews: [],
      favoriteDatasets: [],
      datasets: []
    };
  }
}

// Add skills to user profile
export async function addUserSkills(userId, skills) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    // Get current user
    const currentUser = await getUserById(objectId);
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // Update user skills (avoid duplicates)
    const currentSkills = currentUser.skills || [];
    const newSkills = [...new Set([...currentSkills, ...skills])];
    
    await db.collection('users').updateOne(
      { _id: objectId },
      { 
        $set: { 
          skills: newSkills,
          updatedAt: new Date()
        }
      }
    );
    
    return await getUserById(objectId);
  } catch (error) {
    console.error('Error adding user skills:', error);
    throw error;
  }
}

// Remove skills from user profile
export async function removeUserSkills(userId, skills) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(userId);
    
    // Get current user
    const currentUser = await getUserById(objectId);
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // Filter out skills to remove
    const currentSkills = currentUser.skills || [];
    const updatedSkills = currentSkills.filter(skill => !skills.includes(skill));
    
    await db.collection('users').updateOne(
      { _id: objectId },
      { 
        $set: { 
          skills: updatedSkills,
          updatedAt: new Date()
        }
      }
    );
    
    return await getUserById(objectId);
  } catch (error) {
    console.error('Error removing user skills:', error);
    throw error;
  }
}

// Get user by provider ID (from auth provider)
export async function getUserByProviderId(providerId) {
  try {
    const { db } = await connectToDatabase();
    
    return await db.collection('users').findOne({ providerId });
  } catch (error) {
    console.error('Error getting user by provider ID:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(id, profileData) {
  try {
    const { db } = await connectToDatabase();
    const objectId = normalizeId(id);
    
    // Only allow updating of allowed fields
    const allowedFields = [
      'name', 
      'bio', 
      'avatar', 
      'location', 
      'website', 
      'social',
      'preferences'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (profileData[field] !== undefined) {
        updateData[field] = profileData[field];
      }
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    await db.collection('users').updateOne(
      { _id: objectId },
      { $set: updateData }
    );
    
    return await getUserById(objectId);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function validateUserCredentials(email, password) {
  const { db } = await connectToDatabase();
  
  // Find the user by email
  const user = await db.collection('users').findOne({ email: email.toLowerCase() });
  
  // If no user is found, return null
  if (!user) {
    return null;
  }
  
  // Check if the password is correct
  const isValid = await bcrypt.compare(password, user.password);
  
  // If the password is incorrect, return null
  if (!isValid) {
    return null;
  }
  
  // Return the user object without the password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
} 