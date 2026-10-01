import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

import { queryClient } from '@/lib/queryClient';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.user?.id !== session?.user?.id) {
        queryClient.clear();
      }
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { resetSubscriptionCache } = await import('./useSubscription');
      resetSubscriptionCache();
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem('recall_pro_status');
      await supabase.auth.signOut();
      queryClient.clear();
    } catch (e) {
      console.warn('[useAuth] signOut error:', e);
    } finally {
      queryClient.clear();
      try {
        router.replace('/(auth)/login');
      } catch (e) {
        console.warn('[useAuth] navigation error on signOut:', e);
      }
    }
  };

  return { session, loading, signOut };
}
