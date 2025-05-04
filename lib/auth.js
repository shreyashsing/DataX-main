import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getUserById } from './models/user';
import { ObjectId } from "mongodb";
import { connectToDatabase } from "./mongodb";

export function getAuthToken(request) {
  try {
    // Get token from authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('Auth token found in Authorization header');
      return authHeader.substring(7);
    }
    
    // Get token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (token) {
      console.log('Auth token found in cookies');
      return token;
    }
    
    console.log('No auth token found in request');
    return null;
  } catch (error) {
    console.error('Error extracting auth token:', error);
    return null;
  }
}

export async function verifyAuth(request) {
  try {
    const token = getAuthToken(request);
    
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Verify the token
    const decoded = verify(token, process.env.JWT_SECRET || 'asdfghjkl');
    
    // Get the user from the database
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    return { 
      success: true,
      userId: decoded.userId,
      user
    };
    
  } catch (error) {
    console.error('Auth verification error:', error);
    return { success: false, error: 'Invalid or expired token' };
  }
}

// Helper function to normalize IDs
function normalizeId(id) {
  if (!id) return null;
  return typeof id === 'string' && id.length === 24 
    ? new ObjectId(id) 
    : id;
}

// Get current user from token in cookies
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }
    
    // Verify the token
    const decoded = verify(token, process.env.JWT_SECRET || 'asdfghjkl');
    
    // Get the user from the database
    const user = await getUserById(decoded.userId);
    
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

// Check if user has specific role
export async function hasRole(role) {
  const user = await getCurrentUser();
  return user && user.role === role;
}

// Check if user is admin
export async function isAdmin() {
  return hasRole("admin");
}

// Check if user owns a resource
export async function isResourceOwner(resourceCollection, resourceId) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return false;
    }
    
    const { db } = await connectToDatabase();
    const objectId = normalizeId(resourceId);
    
    const resource = await db.collection(resourceCollection).findOne({ 
      _id: objectId 
    });
    
    if (!resource) {
      return false;
    }
    
    // Check if user is the owner/creator
    const resourceOwnerId = resource.creatorId || resource.ownerId || resource.userId;
    const normalizedOwnerId = normalizeId(resourceOwnerId);
    const normalizedUserId = normalizeId(user._id);
    
    return normalizedOwnerId?.toString() === normalizedUserId?.toString();
  } catch (error) {
    console.error("Error checking resource ownership:", error);
    return false;
  }
}

// Check if user can access a resource (owner or has collaboration rights)
export async function canAccessResource(resourceCollection, resourceId) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return false;
    }
    
    // Admin can access any resource
    if (user.role === "admin") {
      return true;
    }
    
    const { db } = await connectToDatabase();
    const objectId = normalizeId(resourceId);
    const userId = normalizeId(user._id);
    
    const resource = await db.collection(resourceCollection).findOne({ 
      _id: objectId 
    });
    
    if (!resource) {
      return false;
    }
    
    // Check if user is the owner
    const resourceOwnerId = resource.creatorId || resource.ownerId || resource.userId;
    const normalizedOwnerId = normalizeId(resourceOwnerId);
    
    if (normalizedOwnerId?.toString() === userId?.toString()) {
      return true;
    }
    
    // Check if resource is public
    if (resource.visibility === "public" && resource.status === "published") {
      return true;
    }
    
    // Check if user is a collaborator
    if (resource.collaborators && Array.isArray(resource.collaborators)) {
      const collaboratorIds = resource.collaborators.map(c => 
        typeof c === 'object' ? normalizeId(c.userId) : normalizeId(c)
      );
      
      return collaboratorIds.some(id => id?.toString() === userId?.toString());
    }
    
    return false;
  } catch (error) {
    console.error("Error checking resource access:", error);
    return false;
  }
}

// Get user's permission level for a resource
export async function getResourcePermission(resourceCollection, resourceId) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }
    
    const { db } = await connectToDatabase();
    const objectId = normalizeId(resourceId);
    const userId = normalizeId(user._id);
    
    const resource = await db.collection(resourceCollection).findOne({ 
      _id: objectId 
    });
    
    if (!resource) {
      return null;
    }
    
    // Admin has full access
    if (user.role === "admin") {
      return "admin";
    }
    
    // Check if user is the owner
    const resourceOwnerId = resource.creatorId || resource.ownerId || resource.userId;
    const normalizedOwnerId = normalizeId(resourceOwnerId);
    
    if (normalizedOwnerId?.toString() === userId?.toString()) {
      return "owner";
    }
    
    // Check if user is a collaborator with specific permissions
    if (resource.collaborators && Array.isArray(resource.collaborators)) {
      const userCollaboration = resource.collaborators.find(c => {
        if (typeof c === 'object') {
          const collabId = normalizeId(c.userId);
          return collabId?.toString() === userId?.toString();
        }
        return false;
      });
      
      if (userCollaboration) {
        return userCollaboration.permission || "viewer";
      }
    }
    
    // If resource is public, user has viewer permission
    if (resource.visibility === "public" && resource.status === "published") {
      return "viewer";
    }
    
    return null;
  } catch (error) {
    console.error("Error getting resource permission:", error);
    return null;
  }
} 