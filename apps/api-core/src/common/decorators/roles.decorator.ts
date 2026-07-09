import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export const RequireAdmin = () => Roles('admin', 'super_admin');
export const RequireSuperAdmin = () => Roles('super_admin');
export const RequireAdminOrAgent = () => Roles('admin', 'agent', 'super_admin');
