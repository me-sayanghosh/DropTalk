import mongoose from 'mongoose';

let memoryServer = null;

export async function connectDB(uri) {
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return;
  }
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[db] connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.warn(`[db] could not connect to ${uri}: ${err.message}`);
    console.warn('[db] falling back to in-memory MongoDB (mongodb-memory-server)...');

    try {
      const pkg = 'mongodb-memory-server';
      const { MongoMemoryServer } = await import(/* webpackIgnore: true */ pkg);
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[db] connected to in-memory MongoDB at ${memUri}`);
      console.warn('[db] ⚠️  Data will NOT persist across restarts. Install MongoDB for persistence.');
    } catch (fallbackErr) {
      console.error('[db] in-memory fallback also failed:', fallbackErr.message);
      throw err; // throw the original error
    }
  }
}

export async function closeDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
