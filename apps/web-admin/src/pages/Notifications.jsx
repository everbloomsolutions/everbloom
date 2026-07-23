import ErrorBoundary from '../components/shared/ErrorBoundary';
import { notificationApi } from '../api';
import { Bell, Check } from 'lucide-react';
import Button from '../components/shared/Button';
import Skeleton from '../components/shared/Skeleton';
import { formatDistanceDate } from '../utils/formatDate';
import { useNotifications } from '../hooks';
import logger from '../utils/logger';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Notifications = () => {
  const { notifications, unreadCount, setNotifications, setUnreadCount, fetchNotifications } = useNotifications();
  const [_searchParams, _setSearchParams] = useSearchParams();
  const [initialLoad, setInitialLoad] = useState(true);

  // Initial fetch on mount
  useEffect(() => {
    const loadNotifications = async () => {
      await fetchNotifications();
      setInitialLoad(false);
    };
    loadNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      // Real-time update will handle state update, but we can optimistically update
      setNotifications(prev => prev.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      // Real-time update will handle state update, but we can optimistically update
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
    }
  };

  if (initialLoad) {
    return (
      <div>
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
            <Skeleton variant="text" width="250px" height="1rem" />
          </div>
          <Skeleton variant="rectangular" width="120px" height="40px" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {unreadCount} unread notifications
          </p>
        </div>
        <Button variant="secondary" onClick={handleMarkAllAsRead}>
          <Check className="w-5 h-5 mr-2" />
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-4">
        {(notifications || []).map((notification) => (
          <div
            key={notification._id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${
              !notification.isRead ? 'border-l-4 border-primary-600 dark:border-primary-400' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                  notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                  notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                  'bg-primary-100 dark:bg-primary-900/30'
                }`}>
                  <Bell className={`w-5 h-5 ${
                    notification.type === 'success' ? 'text-green-600 dark:text-green-400' :
                    notification.type === 'error' ? 'text-red-600 dark:text-red-400' :
                    notification.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-primary-600 dark:text-primary-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {formatDistanceDate(notification.createdAt)}
                  </p>
                </div>
              </div>
              {!notification.isRead && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAsRead(notification._id)}
                >
                  Mark as read
                </Button>
              )}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <Bell className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const NotificationsWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Notifications"
      message="Something went wrong while loading the notifications page. Please try refreshing the page."
    >
      <Notifications />
    </ErrorBoundary>
  );
};

export default NotificationsWithErrorBoundary;
