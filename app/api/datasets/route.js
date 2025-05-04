import { NextResponse } from 'next/server';
import { getDatasets, createDataset } from '@/lib/models/dataset';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if this request is coming from the explore page or dashboard
    const isExplorePage = request.headers.get('x-explore') === 'true';
    const isDashboard = request.headers.get('x-dashboard') === 'true';
    
    // Verify authentication and get user ID for user-specific queries
    let userId = null;
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success) {
        userId = authResult.userId;
        console.log('Authenticated user:', userId);
      }
    } catch (authError) {
      console.warn('Auth verification failed or not provided:', authError);
      // Continue without auth for public datasets
    }
    
    // Extract query parameters
    const query = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 20,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')) : 1,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') === 'asc' ? 1 : -1
    };
    
    // For explore page, always show all published datasets
    if (isExplorePage) {
      // Show published datasets with visibility set to public
      query.status = 'active';
      query.visibility = 'public';
      
      // If owner is explicitly specified, filter by owner
      if (searchParams.has('owner')) {
        query.owner = searchParams.get('owner');
      }
    }
    // For dashboard or if x-dashboard header is present, only show user's datasets
    else if (isDashboard && userId) {
      query.owner = userId;
    }
    // For other pages or authenticated requests without explicit markers
    else if (userId) {
      // If owner param is explicitly provided, use that for filtering
      if (searchParams.has('owner')) {
        query.owner = searchParams.get('owner');
      } else {
        // Default to showing the user's own datasets
        query.owner = userId;
      }
    } else if (searchParams.has('owner')) {
      // Still allow filtering by owner for public pages
      query.owner = searchParams.get('owner');
    }
    
    // Handle verified filter
    if (searchParams.has('verified')) {
      query.verified = searchParams.get('verified') === 'true';
    }
    
    // Log the parsed query
    console.log('Dataset search query:', query);
    
    // Get datasets based on the query
    const result = await getDatasets(query);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching datasets' },
      { status: 500 }
    );
  }
}

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
    // Remove draft ID extraction - we'll ignore this field
    const datasetData = body;
    
    // Add the authenticated user ID as the owner
    const datasetWithOwner = {
      ...datasetData,
      owner: authResult.userId
    };
    
    // Ensure dataset is created with active status
    const activeDatasetData = {
      ...datasetWithOwner,
      status: 'active',
      createdAt: datasetWithOwner.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    // Create the dataset directly - make sure to pass userId as the second parameter
    console.log('Creating new active dataset directly');
    const result = await createDataset(activeDatasetData, authResult.userId);
    
    // Log the result to diagnose any issues
    console.log('Dataset creation result:', result);
    
    if (!result.success) {
      console.error('Failed to create dataset:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to create dataset' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, dataset: result.dataset });
  } catch (error) {
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the dataset' },
      { status: 500 }
    );
  }
} 