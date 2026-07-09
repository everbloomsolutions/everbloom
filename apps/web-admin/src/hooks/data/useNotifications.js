import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../network/useSocket';
import { notificationApi } from '../../api';
import { createQueryFn } from '../../utils/queryAdapter';

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { socket, connected, on, off } = useSocket();

  // Fetch notifications using TanStack Query
  const { data: notificationsData, isLoading: notificationsLoading, error: notificationsError, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: createQueryFn(() => notificationApi.getAllNotifications()),
    staleTime: 30000, // 30 seconds
  });

  // Fetch unread count using TanStack Query
  const { data: unreadCountData, isLoading: unreadCountLoading, error: unreadCountError, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: createQueryFn(() => notificationApi.getUnreadCount()),
    staleTime: 30000, // 30 seconds
  });

  // Extract data from responses
  const notifications = useMemo(() => {
    if (!notificationsData) return [];
    return notificationsData.notifications || [];
  }, [notificationsData]);

  const unreadCount = useMemo(() => {
    if (!unreadCountData) return 0;
    return unreadCountData.count || 0;
  }, [unreadCountData]);

  // Real-time listeners that sync with TanStack Query cache
  useEffect(() => {
    if (!connected || !socket) return;

    const handleNewNotification = (data) => {
      // Update notifications cache
      queryClient.setQueryData(['notifications', 'all'], (oldData) => {
        if (!oldData) return { notifications: [data.notification] };
        const exists = oldData.notifications?.some(n => n._id === data.notification._id);
        if (exists) return oldData;
        return {
          ...oldData,
          notifications: [data.notification, ...(oldData.notifications || [])],
        };
      });
      
      // Update unread count cache
      queryClient.setQueryData(['notifications', 'unread-count'], (oldData) => {
        return { count: (oldData?.count || 0) + 1 };
      });
    };

    const handleNotificationRead = (data) => {
      // Update notifications cache
      queryClient.setQueryData(['notifications', 'all'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          notifications: (oldData.notifications || []).map(n =>
            n._id === data.notificationId ? { ...n, isRead: true } : n
          ),
        };
      });
      
      // Update unread count cache
      queryClient.setQueryData(['notifications', 'unread-count'], (oldData) => {
        return { count: Math.max(0, (oldData?.count || 0) - 1) };
      });
    };

    const handleUnreadCountUpdate = (data) => {
      // Update unread count cache
      queryClient.setQueryData(['notifications', 'unread-count'], { count: data.count });
    };

    on?.('notification:new', handleNewNotification);
    on?.('notification:read', handleNotificationRead);
    on?.('notification:unread-count', handleUnreadCountUpdate);

    return () => {
      off?.('notification:new', handleNewNotification);
      off?.('notification:read', handleNotificationRead);
      off?.('notification:unread-count', handleUnreadCountUpdate);
    };
  }, [connected, socket, on, off, queryClient]);

  // Manual update functions for backward compatibility
  const setNotifications = (newNotifications) => {
    queryClient.setQueryData(['notifications', 'all'], { notifications: newNotifications });
  };

  const setUnreadCount = (count) => {
    queryClient.setQueryData(['notifications', 'unread-count'], { count });
  };

  return {
    notifications,
    unreadCount,
    loading: notificationsLoading || unreadCountLoading,
    error: notificationsError || unreadCountError,
    setNotifications,
    setUnreadCount,
    fetchNotifications: refetchNotifications,
    fetchUnreadCount: refetchUnreadCount,
  };
};

export default useNotifications;
