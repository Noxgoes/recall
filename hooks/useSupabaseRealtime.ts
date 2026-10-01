import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { queryKeys } from '@/lib/queryKeys';
import { sendLocalNotification } from '@/lib/notifications';

export function useSupabaseRealtime() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    console.log(`[Realtime] Subscribing to insights for user: ${userId}`);

    const channel = supabase
      .channel(`insights-realtime-channel-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'insights',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log(`[Realtime] Change detected: ${payload.eventType}`, (payload.new as any)?.id);

          // Force local React Query cache invalidation
          queryClient.invalidateQueries({ queryKey: queryKeys.insights(userId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.today(userId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.stats(userId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.dueReviews(userId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.insightItems(userId) });

          // Send local alert when a pending/processing link becomes ready
          if (
            payload.eventType === 'UPDATE' &&
            payload.new?.status === 'ready' &&
            (payload.old?.status === 'processing' || payload.old?.status === 'pending')
          ) {
            console.log('[Realtime] Insight processed successfully. Triggering notification.');
            const title = payload.new.title || 'Your memory';
            
            // Count insights if available in payload
            const count = payload.new.ai_insights ? payload.new.ai_insights.length : 0;
            const countStr = count > 0 ? `into ${count} actionable insights` : 'successfully';

            sendLocalNotification(
              '✨ Your memory is ready',
              `We turned your link "${title}" ${countStr}.`,
              { insightId: payload.new.id }
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[Realtime] Unsubscribing from insights realtime channel');
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);
}
