import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useYesterdayInsights } from '@/hooks/useInsights';
import { useReviewQueue, useRecordReview } from '@/hooks/useReviews';
import { useProfileStats } from '@/hooks/useProfileStats';
import { NewSavesDigest } from '@/components/NewSavesDigest';
import { RecallCardFlow } from '@/components/RecallCardFlow';
import type { InsightItem, ReviewRating } from '@/types';

type SessionStage = 'pre-session' | 'digest' | 'recall' | 'completed';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning!';
  if (hour < 18) return 'Good Afternoon!';
  return 'Good Evening!';
}

export default function DailyReviewSessionScreen() {
  const router = useRouter();
  const { data: yesterdayInsights = [], isLoading: isLoadingYesterday } = useYesterdayInsights();
  const { data: dueQueue = [], isLoading: isLoadingDue } = useReviewQueue();
  const { mutateAsync: recordReview } = useRecordReview();
  const { data: stats } = useProfileStats();

  const [stage, setStage] = useState<SessionStage>('pre-session');

  // Animation ref for streak flame pulse on completion
  const streakFlameScale = useRef(new Animated.Value(0.4)).current;
  const streakFlameOpacity = useRef(new Animated.Value(0)).current;

  const totalItems = yesterdayInsights.length + dueQueue.length;
  const estTimeMin = Math.max(1, Math.ceil(totalItems * 0.5));

  // Trigger completion haptic exactly synced to streak flame entrance frame
  useEffect(() => {
    if (stage === 'completed') {
      const timer = setTimeout(() => {
        // Sync haptic pulse to visual beat frame
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.parallel([
          Animated.spring(streakFlameScale, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
          Animated.timing(streakFlameOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }, 80);

      return () => clearTimeout(timer);
    }
  }, [stage]);

  const handleStartSession = () => {
    // Light impact on button press only per spec
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (yesterdayInsights.length > 0) {
      setStage('digest');
    } else if (dueQueue.length > 0) {
      setStage('recall');
    } else {
      setStage('completed');
    }
  };

  const isLoading = isLoadingYesterday || isLoadingDue;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#7C5CFC" size="large" />
        <Text className="font-body text-[14px] text-[#8888A0] mt-3">
          Preparing your daily session...
        </Text>
      </SafeAreaView>
    );
  }

  // ── STAGE 1: SECTION 1 (DIGEST) ──────────────────────────────
  if (stage === 'digest') {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top']}>
        <NewSavesDigest
          insights={yesterdayInsights}
          onComplete={() => {
            if (dueQueue.length > 0) {
              setStage('recall');
            } else {
              setStage('completed');
            }
          }}
        />
      </SafeAreaView>
    );
  }

  // ── STAGE 2: SECTION 2 (RECALL FLOW) ─────────────────────────
  if (stage === 'recall') {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top']}>
        <RecallCardFlow
          items={dueQueue.slice(0, 6)}
          currentStreak={stats?.currentStreak ?? 0}
          onRecordRating={async (item: InsightItem, rating: ReviewRating) => {
            await recordReview({ item, rating });
          }}
          onComplete={() => {
            setStage('completed');
          }}
        />
      </SafeAreaView>
    );
  }

  // ── STAGE 3: COMPLETION SCREEN ────────────────────────────────
  if (stage === 'completed') {
    const streakCount = (stats?.currentStreak ?? 0) > 0 ? stats!.currentStreak : 1;
    const knowledgeScore = stats?.knowledgeScore ?? 88;

    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', paddingVertical: 32 }}>
          {/* Streak Flame Animated Header */}
          <Animated.View
            style={{
              transform: [{ scale: streakFlameScale }],
              opacity: streakFlameOpacity,
            }}
            className="items-center mb-6"
          >
            <View className="w-24 h-24 rounded-full bg-[#FFF7ED] items-center justify-center border-2 border-[#FFEDD5] mb-4 shadow-sm">
              <Ionicons name="flame" size={54} color="#F97316" />
            </View>
            <View className="bg-[#FFF7ED] px-4 py-1.5 rounded-full border border-[#FFEDD5] mb-2 flex-row items-center">
              <Ionicons name="sparkles" size={14} color="#F97316" style={{ marginRight: 6 }} />
              <Text className="font-display text-[13px] font-bold text-[#EA580C]">
                {streakCount} Day Memory Streak!
              </Text>
            </View>
          </Animated.View>

          <Text className="font-display text-[26px] font-bold text-[#1A1A2E] text-center mb-2">
            Session Completed!
          </Text>
          <Text className="font-body text-[14.5px] text-[#666680] text-center leading-relaxed mb-8 max-w-[290px]">
            You've reinforced your long-term memory library for today. Great work staying consistent!
          </Text>

          {/* Stats Summary Card */}
          <View className="w-full bg-white border border-[#EBE8F5] rounded-[24px] p-5 mb-8 shadow-xs">
            {/* Knowledge score increment */}
            <View className="flex-row items-center justify-between pb-4 border-b border-[#F1EEFE] mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-[14px] bg-[#F3EFFE] items-center justify-center mr-3">
                  <Feather name="award" size={20} color="#7C5CFC" />
                </View>
                <View>
                  <Text className="font-display text-[14px] font-bold text-[#1A1A2E]">
                    Knowledge Score
                  </Text>
                  <Text className="font-body text-[11.5px] text-[#8888A0]">
                    Long-term retention rank
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="font-display text-[18px] font-bold text-[#7C5CFC]">
                  {knowledgeScore}%
                </Text>
                <Text className="font-body text-[11px] font-bold text-[#22C55E]">
                  +15 pts today
                </Text>
              </View>
            </View>

            {/* Retention Bar */}
            <View className="mb-2">
              <View className="flex-row justify-between mb-1.5">
                <Text className="font-body text-[12px] text-[#666680]">Retention Strength</Text>
                <Text className="font-display text-[12px] font-bold text-[#1A1A2E]">{knowledgeScore}%</Text>
              </View>
              <View className="w-full h-2.5 bg-[#F3EFFE] rounded-full overflow-hidden">
                <View
                  className="h-full bg-[#7C5CFC] rounded-full"
                  style={{ width: `${knowledgeScore}%` }}
                />
              </View>
            </View>
          </View>

          {/* Return CTA */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)');
            }}
            className="w-full bg-[#7C5CFC] h-[52px] rounded-full flex-row items-center justify-center shadow-xs"
          >
            <Text className="font-display text-[15.5px] font-bold text-white mr-2">
              Back to Home
            </Text>
            <Ionicons name="checkmark-circle" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PRE-SESSION SCREEN (DEFAULT) ─────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingVertical: 24 }}>
        {/* Top Header */}
        <View className="items-center mt-2">
          <View className="items-center justify-center">
            <Image
              source={require('../../assets/images/mascot_reviewpage.png')}
              style={{ width: 200, height: 200, marginBottom: -8, transform: [{ scale: 1.3 }] }}
              resizeMode="contain"
            />
          </View>
          <Text className="font-display text-[13px] font-bold text-[#7C5CFC] uppercase tracking-wider mb-1">
            Daily Digest & Spaced Recall
          </Text>
          <Text className="font-display text-[26px] font-bold text-[#1A1A2E] text-center mb-2">
            {getGreeting()}
          </Text>
          <Text className="font-body text-[14.5px] text-[#666680] text-center leading-relaxed max-w-[300px]">
            Ready to lock in what you've learned? Here is your personalized review for today.
          </Text>
        </View>

        {/* Overview Stats Breakdown Card */}
        <View className="bg-white border border-[#EBE8F5] rounded-[28px] p-6 my-6 shadow-xs">
          <Text className="font-display text-[15px] font-bold text-[#1A1A2E] mb-4">
            Session Overview
          </Text>

          {/* Section 1 Item Row */}
          <View className="flex-row items-center justify-between pb-3.5 border-b border-[#F1EEFE] mb-3.5">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-[12px] bg-[#F3EFFE] items-center justify-center mr-3">
                <Ionicons name="newspaper-outline" size={18} color="#7C5CFC" />
              </View>
              <View>
                <Text className="font-display text-[14px] font-bold text-[#1A1A2E]">
                  Section 1 • New Saves
                </Text>
                <Text className="font-body text-[11.5px] text-[#8888A0]">
                  Saved in last 24–48 hours
                </Text>
              </View>
            </View>
            <View className="bg-[#F3EFFE] px-3 py-1 rounded-full border border-[#E9E1FF]">
              <Text className="font-display text-[13px] font-bold text-[#7C5CFC]">
                {yesterdayInsights.length} {yesterdayInsights.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>

          {/* Section 2 Item Row */}
          <View className="flex-row items-center justify-between pb-3.5 border-b border-[#F1EEFE] mb-3.5">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-[12px] bg-[#EFF6FF] items-center justify-center mr-3">
                <Ionicons name="time-outline" size={18} color="#2563EB" />
              </View>
              <View>
                <Text className="font-display text-[14px] font-bold text-[#1A1A2E]">
                  Section 2 • Due Reviews
                </Text>
                <Text className="font-body text-[11.5px] text-[#8888A0]">
                  SM-2 memory queue
                </Text>
              </View>
            </View>
            <View className="bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#DBEAFE]">
              <Text className="font-display text-[13px] font-bold text-[#2563EB]">
                {dueQueue.length} {dueQueue.length === 1 ? 'card' : 'cards'}
              </Text>
            </View>
          </View>

          {/* Estimated Time Row */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-[12px] bg-[#FFF7ED] items-center justify-center mr-3">
                <Feather name="clock" size={18} color="#EA580C" />
              </View>
              <Text className="font-display text-[14px] font-bold text-[#1A1A2E]">
                Estimated Time
              </Text>
            </View>
            <Text className="font-body text-[13px] font-bold text-[#EA580C]">
              ~{estTimeMin} {estTimeMin === 1 ? 'minute' : 'minutes'}
            </Text>
          </View>
        </View>

        {/* Start Button CTA */}
        <View className="mb-2">
          {totalItems > 0 ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleStartSession}
              className="w-full bg-[#7C5CFC] h-[52px] rounded-full flex-row items-center justify-center shadow-xs"
            >
              <Text className="font-display text-[16px] font-bold text-white mr-2">
                Start Recall
              </Text>
              <Ionicons name="play" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View className="items-center">
              <Text className="font-body text-[13px] text-[#8888A0] text-center mb-3">
                No items due for review right now!
              </Text>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push('/(tabs)/library')}
                className="w-full bg-[#F3EFFE] border border-[#E9E1FF] h-[50px] rounded-full flex-row items-center justify-center"
              >
                <Text className="font-display text-[14.5px] font-bold text-[#7C5CFC] mr-2">
                  Explore Library
                </Text>
                <Ionicons name="library" size={16} color="#7C5CFC" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
