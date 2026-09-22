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
  if (process.env.MONGODB_URI) {
    try {
      await connectDB(process.env.MONGODB_URI);
    } catch (e: any) {
      console.error('[db] serverless connect error:', e.message);
    }
  }

  if (!expressApp) {
    expressApp = createApp({ disableCSP: true });
  }

  return expressApp(req, res);
}
