import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  runOnJS,
  useReducedMotion,
  ZoomIn,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface AppLoadingScreenProps {
  onFinish?: () => void;
  versionText?: string;
  durationMs?: number;
}

export function AppLoadingScreen({
  onFinish,
  versionText = 'Recall • Your AI Insight Library',
  durationMs = 2400,
}: AppLoadingScreenProps) {
  const reducedMotion = useReducedMotion();
  const [isFinished, setIsFinished] = useState(false);

  // Animation values
  const progress = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.9);
  const taglineOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      if (onFinish) onFinish();
      setIsFinished(true);
      return;
    }

    // 1. Entrance: Logo spring scale & fade in
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 120 });

    // 2. Glow breathing loop
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // 3. Tagline reveal
    taglineOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

    // 4. Progress bar fill
    progress.value = withTiming(1, { duration: durationMs - 400, easing: Easing.out(Easing.quad) });

    // 5. Smooth luxury exit dissolve
    const exitTimer = setTimeout(() => {
      screenOpacity.value = withTiming(
        0,
        { duration: 450, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) {
            if (onFinish) runOnJS(onFinish)();
            runOnJS(setIsFinished)(true);
          }
        }
      );
    }, durationMs - 450);

    return () => clearTimeout(exitTimer);
  }, [durationMs, onFinish, reducedMotion]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const taglineAnimStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (isFinished) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.container, containerAnimStyle]}
    >
      <StatusBar style="light" />

      {/* Dynamic Background Glowing Orbs */}
      <Animated.View style={[styles.glowOrb, glowAnimStyle]} />
      <View style={styles.glowOrbSecondary} />

      {/* Main Content Group */}
      <View className="items-center justify-center">
        {/* Brand Icon Badge */}
        <Animated.View style={[styles.logoWrapper, logoAnimStyle]}>
          <View style={styles.glassBadge}>
            <Ionicons name="sparkles" size={38} color="#7B6CF6" />
          </View>
        </Animated.View>

        {/* Brand Title */}
        <Animated.Text style={[styles.brandTitle, logoAnimStyle]}>
          Recall
        </Animated.Text>

        {/* Dynamic Micro Tagline */}
        <Animated.Text style={[styles.tagline, taglineAnimStyle]}>
          Your Personal Insight Library
        </Animated.Text>
      </View>

      {/* Bottom Sleek Loading Bar & Version Footer */}
      <View style={styles.bottomFooter}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
        </View>
        <Text style={styles.versionText}>{versionText}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F0E17',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(123, 108, 246, 0.35)',
    top: height * 0.35,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    top: height * 0.32,
  },
  logoWrapper: {
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 16,
    marginBottom: 20,
  },
  glassBadge: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  brandTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: '#A0A0C0',
    marginTop: 6,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 54,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 48,
  },
  progressBarTrack: {
    width: 120,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7B6CF6',
    borderRadius: 2,
  },
  versionText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.4,
  },
});

