/**
 * Onboarding flow — testing version (single file, all screens).
 * Screens 1–2: image slides. Screen 3: interactive pain-point selector.
 * Add more screens to SCREENS array below.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  FlatList,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  requestNotificationPermission,
  scheduleDailyDigest,
  parseTimeStringToHourMinute,
} from '../../lib/notifications';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────
// SCREENS config
// ─────────────────────────────────────────────────────────────────
const SCREENS = [
  {
    id: 'hook',
    type: 'image',
    image: require('../../assets/images/onboarding_1.png'),
    headline: "You've seen",
    headlinePurple: 'thousands of\ngreat ideas.',
    subtitle: 'Most of them are\nalready gone.',
    fullBleed: true,
  },
  {
    id: 'philosophy',
    type: 'image',
    image: require('../../assets/images/onboarding_2.png'),
    headline: 'Nothing worth learning\nshould be',
    headlinePurple: 'forgotten.',
    subtitle: 'Videos, articles, podcasts and posts become lasting memories you can always come back to.',
    fullBleed: false,
  },
  {
    id: 'curiosity',
    type: 'curiosity',
    image: require('../../assets/images/ob3_mascot_curiosity.png'),
    headline: 'What sparks\nyour ',
    headlinePurple: 'curiosity?',
    subtitle: "Choose a few topics you'd love to remember more about. We'll personalize your library around them.",
    topics: [
      { id: 'productivity', label: 'Productivity', icon: 'bulb-outline' as const },
      { id: 'business', label: 'Business', icon: 'briefcase-outline' as const },
      { id: 'psychology', label: 'Psychology', icon: 'pulse-outline' as const },
      { id: 'technology', label: 'Technology', icon: 'desktop-outline' as const },
      { id: 'design', label: 'Design', icon: 'color-palette-outline' as const },
      { id: 'finance', label: 'Finance', icon: 'trending-up-outline' as const },
      { id: 'fitness', label: 'Fitness', icon: 'barbell-outline' as const },
      { id: 'programming', label: 'Programming', icon: 'code-slash-outline' as const },
      { id: 'books', label: 'Books', icon: 'book-outline' as const },
      { id: 'self-improvement', label: 'Self Improvement', icon: 'sparkles-outline' as const },
      { id: 'science', label: 'Science', icon: 'flask-outline' as const },
      { id: 'world', label: 'World', icon: 'globe-outline' as const },
    ],
  },
  {
    id: 'save-ways',
    type: 'save-ways',
    image: require('../../assets/images/ob4_mascot_writing.png'),
    headline: 'How do you usually\nsave great ideas?',
    subtitle: 'Choose everything that sounds like you.',
    options: [
      { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark-outline' as const, fullWidth: false },
      { id: 'screenshots', label: 'Screenshots', icon: 'image-outline' as const, fullWidth: false },
      { id: 'notes', label: 'Notes', icon: 'document-text-outline' as const, fullWidth: false },
      { id: 'liked', label: 'Liked Posts', icon: 'heart-outline' as const, fullWidth: false },
      { id: 'tabs', label: 'Open Tabs', icon: 'browsers-outline' as const, fullWidth: false },
      { id: 'memory', label: 'I just try to remember', icon: 'bulb-outline' as const, fullWidth: false },
    ],
  },
  {
    id: 'save-first-memory',
    type: 'save-first-memory',
    headline: 'Save your first',
    headlinePurple: 'memory.',
    subtitle: 'Paste anything worth remembering.',
    supportedSources: [
      { name: 'YouTube', icon: 'logo-youtube' as const, color: '#FF0000' },
      { name: 'Instagram', icon: 'logo-instagram' as const, color: '#E1306C' },
      { name: 'X', icon: 'logo-twitter' as const, color: '#000000' },
      { name: 'Articles', icon: 'document-text-outline' as const, color: '#6C5CE7' },
      { name: 'Podcasts', icon: 'mic-outline' as const, color: '#00B894' },
      { name: 'PDFs', icon: 'document-attach-outline' as const, color: '#D63031' },
    ],
  },
  {
    id: 'memory-ready',
    type: 'memory-ready',
    headline: 'Your first memory',
    headlinePurple: 'is ready.',
    subtitle: 'Everything important has been captured for you.',
    card: {
      source: 'YouTube',
      title: 'How to Build Better Habits',
      meta: 'YouTube • Saved just now',
      insights: [
        'Build systems instead of goals',
        'Identity shapes your behaviour',
        'Tiny habits compound over time',
        'Environment beats motivation',
        'Never miss twice',
      ],
      tags: ['Deep Work', 'Consistency', 'Productivity'],
    },
    features: [
      { icon: 'search-outline' as const, text: 'Stored forever' },
      { icon: 'folder-open-outline' as const, text: 'Searchable' },
      { icon: 'git-network-outline' as const, text: 'Organized automatically' },
      { icon: 'share-social-outline' as const, text: 'Connected to related ideas' },
      { icon: 'calendar-outline' as const, text: 'Will appear in Daily Recall' },
    ],
    footer: 'One less thing to remember.\nRecall will.',
  },
  {
    id: 'reminder-time',
    type: 'reminder-time',
    headline: 'When should we',
    headlinePurple: 'remind you?',
    subtitle: 'Pick a time that works for you. We’ll send a daily nudge to revisit what you’ve saved, so it sticks.',
  },
  {
    id: 'daily-review-intro',
    type: 'daily-review-intro',
    headline: 'Tomorrow starts with',
    headlinePurple: 'what matters.',
    subtitle: 'Every morning, Recall brings back the things you\'ve saved—making it effortless to revisit your ideas, strengthen your memory, and keep learning over time.',
  },
] as const;

// ─────────────────────────────────────────────────────────────────
// Image slide component
// ─────────────────────────────────────────────────────────────────
function ImageSlide({ item }: { item: typeof SCREENS[0] & { type: 'image' } }) {
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(14);
  const subtitleOpacity = useSharedValue(0);
  const imageOpacity = useSharedValue(0);
  const imageY = useSharedValue(18);
  const floatY = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withDelay(80, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    titleY.value = withDelay(80, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    imageOpacity.value = withDelay(150, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    imageY.value = withDelay(150, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
  }, []);

  const titleAnim = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleY.value }] }));
  const subtitleAnim = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const imageAnim = useAnimatedStyle(() => ({ opacity: imageOpacity.value, transform: [{ translateY: imageY.value + floatY.value }] }));

  return (
    <View style={styles.slide}>
      <View style={styles.textBlock}>
        <Animated.Text style={[styles.headline, titleAnim]}>
          {item.headline + '\n'}
          <Text style={styles.headlinePurple}>{item.headlinePurple}</Text>
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, subtitleAnim]}>{item.subtitle}</Animated.Text>
      </View>
      <Animated.View style={[item.fullBleed ? styles.imageWrapFull : styles.imageWrapStd, imageAnim]}>
        <Image source={item.image} style={item.fullBleed ? styles.mascotFull : styles.mascotStd} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Curiosity Topic Selection slide — Screen 3
// ─────────────────────────────────────────────────────────────────

// Individual animated topic chip
function TopicChip({
  topic,
  isOn,
  onPress,
  index,
}: {
  topic: { id: string; label: string; icon: string };
  isOn: boolean;
  onPress: () => void;
  index: number;
}) {
  // Staggered entrance
  const entryOpacity = useSharedValue(0);
  const entryY = useSharedValue(10);
  useEffect(() => {
    const delay = 180 + index * 40;
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    entryY.value = withDelay(delay, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, []);

  // Press spring scale
  const pressScale = useSharedValue(1);

  // Checkmark opacity/scale spring
  const checkOpacity = useSharedValue(isOn ? 1 : 0);
  const checkScale = useSharedValue(isOn ? 1 : 0.4);

  useEffect(() => {
    checkOpacity.value = withSpring(isOn ? 1 : 0, { damping: 18, stiffness: 260 });
    checkScale.value = withSpring(isOn ? 1 : 0.4, { damping: 16, stiffness: 280 });
  }, [isOn]);

  const chipAnim = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryY.value }, { scale: pressScale.value }],
  }));

  const checkAnim = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };
  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 12, stiffness: 350 });
  };

  return (
    <Animated.View style={[styles.topicCardWrap, chipAnim]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.topicCard, isOn && styles.topicCardSelected]}
      >
        <View style={[styles.topicIconBubble, isOn && styles.topicIconBubbleOn]}>
          <Ionicons
            name={topic.icon as any}
            size={16}
            color={isOn ? '#7B6CF6' : '#9B96B8'}
          />
        </View>
        <Text style={[styles.topicLabelText, isOn && styles.topicLabelTextOn]} numberOfLines={1}>
          {topic.label}
        </Text>
        <Animated.View style={[styles.topicCheckCircle, checkAnim]}>
          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CuriositySlide({
  item,
  onNext,
}: {
  item: typeof SCREENS[2];
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['productivity', 'technology', 'programming']));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Header entrance
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(14);
  useEffect(() => {
    headerOpacity.value = withDelay(40, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    headerY.value = withDelay(40, withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, []);
  const headerAnim = useAnimatedStyle(() => ({ opacity: headerOpacity.value, transform: [{ translateY: headerY.value }] }));

  // Button fade-in once any topic is selected
  const btnOpacity = useSharedValue(selected.size > 0 ? 1 : 0);
  const btnY = useSharedValue(selected.size > 0 ? 0 : 12);
  useEffect(() => {
    btnOpacity.value = withTiming(selected.size > 0 ? 1 : 0, { duration: 280 });
    btnY.value = withTiming(selected.size > 0 ? 0 : 12, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [selected.size]);
  const btnAnim = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }],
  }));

  const insets = useSafeAreaInsets();
  const btnBottom = Math.max(insets.bottom, 20) + 8;
  const bottomClearance = btnBottom + 80;

  return (
    <View style={styles.slide}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.interactiveScroll, { paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Mascot */}
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, headerAnim]}>
          <Image
            source={item.image}
            style={styles.mascotCuriosityS3}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Left-aligned Headline + Subtitle */}
        <Animated.View style={[styles.textBlockLeft, headerAnim]}>
          <Text style={styles.headlineLeft}>
            {item.headline}
            <Text style={styles.headlinePurple}>{item.headlinePurple}</Text>
          </Text>
          <Text style={styles.subtitleLeft}>{item.subtitle}</Text>
        </Animated.View>

        {/* Grid of Topics (2 columns) */}
        <View style={styles.topicsGrid}>
          {item.topics.map((topic, index) => (
            <TopicChip
              key={topic.id}
              topic={topic}
              isOn={selected.has(topic.id)}
              onPress={() => toggle(topic.id)}
              index={index}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Continue button */}
      <Animated.View
        style={[
          styles.btnWrap,
          { bottom: btnBottom },
          btnAnim,
        ]}
        pointerEvents={selected.size > 0 ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={onNext}>
          <Text style={styles.btnText}>Continue</Text>
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={18} color="#6C5CE7" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Save Ways slide — Screen 4
// ─────────────────────────────────────────────────────────────────

// Mascot Orbit Illustration Component
function MascotOrbitIllustration() {
  const theta = useSharedValue(0);
  const mascotFloatY = useSharedValue(0);

  useEffect(() => {
    // 30 seconds orbit cycle
    theta.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 30000, easing: Easing.linear }),
      -1,
      false
    );
    // 2.2 seconds floating cycle
    mascotFloatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const mascotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotFloatY.value }],
  }));

  const R_X = 90; // horizontal radius
  const R_Y = 55; // vertical radius to create premium tilted orbit

  const orbitBadges = [
    { name: 'play-outline', key: 0 },
    { name: 'camera-outline', key: 1 },
    { name: 'logo-twitter', key: 2 },
    { name: 'mic-outline', key: 3 },
    { name: 'document-text-outline', key: 4 },
    { name: 'book-outline', key: 5 },
  ];

  return (
    <View style={styles.orbitContainer}>
      {/* Orbiting Platforms */}
      {orbitBadges.map((badge, i) => {
        const angleOffset = (i * 2 * Math.PI) / 6;

        const badgeAnimStyle = useAnimatedStyle(() => {
          const currentAngle = theta.value + angleOffset;
          const x = R_X * Math.cos(currentAngle);
          const y = R_Y * Math.sin(currentAngle);
          const floatVal = 2.5 * Math.sin(theta.value * 8 + angleOffset); // organic floating motion

          return {
            transform: [
              { translateX: x },
              { translateY: y + floatVal }
            ],
          };
        });

        return (
          <Animated.View key={badge.key} style={[styles.orbitBadge, badgeAnimStyle]}>
            <Ionicons name={badge.name as any} size={14} color="#7A6BFF" />
          </Animated.View>
        );
      })}
    </View>
  );
}

