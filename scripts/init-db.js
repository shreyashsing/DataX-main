/**
 * Database initialization script
 * 
 * This script sets up the MongoDB database with proper indexes and initializes
 * collections. It can be run manually, or set up as part of the app startup.
 */

const { MongoClient } = require('mongodb');

// MongoDB connection URL from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/datax';
const MONGODB_DB = process.env.MONGODB_DB || 'datax';

async function initDatabase() {
  console.log('Initializing database...');
  
  // Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    
    // Create indexes for collections
    console.log('Creating indexes...');
    
    // Users collection
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    
    // Datasets collection
    await db.collection('datasets').createIndex({ name: 1 });
    await db.collection('datasets').createIndex({ ownerId: 1 });
    await db.collection('datasets').createIndex({ category: 1 });
    await db.collection('datasets').createIndex({ downloads: -1 });
    await db.collection('datasets').createIndex({ createdAt: -1 });
    
    // Activities collection
    await db.collection('activities').createIndex({ userId: 1 });
    await db.collection('activities').createIndex({ createdAt: -1 });
    await db.collection('activities').createIndex({ type: 1 });
    
    // Transactions collection
    await db.collection('transactions').createIndex({ userId: 1 });
    await db.collection('transactions').createIndex({ sellerId: 1 });
    await db.collection('transactions').createIndex({ datasetId: 1 });
    await db.collection('transactions').createIndex({ createdAt: -1 });
    await db.collection('transactions').createIndex({ status: 1 });
    
    console.log('Database initialized successfully!');
    
    // Return the client and db for further operations
    return { client, db };
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export for use in other files
module.exports = { initDatabase };

// If called directly, run the initialization
if (require.main === module) {
  (async () => {
    try {
      const { client } = await initDatabase();
      
      // Close the connection
      await client.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Database initialization failed:', error);
      process.exit(1);
    }
  })();
} 