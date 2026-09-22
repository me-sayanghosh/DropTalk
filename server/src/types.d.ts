import 'express';
import 'socket.io';
import 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      file?: any;
      files?: any;
      [key: string]: any;
    }
  }
}

declare module 'socket.io' {
  interface Socket {
    user?: any;
  }
}

declare module 'mongoose' {
  interface Document {
    toClient?: any;
    toSummary?: any;
    [key: string]: any;
  }
}
