import { useEffect, useState } from 'react';
import { Stack, DefaultTheme, ThemeProvider, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useShareIntentHandler } from '@/hooks/useShareIntentHandler';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import '../global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = 'recall_onboarding_complete';

function ShareIntentOverlay() {
  const { isShareProcessing, shareMessage, shareSuccess } = useShareIntentHandler();
  useSupabaseRealtime();

  if (!isShareProcessing) return null;

  return (
    <View style={StyleSheet.absoluteFill} className="bg-[#F7F6FC] items-center justify-center z-50">
      <Animated.View
        entering={ZoomIn.duration(300)}
        exiting={ZoomOut.duration(200)}
        style={styles.shareOverlayCard}
        className="bg-white border border-[#EDEAF7] items-center justify-center"
      >
        <View
          style={[
            styles.shareCheckmarkCircle,
            { backgroundColor: shareSuccess ? '#7B6CF6' : '#EFEDFB' }
          ]}
        >
          {shareSuccess ? (
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          ) : (
            <Ionicons name="sparkles" size={28} color="#7B6CF6" />
          )}
        </View>
        <Text
          style={{ fontFamily: 'Outfit_700Bold' }}
          className="text-xl font-bold text-[#1A1A2E] text-center mb-2"
        >
          {shareMessage}
        </Text>
        {shareSuccess && (
          <Text
            style={{ fontFamily: 'Outfit_500Medium' }}
            className="text-sm font-medium text-[#9090A8] text-center px-2"
          >
            We'll organize it in the background.
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

import { scheduleRandomMemoryNudges } from '@/lib/notifications';
import { handleOAuthRedirectUrl } from '@/lib/authHelper';
import * as Linking from 'expo-linking';

function InnerApp({ loaded }: { loaded: boolean }) {
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    // Schedule spontaneous memory notification whenever app is opened
    scheduleRandomMemoryNudges();

    // Listen for OAuth deep link callbacks
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url && (event.url.includes('code=') || event.url.includes('access_token='))) {
        handleOAuthRedirectUrl(event.url);
      }
    });

    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('code=') || url.includes('access_token='))) {
        handleOAuthRedirectUrl(url);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (lastNotificationResponse) {
      const data = lastNotificationResponse.notification.request.content.data;
      if (data?.insightId) {
        // Deep link directly to the specific memory if it was a surprise nudge
        router.push(`/insight/${data.insightId}` as any);
      } else {
        // Default to digest
        router.push('/(tabs)');
      }
    }
  }, [lastNotificationResponse]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen 
          name="paywall" 
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }} 
        />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="insight/[id]" />
      </Stack>

      {/* Frictionless Apple-style Share Overlay */}
      <ShareIntentOverlay />

      {/* Hallow-inspired entrance loading animation */}
      <AppLoadingScreen />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    JetBrainsMono_400Regular,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    SplashScreen.hideAsync();
  }, [loaded]);

  return (
    <QueryClientProvider client={queryClient}>
      <InnerApp loaded={loaded} />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  shareOverlayCard: {
    width: 260,
    padding: 28,
    borderRadius: 28,
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  shareCheckmarkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});

