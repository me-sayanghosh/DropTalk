import mongoose from 'mongoose';

let memoryServer: any = null;
let cachedConnectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDB(uri?: string): Promise<typeof mongoose> {
  // If already connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // If a connection attempt is in-flight, return the existing promise
  if (cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  const targetUri = uri || process.env.MONGODB_URI;
  const isServerlessOrProd = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');

  if (!targetUri && isServerlessOrProd) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  mongoose.set('strictQuery', true);

  cachedConnectionPromise = (async () => {
    try {
      if (targetUri) {
        await mongoose.connect(targetUri, {
          serverSelectionTimeoutMS: 5000,
          bufferCommands: false,
        });
        console.log(`[db] connected: ${mongoose.connection.name}`);
        return mongoose;
      }
      throw new Error('No MongoDB URI provided');
    } catch (err: any) {
      cachedConnectionPromise = null;
      console.warn(`[db] could not connect to ${targetUri || 'default URI'}: ${err.message}`);

      // In production or Vercel serverless functions, fail fast so the caller receives the real Atlas error
      if (isServerlessOrProd) {
        throw err;
      }

      console.warn('[db] falling back to in-memory MongoDB (mongodb-memory-server)...');
      try {
        const pkg = 'mongodb-memory-server';
        const { MongoMemoryServer } = await import(/* webpackIgnore: true */ pkg);
        memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();
        await mongoose.connect(memUri, { bufferCommands: false });
        console.log(`[db] connected to in-memory MongoDB at ${memUri}`);
        console.warn('[db] ⚠️  Data will NOT persist across restarts. Install MongoDB for persistence.');
        return mongoose;
      } catch (fallbackErr: any) {
        console.error('[db] in-memory fallback also failed:', fallbackErr.message);
        throw err;
      }
    }
  })();

  return cachedConnectionPromise;
}

export async function closeDB() {
  cachedConnectionPromise = null;
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
