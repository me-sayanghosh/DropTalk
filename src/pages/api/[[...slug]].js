import { createApp } from '../../../server/src/createApp.js';
import { connectDB } from '../../../server/src/shared/config/db.js';

let expressApp = null;

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  if (process.env.MONGODB_URI) {
    try {
      await connectDB(process.env.MONGODB_URI);
    } catch (e) {
      console.error('[db] serverless connect error:', e.message);
    }
  }

  if (!expressApp) {
    expressApp = createApp({ disableCSP: true });
  }

  return expressApp(req, res);
}
