import { USER_ROLES } from './constants';

export const hasPermission = (userRole, requiredRoles) => {
  if (!Array.isArray(requiredRoles)) {
    requiredRoles = [requiredRoles];
  }
  return requiredRoles.includes(userRole);
};

// Role hierarchy: super_admin > admin > agent > user
const ROLE_HIERARCHY = {
  [USER_ROLES.USER]: 0,
  [USER_ROLES.AGENT]: 1,
  [USER_ROLES.ADMIN]: 2,
  [USER_ROLES.SUPER_ADMIN]: 3,
};

export const hasRoleOrHigher = (user, requiredRole) => {
  if (!user?.role) return false;
  const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? -1;
  return userLevel >= requiredLevel;
};

export const isUser = (user) => {
  return user?.role === USER_ROLES.USER;
};

export const isAgent = (user) => {
  return user?.role === USER_ROLES.AGENT;
};

export const isAdmin = (user) => {
  return user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;
};

export const isSuperAdmin = (user) => {
  return user?.role === USER_ROLES.SUPER_ADMIN;
};

export const isAdminOrAgent = (user) => {
  return user?.role === USER_ROLES.ADMIN || 
         user?.role === USER_ROLES.AGENT || 
         user?.role === USER_ROLES.SUPER_ADMIN;
};

export const canManageUsers = (user) => {
  return isAdmin(user);
};

export const canViewAnalytics = (user) => {
  // All roles can view analytics, but with different content
  return !!user?.role;
};
