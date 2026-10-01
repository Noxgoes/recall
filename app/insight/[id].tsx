import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Linking, Share, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useInsight, useDeleteInsight, useToggleFavorite, useUpdateNotes } from '@/hooks/useInsights';
import { useRecordReview } from '@/hooks/useReviews';
import { platformLabels, platformColors, detectPlatform } from '@/lib/platform';
import type { Platform } from '@/types';

export default function InsightDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: insight, isLoading, error } = useInsight(id);
  const { mutateAsync: deleteInsight, isPending: isDeleting } = useDeleteInsight();
  const { mutateAsync: toggleFavorite, isPending: isTogglingFav } = useToggleFavorite();
  const { mutateAsync: updateNotes, isPending: isSavingNotes } = useUpdateNotes();
  const { mutateAsync: recordReview } = useRecordReview();

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // ── Handlers ──────────────────────────────────────────────
  const handleOpenLink = async () => {
    if (!insight?.url) return;
    try {
      await Linking.openURL(insight.url);
    } catch {
      Alert.alert('Error', 'Cannot open this URL.');
    }
  };

  const handleShare = async () => {
    if (!insight) return;
    const items = insight.insight_items ?? []
    const text = [
      insight.title ?? 'Saved Insight',
      '',
      ...items.map((it, i) => `${i + 1}. ${it.content}`),
      '',
      `Source: ${insight.url}`,
    ].join('\n');
    await Share.share({ message: text, title: insight.title ?? '' });
  };

  const handleDelete = () => {
    Alert.alert('Delete Insight', 'This will permanently delete this insight and all its reviews.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteInsight(id);
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleFavorite = async () => {
    if (!insight) return;
    try {
      await toggleFavorite({ id: insight.id, current: insight.is_favorited });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateNotes({ id, notes: notesValue });
      setEditingNotes(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleMarkReviewed = async () => {
    if (!insight) return;
    const firstDueItem = (insight.insight_items ?? [])[0];
    if (!firstDueItem) {
      Alert.alert('No items', 'This insight has no takeaways to review.');
      return;
    }
    try {
      await recordReview({ item: firstDueItem, rating: 'good' });
      Alert.alert('Reviewed!', 'Marked as reviewed. This insight will resurface at the right time.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 bg-[#FAFAFC] justify-center items-center">
        <ActivityIndicator color="#6C5CE7" size="large" />
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error || !insight) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFC] items-center justify-center px-8" edges={['top']}>
        <Ionicons name="alert-circle-outline" size={56} color="#EE4444" />
        <Text className="font-display text-[20px] font-bold text-[#1A1A2E] mt-4 text-center">Insight not found</Text>
        <Text className="font-body text-[14px] text-[#8888A0] mt-2 text-center">
          {error?.message ?? 'This insight may have been deleted.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-[#6C5CE7] px-6 py-3 rounded-full">
          <Text className="font-display text-white text-[14px] font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const platform = detectPlatform(insight.url);
  const color = platformColors[platform] ?? '#6C5CE7';
  const label = platformLabels[platform] ?? 'Saved link';
  const formattedDate = new Date(insight.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-2 mt-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white shadow-sm shadow-purple-900/5 items-center justify-center border border-[#EEE9FF]"
        >
          <Ionicons name="chevron-back" size={20} color="#1A1A2E" />
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={handleFavorite}
            disabled={isTogglingFav}
            className="w-10 h-10 rounded-full bg-white shadow-sm shadow-purple-900/5 items-center justify-center border border-[#EEE9FF]"
          >
            <Ionicons
              name={insight.is_favorited ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={insight.is_favorited ? '#6C5CE7' : '#1A1A2E'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            className="w-10 h-10 rounded-full bg-white shadow-sm shadow-purple-900/5 items-center justify-center border border-[#EEE9FF]"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#1A1A2E" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 150 }}
        className="px-5 pt-4 flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Meta */}
        <View className="mb-4">
          <Text className="font-display text-[28px] font-bold text-[#1A1A2E] leading-[34px] tracking-tight">
            {insight.title}
          </Text>

          <View className="flex-row flex-wrap items-center mt-3 gap-y-2">
            <View className="flex-row items-center mr-3">
              <View className="w-4 h-4 rounded-full mr-1 items-center justify-center" style={{ backgroundColor: color }}>
                <Ionicons
                  name={
                    platform === 'youtube' || platform === 'shorts'
                      ? 'logo-youtube'
                      : platform === 'instagram'
                      ? 'logo-instagram'
                      : platform === 'twitter'
                      ? 'logo-twitter'
                      : 'link'
                  }
                  size={10}
                  color="#FFF"
                />
              </View>
              <Text className="text-[12px] font-body-medium text-[#1A1A2E]">{label}</Text>
            </View>
            <Text className="text-[12px] font-body text-[#8888A0]">Saved {formattedDate}</Text>
          </View>

          {/* Tags */}
          {insight.tags?.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {insight.tags.map(tag => (
                <View key={tag} className="bg-[#F3F1FC] px-3 py-1.5 rounded-full">
                  <Text className="text-[11px] font-body-medium text-[#6C5CE7]">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* AI Summary Card */}
        <View className="mt-2 mb-6 rounded-[24px] border border-[#EEE9FF]/70 overflow-hidden">
          <LinearGradient
            colors={['#F8F7FF', '#F0EEFF']}
            style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 26 }}
          >
            <View className="flex-row items-center mb-2.5">
              <Ionicons name="sparkles" size={16} color="#6C5CE7" />
              <Text className="font-display text-[15px] font-bold text-[#1A1A2E] ml-2">AI Summary</Text>
            </View>
            <Text className="font-body text-[13.5px] leading-[22px] text-[#3F3F5A]">
              {insight.raw_input && insight.raw_input.trim().length > 0
                ? insight.raw_input
                : (insight.insight_items?.[0]?.content ?? 'AI extracted the key insights from this content for you.')}
            </Text>
          </LinearGradient>
        </View>

        {/* Key Takeaways — from insight_items */}
        {(insight.insight_items?.length ?? 0) > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4 px-1">
              <View className="flex-row items-center">
                <Ionicons name="star-outline" size={18} color="#6C5CE7" />
                <Text className="font-display text-[16px] font-bold text-[#1A1A2E] ml-2">Key Takeaways</Text>
              </View>
              <Text className="font-body text-[12px] text-[#8888A0]">{insight.insight_items!.length} insights</Text>
            </View>

            <View className="gap-3">
              {insight.insight_items!.map((it, index) => {
                const isExpanded = expandedIndex === index;
                const dotIndex = it.content.indexOf('. ');
                const title = dotIndex !== -1 ? it.content.slice(0, dotIndex + 1) : it.content;
                const description = dotIndex !== -1 ? it.content.slice(dotIndex + 2) : '';
                const icons: (keyof typeof Ionicons.glyphMap)[] = ['bulb-outline', 'eye-outline', 'rocket-outline', 'heart-outline', 'star-outline'];

                return (
                  <TouchableOpacity
                    key={it.id}
                    onPress={() => setExpandedIndex(isExpanded ? null : index)}
                    activeOpacity={0.7}
                    className="bg-white border border-[#EEE9FF] rounded-[20px] p-4 shadow-sm shadow-purple-900/5 flex-row items-start"
                  >
                    <View className="w-10 h-10 rounded-[12px] bg-[#F8F7FF] items-center justify-center mr-3 mt-0.5">
                      <Ionicons name={icons[index % icons.length]} size={20} color="#6C5CE7" />
                    </View>
                    <View className="flex-1 mr-2">
                      <Text className="font-display text-[14px] font-bold text-[#1A1A2E] leading-snug mb-1">
                        {title}
                      </Text>
                      {isExpanded && description ? (
                        <Text className="font-body text-[13px] leading-[20px] text-[#70708C] mt-1">{description}</Text>
                      ) : null}
                    </View>
                    {description ? (
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#8888A0" style={{ marginTop: 4 }} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* My Notes */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4 px-1">
            <View className="flex-row items-center">
              <Ionicons name="pencil-outline" size={18} color="#6C5CE7" />
              <Text className="font-display text-[16px] font-bold text-[#1A1A2E] ml-2">My Notes</Text>
            </View>
            {!editingNotes && (
              <TouchableOpacity onPress={() => { setNotesValue(insight.raw_input ?? ''); setEditingNotes(true); }}>
                <Text className="font-body text-[12px] text-[#6C5CE7]">Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingNotes ? (
            <View className="bg-white border border-[#6C5CE7] rounded-[20px] p-4 shadow-sm">
              <TextInput
                value={notesValue}
                onChangeText={setNotesValue}
                multiline
                autoFocus
                className="font-body text-[14px] leading-[22px] text-[#4A4A68] min-h-[80px]"
                style={{ textAlignVertical: 'top' }}
                placeholder="Add your thoughts, reflections, or context…"
                placeholderTextColor="#AFAAC0"
              />
              <View className="flex-row gap-3 mt-3 justify-end">
                <TouchableOpacity onPress={() => setEditingNotes(false)}>
                  <Text className="font-body text-[13px] text-[#8888A0]">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="bg-[#6C5CE7] px-4 py-1.5 rounded-full"
                >
                  <Text className="font-display text-[12px] font-bold text-white">
                    {isSavingNotes ? 'Saving…' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : insight.raw_input ? (
            <View className="bg-white border border-[#EEE9FF] rounded-[20px] p-5 shadow-sm shadow-purple-900/5">
              <Text className="font-body text-[#4A4A68] text-[14px] leading-[22px]">{insight.raw_input}</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => { setNotesValue(''); setEditingNotes(true); }}
              className="bg-white border border-dashed border-[#D5D1FF] rounded-[20px] p-5 items-center"
            >
              <Ionicons name="add-circle-outline" size={24} color="#AFAAC0" />
              <Text className="font-body text-[13px] text-[#AFAAC0] mt-2">Tap to add a personal note</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Source */}
        <View className="mb-8">
          <TouchableOpacity
            onPress={handleOpenLink}
            className="flex-row items-center bg-white border border-[#EEE9FF] rounded-[16px] p-4 shadow-sm shadow-purple-900/5"
          >
            <View className="w-9 h-9 rounded-[10px] bg-[#F8F7FF] items-center justify-center mr-3">
              <Ionicons name="link-outline" size={18} color="#6C5CE7" />
            </View>
            <View className="flex-1">
              <Text className="font-display text-[13px] font-bold text-[#1A1A2E]">Open Original</Text>
              <Text className="font-body text-[11px] text-[#8888A0] mt-0.5" numberOfLines={1}>{insight.url}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color="#8888A0" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="bg-[#FAFAFC] px-5 py-3 pb-5 border-t border-[#EEE9FF] flex-row items-center gap-3">
        <TouchableOpacity
          onPress={handleMarkReviewed}
          className="flex-[1.2] bg-[#6C5CE7] h-[48px] rounded-[14px] flex-row items-center justify-center shadow-sm shadow-purple-900/20"
        >
          <Ionicons name="checkmark" size={16} color="#FFF" />
          <Text className="font-display text-[13px] font-bold text-white ml-1.5">Mark Reviewed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setNotesValue(insight.raw_input ?? ''); setEditingNotes(true); }}
          className="flex-1 bg-white border border-[#EEE9FF] h-[48px] rounded-[14px] flex-row items-center justify-center shadow-sm shadow-purple-900/5"
        >
          <Ionicons name="pencil" size={14} color="#6C5CE7" />
          <Text className="font-display text-[12px] font-bold text-[#6C5CE7] ml-1.5">Add Note</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          className="flex-[0.7] bg-white border border-[#EEE9FF] h-[48px] rounded-[14px] flex-row items-center justify-center shadow-sm shadow-purple-900/5"
        >
          <Ionicons name="share-outline" size={16} color="#6C5CE7" />
          <Text className="font-display text-[12px] font-bold text-[#6C5CE7] ml-1.5">Share</Text>
        </TouchableOpacity>
      </View>

      {/* Options Menu Modal */}
      <Modal transparent visible={showMenu} animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity className="flex-1 bg-black/40" onPress={() => setShowMenu(false)} activeOpacity={1}>
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] p-6 pb-10">
            <View className="w-12 h-1.5 bg-[#EEE9FF] rounded-full self-center mb-6" />

            <TouchableOpacity
              onPress={() => { setShowMenu(false); handleOpenLink(); }}
              className="flex-row items-center py-4 border-b border-[#F5F3FF]"
            >
              <Ionicons name="open-outline" size={20} color="#1A1A2E" />
              <Text className="font-body text-[16px] text-[#1A1A2E] ml-4">Open Original</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowMenu(false); handleShare(); }}
              className="flex-row items-center py-4 border-b border-[#F5F3FF]"
            >
              <Ionicons name="share-social-outline" size={20} color="#1A1A2E" />
              <Text className="font-body text-[16px] text-[#1A1A2E] ml-4">Share Insight</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowMenu(false); handleDelete(); }}
              className="flex-row items-center py-4"
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text className="font-body text-[16px] text-[#EF4444] ml-4">Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
