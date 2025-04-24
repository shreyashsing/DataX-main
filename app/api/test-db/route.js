import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    // Connect to the database
    const { client, db } = await connectToDatabase();
    
    // Test the connection by getting the collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(collection => collection.name);
    
    // Return the collections
    return NextResponse.json({ 
      status: 'success', 
      message: 'Connected to MongoDB successfully',
      collections: collectionNames 
    });
    
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to connect to MongoDB',
        error: error.message 
      },
      { status: 500 }
    );
  }
} 