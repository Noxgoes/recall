import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '@/hooks/useSubscription';

export default function Index() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  
  const { isPro, isLoading: isSubscriptionLoading } = useSubscription();

  useEffect(() => {
    const checkState = async () => {
      // 1. Check Session
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      
      // 2. Check Onboarding for this specific user
      const { isOnboardingCompleted } = await import('@/lib/onboardingHelper');
      const onboarded = await isOnboardingCompleted(session?.user?.id);
      setHasCompletedOnboarding(onboarded);
      
      setSessionChecked(true);
    };
    checkState();
  }, []);

  if (!sessionChecked || (hasSession && isSubscriptionLoading)) {
    return (
      <View className="flex-1 bg-[#0F0E17] items-center justify-center">
        <ActivityIndicator size="large" color="#7B6CF6" />
      </View>
    );
  }

  // Not logged in -> go to auth
  if (!hasSession) {
    return <Redirect href="/(auth)/signup" />;
  }

  // Logged in, but didn't finish onboarding -> go to onboarding
  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  // Fully authenticated and onboarded -> go to main app
  return <Redirect href="/(tabs)" />;
}

