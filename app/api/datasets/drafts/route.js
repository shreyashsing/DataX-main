import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';

// Create a new draft dataset
export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { db } = await connectToDatabase();
    
    // Create a draft dataset with basic info and authenticated user as owner
    const draft = {
      ...body,
      owner: authResult.userId,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      downloads: 0,
      popularity: 0
    };
    
    const result = await db.collection('datasets').insertOne(draft);
    
    return NextResponse.json({ 
      success: true, 
      draftId: result.insertedId,
      draft: { ...draft, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating draft dataset:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the draft dataset' },
      { status: 500 }
    );
  }
}

// Update an existing draft dataset
export async function PUT(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { _id, ...updateData } = body;
    
    if (!_id) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Update draft dataset with new data, ensuring user owns the draft
    const result = await db.collection('datasets').updateOne(
      { 
        _id: new ObjectId(_id), 
        status: 'draft',
        owner: authResult.userId // Ensure the user owns this draft
      },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Draft dataset not found, already published, or not owned by you' },
        { status: 404 }
      );
    }
    
    // Get the updated draft
    const updatedDraft = await db.collection('datasets').findOne({ _id: new ObjectId(_id) });
    
    return NextResponse.json({ 
      success: true, 
      draft: updatedDraft
    });
  } catch (error) {
    console.error('Error updating draft dataset:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the draft dataset' },
      { status: 500 }
    );
  }
}

// Get draft datasets for a user
export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Get all draft datasets for the authenticated user
    const drafts = await db.collection('datasets')
      .find({ owner: authResult.userId, status: 'draft' })
      .sort({ updatedAt: -1 })
      .toArray();
    
    return NextResponse.json({ 
      success: true, 
      drafts
    });
  } catch (error) {
    console.error('Error fetching draft datasets:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching draft datasets' },
      { status: 500 }
    );
  }
} 