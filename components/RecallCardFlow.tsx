import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { InsightItem, ReviewRating } from '@/types';
import { getEstimatedIntervals } from '@/lib/spaced-repetition';

export type RecallCardFlowProps = {
  items: InsightItem[];
  currentStreak?: number;
  onRecordRating: (item: InsightItem, rating: ReviewRating) => Promise<void>;
  onComplete: () => void;
};

function formatPlatformLabel(platform?: string, contentType?: string): string {
  if (contentType === 'short_form_video' || platform === 'shorts') return 'Short-form Video';
  if (contentType === 'youtube_video' || platform === 'youtube') return 'YouTube Video';
  if (contentType === 'tweet' || contentType === 'tweet_thread' || platform === 'twitter') return 'X / Twitter Post';
  if (platform === 'instagram') return 'Instagram Reel';
  if (contentType === 'article') return 'Article';
  if (contentType === 'podcast') return 'Podcast';
  return 'Saved Content';
}

function getPlatformIcon(platform?: string): keyof typeof Ionicons.glyphMap {
  if (platform === 'youtube' || platform === 'shorts') return 'logo-youtube';
  if (platform === 'instagram') return 'logo-instagram';
  if (platform === 'twitter') return 'logo-twitter';
  return 'link-outline';
}

function getPlatformColor(platform?: string): string {
  if (platform === 'youtube' || platform === 'shorts') return '#FF0000';
  if (platform === 'instagram') return '#E1306C';
  if (platform === 'twitter') return '#0F1419';
  return '#7C5CFC';
}

