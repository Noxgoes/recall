import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface ShimmerProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Shimmer({ style, className }: ShimmerProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 750, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View className={className} style={[styles.base, style, animatedStyle]} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#EDEAF9',
    borderRadius: 8,
  },
});
