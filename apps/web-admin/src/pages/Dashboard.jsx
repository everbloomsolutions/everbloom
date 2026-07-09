import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import Skeleton from '../components/shared/Skeleton';
import DashboardTodayActivity from '../components/dashboard/DashboardTodayActivity';
import DashboardPerformanceMetrics from '../components/dashboard/DashboardPerformanceMetrics';
import DashboardRecentActivity from '../components/dashboard/DashboardRecentActivity';
import DashboardUserLocation from '../components/dashboard/DashboardUserLocation';
import DashboardAgentLocations from '../components/dashboard/DashboardAgentLocations';
import DashboardInsights from '../components/dashboard/DashboardInsights';
import DashboardAdminStats from '../components/dashboard/DashboardAdminStats';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAuth } from '../hooks';
import { USER_ROLES } from '../utils/constants';
import { locationApi } from '../api';
import { createQueryFn } from '../utils/queryAdapter';
import ErrorBoundary from '../components/shared/ErrorBoundary';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role;
  const isAdmin = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN;
  const isAgent = userRole === USER_ROLES.AGENT;
  const isUser = userRole === USER_ROLES.USER;

  // Use TanStack Query for all data fetching
  const { data: statsData, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard', 'stats', user?._id, userRole],
    queryFn: createQueryFn(() => dashboardApi.getDashboardStats()),
    staleTime: 60000, // 1 minute
  });

  const { data: todayData, isLoading: todayLoading, error: todayError, refetch: refetchToday } = useQuery({
    queryKey: ['dashboard', 'today', user?._id, userRole],
    queryFn: createQueryFn(() => dashboardApi.getTodayActivityOverview()),
    staleTime: 30000, // 30 seconds
  });

  const { data: performanceData, isLoading: performanceLoading, error: performanceError, refetch: refetchPerformance } = useQuery({
    queryKey: ['dashboard', 'performance', user?._id, userRole],
    queryFn: createQueryFn(() => dashboardApi.getTodayPerformanceMetrics()),
    staleTime: 30000, // 30 seconds
  });

  const { data: recentData, isLoading: recentLoading, error: recentError, refetch: refetchRecent } = useQuery({
    queryKey: ['dashboard', 'recent', user?._id, userRole],
    queryFn: createQueryFn(() => dashboardApi.getRecentDataAndGrowth()),
    staleTime: 60000, // 1 minute
  });

  // Fetch default location for users
  const defaultLocationId = useMemo(() => {
    if (!isUser || !user?.defaultLocation) return null;
    if (typeof user.defaultLocation === 'object' && user.defaultLocation.locationName) {
      return user.defaultLocation; // Already populated
    }
    return typeof user.defaultLocation === 'string'
      ? user.defaultLocation
      : user.defaultLocation._id || user.defaultLocation;
  }, [isUser, user?.defaultLocation]);

  const { data: defaultLocationData, isLoading: _defaultLocationLoading } = useQuery({
    queryKey: ['location', defaultLocationId],
    queryFn: createQueryFn(() => {
      if (!defaultLocationId || typeof defaultLocationId === 'object') {
        return Promise.resolve({ success: true, data: defaultLocationId });
      }
      return locationApi.getLocationById(defaultLocationId);
    }),
    enabled: !!defaultLocationId && typeof defaultLocationId !== 'object',
    staleTime: 300000, // 5 minutes
  });

  // Fetch assigned locations for agents
  const { data: assignedLocationsData, isLoading: _assignedLocationsLoading } = useQuery({
    queryKey: ['locations', 'assigned', user?._id],
    queryFn: createQueryFn(() => locationApi.getLocations({ assignedToAgent: user._id })),
    enabled: isAgent && !!user?._id,
    staleTime: 60000, // 1 minute
  });

  // Extract data from responses (after adapter transformation)
  const stats = statsData;

  // Normalize todayData into the richer structure expected by dashboard components.
  // Backend currently returns a simplified TodayActivityDto (counts only) with role-based filtering.
  const normalizedTodayData = useMemo(() => {
    const raw = todayData || {};
    const collectionsCount = Number(raw?.collections ?? raw?.newProjects ?? 0) || 0;
    const newUsers = Number(raw?.newUsers ?? 0) || 0;
    const newLocations = Number(raw?.newLocations ?? 0) || 0;
    const date = raw?.date || new Date().toISOString().split('T')[0];

    return {
      today: {
        collections: {
          count: collectionsCount,
          totalWeight: Number(raw?.totalWeight ?? 0) || 0,
          totalRevenue: Number(raw?.totalRevenue ?? 0) || 0,
          withReceipt: Number(raw?.withReceipt ?? 0) || 0,
          withoutReceipt: Number(raw?.withoutReceipt ?? 0) || 0,
        },
        receipts: {
          count: Number(raw?.receiptsCount ?? 0) || 0,
          totalAmount: Number(raw?.receiptsTotalAmount ?? 0) || 0,
        },
        revenue: {
          total: Number(raw?.revenueTotal ?? 0) || 0,
          gst: Number(raw?.revenueGst ?? 0) || 0,
          net: Number(raw?.revenueNet ?? 0) || 0,
        },
        newUsers,
        newLocations,
        date,
      },
      // Changes are not provided by backend currently; default to 0 to avoid UI crashes.
      changes: {
        collections: 0,
        receipts: 0,
        revenue: 0,
        newUsers: 0,
      },
    };
  }, [todayData]);
  const defaultLocation = typeof defaultLocationId === 'object' ? defaultLocationId : defaultLocationData;
  const assignedLocations = assignedLocationsData?.locations || [];

  // Combined loading state
  const loading = statsLoading || todayLoading || performanceLoading || recentLoading;
  const error = todayError || statsError || performanceError || recentError;

  // Refetch all data
  const refetchAll = () => {
    refetchStats();
    refetchToday();
    refetchPerformance();
    refetchRecent();
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (user?._id && userRole) {
      const interval = setInterval(refetchAll, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
    // intentional: run only when user/role change; refetchAll is stable from query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, userRole]);

  if (loading && !todayData) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton variant="text" width="200px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="300px" height="1rem" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  // Show error message if critical data failed
  if (error && !todayData) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200">{error?.message || 'Failed to load dashboard data. Please refresh the page.'}</p>
          <button
            onClick={refetchAll}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }


  // Get role-specific greeting
  const getGreeting = () => {
    if (isUser) return "Welcome! Here's your activity overview.";
    if (isAgent) return "Welcome back! Here's your performance today.";
    if (isAdmin) return "Welcome back! Here's what's happening today.";
    return "Welcome back!";
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {getGreeting()}
            </p>
          </div>
          {/* Refresh Button */}
          <button
            onClick={refetchAll}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>


      {/* Today's Activity Overview */}
      <DashboardTodayActivity
        todayData={normalizedTodayData}
        isAdmin={isAdmin}
        isAgent={isAgent}
        isUser={isUser}
      />

      {/* Allocated Location Details - User role only */}
      <DashboardUserLocation defaultLocation={defaultLocation} />

      {/* Today's Performance Metrics - Only for Admin and Agent */}
      <DashboardPerformanceMetrics
        performanceData={performanceData}
        isAdmin={isAdmin}
        isAgent={isAgent}
        assignedLocations={assignedLocations}
      />

      {/* Assigned Locations Summary - Agent only */}
      {isAgent && assignedLocations && assignedLocations.length > 0 && (
        <DashboardAgentLocations
          assignedLocations={assignedLocations}
          navigate={navigate}
        />
      )}

      {/* Role-Specific Insights */}
      {todayData && (isUser || isAgent) && (
        <DashboardInsights
          todayData={normalizedTodayData}
          isUser={isUser}
          isAgent={isAgent}
          navigate={navigate}
        />
      )}

      {/* User Activity Summary and Timeline */}
      {isUser && recentData && (
        <DashboardRecentActivity
          recentData={recentData}
          stats={stats}
          isUser={isUser}
          isAdmin={isAdmin}
          isAgent={isAgent}
          navigate={navigate}
        />
      )}

      {/* Recent Data, Charts - Only for Admin/Agent */}
      {recentData && !isUser && (
        <DashboardRecentActivity
          recentData={recentData}
          stats={stats}
          isAdmin={isAdmin}
          isAgent={isAgent}
          isUser={isUser}
          navigate={navigate}
        />
      )}

      {/* Admin Stats */}
      {isAdmin && <DashboardAdminStats stats={stats} navigate={navigate} />}
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const DashboardWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Dashboard"
      message="Something went wrong while loading the dashboard. Please try refreshing the page."
    >
      <Dashboard />
    </ErrorBoundary>
  );
};

export default DashboardWithErrorBoundary;
