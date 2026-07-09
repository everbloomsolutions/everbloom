import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks';
import { notificationApi } from '../../api';
import { formatDistanceDate } from '../../utils/formatDate';
import logger from '../../utils/logger';

const NotificationBell = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, setNotifications, setUnreadCount } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Get recent notifications (most recent 5)
  const recentNotifications = notifications.slice(0, 5);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      // Real-time update will handle state update, but we can optimistically update
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    setDropdownOpen(false);
    if (notification.link) {
      navigate(notification.link);
    } else {
      navigate('/notifications');
    }
  };

  const handleViewAll = () => {
    setDropdownOpen(false);
    navigate('/notifications');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all transform hover:scale-110 active:scale-95"
        title="Notifications"
        aria-label={`View notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <>
            <span
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"
              aria-label={`${unreadCount} unread notifications`}
            />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75" aria-hidden="true" />
          </>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 z-50 w-80 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              <div className="py-2">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      !notification.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 p-1.5 rounded-lg ${
                          notification.type === 'success'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : notification.type === 'error'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : notification.type === 'warning'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30'
                            : 'bg-primary-100 dark:bg-primary-900/30'
                        }`}
                      >
                        <Bell
                          className={`w-4 h-4 ${
                            notification.type === 'success'
                              ? 'text-green-600 dark:text-green-400'
                              : notification.type === 'error'
                              ? 'text-red-600 dark:text-red-400'
                              : notification.type === 'warning'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-primary-600 dark:text-primary-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
                                !notification.isRead ? 'font-semibold' : ''
                              }`}
                            >
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {formatDistanceDate(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(notification._id, e)}
                              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="Mark as read"
                              aria-label="Mark as read"
                            >
                              <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
              </div>
            )}
          </div>

          {recentNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={handleViewAll}
                className="flex items-center justify-between w-full text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <span>View all notifications</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