export function RecallCardFlow({
  items,
  currentStreak = 0,
  onRecordRating,
  onComplete,
}: RecallCardFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = items.length;
  const currentItem: InsightItem | undefined = items[currentIndex];

  if (!currentItem || currentIndex >= total) {
    onComplete();
    return null;
  }

  const handleReveal = () => {
    if (revealed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRevealed(true);
  };

  const handleRate = async (rating: ReviewRating) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (rating === 'again' || rating === 'forgot') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (rating === 'hard') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (rating === 'good') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (rating === 'easy') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      await onRecordRating(currentItem, rating);
    } catch (e) {
      console.warn('[RecallCardFlow] Rating error:', e);
    }

    setRevealed(false);
    setShowHint(false);
    setIsSubmitting(false);

    if (currentIndex + 1 >= total) {
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const platform = currentItem.insights?.platform ?? 'other';
  const itemTitle = currentItem.insights?.title || 'Saved Knowledge';
  const rawInput = (currentItem.insights as any)?.raw_input || (currentItem.insights as any)?.user_points;
  const itemUrl = currentItem.insights?.url;
  const contentType = (currentItem.insights as any)?.content_type;
  const tags = currentItem.insights?.tags ?? [];
  const primaryTopic = tags.length > 0 ? tags[0] : null;

  // Question or challenge prompt for the front of the card
  const challengeQuestion =
    currentItem.recall_question?.trim() ||
    (currentItem.headline
      ? `What is the key takeaway regarding: "${currentItem.headline.slice(0, 45)}..."?`
      : 'What is the core principle or strategy you wanted to remember from this?');

  // Intelligent hint generation for front of card
  const insightType = currentItem.insight_type ? currentItem.insight_type.replace('_', ' ') : 'principle';
  const hintText =
    currentItem.application?.trim() ||
    (currentItem.explanation
      ? `Context: ${currentItem.explanation.slice(0, 80)}...`
      : rawInput
      ? `Your note mentioned: "${rawInput.slice(0, 70)}..."`
      : `Think about the core ${insightType} highlighted in this ${formatPlatformLabel(platform, contentType).toLowerCase()}.`);

  // Estimated next intervals for each button
  const intervals = getEstimatedIntervals({
    easeFactor: currentItem.ease_factor,
    intervalDays: currentItem.interval_days,
    repetitions: currentItem.repetitions,
  });

  return (
    <View className="flex-1 justify-between pt-2 pb-4 px-4">
      {/* Header: Progress & Streak Flame */}
      <View className="mb-2">
        <View className="flex-row items-center justify-between mb-2">
          {/* Progress Pill */}
          <View className="flex-row items-center bg-[#F3EFFE] px-3 py-1 rounded-full border border-[#E9E1FF]">
            <Ionicons name="sparkles" size={12} color="#7C5CFC" style={{ marginRight: 5 }} />
            <Text className="font-display text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">
              {currentIndex + 1} of {total}
            </Text>
          </View>

          {/* Streak Badge */}
          {currentStreak > 0 && (
            <View className="flex-row items-center bg-[#FFF7ED] px-2.5 py-1 rounded-full border border-[#FFEDD5]">
              <Ionicons name="flame" size={13} color="#F97316" style={{ marginRight: 4 }} />
              <Text className="font-display text-[11px] font-bold text-[#EA580C]">
                {currentStreak}d Streak
              </Text>
            </View>
          )}
        </View>

        {/* Top Progress Bar */}
        <View className="w-full h-1.5 bg-[#EFEAFF] rounded-full overflow-hidden">
          <View
            className="h-full bg-[#7C5CFC] rounded-full"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </View>
      </View>

      {/* Main Flashcard Card */}
      <View style={styles.cardContainer} className="bg-white border border-[#EBE8F5] rounded-[26px] p-5 shadow-sm flex-1 justify-between my-2">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}>
          
          {/* 1. Header Row (Source Chip + Icon + Type Pill) */}
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="flex-row items-center flex-1 pr-2">
              <View
                className="w-7 h-7 rounded-[8px] items-center justify-center mr-2"
                style={{ backgroundColor: getPlatformColor(platform) }}
              >
                <Ionicons name={getPlatformIcon(platform)} size={14} color="#FFFFFF" />
              </View>
              <Text className="font-display text-[12px] font-bold text-[#70708C] leading-tight" numberOfLines={1}>
                {formatPlatformLabel(platform, contentType)} {primaryTopic ? `• ${primaryTopic}` : ''}
              </Text>
            </View>

            {currentItem.insight_type && (
              <View className="bg-[#F4F1FE] px-2.5 py-0.5 rounded-full border border-[#E9E1FF]">
                <Text className="font-display text-[10px] font-bold text-[#7C5CFC] uppercase tracking-wider">
                  {currentItem.insight_type.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>

          {/* 2. CARD CONTENT: FRONT vs BACK */}
          {!revealed ? (
            /* ── FRONT (The Active Retrieval Challenge) ── */
            <View className="flex-1 justify-center py-2">
              {/* Source Title */}
              <Text className="font-display text-[18px] font-bold text-[#1A1A2E] leading-[25px] mb-4">
                {itemTitle}
              </Text>

              {/* Challenge Question Prompt Box */}
              <View className="bg-[#F9F8FF] border border-[#EAE4FE] rounded-[20px] p-4 mb-3.5 shadow-xs">
                <View className="flex-row items-center mb-2">
                  <View className="w-6 h-6 rounded-full bg-[#EDE7FF] items-center justify-center mr-2">
                    <Ionicons name="help-circle" size={14} color="#7C5CFC" />
                  </View>
                  <Text className="font-display text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">
                    Recall Challenge
                  </Text>
                </View>

                <Text className="font-display text-[15.5px] font-bold text-[#1A1A2E] leading-[23px]">
                  {challengeQuestion}
                </Text>
              </View>

              {/* Interactive Hint Section */}
              <View className="mb-2">
                {!showHint ? (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowHint(true);
                    }}
                    activeOpacity={0.7}
                    className="flex-row items-center self-center bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-1.5 rounded-full"
                  >
                    <Ionicons name="bulb-outline" size={13} color="#64748B" style={{ marginRight: 5 }} />
                    <Text className="font-display text-[11.5px] font-bold text-[#64748B]">
                      Need a hint?
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-[16px] p-3">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="bulb" size={13} color="#D97706" style={{ marginRight: 5 }} />
                      <Text className="font-display text-[11px] font-bold text-[#B45309] uppercase tracking-wider">
                        Clue
                      </Text>
                    </View>
                    <Text className="font-body text-[12.5px] text-[#92400E] leading-relaxed">
                      {hintText}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* ── BACK (The Revealed Answer & Takeaways) ── */
            <View className="flex-1 justify-center py-2">
              {/* Title reference */}
              <Text className="font-display text-[13.5px] font-bold text-[#8888A0] mb-3" numberOfLines={2}>
                {itemTitle}
              </Text>

              {/* Primary Verb-First Takeaway */}
              <View className="bg-[#FAF9FF] border border-[#E9E3FF] rounded-[20px] p-4 mb-3">
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="sparkles" size={13} color="#7C5CFC" style={{ marginRight: 5 }} />
                  <Text className="font-display text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">
                    Core Takeaway
                  </Text>
                </View>
                <Text className="font-display text-[16px] font-bold text-[#1A1A2E] leading-[24px]">
                  {currentItem.headline || currentItem.content}
                </Text>
                {currentItem.explanation && currentItem.headline && (
                  <Text className="font-body text-[13px] text-[#555570] leading-[19px] mt-2">
                    {currentItem.explanation}
                  </Text>
                )}
              </View>

              {/* Practical Application */}
              {currentItem.application && currentItem.application.trim().length > 0 && (
                <View className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-[16px] p-3 mb-2.5">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="flash-outline" size={13} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text className="font-display text-[10.5px] font-bold text-[#15803D] uppercase tracking-wider">
                      How to Apply It
                    </Text>
                  </View>
                  <Text className="font-body text-[12px] text-[#166534] leading-relaxed">
                    {currentItem.application}
                  </Text>
                </View>
              )}

              {/* User's Original Note (if provided) */}
              {rawInput && rawInput.trim().length > 0 && (
                <View className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-2.5 mb-2">
                  <Text className="font-display text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
                    Your Saved Note
                  </Text>
                  <Text className="font-body text-[11.5px] text-[#334155] italic leading-relaxed">
                    "{rawInput.trim()}"
                  </Text>
                </View>
              )}

              {/* View Source Link */}
              {itemUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(itemUrl)}
                  activeOpacity={0.7}
                  className="flex-row items-center self-start mt-1 py-1"
                >
                  <Ionicons name="open-outline" size={12} color="#7C5CFC" style={{ marginRight: 4 }} />
                  <Text className="font-display text-[11.5px] font-bold text-[#7C5CFC]">
                    View original source
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 3. Footer Prompt */}
          <View className="pt-2.5 border-t border-[#F1EEFE] flex-row items-center justify-center mt-1">
            <Text className="font-body text-[11px] text-[#AFAAC0] text-center">
              {revealed ? 'How did you do? Rate your recall below:' : 'Try retrieving the lesson before tapping Show Answer'}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* 4. Controls Area */}
      <View className="mt-2 min-h-[68px] justify-center">
        {!revealed ? (
          /* Single Show Answer Button */
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleReveal}
            className="w-full bg-[#7C5CFC] h-[52px] rounded-full flex-row items-center justify-center shadow-sm"
          >
            <Text className="font-display text-[15.5px] font-bold text-white mr-1.5">
              Show Answer
            </Text>
            <Ionicons name="eye" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          /* 4-Button Intuitive SM-2 Rating Grid with Clear Descriptions & Schedule */
          <View className="w-full">
            <View className="flex-row items-center justify-between gap-1.5">
              {/* 1. Forgot (Tomorrow) */}
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => handleRate('again')}
                className="flex-1 bg-[#FEF2F2] border border-[#FECACA] py-2 px-1 rounded-[16px] items-center"
              >
                <Ionicons name="close-circle" size={16} color="#DC2626" style={{ marginBottom: 2 }} />
                <Text className="font-display text-[12px] font-bold text-[#DC2626]">
                  Forgot
                </Text>
                <Text className="font-body text-[9.5px] text-[#EF4444] font-medium mt-0.5 text-center" numberOfLines={1}>
                  Tomorrow
                </Text>
              </TouchableOpacity>

              {/* 2. Hard (In 3d) */}
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => handleRate('hard')}
                className="flex-1 bg-[#FFF7ED] border border-[#FED7AA] py-2 px-1 rounded-[16px] items-center"
              >
                <Ionicons name="alert-circle" size={16} color="#EA580C" style={{ marginBottom: 2 }} />
                <Text className="font-display text-[12px] font-bold text-[#EA580C]">
                  Hard
                </Text>
                <Text className="font-body text-[9.5px] text-[#F97316] font-medium mt-0.5 text-center" numberOfLines={1}>
                  In 3 days
                </Text>
              </TouchableOpacity>

              {/* 3. Good (In 6d) */}
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => handleRate('good')}
                className="flex-1 bg-[#F0FDF4] border border-[#BBF7D0] py-2 px-1 rounded-[16px] items-center"
              >
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ marginBottom: 2 }} />
                <Text className="font-display text-[12px] font-bold text-[#16A34A]">
                  Good
                </Text>
                <Text className="font-body text-[9.5px] text-[#22C55E] font-medium mt-0.5 text-center" numberOfLines={1}>
                  In 6 days
                </Text>
              </TouchableOpacity>

              {/* 4. Easy (In 2w) */}
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => handleRate('easy')}
                className="flex-1 bg-[#EFF6FF] border border-[#BFDBFE] py-2 px-1 rounded-[16px] items-center"
              >
                <Ionicons name="sparkles" size={15} color="#2563EB" style={{ marginBottom: 2 }} />
                <Text className="font-display text-[12px] font-bold text-[#2563EB]">
                  Easy
                </Text>
                <Text className="font-body text-[9.5px] text-[#3B82F6] font-medium mt-0.5 text-center" numberOfLines={1}>
                  In 2 weeks
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
});