// Individual animated save-way chip (mirrors TopicChip exactly)
function SaveWayChip({
  option,
  isOn,
  onPress,
  index,
}: {
  option: { id: string; label: string; icon: string };
  isOn: boolean;
  onPress: () => void;
  index: number;
}) {
  // Staggered entrance
  const entryOpacity = useSharedValue(0);
  const entryY = useSharedValue(10);
  useEffect(() => {
    const delay = 180 + index * 40;
    entryOpacity.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    entryY.value = withDelay(delay, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, []);

  // Press spring scale
  const pressScale = useSharedValue(1);

  // Selection states
  const selectionProgress = useSharedValue(isOn ? 1 : 0);
  useEffect(() => {
    selectionProgress.value = withTiming(isOn ? 1 : 0, { duration: 200 });
  }, [isOn]);

  const chipAnim = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [
      { translateY: entryY.value },
      { scale: pressScale.value }
    ],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: isOn ? '#F0EDFF' : '#FFFFFF',
    borderColor: isOn ? '#7A6BFF' : '#F0EBF8',
  }));

  const iconScaleVal = useSharedValue(isOn ? 1.05 : 1);
  useEffect(() => {
    iconScaleVal.value = withTiming(isOn ? 1.05 : 1, { duration: 180 });
  }, [isOn]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScaleVal.value }],
  }));

  const checkAnimStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
    transform: [{ scale: selectionProgress.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };
  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 12, stiffness: 350 });
  };

  return (
    <Animated.View style={[styles.saveWayChipWrap, chipAnim]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ width: '100%' }}
      >
        <Animated.View style={[styles.saveWayCard, cardAnimStyle]}>
          <View style={styles.saveWayIconWrap}>
            <Animated.View style={[styles.saveWayIconBubble, isOn && styles.saveWayIconBubbleOn, iconAnimStyle]}>
              <Ionicons
                name={option.icon as any}
                size={16}
                color={isOn ? '#7A6BFF' : '#9B96B8'}
              />
            </Animated.View>
          </View>
          <Text style={[styles.saveWayLabelInner, isOn && styles.topicLabelTextOn]}>
            {option.label}
          </Text>
          <Animated.View style={[styles.saveWayCheckAbsolute, checkAnimStyle]}>
            <Ionicons name="checkmark-circle" size={14} color="#7A6BFF" />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SaveWaysSlide({
  item,
  onNext,
}: {
  item: typeof SCREENS[3];
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasSelection = selected.size > 0;

  // Header entrance
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(14);
  useEffect(() => {
    headerOpacity.value = withDelay(40, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    headerY.value = withDelay(40, withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, []);
  const headerAnim = useAnimatedStyle(() => ({ opacity: headerOpacity.value, transform: [{ translateY: headerY.value }] }));

  // Footer card — grainy/static → clear reveal
  const cardOpacity = useSharedValue(0);
  const grainScale = useSharedValue(1.015); // very subtle scale blur feel

  // Continue button
  const btnOpacity = useSharedValue(0);
  const btnY = useSharedValue(14);

  useEffect(() => {
    if (hasSelection) {
      // Rapid grain flicker: quick low-opacity flashes simulating static noise,
      // then resolves cleanly into full opacity
      cardOpacity.value = withSequence(
        // static/grain phase — rapid flickers between 0.08 and 0.35
        withTiming(0.12, { duration: 55 }),
        withTiming(0.28, { duration: 45 }),
        withTiming(0.10, { duration: 55 }),
        withTiming(0.38, { duration: 40 }),
        withTiming(0.15, { duration: 50 }),
        withTiming(0.42, { duration: 45 }),
        withTiming(0.20, { duration: 55 }),
        withTiming(0.50, { duration: 40 }),
        withTiming(0.30, { duration: 50 }),
        withTiming(0.60, { duration: 45 }),
        withTiming(0.45, { duration: 40 }),
        withTiming(0.75, { duration: 50 }),
        // resolves into clean full visibility
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      );
      grainScale.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
      // Button fades in softly after grain settles
      btnOpacity.value = withDelay(550, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
      btnY.value = withDelay(550, withSpring(0, { damping: 20, stiffness: 160 }));
    } else {
      cardOpacity.value = withTiming(0, { duration: 180 });
      grainScale.value = withTiming(1.015, { duration: 180 });
      btnOpacity.value = withTiming(0, { duration: 120 });
      btnY.value = withTiming(14, { duration: 120 });
    }
  }, [hasSelection]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: grainScale.value }],
  }));

  const btnAnim = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }],
  }));

  const insets = useSafeAreaInsets();
  const btnBottom = Math.max(insets.bottom, 20) + 8;
  const bottomClearance = btnBottom + 90;

  return (
    <View style={styles.slide}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.interactiveScroll, { paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >

        {/* Mascot */}
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, headerAnim]}>
          <Image
            source={require('../../assets/images/ob4_mascot_writing.png')}
            style={styles.ob4_mascot_writing}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Left-aligned Headline + Subtitle */}
        <Animated.View style={[styles.textBlockLeft, headerAnim]}>
          <Text style={styles.headlineLeft}>
            {item.headline}
          </Text>
          <Text style={styles.subtitleLeft}>{item.subtitle}</Text>
        </Animated.View>

        {/* Options Grid */}
        <View style={styles.saveWaysGrid}>
          {item.options.map((opt, index) => (
            <SaveWayChip
              key={opt.id}
              option={opt}
              isOn={selected.has(opt.id)}
              onPress={() => toggle(opt.id)}
              index={index}
            />
          ))}
        </View>

        {/* Dynamic message — fades in after selection, card style */}
        <Animated.View style={[styles.dynamicFooterCard, { marginTop: 20 }, cardAnimatedStyle]}>
          <View style={styles.footerHomeIconBox}>
            <Ionicons name="home-outline" size={20} color="#7A6BFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerCardTitle}>Recall brings all of these together.</Text>
            <Text style={styles.footerCardDesc}>
              One memory library for everything worth keeping.
            </Text>
          </View>
        </Animated.View>

        {/* Continue button — below the card, in layout flow */}
        <Animated.View style={[{ marginTop: 16 }, btnAnim]} pointerEvents={hasSelection ? 'auto' : 'none'}>
          <TouchableOpacity style={styles.saveWaysBtn} activeOpacity={0.85} onPress={onNext}>
            <Text style={styles.saveWaysBtnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// Interactive first link slide — Screen 4
// ─────────────────────────────────────────────────────────────────
function SaveMemorySlide({
  item,
  onNext,
}: {
  item: typeof SCREENS[4];
  onNext: (url: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageText, setStageText] = useState('Analyzing...');
  const canSubmit = url.trim().length > 0;

  const handlePaste = () => {
    setUrl('https://youtube.com/shorts/503_942_memory_management');
  };

  const handleExample = () => {
    setUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  };

  // Reanimated shared values
  const animFade = useSharedValue(0);
  const animSlideY = useSharedValue(12);

  // Stage timeline values
  const btnScale = useSharedValue(1);
  const uiOpacity = useSharedValue(1);
  const morphProgress = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const sparklesRotation = useSharedValue(0);

  // Floating Memory Particles / Insight Cards
  const p1Opacity = useSharedValue(0);
  const p1Y = useSharedValue(0);

  const p2Opacity = useSharedValue(0);
  const p2Y = useSharedValue(0);

  const p3Opacity = useSharedValue(0);
  const p3Y = useSharedValue(0);

  useEffect(() => {
    animFade.value = withDelay(80, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    animSlideY.value = withDelay(80, withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }));
  }, []);

  const handleCreateMemory = () => {
    if (!canSubmit || isProcessing) return;

    // Soft haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsProcessing(true);

    // 0 – 200 ms: Button press scale & soft UI fade
    btnScale.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withTiming(1.0, { duration: 100 })
    );
    uiOpacity.value = withTiming(0.9, { duration: 200 });

    // 200 – 500 ms: Card morph into Analyzing card & lavender pulse
    morphProgress.value = withDelay(200, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    progressWidth.value = withDelay(200, withTiming(0.35, { duration: 300, easing: Easing.out(Easing.cubic) }));

    pulseScale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.8, { duration: 900, easing: Easing.out(Easing.quad) }),
          withTiming(1.0, { duration: 0 })
        ),
        -1,
        false
      )
    );
    pulseOpacity.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: 900, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      )
    );

    sparklesRotation.value = withRepeat(
      withTiming(360, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );

    // 500 – 1200 ms: Progress fills to 80%, floating particles emerge as tiny insight cards
    progressWidth.value = withDelay(500, withTiming(0.8, { duration: 700, easing: Easing.out(Easing.quad) }));

    // Particle 1: "Build systems"
    p1Opacity.value = withDelay(500, withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 320 }),
      withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) })
    ));
    p1Y.value = withDelay(500, withTiming(-65, { duration: 700, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));

    // Particle 2: "Reduce friction"
    p2Opacity.value = withDelay(650, withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 320 }),
      withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) })
    ));
    p2Y.value = withDelay(650, withTiming(-75, { duration: 700, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));

    // Particle 3: "Identity drives habits"
    p3Opacity.value = withDelay(800, withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 320 }),
      withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) })
    ));
    p3Y.value = withDelay(800, withTiming(-60, { duration: 700, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));

    // 1200 ms: Title changes to "Memory Ready" with medium haptic
    setTimeout(() => {
      setStageText('Memory Ready');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 1200);

    // 1200 – 1700 ms: Progress 100%, Card grows ~3%, soft lavender glow behind
    progressWidth.value = withDelay(1200, withTiming(1.0, { duration: 400, easing: Easing.out(Easing.cubic) }));
    cardScale.value = withDelay(1200, withTiming(1.03, { duration: 400, easing: Easing.out(Easing.cubic) }));
    glowOpacity.value = withDelay(1200, withSequence(
      withTiming(0.4, { duration: 300 }),
      withTiming(0.18, { duration: 400 })
    ));

    // 1700 – 2000 ms: Crossfade into completed Memory screen
    setTimeout(async () => {
      try {
        await AsyncStorage.setItem('pending_onboarding_url', url);
        const { saveOnboardingSampleMemory } = await import('../../lib/onboardingHelper');
        await saveOnboardingSampleMemory(undefined, url);
      } catch (e) {
        console.warn('Failed to save pending url', e);
      }
      onNext(url);
    }, 1950);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animFade.value * uiOpacity.value,
    transform: [{ translateY: animSlideY.value }],
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const sparklesAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparklesRotation.value}deg` }],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  // Particles Animated Styles
  const p1Style = useAnimatedStyle(() => ({
    opacity: p1Opacity.value,
    transform: [{ translateY: p1Y.value }, { translateX: -30 }],
  }));

  const p2Style = useAnimatedStyle(() => ({
    opacity: p2Opacity.value,
    transform: [{ translateY: p2Y.value }, { translateX: 25 }],
  }));

  const p3Style = useAnimatedStyle(() => ({
    opacity: p3Opacity.value,
    transform: [{ translateY: p3Y.value }, { translateX: -5 }],
  }));

  return (
    <View style={styles.slide}>
      <ScrollView
        contentContainerStyle={styles.interactiveScroll}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View style={[styles.textBlockInteractive, animatedStyle]}>
          <Text style={styles.headline}>
            {item.headline + '\n'}
            <Text style={styles.headlinePurple}>{item.headlinePurple}</Text>
          </Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </Animated.View>

        {/* Mascot peeking & card overlap */}
        <Animated.View style={[styles.mascotStackWrap, animatedStyle]}>
          {/* Peeking Mascot */}
          <Image
            source={require('../../assets/images/ob5_mascot_peeking.png')}
            style={styles.mascotPeeking}
            resizeMode="contain"
          />

          {/* Floating Insight Cards / Memory Particles */}
          <View style={styles.particlesContainer} pointerEvents="none">
            {/* Particle 1 */}
            <Animated.View style={[styles.particleCard, p1Style]}>
              <Ionicons name="sparkles" size={12} color="#7B6CF6" style={{ marginRight: 4 }} />
              <Text style={styles.particleText}>Build systems</Text>
            </Animated.View>

            {/* Particle 2 */}
            <Animated.View style={[styles.particleCard, p2Style]}>
              <Ionicons name="sparkles" size={12} color="#7B6CF6" style={{ marginRight: 4 }} />
              <Text style={styles.particleText}>Reduce friction</Text>
            </Animated.View>

            {/* Particle 3 */}
            <Animated.View style={[styles.particleCard, p3Style]}>
              <Ionicons name="sparkles" size={12} color="#7B6CF6" style={{ marginRight: 4 }} />
              <Text style={styles.particleText}>Identity drives habits</Text>
            </Animated.View>
          </View>

          {/* Lavender Glow Layer behind Card */}
          <Animated.View style={[styles.lavenderCardGlow, glowAnimStyle]} pointerEvents="none" />

          {/* Input / Morphing Card */}
          <Animated.View style={[styles.inputCard, cardAnimStyle, isProcessing && styles.inputCardProcessing]}>
            {/* Left Icon (Link / Lavender Pulse) */}
            <View style={styles.inputLeftIconWrap}>
              {isProcessing && (
                <Animated.View style={[styles.pulseRing, pulseAnimStyle]} />
              )}
              {isProcessing ? (
                <Animated.View style={sparklesAnimStyle}>
                  <Ionicons name="sparkles" size={18} color="#7B6CF6" />
                </Animated.View>
              ) : (
                <Ionicons name="link" size={18} color="#7B6CF6" />
              )}
            </View>

            {/* Input or Analyzing Text */}
            {!isProcessing ? (
              <TextInput
                style={styles.urlInput}
                value={url}
                onChangeText={setUrl}
                placeholder="Paste a YouTube, Instagram, X, article, podcast or PDF link..."
                placeholderTextColor="#AFAAC0"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={styles.analyzingText}>{stageText}</Text>
                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                  <Animated.View style={[styles.progressBarFill, progressAnimStyle]} />
                </View>
              </View>
            )}

            {!isProcessing && (
              <TouchableOpacity
                style={styles.pasteBtn}
                activeOpacity={0.7}
                onPress={handlePaste}
              >
                <Text style={styles.pasteBtnText}>Paste</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>

        {/* Supported Sources */}
        <Animated.View style={[styles.sourcesSection, animatedStyle]}>
          <Text style={styles.sourcesTitle}>Supported sources</Text>
          <View style={styles.sourcesGrid}>
            {item.supportedSources.map((src, i) => (
              <View key={i} style={styles.sourceBox}>
                <View style={styles.sourceIconBox}>
                  <Ionicons name={src.icon} size={18} color="#7B6CF6" />
                </View>
                <Text style={styles.sourceLabel}>{src.name}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Try with example */}
        <Animated.View style={[styles.exampleSection, animatedStyle]}>
          <TouchableOpacity
            style={styles.exampleBtn}
            activeOpacity={0.8}
            onPress={handleExample}
            disabled={isProcessing}
          >
            <Ionicons name="sparkles-outline" size={14} color="#7B6CF6" style={{ marginRight: 6 }} />
            <Text style={styles.exampleBtnText}>Try with an example</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View style={[styles.createBtnWrap, animatedStyle, btnAnimStyle]}>
          <TouchableOpacity
            style={[styles.createBtn, canSubmit ? styles.createBtnActive : styles.createBtnDisabled]}
            activeOpacity={0.85}
            disabled={!canSubmit || isProcessing}
            onPress={handleCreateMemory}
          >
            <Text style={[styles.createBtnText, canSubmit ? styles.createBtnTextActive : styles.createBtnTextDisabled]}>
              {isProcessing ? "Processing Memory..." : "Create My Memory"}
            </Text>
            <Ionicons
              name={canSubmit ? "arrow-forward" : "lock-closed-outline"}
              size={18}
              color={canSubmit ? "#FFFFFF" : "#AFAAC0"}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Guard caption */}
        <Animated.View style={[styles.guardCaptionWrap, animatedStyle]}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#9090A8" style={{ marginRight: 4 }} />
          <Text style={styles.guardCaption}>
            Supports YouTube, Instagram, X, Articles, Podcasts and PDFs.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Memory Ready slide — Screen 5
// ─────────────────────────────────────────────────────────────────
function MemoryReadySlide({
  item,
  onNext,
  isActive,
}: {
  item: typeof SCREENS[5];
  onNext: () => void;
  isActive: boolean;
}) {
  const animFade = useSharedValue(0);
  const animSlideY = useSharedValue(12);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    animFade.value = withDelay(80, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    animSlideY.value = withDelay(80, withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }));

    async function loadSvg() {
      try {
        const asset = Asset.fromModule(require('../../assets/images/animated_lottie_checkamrk.svg'));
        await asset.downloadAsync();
        if (asset.localUri) {
          const content = await FileSystem.readAsStringAsync(asset.localUri);
          // Force SMIL animations to run once and freeze on the final frame (fill="freeze")
          const modifiedContent = content.replace(/repeatCount="indefinite"/g, 'repeatCount="1"');
          setSvgContent(modifiedContent);
        }
      } catch (e) {
        console.warn('Failed to load animated checkmark SVG:', e);
      }
    }
    loadSvg();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animFade.value,
    transform: [{ translateY: animSlideY.value }],
  }));

  const mascotAnimStyle = useAnimatedStyle(() => ({
    opacity: withDelay(250, withTiming(isActive ? 1 : 0, { duration: 600, easing: Easing.out(Easing.cubic) })),
    transform: [
      {
        translateX: withDelay(
          250,
          withTiming(isActive ? 0 : 60, { duration: 600, easing: Easing.out(Easing.cubic) })
        ),
      },
    ],
  }));

  return (
    <View style={styles.slide}>
      <ScrollView
        contentContainerStyle={styles.readyScroll}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header checkmark bubble & Text */}
        <Animated.View style={[styles.textBlockInteractive, animatedStyle, { alignItems: 'center' }]}>
          <View style={styles.checkmarkSphere}>
            {isActive && svgContent ? (
              <WebView
                key={isActive ? 'active' : 'inactive'}
                originWhitelist={['*']}
                scalesPageToFit={true}
                scrollEnabled={false}
                style={{ backgroundColor: 'transparent' }}
                containerStyle={{ backgroundColor: 'transparent' }}
                source={{
                  html: `
                    <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                        <style>
                          body, html {
                            margin: 0;
                            padding: 0;
                            width: 100%;
                            height: 100%;
                            overflow: hidden;
                            background-color: transparent;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          }
                          svg {
                            width: 100%;
                            height: 100%;
                          }
                        </style>
                      </head>
                      <body>
                        ${svgContent}
                      </body>
                    </html>
                  `
                }}
              />
            ) : (
              <ActivityIndicator size="small" color="#7B6CF6" style={{ flex: 1 }} />
            )}
          </View>
          <Text style={[styles.headline, { textAlign: 'center', marginTop: 12 }]}>
            {item.headline + '\n'}
            <Text style={styles.headlinePurple}>{item.headlinePurple}</Text>
          </Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>{item.subtitle}</Text>
        </Animated.View>

        {/* Mascot & Central Card Stack */}
        <Animated.View style={[styles.readyCardStack, animatedStyle]}>
          {/* Peeking Mascot holding bubble */}
          <Animated.Image
            source={require('../../assets/images/ob6_mascot_peeking.png')}
            style={[styles.mascotBubble, mascotAnimStyle]}
            resizeMode="contain"
          />

          {/* Central Mock Card */}
          <View style={styles.centralCard}>
            {/* Card Header: YouTube icon + Title + Memory Badge */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.ytIconBox}>
                <Ionicons name="logo-youtube" size={18} color="#FF0000" />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={styles.cardTitleText} numberOfLines={1}>
                  {item.card.title}
                </Text>
                <Text style={styles.cardMetaText}>{item.card.meta}</Text>
              </View>
              <View style={styles.badgeMemory}>
                <Ionicons name="bookmark" size={10} color="#7B6CF6" style={{ marginRight: 2 }} />
                <Text style={styles.badgeText}>Memory</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Insights Section */}
            <View style={styles.cardInsightsSection}>
              <View style={styles.insightsTitleRow}>
                <Ionicons name="sparkles" size={14} color="#7B6CF6" style={{ marginRight: 6 }} />
                <Text style={styles.insightsTitlePurple}>5 key insights</Text>
              </View>
              {item.card.insights.map((insight, idx) => (
                <View key={idx} style={styles.insightBulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.insightBulletText}>{insight}</Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Connected Related Ideas Section */}
            <View style={styles.connectedSection}>
              <View style={styles.connectedTitleRow}>
                <Ionicons name="link" size={14} color="#7B6CF6" style={{ marginRight: 6 }} />
                <Text style={styles.connectedTitleText}>Connected to related ideas</Text>
              </View>
              <View style={styles.tagsRow}>
                {item.card.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Features Checklist */}
        <Animated.View style={[styles.checklistSection, animatedStyle]}>
          {item.features.map((feature, idx) => {
            const isLastRow = idx === item.features.length - 1;
            const isPurpleText = feature.text === 'Will appear in Daily Recall';
            return (
              <View key={idx} style={[styles.checkRow, !isLastRow && styles.checkRowBorder]}>
                <View style={styles.checkIconBox}>
                  <Ionicons name={feature.icon} size={16} color="#7B6CF6" />
                </View>
                <Text style={[styles.checkLabel, isPurpleText && styles.checkLabelPurple]}>
                  {feature.text}
                </Text>
                <View style={styles.checkCircleActive}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Heart separator & Footer copy */}
        <Animated.View style={[styles.footerTextSection, animatedStyle]}>
          <Ionicons name="heart" size={18} color="#7B6CF6" style={{ marginBottom: 6 }} />
          <Text style={styles.footerHeadline}>
            One less thing to remember.
          </Text>
          <Text style={styles.footerHeadlineSub}>
            <Text style={{ fontFamily: 'Outfit_700Bold', textDecorationLine: 'underline' }}>Recall</Text> will.
          </Text>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View style={[styles.ctaButtonsWrap, animatedStyle]}>
          <TouchableOpacity
            style={styles.mainCtaBtn}
            activeOpacity={0.85}
            onPress={onNext}
          >
            <Text style={styles.mainCtaBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Reminder Picker slide — Screen 7
// ─────────────────────────────────────────────────────────────────
function ReminderTimeSlide({
  item,
  onNext,
  onBack,
}: {
  item: typeof SCREENS[6];
  onNext: () => void;
  onBack: () => void;
}) {
  const [selectedTimeOption, setSelectedTimeOption] = useState<'morning' | 'midday' | 'evening' | 'custom'>('morning');
  const [customTimeStr, setCustomTimeStr] = useState<string>('7:00 AM');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const animFade = useSharedValue(0);
  const animSlideY = useSharedValue(12);

  useEffect(() => {
    animFade.value = withDelay(80, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    animSlideY.value = withDelay(80, withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animFade.value,
    transform: [{ translateY: animSlideY.value }],
  }));

  const insets = useSafeAreaInsets();
  const bottomClearance = Math.max(insets.bottom, 20) + 30;

  const handleSetReminder = async () => {
    setIsSaving(true);
    try {
      let timeStr = '8:00 AM';
      if (selectedTimeOption === 'morning') timeStr = '8:00 AM';
      else if (selectedTimeOption === 'midday') timeStr = '12:00 PM';
      else if (selectedTimeOption === 'evening') timeStr = '8:00 PM';
      else if (selectedTimeOption === 'custom') timeStr = customTimeStr;

      const { hour, minute } = parseTimeStringToHourMinute(timeStr);

      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleDailyDigest(hour, minute);
      }

      await AsyncStorage.setItem('recall_reminder_time', timeStr);
      await AsyncStorage.setItem('recall_reminder_enabled', 'true');
    } catch (e) {
      console.warn('Could not save reminder preference:', e);
    } finally {
      setIsSaving(false);
      onNext();
    }
  };

  const handleSkip = () => {
    onNext();
  };

  return (
    <View style={styles.slide}>
      <ScrollView
        contentContainerStyle={[styles.readyScroll, { paddingBottom: bottomClearance, paddingHorizontal: 20 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Top Header Clock Mascot */}
        <Animated.View style={[animatedStyle, { width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 2 }]}>
          <Image
            source={require('../../assets/images/clock_mascot.png')}
            style={{ width: 175, height: 175, transform: [{ scale: 2 }], marginTop: 60, marginBottom: -90 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title & Subtitle */}
        <Animated.View style={[styles.textBlockCentered, animatedStyle, { paddingHorizontal: 10, marginTop: 8 }]}>
          <Text style={[styles.headlineCentered, { fontSize: 26, lineHeight: 32 }]}>
            When should we{'\n'}
            <Text style={styles.headlinePurple}>remind you?</Text>
          </Text>
          <Text style={[styles.subtitleCentered, { fontSize: 13, color: '#6A6A80', lineHeight: 18, marginTop: 6 }]}>
            Pick a time that works for you. We’ll send a daily nudge to revisit what you’ve saved, so it sticks.
          </Text>
        </Animated.View>

        {/* Reminder Options Stack */}
        <Animated.View style={[animatedStyle, { width: '100%', marginTop: 16, gap: 10 }]}>
          {/* 1. Morning Recall */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTimeOption('morning');
            }}
            style={[
              styles.reminderCardOption,
              selectedTimeOption === 'morning' ? styles.reminderCardActive : styles.reminderCardInactive,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={[styles.reminderIconBox, { backgroundColor: '#F1EBFF' }]}>
                <Ionicons name="partly-sunny" size={22} color="#7C5CFC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderCardTitle}>Morning Recall</Text>
                <Text style={styles.reminderCardSubtitle}>
                  Start your day with one thing you saved.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Ionicons name="time-outline" size={12} color="#7C5CFC" />
                  <Text style={[styles.reminderTimeText, { color: '#7C5CFC' }]}>8:00 AM</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={selectedTimeOption === 'morning' ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selectedTimeOption === 'morning' ? '#7C5CFC' : '#D1CBDD'}
            />
          </TouchableOpacity>

          {/* 2. Midday Refresh */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTimeOption('midday');
            }}
            style={[
              styles.reminderCardOption,
              selectedTimeOption === 'midday' ? styles.reminderCardActive : styles.reminderCardInactive,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={[styles.reminderIconBox, { backgroundColor: '#FFF7E6' }]}>
                <Ionicons name="sunny" size={22} color="#FFB800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderCardTitle}>Midday Refresh</Text>
                <Text style={styles.reminderCardSubtitle}>
                  A quick nudge to keep things fresh.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Ionicons name="time-outline" size={12} color="#6A6A80" />
                  <Text style={[styles.reminderTimeText, { color: '#6A6A80' }]}>12:00 PM</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={selectedTimeOption === 'midday' ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selectedTimeOption === 'midday' ? '#7C5CFC' : '#D1CBDD'}
            />
          </TouchableOpacity>

          {/* 3. Evening Reflection */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTimeOption('evening');
            }}
            style={[
              styles.reminderCardOption,
              selectedTimeOption === 'evening' ? styles.reminderCardActive : styles.reminderCardInactive,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={[styles.reminderIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="moon" size={20} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderCardTitle}>Evening Reflection</Text>
                <Text style={styles.reminderCardSubtitle}>
                  Lock in what you learned today.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Ionicons name="time-outline" size={12} color="#6A6A80" />
                  <Text style={[styles.reminderTimeText, { color: '#6A6A80' }]}>8:00 PM</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={selectedTimeOption === 'evening' ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selectedTimeOption === 'evening' ? '#7C5CFC' : '#D1CBDD'}
            />
          </TouchableOpacity>

          {/* 4. Choose a Custom Time */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTimeOption('custom');
              setShowCustomPicker(!showCustomPicker);
            }}
            style={[
              styles.customTimeRow,
              selectedTimeOption === 'custom' && { borderColor: '#7C5CFC' },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.customTimePlusBox}>
                <Ionicons name="add" size={18} color="#7C5CFC" />
              </View>
              <Text style={styles.customTimeTitleText}>
                {selectedTimeOption === 'custom' ? `Custom Time: ${customTimeStr}` : 'Choose a custom time'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7C5CFC" />
          </TouchableOpacity>

          {/* Custom Time Selector Dropdown / Input */}
          {showCustomPicker && (
            <View style={styles.customTimeDropdown}>
              {['7:00 AM', '9:00 AM', '6:00 PM', '9:00 PM'].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setCustomTimeStr(t);
                    setSelectedTimeOption('custom');
                  }}
                  style={[
                    styles.customChip,
                    customTimeStr === t ? styles.customChipActive : styles.customChipInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.customChipText,
                      customTimeStr === t ? { color: '#FFFFFF' } : { color: '#7C5CFC' },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[animatedStyle, { width: '100%', marginTop: 28 }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSetReminder}
            disabled={isSaving}
            style={styles.setReminderBtn}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.setReminderBtnText}>Set My Reminder</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={{ marginTop: 14, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 13.5, color: '#8888A0' }}>
              I'll decide later
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Daily Review Intro slide — Screen 8
// ─────────────────────────────────────────────────────────────────
function DailyReviewIntroSlide({
  item,
  onNext,
  onBack,
}: {
  item: typeof SCREENS[7];
  onNext: () => void;
  onBack: () => void;
}) {
  const animFade = useSharedValue(0);
  const animSlideY = useSharedValue(12);

  useEffect(() => {
    animFade.value = withDelay(80, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    animSlideY.value = withDelay(80, withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animFade.value,
    transform: [{ translateY: animSlideY.value }],
  }));

  const insets = useSafeAreaInsets();
  const bottomClearance = Math.max(insets.bottom, 20) + 30;

  return (
    <View style={styles.slide}>
      <ScrollView
        contentContainerStyle={[styles.readyScroll, { paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header Block */}
        <Animated.View style={[styles.textBlockCentered, animatedStyle, { paddingHorizontal: 16, marginTop: 10 }]}>
          <Text style={styles.headlineCentered}>
            Tomorrow starts with{'\n'}
            <Text style={styles.headlinePurple}>what matters.</Text>
          </Text>
          <Text style={[styles.subtitleCentered, { fontSize: 14, color: '#6A6A80', lineHeight: 20 }]}>
            {item.subtitle}
          </Text>
        </Animated.View>

        {/* Mascot & Card Stack Wrapper */}
        <Animated.View style={[styles.readyCardStack, animatedStyle, { marginTop: 80, marginBottom: 24 }]}>
          {/* Peeking Mascot with Star & Glasses */}
          <Image
            source={require('../../assets/images/screen7mascot.png')}
            style={styles.ob7Mascot}
            resizeMode="contain"
          />

          {/* Central Mock Card */}
          <View style={styles.centralCard}>
            {/* Card Header & Sun/Hills Graphic */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: 65 }}>
              <View>
                <Text style={[styles.cardTitleText, { fontSize: 20, fontFamily: 'Outfit_700Bold' }]}>
                  Today's Review
                </Text>
                <Text style={[styles.cardMetaText, { color: '#6A6A80', fontSize: 13 }]}>
                  Friday • Morning
                </Text>
              </View>
              {/* Sun/Hills Graphic */}
              <Image
                source={require('../../assets/images/mountain.png')}
                style={styles.ob7SunHills}
                resizeMode="contain"
              />
            </View>

            {/* Metrics Row */}
            <View style={styles.ob7MetricsRow}>
              {/* Metric 1 */}
              <View style={styles.ob7MetricBox}>
                <View style={styles.ob7MetricIconWrap}>
                  <Ionicons name="book-outline" size={14} color="#7B6CF6" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.ob7MetricNum}>4</Text>
                  <Text style={styles.ob7MetricLabel}>Sources</Text>
                </View>
              </View>

              {/* Divider line */}
              <View style={styles.ob7MetricDivider} />

              {/* Metric 2 */}
              <View style={styles.ob7MetricBox}>
                <View style={styles.ob7MetricIconWrap}>
                  <Ionicons name="bulb-outline" size={14} color="#7B6CF6" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.ob7MetricNum}>12</Text>
                  <Text style={styles.ob7MetricLabel}>Insights</Text>
                </View>
              </View>

              {/* Divider line */}
              <View style={styles.ob7MetricDivider} />

              {/* Metric 3 */}
              <View style={styles.ob7MetricBox}>
                <View style={styles.ob7MetricIconWrap}>
                  <Ionicons name="time-outline" size={14} color="#7B6CF6" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.ob7MetricNum}>≈ 8 min</Text>
                  <Text style={styles.ob7MetricLabel}>Est. time</Text>
                </View>
              </View>
            </View>

            {/* Session Title Divider */}
            <View style={styles.ob7SessionTitleRow}>
              <View style={styles.ob7TitleLine} />
              <Text style={styles.ob7SessionTitleText}>Review in this session</Text>
              <View style={styles.ob7TitleLine} />
            </View>

            {/* List of items */}
            <View style={{ gap: 12 }}>
              {/* Item 1 */}
              <View style={styles.ob7ListItem}>
                <View style={styles.ob7ItemIconBox}>
                  <Ionicons name="logo-youtube" size={14} color="#FF0000" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ob7ItemType}>YouTube</Text>
                  <Text style={styles.ob7ItemTitle} numberOfLines={1}>The psychology of consistency</Text>
                </View>
                <Text style={styles.ob7ItemCount}>3 insights</Text>
                <Ionicons name="chevron-forward" size={14} color="#C8C7D8" style={{ marginLeft: 6 }} />
              </View>

              {/* Item 2 */}
              <View style={styles.ob7ListItem}>
                <View style={styles.ob7ItemIconBox}>
                  <Ionicons name="logo-twitter" size={14} color="#000000" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ob7ItemType}>X Thread</Text>
                  <Text style={styles.ob7ItemTitle} numberOfLines={1}>How to think clearer</Text>
                </View>
                <Text style={styles.ob7ItemCount}>4 insights</Text>
                <Ionicons name="chevron-forward" size={14} color="#C8C7D8" style={{ marginLeft: 6 }} />
              </View>

              {/* Item 3 */}
              <View style={styles.ob7ListItem}>
                <View style={styles.ob7ItemIconBox}>
                  <Ionicons name="document-text-outline" size={14} color="#7B6CF6" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ob7ItemType}>Article</Text>
                  <Text style={styles.ob7ItemTitle} numberOfLines={1}>Atomic habits breakdown</Text>
                </View>
                <Text style={styles.ob7ItemCount}>3 insights</Text>
                <Ionicons name="chevron-forward" size={14} color="#C8C7D8" style={{ marginLeft: 6 }} />
              </View>

              {/* Item 4 */}
              <View style={styles.ob7ListItem}>
                <View style={styles.ob7ItemIconBox}>
                  <Ionicons name="mic-outline" size={14} color="#00B894" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ob7ItemType}>Podcast</Text>
                  <Text style={styles.ob7ItemTitle} numberOfLines={1}>Deep work in a distracted world</Text>
                </View>
                <Text style={styles.ob7ItemCount}>2 insights</Text>
                <Ionicons name="chevron-forward" size={14} color="#C8C7D8" style={{ marginLeft: 6 }} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Small reviews tagline */}
        <Animated.View style={[styles.footerTextSection, animatedStyle, { marginTop: 12, marginBottom: 20 }]}>
          <Text style={[styles.footerHeadline, { fontSize: 16, fontFamily: 'Outfit_700Bold' }]}>
            Small reviews.
          </Text>
          <Text style={[styles.footerHeadlineSub, { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#7B6CF6' }]}>
            Lasting knowledge.
          </Text>
        </Animated.View>

        {/* Bottom CTA & Back Buttons */}
        <Animated.View style={[styles.ctaButtonsWrap, animatedStyle]}>
          <TouchableOpacity
            style={styles.mainCtaBtn}
            activeOpacity={0.85}
            onPress={onNext}
          >
            <Text style={styles.mainCtaBtnText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryCtaBtn, { marginTop: 12 }]}
            activeOpacity={0.7}
            onPress={onBack}
          >
            <Text style={styles.secondaryCtaBtnText}>Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main container
// ─────────────────────────────────────────────────────────────────
export default function OnboardingFlow() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [step, setStep] = useState(0);
  const isLast = step === SCREENS.length - 1;

  const btnOpacity = useSharedValue(0);
  const btnY = useSharedValue(12);
  useEffect(() => {
    btnOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    btnY.value = withDelay(800, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, []);
  const btnAnim = useAnimatedStyle(() => ({ opacity: btnOpacity.value, transform: [{ translateY: btnY.value }] }));

  const goNext = async () => {
    if (isLast) {
      const { setOnboardingCompleted } = await import('../../lib/onboardingHelper');
      await setOnboardingCompleted();
      router.replace('/paywall');
      return;
    }
    const next = step + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setStep(next);
  };

  const goBack = () => {
    if (step > 0) {
      const prev = step - 1;
      listRef.current?.scrollToIndex({ index: prev, animated: true });
      setStep(prev);
    }
  };

  const topPad = insets.top || (Platform.OS === 'ios' ? 50 : 32);
  const btnBottom = Math.max(insets.bottom, 20) + 8;

  return (
    <View style={styles.root}>

      {/* ── Progress bar ─────────────────────────────────────── */}
      <View style={[styles.progressRow, { top: topPad + 4 }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / SCREENS.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{step + 1} / {SCREENS.length}</Text>
      </View>

      {/* ── Slides (FlatList — swipe disabled on interactive screens) ── */}
      <FlatList
        ref={listRef}
        data={SCREENS}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          if (item.type === 'curiosity') {
            return <CuriositySlide item={item as typeof SCREENS[2]} onNext={goNext} />;
          }
          if (item.type === 'save-ways') {
            return <SaveWaysSlide item={item as typeof SCREENS[3]} onNext={goNext} />;
          }
          if (item.type === 'save-first-memory') {
            return <SaveMemorySlide item={item as typeof SCREENS[4]} onNext={goNext} />;
          }
          if (item.type === 'memory-ready') {
            return <MemoryReadySlide item={item as typeof SCREENS[5]} onNext={goNext} isActive={step === index} />;
          }
          if (item.type === 'reminder-time') {
            return <ReminderTimeSlide item={item as typeof SCREENS[6]} onNext={goNext} onBack={goBack} />;
          }
          if (item.type === 'daily-review-intro') {
            return <DailyReviewIntroSlide item={item as typeof SCREENS[7]} onNext={goNext} onBack={goBack} />;
          }
          return <ImageSlide item={item as typeof SCREENS[0] & { type: 'image' }} />;
        }}
        horizontal
        pagingEnabled
        scrollEnabled={
          SCREENS[step]?.type !== 'curiosity' &&
          SCREENS[step]?.type !== 'save-ways' &&
          SCREENS[step]?.type !== 'save-first-memory' &&
          SCREENS[step]?.type !== 'memory-ready' &&
          SCREENS[step]?.type !== 'reminder-time' &&
          SCREENS[step]?.type !== 'daily-review-intro'
        }
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setStep(idx);
        }}
        style={{ flex: 1, marginTop: topPad + 28 }}
      />

      {/* ── Dots ─────────────────────────────────────────────── */}
      {SCREENS[step]?.type !== 'save-first-memory' &&
        SCREENS[step]?.type !== 'memory-ready' &&
        SCREENS[step]?.type !== 'curiosity' &&
        SCREENS[step]?.type !== 'save-ways' &&
        SCREENS[step]?.type !== 'reminder-time' &&
        SCREENS[step]?.type !== 'daily-review-intro' && (
          <View style={[styles.dotsRow, { bottom: btnBottom + 76 }]}>
            {SCREENS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step ? styles.dotOn : styles.dotOff]} />
            ))}
          </View>
        )}

      {/* ── Button ───────────────────────────────────────────── */}
      {SCREENS[step]?.type !== 'save-first-memory' &&
        SCREENS[step]?.type !== 'memory-ready' &&
        SCREENS[step]?.type !== 'curiosity' &&
        SCREENS[step]?.type !== 'save-ways' &&
        SCREENS[step]?.type !== 'reminder-time' &&
        SCREENS[step]?.type !== 'daily-review-intro' && (
          <Animated.View style={[styles.btnWrap, { bottom: btnBottom }, btnAnim]}>
            <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={goNext}>
              <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Continue'}</Text>
              <View style={styles.arrowCircle}>
                <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#6C5CE7" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },

  // Progress
  progressRow: {
    position: 'absolute', left: 24, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 20,
  },
  progressTrack: { flex: 1, height: 3, backgroundColor: '#EEE9FF', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7B6CF6', borderRadius: 2 },
  progressLabel: { fontSize: 12, color: '#9090A8', fontFamily: 'Outfit_400Regular', minWidth: 28, textAlign: 'right' },

  // Slide
  slide: { width, flex: 1, backgroundColor: '#FAFAFA', overflow: 'hidden' },

  // Text (image slides)
  textBlock: { paddingHorizontal: 28, paddingTop: 16, zIndex: 10 },
  headline: { fontSize: 34, fontWeight: '800', color: '#1A1A2E', lineHeight: 42, fontFamily: 'Outfit_700Bold' },
  headlinePurple: { color: '#6C5CE7', fontFamily: 'Outfit_700Bold' },
  subtitle: { marginTop: 10, fontSize: 15, color: '#9090A8', lineHeight: 22, fontFamily: 'Outfit_400Regular' },

  // Image slide — full bleed
  imageWrapFull: { position: 'absolute', top: height * 0.17, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  mascotFull: { width: width, height: height * 1 },

  // Image slide — standard
  imageWrapStd: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 110, marginTop: 12 },
  mascotStd: { width: width - 24, height: height * 0.44, transform: [{ scale: 1.2 }] },

  // ── Screen 3: Curiosity mascot
  mascotCuriosityS3: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: -80,
    marginTop: 40,
    transform: [{ scale: 2.4 }],
  },
  // ── Screen 4: Save Ways mascot
  ob4_mascot_writing: {
    width: 240,
    height: 180,
    alignSelf: 'center',
    marginBottom: -1,
    marginTop: 20,
    transform: [{ scale: 1.7 }],
  },
  // Orbit illustration styles
  orbitContainer: {
    height: 185,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
  },
  orbitMascotWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  orbitMascotImage: {
    width: 140,
    height: 140,
  },
  orbitBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7A6BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 5,
  },
  saveWayCheckAbsolute: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  saveWaysBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7A6BFF',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#7A6BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveWaysBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
  },
  // Left-aligned text block for screen 3
  textBlockLeft: {
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  headlineLeft: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    lineHeight: 40,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'left',
  },
  subtitleLeft: {
    fontSize: 14.5,
    color: '#9090A8',
    lineHeight: 22,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'left',
    marginTop: 10,
  },
  // Keep centered variants for other slides that use them
  textBlockCentered: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  headlineCentered: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    lineHeight: 40,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
  },
  subtitleCentered: {
    fontSize: 14.5,
    color: '#9090A8',
    lineHeight: 21,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginTop: 10,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  topicCardWrap: {
    width: (width - 48 - 10) / 2,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F0EBF8',
    height: 52,
    width: '100%',
    paddingHorizontal: 12,
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  topicCardSelected: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F0EDFF',
    shadowColor: '#7B6CF6',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  topicIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F5F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  topicIconBubbleOn: {
    backgroundColor: '#EBE6FF',
  },
  topicIconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicLabelText: {
    flex: 1,
    fontSize: 13.5,
    color: '#4A455E',
    fontFamily: 'Outfit_500Medium',
  },
  topicLabelTextOn: {
    color: '#3D3580',
    fontFamily: 'Outfit_600SemiBold',
  },
  topicCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7B6CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },

  // ── Save Ways Screen ────────────────────────────────────────
  saveWaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  saveWayChipWrap: {
    width: (width - 48 - 10) / 2,
  },
  saveWayChipWrapFull: {
    width: '100%',
  },
  saveWayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F0EBF8',
    minHeight: 64,
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  // wrapper that pins icon bubble to center of the min row height
  saveWayIconWrap: {
    alignSelf: 'center',
    marginRight: 8,
  },
  saveWayIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveWayIconBubbleOn: {
    backgroundColor: '#EBE6FF',
  },
  // label that wraps across 2 lines max
  saveWayLabelInner: {
    flex: 1,
    fontSize: 14,
    color: '#4A455E',
    fontFamily: 'Outfit_500Medium',
    lineHeight: 18,
  },
  // checkmark variant pinned to center
  saveWayCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#E8E4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
  },
  saveWayCheckCircleOn: {
    backgroundColor: '#7B6CF6',
    borderColor: '#7B6CF6',
  },
  saveWayCardFull: {
    width: '100%',
  },
  saveWayCardSelected: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F0EDFF',
    shadowColor: '#7B6CF6',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  saveWayIconBox: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveWayLabelText: {
    flex: 1,
    fontSize: 13.5,
    color: '#4A455E',
    fontFamily: 'Outfit_500Medium',
  },
  saveWayCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  saveWayCheckOn: {
    backgroundColor: '#7B6CF6',
    borderColor: '#7B6CF6',
  },
  dynamicFooterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F4FF',
    borderRadius: 24,
    padding: 22,
    marginTop: 20,
    width: '100%',
  },
  footerHomeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  footerCardTitle: {
    fontSize: 13.5,
    color: '#1A1A2E',
    fontFamily: 'Outfit_700Bold',
  },
  footerCardDesc: {
    fontSize: 12,
    color: '#7B6CF6',
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
    lineHeight: 16,
  },
  ctaBtnAbsoluteWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 100,
  },
  saveWaysDynamicMsg: {
    fontSize: 13,
    color: '#9090A8',
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 19,
    fontStyle: 'italic',
  },

  // ── Interactive slide ───────────────────────────────────────
  interactiveScroll: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headlineInteractive: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A2E',
    lineHeight: 38,
    fontFamily: 'Outfit_700Bold',
  },
  mascotSmall: {
    width: 72,
    height: 72,
    marginTop: 10,
    marginBottom: 15,
    transform: [{ scale: 2 }],
  },
  subtitleInteractive: {
    fontSize: 14,
    color: '#9090A8',
    lineHeight: 21,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 19,
  },

  // Cards
  cardsWrap: { gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 11,
    borderWidth: 1.5,
    borderColor: '#F0EDF9',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardSelected: {
    borderColor: '#7B6CF6',
    backgroundColor: '#FDFCFF',
  },
  cardImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  cardTextWrap: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: 'Outfit_700Bold',
    lineHeight: 20,
  },
  cardSub: {
    fontSize: 13,
    color: '#9090A8',
    fontFamily: 'Outfit_400Regular',
    lineHeight: 18,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D4CEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: '#7B6CF6',
    backgroundColor: '#7B6CF6',
  },

  // Footer
  footerWrap: {
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#9090A8',
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: 'Outfit_400Regular',
  },

  // Dots
  dotsRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  dotOn: { width: 20, backgroundColor: '#7B6CF6' },
  dotOff: { width: 6, backgroundColor: '#D8D4F0' },

  // Button
  btnWrap: { position: 'absolute', left: 24, right: 24 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7B6CF6', borderRadius: 50, height: 58, paddingHorizontal: 28,
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.2, marginRight: 10 },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  // ── Screen 4: SaveMemorySlide Styles ──────────────────────────
  textBlockInteractive: {
    paddingHorizontal: 4,
    paddingTop: 10,
    marginBottom: 16,
  },
  mascotStackWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 180,
    width: '100%',
    marginBottom: 16,

  },
  mascotPeeking: {
    position: 'absolute',
    right: -100,
    bottom: -54,
    width: 420,
    height: 320,
    zIndex: 1,
    transform: [{ scale: 0.95 }],
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E4F8',
    height: 64,
    paddingLeft: 16,
    paddingRight: 8,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 2,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: '#1A1A2E',
    fontFamily: 'Outfit_400Regular',
    paddingRight: 8,
  },
  pasteBtn: {
    backgroundColor: '#F0EDFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pasteBtnText: {
    color: '#7B6CF6',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  sourcesSection: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9090A8',
    fontFamily: 'Outfit_700Bold',
    marginBottom: 10,
  },
  sourcesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceBox: {
    width: (width - 48 - 40) / 6,
    alignItems: 'center',
  },
  sourceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EDF9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 4,
  },
  sourceLabel: {
    fontSize: 10,
    color: '#9090A8',
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },
  exampleSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  exampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  exampleBtnText: {
    color: '#7B6CF6',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  createBtnWrap: {
    marginTop: 24,
    width: '100%',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    height: 56,
    width: '100%',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  createBtnActive: {
    backgroundColor: '#7B6CF6',
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.25,
  },
  createBtnDisabled: {
    backgroundColor: '#E5E0FF',
    shadowColor: 'transparent',
    shadowOpacity: 0,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  createBtnTextActive: {
    color: '#FFFFFF',
  },
  createBtnTextDisabled: {
    color: '#AFAAC0',
  },
  guardCaptionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingBottom: 20,
  },
  guardCaption: {
    fontSize: 11,
    color: '#9090A8',
    fontFamily: 'Outfit_400Regular',
  },

  // ── Screen 5: MemoryReadySlide Styles ──────────────────────────
  checkmarkSphere: {
    width: 240,
    height: 240,
    marginTop: -80,
    marginBottom: -80,
  },
  readyCardStack: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    marginTop: 35,
    marginBottom: 20,
  },
  mascotBubble: {
    position: 'absolute',
    right: -60,
    top: -140,
    width: 260,
    height: 260,
    zIndex: 10,
    transform: [{ scale: 0.75 }],

  },
  centralCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#F0EDF9',
    padding: 18,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ytIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4F8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: 'Outfit_700Bold',
  },
  cardMetaText: {
    fontSize: 11,
    color: '#9090A8',
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  badgeMemory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#7B6CF6',
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0EDF9',
    marginVertical: 14,
  },
  cardInsightsSection: {
    paddingHorizontal: 2,
  },
  insightsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightsTitlePurple: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7B6CF6',
    fontFamily: 'Outfit_700Bold',
  },
  insightBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7B6CF6',
    marginTop: 7,
    marginRight: 8,
  },
  insightBulletText: {
    flex: 1,
    fontSize: 13.5,
    color: '#4A4A68',
    fontFamily: 'Outfit_400Regular',
    lineHeight: 18,
  },
  connectedSection: {
    paddingHorizontal: 2,
  },
  connectedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  connectedTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7B6CF6',
    fontFamily: 'Outfit_700Bold',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: '#F0EDFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#7B6CF6',
    fontFamily: 'Outfit_500Medium',
  },
  checklistSection: {
    marginTop: 15,
    marginHorizontal: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  checkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECE9F7',
    borderStyle: 'dashed',
  },
  checkIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A2E',
    fontFamily: 'Outfit_500Medium',
  },
  checkLabelPurple: {
    color: '#7B6CF6',
  },
  checkCircleActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7B6CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyScroll: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 160,
  },
  footerTextSection: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 20,
  },
  footerHeadline: {
    fontSize: 14,
    color: '#1A1A2E',
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
  footerHeadlineSub: {
    fontSize: 14,
    color: '#1A1A2E',
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
    marginTop: 2,
  },
  ctaButtonsWrap: {
    marginTop: 10,
    gap: 10,
    width: '100%',
  },
  reminderCardOption: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderCardActive: {
    backgroundColor: '#F6F2FF',
    borderColor: '#7C5CFC',
  },
  reminderCardInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EBE8F5',
  },
  reminderIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reminderCardTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#1A1A2E',
  },
  reminderCardSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: '#6A6A80',
    marginTop: 2,
  },
  reminderTimeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    marginLeft: 4,
  },
  customTimeRow: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#F6F4FD',
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customTimePlusBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAE4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customTimeTitleText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#7C5CFC',
  },
  customTimeDropdown: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBE8F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  customChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customChipActive: {
    backgroundColor: '#7C5CFC',
  },
  customChipInactive: {
    backgroundColor: '#F4F0FF',
  },
  customChipText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
  },
  setReminderBtn: {
    width: '100%',
    backgroundColor: '#7C5CFC',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setReminderBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  mainCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B6CF6',
    borderRadius: 50,
    height: 56,
    width: '100%',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  mainCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  secondaryCtaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: '100%',
  },
  secondaryCtaBtnText: {
    color: '#9090A8',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // ── Signup Slide Styles ─────────────────────────────────────
  googleBtnOnboarding: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#E8E4F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleGOnboarding: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 10,
    fontFamily: 'Outfit_700Bold',
  },
  googleBtnTextOnboarding: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#1A1A2E',
  },
  loginFooterOnboarding: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  loginFooterTextOnboarding: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#AFAAC0',
  },
  loginFooterLinkOnboarding: {
    fontFamily: 'Outfit_600SemiBold',
    color: '#7B6CF6',
  },

  // ── Screen 7: DailyReviewIntroSlide Styles ───────────────────
  ob7Mascot: {
    position: 'absolute',
    left: -33,
    top: -70,
    width: 145,
    height: 145,
    zIndex: 10,
    transform: [{ scale: 2.2 }],
  },
  ob7SunHills: {
    width: 90,
    height: 65,
    transform: [{ scale: 5 }],
    top: -5,
    right: 13,
  },
  ob7MetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F6FC',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  ob7MetricBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ob7MetricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ob7MetricNum: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    color: '#1A1A2E',
  },
  ob7MetricLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    color: '#9090A8',
  },
  ob7MetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E6E3F4',
    marginHorizontal: 8,
  },
  ob7SessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ob7TitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0EDF9',
  },
  ob7SessionTitleText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#9090A8',
    marginHorizontal: 12,
  },
  ob7ListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
  },
  ob7ItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F7F6FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ob7ItemType: {
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    color: '#1A1A2E',
  },
  ob7ItemTitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: '#9090A8',
    marginTop: 1,
  },
  ob7ItemCount: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: '#9090A8',
  },
  ob7ContinueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 14,
  },
  ob7ContinueTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    color: '#7B6CF6',
  },
  ob7ContinueSub: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    color: '#9090A8',
    marginTop: 2,
  },

  // ── Memory Creation Animation Styles ─────────────────────────
  particlesContainer: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  particleCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E8E4F8',
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  particleText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7B6CF6',
  },
  lavenderCardGlow: {
    position: 'absolute',
    bottom: -6,
    left: -6,
    right: -6,
    top: -6,
    backgroundColor: '#7B6CF6',
    borderRadius: 28,
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  inputCardProcessing: {
    borderColor: '#7B6CF6',
    backgroundColor: '#FFFFFF',
  },
  inputLeftIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    marginRight: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7B6CF6',
    backgroundColor: 'transparent',
  },
  analyzingText: {
    fontSize: 13.5,
    fontFamily: 'Outfit_600SemiBold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: '#F0EDF9',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7B6CF6',
    borderRadius: 2,
  },
});
