// src/router/AppRoutes.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import Loader from '../components/shared/Loader';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import BlankLayout from '../layouts/BlankLayout';

// Lazy load pages for code splitting
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Users = lazy(() => import('../pages/Users'));
const Locations = lazy(() => import('../pages/Locations'));
const Collections = lazy(() => import('../pages/Collections'));
const Settings = lazy(() => import('../pages/Settings'));
const Analytics = lazy(() => import('../pages/Analytics'));
const AuditLogs = lazy(() => import('../pages/AuditLogs'));
const Archived = lazy(() => import('../pages/Archived'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Error404 = lazy(() => import('../pages/Error404'));
const Assign = lazy(() => import('../pages/Assign'));

// Protected Route Component
import ProtectedRoute from './ProtectedRoute';

// Suspense wrapper for lazy-loaded components
const LazyWrapper = ({ children }) => (
  <Suspense fallback={<Loader />}>
    {children}
  </Suspense>
);

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Redirect root based on auth status */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* Auth Routes (Public) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LazyWrapper><Login /></LazyWrapper>} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        {/* Dashboard - All roles */}
        <Route path="/dashboard" element={<LazyWrapper><Dashboard /></LazyWrapper>} />
        
        {/* Analytics - All roles (with different content based on role) */}
        <Route path="/analytics" element={<LazyWrapper><Analytics /></LazyWrapper>} />
        
        {/* Settings - All roles */}
        <Route path="/settings" element={<LazyWrapper><Settings /></LazyWrapper>} />
        
        {/* Notifications - All roles */}
        <Route path="/notifications" element={<LazyWrapper><Notifications /></LazyWrapper>} />
        
        {/* Admin and Super Admin only routes */}
        <Route path="/users" element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><LazyWrapper><Users /></LazyWrapper></ProtectedRoute>} />
        <Route path="/locations" element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><LazyWrapper><Locations /></LazyWrapper></ProtectedRoute>} />
        <Route path="/assign" element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><LazyWrapper><Assign /></LazyWrapper></ProtectedRoute>} />
        {/* Collections - All roles (users see only their assigned location's collections) */}
        <Route path="/collections" element={<ProtectedRoute requiredRoles={['user', 'agent', 'admin', 'super_admin']}><LazyWrapper><Collections /></LazyWrapper></ProtectedRoute>} />
        <Route path="/archived" element={<ProtectedRoute requiredRoles={['admin', 'super_admin']}><LazyWrapper><Archived /></LazyWrapper></ProtectedRoute>} />
        
        {/* Super Admin only routes */}
        <Route path="/audit-logs" element={<ProtectedRoute requiredRole="super_admin"><LazyWrapper><AuditLogs /></LazyWrapper></ProtectedRoute>} />
      </Route>

      {/* 404 Page */}
      <Route element={<BlankLayout />}>
        <Route path="/404" element={<LazyWrapper><Error404 /></LazyWrapper>} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;