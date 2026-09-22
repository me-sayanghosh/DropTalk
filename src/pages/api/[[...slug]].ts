import type { NextApiRequest, NextApiResponse, PageConfig } from 'next';
import { createApp } from '../../../server/src/createApp';
import { connectDB } from '../../../server/src/shared/config/db';

let expressApp: any = null;

export const config: PageConfig = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Fast path for health checks
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({ ok: true, timestamp: Date.now() });
  }

  // Ensure MONGODB_URI is set on Vercel/production
  const mongoUri = process.env.MONGODB_URI;
  const isServerlessOrProd = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');

  if (!mongoUri && isServerlessOrProd) {
    console.error('[serverless] MONGODB_URI environment variable is missing.');
    return res.status(500).json({
      error: 'MONGODB_URI is not set in Vercel Environment Variables. Please add MONGODB_URI in your Vercel Project Settings > Environment Variables, then redeploy.',
    });
  }

  try {
    if (mongoUri) {
      await connectDB(mongoUri);
    }
  } catch (e: any) {
    console.error('[db] serverless connect error:', e.message);
    return res.status(500).json({
      error: `Database connection failed: ${e.message}. Please verify your MONGODB_URI in Vercel Environment Variables and ensure 0.0.0.0/0 (allow access from anywhere) is configured in your MongoDB Atlas Network Access.`,
    });
  }

  if (!expressApp) {
    expressApp = createApp({ disableCSP: true });
  }

  return expressApp(req, res);
}
