import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export async function getUserByEmail(email) {
  const { db } = await connectToDatabase();
  return db.collection('users').findOne({ email });
}

export async function getUserById(id) {
  const { db } = await connectToDatabase();
  
  try {
    // Convert string ID to ObjectId if needed
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return db.collection('users').findOne({ _id: objectId });
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

export async function createUser(userData) {
  const { db } = await connectToDatabase();
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  // Create the user object
  const user = {
    name: userData.name,
    email: userData.email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: userData.avatar || null,
  };
  
  // Insert the user into the database
  const result = await db.collection('users').insertOne(user);
  
  // Return the user object without the password
  const { password, ...userWithoutPassword } = user;
  return { ...userWithoutPassword, _id: result.insertedId };
}

export async function validateUserCredentials(email, password) {
  const { db } = await connectToDatabase();
  
  // Find the user by email
  const user = await db.collection('users').findOne({ email: email.toLowerCase() });
  
  // If no user is found, return null
  if (!user) {
    return null;
  }
  
  // Check if the password is correct
  const isValid = await bcrypt.compare(password, user.password);
  
  // If the password is incorrect, return null
  if (!isValid) {
    return null;
  }
  
  // Return the user object without the password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function updateUser(userId, updateData) {
  const { db } = await connectToDatabase();
  
  // Prepare the update object
  const update = {
    ...updateData,
    updatedAt: new Date()
  };
  
  // If updating password, hash it
  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  }
  
  // Update the user in the database
  await db.collection('users').updateOne(
    { _id: userId },
    { $set: update }
  );
  
  // Get the updated user
  const updatedUser = await getUserById(userId);
  
  // Return the user without the password
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
} 