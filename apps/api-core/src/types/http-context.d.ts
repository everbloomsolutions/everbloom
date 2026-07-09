import { IUser } from '../modules/user/user.model';

declare global {
  namespace Express {
    interface User extends IUser {
      _id: string | { toString(): string };
      role: 'user' | 'agent' | 'admin' | 'super_admin';
    }
    
    interface Request {
      user?: User;
    }
  }
}

export {};
