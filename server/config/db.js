import mongoose from 'mongoose';

let memoryServer = null;

/**
 * Connects to MongoDB.
 * MONGO_URI=memory starts an in-memory MongoDB (mongodb-memory-server).
 * Returns true when running in memory mode (so the caller can auto-seed).
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI || 'memory';

  if (uri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    console.log('Starting in-memory MongoDB (the first run downloads a MongoDB binary)...');
    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
    console.log('Connected to in-memory MongoDB');
    return true;
  }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return false;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
