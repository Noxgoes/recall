import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Platform, detectPlatform } from '@/lib/platform';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export type InsightCardProps = {
  id: string;
  url: string;
  title: string;
  snippet?: string;
  user_points?: string;
  ai_insights?: string[];
  tags: string[];
  status?: string;
  created_at: string;
  onPress?: () => void;
};

// Theme configs for platform brand cards
const platformThemes: Record<Platform, { 
  gradient: readonly [string, string, ...string[]]; 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string;
}> = {
  youtube: {
    gradient: ['#FF1E1E', '#CC0000'],
    icon: 'logo-youtube',
    label: 'YouTube',
  },
  shorts: {
    gradient: ['#FF1E1E', '#CC0000'],
    icon: 'logo-youtube',
    label: 'YouTube',
  },
  instagram: {
    gradient: ['#833AB4', '#FD1D1D', '#F77737'],
    icon: 'logo-instagram',
    label: 'Instagram',
  },
  twitter: {
    gradient: ['#1DA1F2', '#0C85D0'],
    icon: 'logo-twitter',
    label: 'X / Twitter',
  },
  other: {
    gradient: ['#7C5CFC', '#5A38FD'],
    icon: 'link-outline',
    label: 'Article',
  },
};

// Date formatter helper (e.g. Aug 26, 2026)
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Relative review days helper
function getReviewDaysText(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const days = (hash % 7) + 1;
  return `Reviewed ${days}d ago`;
}

// Progress width helper
function getReviewProgressWidth(id: string): number {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 30 + (hash % 60); // 30% to 90%
}

export function InsightCard({
  id,
  url,
  title,
  snippet,
  user_points,
  ai_insights,
  tags = [],
  status,
  created_at,
  onPress,
}: InsightCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const platform = detectPlatform(url);
  
  const [bookmarked, setBookmarked] = useState(false);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const defaultOnPress = () => {
    router.push(`/insight/${id}`);
  };

  // Determine actual display snippet cleanly
  const isProcessing = status === 'processing' || status === 'pending';
  const isFailed = status === 'failed';
  const displaySnippet =
    isProcessing
      ? 'AI is extracting key takeaways...'
      : isFailed
      ? (user_points || 'Tap to view or add notes.')
      : snippet ||
        (Array.isArray(ai_insights) && ai_insights.length > 0 ? ai_insights[0] : null) ||
        user_points ||
        `Key takeaways saved from ${platform === 'youtube' || platform === 'shorts' ? 'YouTube' : platform === 'twitter' ? 'X / Twitter' : 'web'}.`;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress || defaultOnPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        className="w-full bg-white border border-[#EDEAF7] rounded-[20px] p-3.5 mb-3 shadow-xs"
      >
        <View className="flex-row items-start">
          {/* Left Icon Squircle Container (Proportional & Compact) */}
          <View className="w-14 h-14 rounded-[15px] bg-[#F4F2FA] mr-3 items-center justify-center">
            {platform === 'youtube' || platform === 'shorts' ? (
              /* Perfect Proportional YouTube Play Icon */
              <View className="w-9 h-6 rounded-[7px] bg-[#FF0000] items-center justify-center shadow-xs">
                <Ionicons name="play" size={13} color="#FFFFFF" style={{ marginLeft: 1.5 }} />
              </View>
            ) : platform === 'instagram' ? (
              <LinearGradient
                colors={['#833AB4', '#FD1D1D', '#F77737']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-9 h-9 rounded-[10px] items-center justify-center"
              >
                <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
              </LinearGradient>
            ) : platform === 'twitter' ? (
              <View className="w-9 h-9 rounded-[10px] bg-[#0F1419] items-center justify-center">
                <Ionicons name="logo-twitter" size={17} color="#FFFFFF" />
              </View>
            ) : (
              <View className="w-9 h-9 rounded-[10px] bg-[#7C5CFC] items-center justify-center">
                <Ionicons name="link" size={17} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Right Header: Title + Date & Bookmark */}
          <View className="flex-1">
            <View className="flex-row items-start justify-between">
              <Text 
                className="font-display text-[14.5px] font-bold text-[#0F172A] flex-1 leading-snug pr-2" 
                numberOfLines={1}
              >
                {title || 'Untitled Insight'}
              </Text>
              
              <View className="flex-row items-center">
                <Text className="text-[10.5px] font-body text-[#94A3B8] mr-1.5">
                  {formatDate(created_at)}
                </Text>
                <TouchableOpacity 
                  onPress={() => setBookmarked(!bookmarked)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons 
                    name={bookmarked ? "bookmark" : "bookmark-outline"} 
                    size={15} 
                    color={bookmarked ? "#7C5CFC" : "#CBD5E1"} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Snippet / Takeaway text */}
            <Text 
              className="text-[12px] text-[#64748B] font-body leading-relaxed mt-1" 
              numberOfLines={2}
            >
              {displaySnippet}
            </Text>
          </View>
        </View>

        {/* Bottom Bar: Tags + Review Status */}
        <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-[#F5F3FF]">
          {/* Left: Tags */}
          <View className="flex-row flex-wrap gap-1 flex-1 pr-2">
            {tags.slice(0, 2).map((tag) => (
              <View key={tag} className="bg-[#F1EEFE] rounded-md px-2.5 py-0.5 justify-center items-center">
                <Text className="text-[#7C5CFC] text-[10px] font-medium capitalize">
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* Right: Review Progress */}
          <View className="flex-row items-center gap-2">
            <Text className="text-[9.5px] font-body text-[#94A3B8]">
              {getReviewDaysText(id)}
            </Text>
            <View className="w-[48px] h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
              <View 
                className="h-full bg-[#7C5CFC] rounded-full" 
                style={{ width: `${getReviewProgressWidth(id)}%` }}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
