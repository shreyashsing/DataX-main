import { MongoClient, Db } from 'mongodb';

// Add global declaration for TypeScript
declare global {
  var _mongoClientPromise: Promise<MongoClient>;
  var _mockDb: any;
}

// Connection string
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/datax';
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Initialize the mock database (for demo mode)
if (typeof global._mockDb === 'undefined') {
  global._mockDb = {
    collections: {
      datasets: [],
      activities: [],
      users: []
    },
    collection: function(name: string) {
      const collections = this.collections;
      return {
        findOne: async function(query: any) {
          if (!collections[name]) return null;
          if (query._id) {
            return collections[name].find((item: any) => item._id.toString() === query._id.toString());
          }
          return null;
        },
        find: async function(query: any = {}) {
          if (!collections[name]) return { toArray: async () => [] };
          return { 
            toArray: async () => collections[name].filter((item: any) => {
              for (const key in query) {
                if (item[key] !== query[key]) return false;
              }
              return true;
            }) 
          };
        },
        insertOne: async function(doc: any) {
          if (!collections[name]) collections[name] = [];
          collections[name].push(doc);
          return { insertedId: doc._id };
        },
        updateOne: async function(query: any, update: any) {
          if (!collections[name]) return { modifiedCount: 0 };
          const index = collections[name].findIndex((item: any) => {
            if (query._id) return item._id.toString() === query._id.toString();
            return false;
          });
          
          if (index === -1) return { modifiedCount: 0 };
          
          if (update.$set) {
            collections[name][index] = { ...collections[name][index], ...update.$set };
          }
          
          return { modifiedCount: 1 };
        }
      };
    }
  };
}

// For demo purposes, we'll use a mock database
const useMockDb = !process.env.MONGODB_URI;

// Initialize clientPromise based on environment
if (useMockDb) {
  // Create a dummy promise for mock mode
  clientPromise = Promise.resolve({} as MongoClient);
} else {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

export const connectToDatabase = async () => {
  if (useMockDb) {
    console.log('Using mock database for demo mode');
    return { client: null, db: global._mockDb };
  }
  
  const client = await clientPromise;
  const db = client.db();
  
  return { client, db };
};

// Export a module-scoped MongoClient promise
export default clientPromise; 