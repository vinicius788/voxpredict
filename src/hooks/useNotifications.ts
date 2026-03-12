import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, request } from '../lib/api-client';

type ApiNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  timestamp: Date;
  read: boolean;
}

export const useNotifications = (enabled = true) => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    enabled,
    queryFn: async () => {
      const response = await api.getNotifications();
      const raw = (response.data || response) as ApiNotification[];
      return raw.map(
        (item): Notification => ({
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          read: item.read,
          timestamp: new Date(item.createdAt),
        }),
      );
    },
    staleTime: 30_000,
    refetchInterval: 45_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => request(`/api/notifications/${id}/read`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = notificationsQuery.data || [];
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    addNotification: () => {
      // Notifications are server-driven in the real data flow.
    },
    markAsRead: (id: string) => markReadMutation.mutate(id),
    markAllAsRead: () => markAllReadMutation.mutate(),
  };
};
