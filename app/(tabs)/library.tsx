import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList,
  ScrollView, ActivityIndicator, RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInsights } from '@/hooks/useInsights';
import { InsightCard } from '@/components/InsightCard';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { TagFilter, Insight } from '@/types';
import { Image } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Filter config ─────────────────────────────────────────────
const TAG_FILTERS: { label: string; value: TagFilter }[] = [
  { label: '⭐ All', value: 'all' },
  { label: '🧠 Mindset', value: 'mindset' },
  { label: '💼 Business', value: 'business' },
  { label: '⚡ Productivity', value: 'productivity' },
  { label: '🧬 Health', value: 'health' },
  { label: '📚 Books', value: 'books' },
  { label: '💻 Coding', value: 'coding' },
  { label: '🎨 Design', value: 'design' },
  { label: '❤️ Relationships', value: 'relationships' },
  { label: '💰 Finance', value: 'finance' },
];

type SortOption = 'newest' | 'oldest' | 'favorites';

type DayGroup = {
  dateKey: string;
  title: string;
  dateBadge: string;
  items: Insight[];
};

function getDateKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch {
    return 'other';
  }
}

function formatDayHeader(dateKey: string): { title: string; dateBadge: string } {
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];

  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  if (dateKey === todayKey) {
    return {
      title: 'Today',
      dateBadge: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }

  if (dateKey === yesterdayKey) {
    return {
      title: 'Yesterday',
      dateBadge: yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }

  try {
    const d = new Date(dateKey + 'T12:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isThisYear = d.getFullYear() === today.getFullYear();

    return {
      title: `${dayName}, ${formatted}${!isThisYear ? `, ${d.getFullYear()}` : ''}`,
      dateBadge: formatted,
    };
  } catch {
    return { title: 'Earlier', dateBadge: '' };
  }
}

// ─── Empty State ───────────────────────────────────────────────
function LibraryEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <Image
        source={require('../../assets/images/libmascot.png')}
        style={{ width: 160, height: 160, marginBottom: 20, transform: [{ scale: 2 }] }}
        resizeMode="contain"
      />
      <Text className="font-display text-[22px] font-bold text-[#1A1A2E] text-center mb-3">
        {hasFilters ? 'No results found' : 'Your library is empty'}
      </Text>
      <Text className="font-body text-[14px] text-[#8888A0] text-center leading-[22px] mb-6">
        {hasFilters
          ? 'Try a different search or filter to find your saved insights.'
          : 'Save your first link and Recall will extract the key insights for you to review over time.'}
      </Text>
      {!hasFilters && (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/save')}
          className="flex-row items-center bg-[#6C5CE7] px-6 py-3 rounded-full shadow-sm shadow-purple-900/20"
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text className="font-display text-[14px] font-bold text-white ml-2">Save your first link</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────
export default function Library() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagFilter>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: insights = [], isLoading, isRefetching, refetch } = useInsights({
    search: debouncedSearch,
    tag: selectedTag,
    sort,
  });

  const onSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  };

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const hasFilters = debouncedSearch.trim().length > 0 || selectedTag !== 'all';

  // Ensure that the example link saved during onboarding appears in the library
  React.useEffect(() => {
    if (!isLoading && insights.length === 0 && !hasFilters) {
      import('@/lib/onboardingHelper').then(async ({ saveOnboardingSampleMemory }) => {
        const seeded = await saveOnboardingSampleMemory();
        if (seeded) {
          refetch();
        }
      });
    }
  }, [isLoading, insights.length, hasFilters, refetch]);

  const SORT_LABELS: Record<SortOption, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    favorites: 'Favorites only',
  };

  // Group insights day-wise
  const dayGroups: DayGroup[] = useMemo(() => {
    const groupsMap = new Map<string, Insight[]>();

    for (const item of insights) {
      const key = getDateKey(item.created_at);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(item);
    }

    const groups: DayGroup[] = [];
    for (const [dateKey, items] of groupsMap.entries()) {
      const { title, dateBadge } = formatDayHeader(dateKey);
      groups.push({
        dateKey,
        title,
        dateBadge,
        items,
      });
    }

    return groups;
  }, [insights]);

  const toggleDayCollapse = (dateKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const allCollapsed = dayGroups.length > 0 && dayGroups.every((g) => collapsedDays[g.dateKey]);

  const toggleCollapseAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (allCollapsed) {
      setCollapsedDays({});
    } else {
      const all: Record<string, boolean> = {};
      dayGroups.forEach((g) => {
        all[g.dateKey] = true;
      });
      setCollapsedDays(all);
    }
  };

  // ── Header for FlatList ──
  const renderHeader = () => (
    <View className="pt-5 pb-2">
      {/* Title row with actions */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="font-display text-[32px] font-bold text-[#1A1A2E] tracking-tight">
            Library
          </Text>
          <Text className="font-body text-[12.5px] text-[#8888A0] mt-0.5">
            {insights.length} {insights.length === 1 ? 'saved recall' : 'saved recalls'} organized by day
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Collapse / Expand all button */}
          {dayGroups.length > 1 && (
            <TouchableOpacity
              className="px-3 h-10 rounded-full bg-white shadow-sm shadow-purple-900/5 flex-row items-center justify-center border border-[#EEE9FF]"
              activeOpacity={0.8}
              onPress={toggleCollapseAll}
            >
              <Ionicons
                name={allCollapsed ? 'expand-outline' : 'contract-outline'}
                size={15}
                color="#6C5CE7"
                style={{ marginRight: 4 }}
              />
              <Text className="font-display text-[11.5px] font-bold text-[#6C5CE7]">
                {allCollapsed ? 'Expand' : 'Minimize'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Sort Menu Button */}
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white shadow-sm shadow-purple-900/5 items-center justify-center border border-[#EEE9FF]"
            activeOpacity={0.8}
            onPress={() => setShowSortMenu((v) => !v)}
          >
            <Ionicons name="options-outline" size={18} color="#1A1A2E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort menu dropdown */}
      {showSortMenu && (
        <View className="bg-white border border-[#EEE9FF] rounded-[18px] mb-4 overflow-hidden shadow-sm">
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => {
                setSort(key);
                setShowSortMenu(false);
              }}
              className="flex-row items-center justify-between px-4 py-3 border-b border-[#F5F3FF]"
            >
              <Text className={`font-body text-[14px] ${sort === key ? 'text-[#6C5CE7] font-bold' : 'text-[#1A1A2E]'}`}>
                {label}
              </Text>
              {sort === key && <Ionicons name="checkmark" size={16} color="#6C5CE7" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search bar */}
      <View className="flex-row items-center bg-white border border-[#EEE9FF] rounded-full px-4 h-[46px] mb-3.5 shadow-sm shadow-purple-900/5">
        <Ionicons name="search" size={16} color="#8888A0" />
        <TextInput
          className="flex-1 px-3 text-[#1A1A2E] font-body text-[13.5px]"
          placeholder="Search insights, titles, tags…"
          placeholderTextColor="#AFAAC0"
          value={search}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
            <Ionicons name="close-circle" size={16} color="#AFAAC0" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 24 }}
        className="mb-3"
      >
        {TAG_FILTERS.map(({ label, value }) => {
          const active = selectedTag === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setSelectedTag(value)}
              className={`px-3.5 py-1.5 rounded-full border ${active ? 'bg-[#6C5CE7] border-[#6C5CE7]' : 'bg-white border-[#EEE9FF]'}`}
            >
              <Text className={`font-body text-[12.5px] ${active ? 'text-white font-bold' : 'text-[#8888A0]'}`}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top']}>
      <View className="flex-1 px-4">
        {isLoading ? (
          <>
            {renderHeader()}
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#6C5CE7" size="large" />
            </View>
          </>
        ) : (
          <FlatList<DayGroup>
            data={dayGroups}
            keyExtractor={(group) => group.dateKey}
            renderItem={({ item: group }) => {
              const isCollapsed = Boolean(collapsedDays[group.dateKey]);

              return (
                <View className="mb-4 bg-white/70 border border-[#ECE8F7] rounded-[24px] p-3.5 shadow-xs">
                  {/* Day Header Accordion Toggle Bar */}
                  <TouchableOpacity
                    onPress={() => toggleDayCollapse(group.dateKey)}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between py-1 px-1 mb-1"
                  >
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className="w-8 h-8 rounded-[10px] bg-[#F1EEFE] items-center justify-center mr-2.5">
                        <Ionicons name="calendar-outline" size={16} color="#6C5CE7" />
                      </View>
                      <View>
                        <Text className="font-display text-[15px] font-bold text-[#1A1A2E]">
                          {group.title}
                        </Text>
                        <Text className="font-body text-[11px] text-[#8888A0]">
                          {group.items.length} {group.items.length === 1 ? 'memory' : 'memories'}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      <View className="bg-[#F4F1FE] px-2.5 py-0.5 rounded-full border border-[#E9E1FF]">
                        <Text className="font-display text-[10.5px] font-bold text-[#6C5CE7]">
                          {group.items.length}
                        </Text>
                      </View>
                      <View className="w-7 h-7 rounded-full bg-[#F8F7FF] items-center justify-center border border-[#EEE9FF]">
                        <Ionicons
                          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                          size={15}
                          color="#7C5CFC"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Day Content Container: Expanded vs Collapsed */}
                  {!isCollapsed ? (
                    <View className="pt-2">
                      {group.items.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => router.push(`/insight/${item.id}`)}
                          activeOpacity={0.85}
                          className="mb-1"
                        >
                          <InsightCard
                            id={item.id}
                            url={item.url}
                            title={item.title ?? 'Saved Link'}
                            user_points={item.user_points ?? undefined}
                            ai_insights={item.ai_insights ?? undefined}
                            tags={item.tags ?? []}
                            status={item.status}
                            created_at={item.created_at}
                            onPress={() => router.push(`/insight/${item.id}`)}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    /* Collapsed Compact State */
                    <TouchableOpacity
                      onPress={() => toggleDayCollapse(group.dateKey)}
                      activeOpacity={0.7}
                      className="bg-[#FAF9FF] border border-dashed border-[#DCD6FE] rounded-[16px] py-2.5 px-3 mt-1.5 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center">
                        <Ionicons name="layers-outline" size={14} color="#7C5CFC" style={{ marginRight: 6 }} />
                        <Text className="font-body text-[12px] text-[#6C5CE7] font-medium">
                          {group.items.length} {group.items.length === 1 ? 'recall minimized' : 'recalls minimized'}
                        </Text>
                      </View>
                      <Text className="font-display text-[11px] font-bold text-[#7C5CFC]">
                        Tap to expand
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={<LibraryEmpty hasFilters={hasFilters} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor="#6C5CE7"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

