import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { mockDatasets } from '@/lib/mock-data';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { ACTIVITY_TYPES } from '@/lib/models/activity';

export async function GET(request) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development' && process.env.FORCE_SEEDING !== 'true') {
      return NextResponse.json(
        { error: 'Seeding is only allowed in development mode' },
        { status: 403 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Create test user if it doesn't exist
    const testUser = await db.collection('users').findOne({ email: 'test@example.com' });
    
    let userId;
    if (!testUser) {
      // Create a test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const userResult = await db.collection('users').insertOne(newUser);
      userId = userResult.insertedId;
      console.log('Created test user with ID:', userId);
    } else {
      userId = testUser._id;
      console.log('Using existing test user:', userId);
    }
    
    // Insert datasets
    const datasetResults = [];
    for (const dataset of mockDatasets) {
      // Check if the dataset already exists
      const existingDataset = await db.collection('datasets').findOne({ name: dataset.name });
      
      if (!existingDataset) {
        // Prepare dataset object with userId
        const newDataset = {
          ...dataset,
          ownerId: userId,
          _id: new ObjectId(dataset.id),
          createdAt: new Date(dataset.createdAt),
          updatedAt: new Date()
        };
        delete newDataset.id; // Remove the string ID
        
        // Insert the dataset
        const result = await db.collection('datasets').insertOne(newDataset);
        datasetResults.push({ id: result.insertedId, name: dataset.name });
      } else {
        datasetResults.push({ id: existingDataset._id, name: dataset.name, skipped: true });
      }
    }
    
    // Create sample activities
    const activities = [];
    const datasets = await db.collection('datasets').find({ ownerId: userId }).limit(5).toArray();
    
    if (datasets.length > 0) {
      // Clear existing activities for the user
      await db.collection('activities').deleteMany({ userId });
      
      // Generate 10 random activities
      const activityTypes = Object.values(ACTIVITY_TYPES);
      const dateBefore = new Date();
      dateBefore.setDate(dateBefore.getDate() - 30);
      
      for (let i = 0; i < 10; i++) {
        const dataset = datasets[Math.floor(Math.random() * datasets.length)];
        const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);
        
        let activity = {
          type: activityType,
          userId,
          datasetId: dataset._id,
          createdAt,
        };
        
        // Set activity details based on type
        switch (activityType) {
          case ACTIVITY_TYPES.PURCHASE:
            const amount = Math.floor(Math.random() * 100) + 20;
            activity = {
              ...activity,
              title: Math.random() > 0.5 ? 'Dataset Purchased' : 'Dataset Sold',
              description: Math.random() > 0.5 
                ? `You purchased the '${dataset.name}' dataset` 
                : `Someone purchased your '${dataset.name}' dataset`,
              amount: Math.random() > 0.5 ? -amount : amount,
              positive: Math.random() > 0.5
            };
            break;
          case ACTIVITY_TYPES.DOWNLOAD:
            activity = {
              ...activity,
              title: 'Dataset Downloaded',
              description: `Your '${dataset.name}' was downloaded`
            };
            break;
          case ACTIVITY_TYPES.UPLOAD:
            activity = {
              ...activity,
              title: 'Dataset Uploaded',
              description: `You uploaded the '${dataset.name}' dataset`
            };
            break;
          case ACTIVITY_TYPES.SYSTEM:
            activity = {
              ...activity,
              title: 'System Update',
              description: `Your dataset '${dataset.name}' was updated to comply with new standards`
            };
            break;
        }
        
        activities.push(activity);
      }
      
      // Insert all activities
      await db.collection('activities').insertMany(activities);
    }
    
    // Create sample transactions
    const transactions = [];
    if (datasets.length > 0) {
      // Clear existing transactions
      await db.collection('transactions').deleteMany({ 
        $or: [{ userId }, { sellerId: userId }]
      });
      
      // Generate 10 random transactions
      for (let i = 0; i < 10; i++) {
        const dataset = datasets[Math.floor(Math.random() * datasets.length)];
        const daysAgo = Math.floor(Math.random() * 60);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);
        
        const amount = Math.floor(dataset.price * (Math.random() * 0.4 + 0.8)); // 80-120% of dataset price
        
        const transaction = {
          datasetId: dataset._id,
          amount,
          status: 'completed',
          createdAt,
        };
        
        // Randomly make it either a buy or sell transaction
        if (Math.random() > 0.5) {
          // User is buying
          transaction.userId = userId;
          transaction.sellerId = new ObjectId();
        } else {
          // User is selling
          transaction.userId = new ObjectId();
          transaction.sellerId = userId;
        }
        
        transactions.push(transaction);
      }
      
      // Insert all transactions
      await db.collection('transactions').insertMany(transactions);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      datasets: datasetResults,
      activities: activities.length,
      transactions: transactions.length
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'An error occurred while seeding the database', details: error.message },
      { status: 500 }
    );
  }
} 