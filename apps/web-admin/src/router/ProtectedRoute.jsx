// src/router/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import Loader from '../components/shared/Loader';
import { hasRoleOrHigher, hasPermission } from '../utils/permissionUtils';

const ProtectedRoute = ({ children, requiredRole = null, requiredRoles = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loader while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role access
  if (requiredRole || requiredRoles) {
    let hasAccess = false;

    // Check single role with hierarchy support
    if (requiredRole) {
      hasAccess = hasRoleOrHigher(user, requiredRole);
    }

    // Check multiple roles with hierarchy support
    // User has access if they have any of the required roles OR a role higher than any of them
    if (requiredRoles && Array.isArray(requiredRoles)) {
      // First check exact match
      hasAccess = hasPermission(user?.role, requiredRoles);
      
      // If no exact match, check if user has a role higher than any required role
      if (!hasAccess) {
        hasAccess = requiredRoles.some(role => hasRoleOrHigher(user, role));
      }
    }

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;