import { NextResponse } from 'next/server';
import { getDatasetById } from '@/lib/models/dataset';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid dataset ID' },
        { status: 400 }
      );
    }

    // Verify authentication (optional for public datasets)
    let userId = null;
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
      }
    } catch (error) {
      // Continue without authentication for public datasets
      console.warn('Auth verification failed or not provided:', error);
    }

    // Get the dataset
    const dataset = await getDatasetById(id);
    
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Check access permissions (if dataset is private)
    if (dataset.visibility === 'private') {
      // Only the owner or collaborators can access private datasets
      if (!userId || 
          (dataset.owner !== userId && 
           dataset.owner !== userId.toString() && 
           dataset.ownerId !== userId &&
           dataset.ownerId !== userId.toString() &&
           !dataset.collaborators?.some(c => 
              c.userId === userId || c.userId === userId.toString()))) {
        return NextResponse.json(
          { error: 'You do not have permission to access this dataset' },
          { status: 403 }
        );
      }
    }

    // Increment view count (only for non-owners)
    if (userId && 
        dataset.owner !== userId && 
        dataset.owner !== userId.toString() &&
        dataset.ownerId !== userId &&
        dataset.ownerId !== userId.toString()) {
      // Increment view count in background, don't wait for result
      incrementDatasetViews(id).catch(err => 
        console.error('Error incrementing view count:', err)
      );
    }

    return NextResponse.json(dataset);
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the dataset' },
      { status: 500 }
    );
  }
}

// Helper function to increment views
async function incrementDatasetViews(id) {
  try {
    const { db } = await import('@/lib/mongodb').then(mod => mod.connectToDatabase());
    await db.collection('datasets').updateOne(
      { _id: new ObjectId(id) },
      { $inc: { views: 1 } }
    );
    return true;
  } catch (error) {
    console.error('Error incrementing views:', error);
    return false;
  }
} 