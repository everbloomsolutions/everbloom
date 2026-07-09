import { Types as _Types } from 'mongoose';

export interface UserResponse {
  _id: string;
  email: string;
  name?: string;
  role: 'user' | 'agent' | 'admin' | 'super_admin';
  isActive: boolean;
  avatar?: string;
  phoneNumber?: string;
  company?: string;
  preferences?: Record<string, unknown>;
  defaultLocation?: string | {
    _id: string;
    locationName: string;
    address: string;
    city?: string;
    state?: string;
    locationType: string;
  };
  isDeleted?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
