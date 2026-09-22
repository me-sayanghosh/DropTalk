import 'express';
import 'socket.io';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      file?: any;
      files?: any;
    }
  }
}

declare module 'socket.io' {
  interface Socket {
    user?: any;
  }
}
