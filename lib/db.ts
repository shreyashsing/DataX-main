import { MongoClient, Db, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'datax';

// Connection cache
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

interface ConnectToDatabaseResult {
  client: MongoClient;
  db: Db;
}

/**
 * Connect to MongoDB and return the client and database
 */
export async function connectToDatabase(): Promise<ConnectToDatabaseResult> {
  // If we have cached connections, use them
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Establish new connection
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  // Cache the connections
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

// Export ObjectId for convenience
export { ObjectId }; 