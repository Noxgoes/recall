import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { Insight } from '@/types';
import { detectPlatform } from '@/lib/platform';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export type NewSavesDigestProps = {
  insights: Insight[];
  onComplete: () => void;
};

function getPlatformIcon(platform: string): keyof typeof Ionicons.glyphMap {
  if (platform === 'youtube' || platform === 'shorts') return 'logo-youtube';
  if (platform === 'instagram') return 'logo-instagram';
  if (platform === 'twitter') return 'logo-twitter';
  return 'link-outline';
}

function getPlatformColor(platform: string): string {
  if (platform === 'youtube' || platform === 'shorts') return '#FF0000';
  if (platform === 'instagram') return '#E1306C';
  if (platform === 'twitter') return '#0F1419';
  return '#7C5CFC';
}

export function NewSavesDigest({ insights, onComplete }: NewSavesDigestProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const total = insights.length;
  const isLast = activeIndex >= total;

  const handleNext = () => {
    // Light haptic only on swipe/tap gesture (page turn feel)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (activeIndex + 1 > total) {
      onComplete();
      return;
    }

    const nextIdx = activeIndex + 1;
    setActiveIndex(nextIdx);
    if (nextIdx < total) {
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (slide !== activeIndex && slide >= 0 && slide <= total) {
      // Light haptic on swipe gesture boundary
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveIndex(slide);
    }
  };

  // If reached transition screen at the end of Section 1
  if (isLast) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-[#F3EFFE] items-center justify-center mb-6 border border-[#E9E1FF]">
          <Ionicons name="sparkles" size={28} color="#7C5CFC" />
        </View>
        <Text className="font-display text-[24px] font-bold text-[#1A1A2E] text-center mb-2">
          New saves reviewed!
        </Text>
        <Text className="font-body text-[14.5px] text-[#666680] text-center leading-relaxed mb-8 max-w-[280px]">
          Now let's revisit what's due for long-term memory review.
        </Text>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            // Calm transition pause — no haptic buzz here as requested
            onComplete();
          }}
          className="w-full bg-[#7C5CFC] h-[52px] rounded-full flex-row items-center justify-center shadow-sm shadow-purple-900/10"
        >
          <Text className="font-display text-[15.5px] font-bold text-white mr-2">
            Continue to Recall Session
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-between pt-2 pb-6">
      {/* Top Header Badge & Dots */}
      <View className="px-5 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center bg-[#F3EFFE] px-3 py-1 rounded-full border border-[#E9E1FF]">
            <View className="w-2 h-2 rounded-full bg-[#7C5CFC] mr-2" />
            <Text className="font-display text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">
              Section 1 • New Saves Digest
            </Text>
          </View>
          <Text className="font-display text-[12px] font-bold text-[#8888A0]">
            {activeIndex + 1} of {total}
          </Text>
        </View>

        {/* Platform breakdown summary subtitle */}
        {(() => {
          const counts: Record<string, number> = {};
          insights.forEach((item) => {
            const p = detectPlatform(item.url);
            counts[p] = (counts[p] || 0) + 1;
          });

          const labelMap: Record<string, { singular: string; plural: string }> = {
            twitter: { singular: 'X clip', plural: 'X clips' },
            instagram: { singular: 'Instagram clip', plural: 'Instagram clips' },
            shorts: { singular: 'YouTube Short', plural: 'YouTube Shorts' },
            youtube: { singular: 'YouTube clip', plural: 'YouTube clips' },
            other: { singular: 'link', plural: 'links' },
          };

          const parts = Object.entries(counts).map(([plat, count]) => {
            const labels = labelMap[plat] || { singular: `${plat} clip`, plural: `${plat} clips` };
            const labelText = count === 1 ? labels.singular : labels.plural;
            return `${count} ${labelText}`;
          });

          const summaryText = parts.length > 0 ? parts.join(' • ') : `${total} items saved`;

          return (
            <Text className="font-body text-[12.5px] text-[#666680] mb-3">
              {summaryText}
            </Text>
          );
        })()}

        {/* Progress Story Bar */}
        <View className="flex-row gap-1.5 w-full">
          {insights.map((_, idx) => (
            <View
              key={idx}
              className={`h-1 flex-1 rounded-full ${
                idx === activeIndex
                  ? 'bg-[#7C5CFC]'
                  : idx < activeIndex
                  ? 'bg-[#A898FF]'
                  : 'bg-[#E5E0F5]'
              }`}
            />
          ))}
        </View>
      </View>

      {/* Main Story Carousel */}
      <View className="flex-1 justify-center">
        <FlatList
          ref={listRef}
          data={insights}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
          renderItem={({ item }) => {
            const platform = detectPlatform(item.url);
            
            // Extract list of takeaways from insight_items or ai_insights
            let takeaways: string[] = [];
            if (Array.isArray(item.insight_items) && item.insight_items.length > 0) {
              takeaways = item.insight_items.map((it: any) => {
                if (typeof it === 'string') return it;
                return it.headline || it.content || it.explanation || '';
              }).filter(Boolean);
            } else if (Array.isArray(item.ai_insights) && item.ai_insights.length > 0) {
              takeaways = item.ai_insights;
            }

            return (
              <View
                style={{ width: CARD_WIDTH }}
                className="bg-white border border-[#EBE8F5] rounded-[28px] p-6 justify-between shadow-xs relative"
              >
                <View>
                  {/* Top Platform & Title */}
                  <View className="flex-row items-center mb-4">
                    <View
                      className="w-10 h-10 rounded-[14px] items-center justify-center mr-3"
                      style={{ backgroundColor: getPlatformColor(platform) }}
                    >
                      <Ionicons name={getPlatformIcon(platform)} size={20} color="#FFFFFF" />
                    </View>
                    <View className="flex-1 pr-2">
                      <Text
                        className="font-display text-[16px] font-bold text-[#1A1A2E] leading-tight"
                        numberOfLines={2}
                      >
                        {item.title || 'Saved Item'}
                      </Text>
                      <Text className="font-body text-[11.5px] text-[#8888A0] mt-0.5 capitalize">
                        Saved yesterday
                      </Text>
                    </View>
                  </View>

                  {/* User's Original Notes */}
                  {(item.user_points || item.raw_input) && (
                    <View className="bg-[#F8F7FC] p-3 rounded-[16px] mb-4 border border-[#EEEAF7]">
                      <Text className="font-display text-[10.5px] font-bold text-[#7C5CFC] uppercase tracking-wider mb-1">
                        Your Original Note
                      </Text>
                      <Text className="font-body text-[12.5px] text-[#475569] leading-relaxed">
                        "{item.user_points || item.raw_input}"
                      </Text>
                    </View>
                  )}

                  {/* AI Insights List */}
                  <View className="mt-1">
                    <Text className="font-display text-[11px] font-bold text-[#1A1A2E] uppercase tracking-wider mb-2.5">
                      Key Takeaways Extracted
                    </Text>
                    {takeaways.length > 0 ? (
                      takeaways.slice(0, 4).map((takeaway: string, idx: number) => (
                        <View key={idx} className="flex-row items-start mb-2.5">
                          <View className="w-5 h-5 rounded-full bg-[#F1EBFF] items-center justify-center mr-2.5 mt-0.5">
                            <Text className="font-display text-[10px] font-bold text-[#7C5CFC]">
                              {idx + 1}
                            </Text>
                          </View>
                          <Text className="font-body text-[13px] text-[#334155] leading-snug flex-1">
                            {takeaway}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text className="font-body text-[12.5px] text-[#64748B] italic">
                        Full insights saved in your Recall library.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Bottom Card Footer */}
                <View className="pt-3 border-t border-[#F1EEFE] flex-row items-center justify-between mt-4">
                  <View className="flex-row flex-wrap gap-1.5 flex-1 pr-2">
                    {(item.tags ?? []).slice(0, 2).map((tag: string) => (
                      <View key={tag} className="bg-[#F1EEFE] px-2.5 py-0.5 rounded-md">
                        <Text className="text-[#7C5CFC] text-[10px] font-medium capitalize">
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text className="font-body text-[11px] text-[#94A3B8]">
                    Tap Next to continue
                  </Text>
                </View>
              </View>
            );
          }}
        />
      </View>

      {/* Bottom Action */}
      <View className="px-5 mt-4">
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleNext}
          className="w-full bg-[#7C5CFC] h-[50px] rounded-full flex-row items-center justify-center shadow-xs"
        >
          <Text className="font-display text-[15px] font-bold text-white mr-1.5">
            {activeIndex === total - 1 ? 'Finish Digest' : 'Next Card'}
          </Text>
          <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
