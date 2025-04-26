/**
 * Database seeding script
 * 
 * This script seeds the MongoDB database with sample data
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// MongoDB connection URL from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/datax';
const MONGODB_DB = process.env.MONGODB_DB || 'datax';

// Mock user data
const mockUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

// Sample datasets
const mockDatasets = [
  {
    name: "Financial Market Trends 2023",
    description: "Comprehensive dataset of global financial markets including stocks, bonds, and cryptocurrencies.",
    price: 299,
    category: "Finance",
    dataType: "Time Series",
    size: "2.4 GB",
    downloads: 1245,
    popularity: 98,
    verified: true,
    createdAt: new Date("2023-11-15")
  },
  {
    name: "Healthcare Patient Records (Anonymized)",
    description: "Anonymized patient records for research purposes, including medical history and treatments.",
    price: 499,
    category: "Healthcare",
    dataType: "Structured",
    size: "5.7 GB",
    downloads: 876,
    popularity: 92,
    verified: true,
    createdAt: new Date("2023-10-05")
  },
  {
    name: "E-commerce Customer Behavior",
    description: "Detailed customer behavior data from major e-commerce platforms.",
    price: 349,
    category: "E-commerce",
    dataType: "Structured",
    size: "3.2 GB",
    downloads: 1532,
    popularity: 97,
    verified: true,
    createdAt: new Date("2023-12-01")
  }
];

// Activity types
const ACTIVITY_TYPES = {
  PURCHASE: 'purchase',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',
  SYSTEM: 'system'
};

async function seedDatabase() {
  console.log('Seeding database...');
  
  // Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    
    // Create test user if it doesn't exist
    let userId;
    const existingUser = await db.collection('users').findOne({ email: mockUser.email });
    
    if (existingUser) {
      userId = existingUser._id;
      console.log('Using existing user:', userId);
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(mockUser.password, 10);
      
      // Create user
      const userResult = await db.collection('users').insertOne({
        name: mockUser.name,
        email: mockUser.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      userId = userResult.insertedId;
      console.log('Created new user:', userId);
    }
    
    // Clear existing datasets for this user
    await db.collection('datasets').deleteMany({ ownerId: userId });
    console.log('Cleared existing datasets');
    
    // Insert datasets
    const datasets = [];
    for (const dataset of mockDatasets) {
      const newDataset = {
        ...dataset,
        ownerId: userId,
        updatedAt: new Date()
      };
      
      const result = await db.collection('datasets').insertOne(newDataset);
      datasets.push({ _id: result.insertedId, name: dataset.name });
      console.log('Added dataset:', dataset.name, 'with ID:', result.insertedId, 'owned by:', userId);
    }
    
    // Verify datasets were inserted
    const datasetCount = await db.collection('datasets').countDocuments({ ownerId: userId });
    console.log(`Verified ${datasetCount} datasets in database for user ${userId}`);
    
    // Create activities
    await db.collection('activities').deleteMany({ userId: userId });
    
    const activities = [];
    for (let i = 0; i < 10; i++) {
      const dataset = datasets[Math.floor(Math.random() * datasets.length)];
      const activityType = Object.values(ACTIVITY_TYPES)[Math.floor(Math.random() * 4)];
      
      let activity = {
        type: activityType,
        userId: userId,
        datasetId: dataset._id,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
      };
      
      // Set activity details based on type
      switch (activityType) {
        case ACTIVITY_TYPES.PURCHASE:
          const amount = Math.floor(Math.random() * 100) + 20;
          activity = {
            ...activity,
            title: 'Dataset Purchase',
            description: `Transaction for ${dataset.name}`,
            amount: amount,
            positive: Math.random() > 0.5
          };
          break;
        case ACTIVITY_TYPES.DOWNLOAD:
          activity = {
            ...activity,
            title: 'Dataset Downloaded',
            description: `Downloaded ${dataset.name}`
          };
          break;
        case ACTIVITY_TYPES.UPLOAD:
          activity = {
            ...activity,
            title: 'Dataset Uploaded',
            description: `Uploaded ${dataset.name}`
          };
          break;
        case ACTIVITY_TYPES.SYSTEM:
          activity = {
            ...activity,
            title: 'System Update',
            description: `System update for ${dataset.name}`
          };
          break;
      }
      
      activities.push(activity);
    }
    
    await db.collection('activities').insertMany(activities);
    console.log('Added activities:', activities.length);
    
    // Create transactions
    await db.collection('transactions').deleteMany({ 
      $or: [{ userId: userId }, { sellerId: userId }]
    });
    
    const transactions = [];
    for (let i = 0; i < 10; i++) {
      const dataset = datasets[Math.floor(Math.random() * datasets.length)];
      const isSelling = Math.random() > 0.5;
      
      const transaction = {
        datasetId: dataset._id,
        amount: Math.floor(Math.random() * 500) + 50,
        status: 'completed',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000)
      };
      
      if (isSelling) {
        transaction.sellerId = userId;
        transaction.userId = new ObjectId();
      } else {
        transaction.userId = userId;
        transaction.sellerId = new ObjectId();
      }
      
      transactions.push(transaction);
    }
    
    await db.collection('transactions').insertMany(transactions);
    console.log('Added transactions:', transactions.length);
    
    console.log('Database seeding complete!');
    
    return {
      user: { email: mockUser.email, password: mockUser.password },
      datasets: datasets.length,
      activities: activities.length,
      transactions: transactions.length
    };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

// Run the seeding function if this script is executed directly
if (require.main === module) {
  (async () => {
    try {
      const result = await seedDatabase();
      console.log('Seeding result:', result);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { seedDatabase }; 