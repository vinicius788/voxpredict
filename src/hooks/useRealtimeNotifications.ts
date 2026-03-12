import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type RealtimeNotification = {
  title?: string;
  message?: string;
  type?: string;
};

export const useRealtimeNotifications = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          const notification = payload.new as RealtimeNotification;
          if (!notification?.title) return;

          if (notification.type === 'WIN') {
            toast.success(notification.title);
            return;
          }
          if (notification.type === 'LOSS') {
            toast.error(notification.title);
            return;
          }
          toast(notification.title);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
};

