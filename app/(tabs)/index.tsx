import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useTodayInsights, useInsights } from '@/hooks/useInsights';
import { useReviewQueue } from '@/hooks/useReviews';
import { useProfileStats } from '@/hooks/useProfileStats';
import { detectPlatform } from '@/lib/platform';
import { Shimmer } from '@/components/Shimmer';
import type { Insight } from '@/types';

const { width } = Dimensions.get('window');

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getUserName(session?: any): string {
  const meta = session?.user?.user_metadata;
  if (meta?.full_name) return meta.full_name.split(' ')[0];
  if (meta?.name) return meta.name.split(' ')[0];
  if (meta?.username) return meta.username;

  const email = session?.user?.email;
  if (!email) return 'Nakkul';
  const prefix = email.split('@')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function getPlatformIcon(platform: string): keyof typeof Ionicons.glyphMap {
  if (platform === 'youtube' || platform === 'shorts') return 'logo-youtube';
  if (platform === 'instagram') return 'logo-instagram';
  if (platform === 'twitter') return 'logo-twitter';
  return 'link';
}

function getPlatformColor(platform: string): string {
  if (platform === 'youtube' || platform === 'shorts') return '#FF0000';
  if (platform === 'instagram') return '#E1306C';
  if (platform === 'twitter') return '#000000';
  return '#6C63FF';
}

// ─── Today's Save Card (horizontal scroll for active users) ─────
function TodaySaveCard({ insight }: { insight: Insight }) {
  const platform = detectPlatform(insight.url);
  const cardWidth = (width - 48 - 16) / 2.3;
  const isProcessing = insight.status === 'processing' || insight.status === 'pending';

  if (isProcessing) {
    return (
      <View
        style={{ width: cardWidth }}
        className="bg-white border border-[#EDEAF7] rounded-2xl p-3 relative overflow-hidden"
      >
        <Shimmer style={{ height: 80 }} className="rounded-xl mb-2.5 w-full" />
        <Shimmer style={{ height: 11, width: '85%' }} className="rounded mb-1.5" />
        <Shimmer style={{ height: 11, width: '60%' }} className="rounded mb-2.5" />
        <View className="flex-row items-center mt-1">
          <View className="w-1.5 h-1.5 rounded-full bg-[#7B6CF6] mr-1.5" style={{ opacity: 0.8 }} />
          <Text style={{ fontFamily: 'Outfit_600SemiBold' }} className="font-body text-[9px] text-[#7B6CF6]">
            Processing...
          </Text>
        </View>
      </View>
    );
  }

  // Count AI insights if available in payload
  const insightsCount = Array.isArray(insight.ai_insights) ? insight.ai_insights.length : 3;
  const estTime = Math.max(1, Math.round(insightsCount * 1.5));

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/insight/${insight.id}`)}
      style={{ width: cardWidth }}
      className="bg-white border border-[#EDEAF7] rounded-2xl p-3 relative overflow-hidden"
    >
      <View
        className="rounded-xl h-20 items-center justify-center relative mb-2"
        style={{ backgroundColor: getPlatformColor(platform) + '15' }}
      >
        <Ionicons name={getPlatformIcon(platform)} size={24} color={getPlatformColor(platform)} />
      </View>
      <Text style={{ fontFamily: 'Outfit_700Bold' }} className="font-display text-[12px] font-bold text-[#0F172A]" numberOfLines={2}>
        {insight.title || 'Saved insight'}
      </Text>
      <Text style={{ fontFamily: 'Outfit_500Medium' }} className="mt-1.5 font-body text-[9px] text-[#64748B] capitalize">
        {insightsCount} insights • {estTime}m review
      </Text>
    </TouchableOpacity>
  );
}

export default function Home() {
  const { session, loading: authLoading } = useAuth();
  const uid = session?.user?.id;

  const { data: todayInsights = [], isLoading: todayLoading, refetch: refetchToday } = useTodayInsights();
  const { data: allInsights = [], isLoading: allLoading, refetch: refetchAll } = useInsights();
  const { data: reviewQueue = [] } = useReviewQueue();
  const { data: stats, isLoading: statsLoading } = useProfileStats();

  const userName = getUserName(session);
  const hasData = allInsights.length > 0;

  const onRefresh = async () => {
    await Promise.all([refetchToday(), refetchAll()]);
  };

  const isLoading = authLoading || todayLoading || allLoading || statsLoading;

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F6FC]">
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F6FC]" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#6C63FF" />
        }
      >
        {/* SECTION 1 — HEADER */}
        <View className="flex-row items-center justify-between pt-6 pb-5">
          <View className="flex-1 pr-3">
            <Text className="font-display text-[26px] font-bold text-[#0F172A] leading-tight">
              {getGreeting()}, {userName} ☀️
            </Text>
            <Text className="font-body text-[14px] text-[#64748B] mt-1">
              Let's start building your knowledge base.
            </Text>
          </View>
          <Image
            source={require('../../assets/images/mascot_homepage.png')}
            style={{
              width: 109, height: 109, transform: [{ scale: 3 }, { translateX: -6 }]
            }}
            resizeMode="contain"
          />
        </View>

        {/* SECTION 2 — EMPTY STATE / ACTIVE STATE CARD */}
        {!hasData ? (
          <View className="bg-[#EFEDFB] rounded-[24px] p-6 items-center mb-6">
            <Image
              source={require('../../assets/images/libmascot.png')}
              style={{ width: 180, height: 120, marginBottom: 12, transform: [{ scale: 1.6 }] }}
              resizeMode="contain"
            />
            <Text className="font-display text-[20px] font-bold text-[#0F172A] text-center mb-2">
              Nothing to recall yet
            </Text>
            <Text className="font-body text-[13px] text-[#64748B] text-center mb-5 max-w-[280px] leading-[18px]">
              Save your first link and I'll turn it into bite-sized insights you can review anytime.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/save')}
              activeOpacity={0.9}
              className="w-full bg-[#6C63FF] py-3.5 rounded-full items-center justify-center flex-row shadow-sm shadow-[#6C63FF]/20"
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text className="font-display text-[15px] font-bold text-white ml-1.5">
                Save Your First Link
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-[#EFEDFB] rounded-[24px] p-6 mb-6">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-3">
                <Text className="font-display text-[14px] font-bold text-[#6C63FF] uppercase tracking-wider mb-1">
                  Today's Session
                </Text>
                <Text className="font-display text-[20px] font-bold text-[#0F172A] leading-tight mb-2">
                  {reviewQueue.length > 0
                    ? `You have ${reviewQueue.length} reviews ready`
                    : "You're all caught up!"}
                </Text>
                <Text className="font-body text-[13px] text-[#64748B] leading-[18px] mb-4">
                  {reviewQueue.length > 0
                    ? 'Resurface key points now to strengthen your long-term memory.'
                    : 'Check back tomorrow or save more links to expand your insights.'}
                </Text>
              </View>
              <Image
                source={require('../../assets/images/libmascot.png')}
                style={{ width: 90, height: 70, transform: [{ scale: 2 }] }}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              onPress={() => router.push(reviewQueue.length > 0 ? '/(tabs)/review' : '/(tabs)/save')}
              activeOpacity={0.9}
              className="w-full bg-[#6C63FF] py-3.5 rounded-full items-center justify-center flex-row shadow-sm shadow-[#6C63FF]/20"
            >
              <Ionicons name={reviewQueue.length > 0 ? "play" : "add"} size={16} color="#FFFFFF" />
              <Text className="font-display text-[15px] font-bold text-white ml-1.5">
                {reviewQueue.length > 0 ? "Start Today's Review" : "Save Another Link"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION 3 — "SEE WHAT YOU'LL GET" / "TODAY'S SAVES" */}
        {!hasData || todayInsights.length === 0 ? (
          <View className="mb-6">
            <Text className="font-display text-[16px] font-bold text-[#0F172A]">
              See what you'll get
            </Text>
            <Text className="font-body text-[12px] text-[#64748B] mb-4 mt-0.5">
              Examples of insights you can save
            </Text>

            <View className="flex-row justify-between gap-3">
              {/* Card 1: Video */}
              <View className="flex-1 bg-white/70 border border-dashed border-[#C7D2FE] rounded-2xl p-3 relative items-stretch">
                <View className="self-start bg-[#EEF2FF] px-2 py-0.5 rounded-full mb-2">
                  <Text className="text-[#6C63FF] font-body text-[9px] font-bold">Example</Text>
                </View>
                <View className="bg-[#EBE9F7] rounded-xl h-20 items-center justify-center relative mb-2">
                  <Ionicons name="play-circle" size={32} color="#A099E0" />
                  <View className="absolute top-1.5 left-1.5 bg-black/60 w-5 h-5 rounded-md items-center justify-center">
                    <Ionicons name="logo-youtube" size={11} color="#FFF" />
                  </View>
                </View>
                <Text className="font-display text-[11px] font-bold text-[#0F172A] leading-tight mb-1" numberOfLines={2}>
                  How to Build Better Habits
                </Text>
                <View className="bg-[#EEF2FF] px-2 py-0.5 rounded-full self-start mt-auto">
                  <Text className="text-[#6C63FF] font-body text-[9px] font-medium">Productivity</Text>
                </View>
              </View>

              {/* Card 2: Image */}
              <View className="flex-1 bg-white/70 border border-dashed border-[#C7D2FE] rounded-2xl p-3 relative items-stretch">
                <View className="self-start bg-[#EEF2FF] px-2 py-0.5 rounded-full mb-2">
                  <Text className="text-[#6C63FF] font-body text-[9px] font-bold">Example</Text>
                </View>
                <View className="bg-[#EBE9F7] rounded-xl h-20 items-center justify-center relative mb-2">
                  <Ionicons name="image-outline" size={28} color="#A099E0" />
                  <View className="absolute top-1.5 left-1.5 bg-white border border-[#EDEAF7] w-5 h-5 rounded-md items-center justify-center">
                    <Ionicons name="logo-instagram" size={11} color="#E1306C" />
                  </View>
                </View>
                <Text className="font-display text-[11px] font-bold text-[#0F172A] leading-tight mb-1" numberOfLines={2}>
                  Your Mind is Your Reality
                </Text>
                <View className="bg-[#EEF2FF] px-2 py-0.5 rounded-full self-start mt-auto">
                  <Text className="text-[#6C63FF] font-body text-[9px] font-medium">Mindset</Text>
                </View>
              </View>

              {/* Card 3: Social Post */}
              <View className="flex-1 bg-white/70 border border-dashed border-[#C7D2FE] rounded-2xl p-3 relative items-stretch">
                <View className="self-start bg-[#EEF2FF] px-2 py-0.5 rounded-full mb-2">
                  <Text className="text-[#6C63FF] font-body text-[9px] font-bold">Example</Text>
                </View>
                <View className="bg-[#EBE9F7] rounded-xl h-20 p-2 justify-center items-start relative mb-2">
                  <View className="w-12 h-1 bg-[#A099E0]/40 rounded mb-1" />
                  <View className="w-16 h-1 bg-[#A099E0]/30 rounded mb-1" />
                  <View className="w-10 h-1 bg-[#A099E0]/20 rounded" />
                  <View className="absolute top-1.5 left-1.5 bg-black w-5 h-5 rounded-md items-center justify-center">
                    <Ionicons name="logo-twitter" size={9} color="#FFF" />
                  </View>
                </View>
                <Text className="font-display text-[11px] font-bold text-[#0F172A] leading-tight mb-1" numberOfLines={2}>
                  The 3 Rules of Focus
                </Text>
                <View className="bg-[#EEF2FF] px-2 py-0.5 rounded-full self-start mt-auto">
                  <Text className="text-[#6C63FF] font-body text-[9px] font-medium">Focus</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="font-display text-[16px] font-bold text-[#0F172A]">
                  Today's Saves
                </Text>
                <Text className="font-body text-[12px] text-[#64748B]">
                  Insights you saved today
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
                <Text className="font-body-medium text-[12px] text-[#6C63FF]">View all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 12 }}
            >
              {todayInsights.map(insight => (
                <TodaySaveCard key={insight.id} insight={insight} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* SECTION 4 — "RELATED IDEAS" BANNER */}
        <View className="bg-[#EFEDFB] border border-[#D4D1FF] rounded-[24px] p-4 flex-row items-center justify-between mb-6">
          <View className="w-12 h-12 rounded-full bg-[#6C63FF] items-center justify-center mr-3">
            <MaterialCommunityIcons name="puzzle-outline" size={22} color="#FFFFFF" />
          </View>
          <View className="flex-1 mr-2">
            <Text className="font-display text-[13px] font-bold text-[#0F172A]">
              Related ideas will appear here
            </Text>
            <Text className="font-body text-[11px] text-[#64748B] mt-1 leading-snug">
              Once you save a few links, I'll connect ideas across them automatically.
            </Text>
          </View>

          {/* Overlapping card silhouettes */}
          <View className="flex-row items-center relative w-12 h-10">
            <View className="absolute right-0 top-1 w-6 h-8 bg-white/40 border border-[#EDEAF7] rounded-md rotate-[6deg]" />
            <View className="absolute right-1.5 top-0 w-6 h-8 bg-white/60 border border-[#EDEAF7] rounded-md -rotate-[3deg]" />
            <View className="absolute right-3.5 top-0.5 w-6 h-8 bg-white border border-[#EDEAF7] rounded-md justify-center items-center">
              <Ionicons name="link" size={8} color="#6C63FF" />
            </View>
          </View>
        </View>

        {/* SECTION 5 — "YOUR LEARNING PROGRESS" */}
        <View className="mb-6">
          <Text className="font-display text-[16px] font-bold text-[#0F172A]">
            Your learning progress
          </Text>
          <Text className="font-body text-[12px] text-[#64748B] mb-4 mt-0.5">
            Track your growth over time
          </Text>

          <View className="flex-row flex-wrap justify-between gap-3">
            {/* Grid 1: Streak */}
            <View className="w-[48%] bg-white border border-[#EDEAF7] rounded-2xl p-4 items-center justify-center">
              <Ionicons name="flame-outline" size={24} color="#6C63FF" />
              <Text className="font-display text-[22px] font-bold text-[#0F172A] mt-2">
                {stats?.currentStreak ?? 0}
              </Text>
              <Text className="font-body text-[10px] text-[#64748B] mt-0.5">Day streak</Text>
              <Text className="font-body text-[9px] text-[#AFAAC0] mt-1">Goal: 7 days</Text>
            </View>

            {/* Grid 2: Saved */}
            <View className="w-[48%] bg-white border border-[#EDEAF7] rounded-2xl p-4 items-center justify-center">
              <MaterialCommunityIcons name="brain" size={24} color="#6C63FF" />
              <Text className="font-display text-[22px] font-bold text-[#0F172A] mt-2">
                {stats?.totalInsights ?? 0}
              </Text>
              <Text className="font-body text-[10px] text-[#64748B] mt-0.5">Insights saved</Text>
              <Text className="font-body text-[9px] text-[#AFAAC0] mt-1">Goal: 10</Text>
            </View>

            {/* Grid 3: Completed */}
            <View className="w-[48%] bg-white border border-[#EDEAF7] rounded-2xl p-4 items-center justify-center">
              <Ionicons name="checkmark-circle-outline" size={24} color="#6C63FF" />
              <Text className="font-display text-[22px] font-bold text-[#0F172A] mt-2">
                {stats?.totalReviews ?? 0}
              </Text>
              <Text className="font-body text-[10px] text-[#64748B] mt-0.5">Reviews completed</Text>
              <Text className="font-body text-[9px] text-[#AFAAC0] mt-1">Goal: 10</Text>
            </View>

            {/* Grid 4: Memory score */}
            <View className="w-[48%] bg-white border border-[#EDEAF7] rounded-2xl p-4 items-center justify-center">
              <Ionicons name="trending-up-outline" size={24} color="#6C63FF" />
              <Text className="font-display text-[22px] font-bold text-[#0F172A] mt-2">
                {stats?.knowledgeScore ? Math.min(100, Math.round(stats.knowledgeScore / 10)) : 0}%
              </Text>
              <Text className="font-body text-[10px] text-[#64748B] mt-0.5">Memory score</Text>
              <Text className="font-body text-[9px] text-[#AFAAC0] mt-1">Goal: 80%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
