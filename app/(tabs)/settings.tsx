import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  TextInput,
  Image,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/PaywallModal';
import {
  requestNotificationPermission,
  scheduleDailyDigest,
  cancelDailyDigest,
  parseTimeStringToHourMinute,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/lib/queryClient';
import { clearOnboardingCompleted } from '@/lib/onboardingHelper';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: stats } = useProfileStats();
  const { name, avatarUri, updateProfile, email } = useProfile();
  const { isPro } = useSubscription();

  const [showPaywall, setShowPaywall] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // ── Profile editing state ──────────────────────────────────
  const [editName, setEditName] = useState(name);
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(avatarUri);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setEditName(name);
    setEditAvatarUri(avatarUri);
  }, [name, avatarUri]);

  // ── State for Toggles ──────────────────────────────────────
  const [dailyReminder, setDailyReminder] = useState(true);
  const [saveAutomatically, setSaveAutomatically] = useState(true);
  const [extractInsights, setExtractInsights] = useState(true);
  const [archiveCompleted, setArchiveCompleted] = useState(false);

  // ── State for Selection Settings ───────────────────────────
  const [reviewTime, setReviewTime] = useState('8:00 AM');
  const [dailyGoal, setDailyGoal] = useState('5 memories');
  const [sortOrder, setSortOrder] = useState('Newest first');
  const [appearance, setAppearance] = useState<'System' | 'Light' | 'Dark'>('System');

  // ── Notification handlers ──────────────────────────────────
  const handleToggleReminder = async (enabled: boolean) => {
    setDailyReminder(enabled);
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your phone settings to receive daily recall reminders.'
        );
        setDailyReminder(false);
        return;
      }
      const { hour, minute } = parseTimeStringToHourMinute(reviewTime);
      await scheduleDailyDigest(hour, minute);
      Alert.alert('Reminder Set ⏰', `Daily recall notifications scheduled every morning at ${reviewTime}.`);
    } else {
      await cancelDailyDigest();
    }
  };

  const handleSelectReviewTime = async (newTime: string) => {
    setReviewTime(newTime);
    setActiveModal(null);
    if (dailyReminder) {
      const { hour, minute } = parseTimeStringToHourMinute(newTime);
      await scheduleDailyDigest(hour, minute);
      Alert.alert('Time Updated ⏰', `Your daily recall notification is now set to ${newTime}.`);
    }
  };

  // ── Modals ────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<
    'reviewTime' | 'dailyGoal' | 'sortOrder' | 'appearance' | 'profile' | null
  >(null);

  // Avatar initial
  const userInitial = (name || email || 'U').charAt(0).toUpperCase();

  // Pick photo from library
  const handlePickPhoto = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please allow access to your photo library in settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setEditAvatarUri(result.assets[0].uri);
      }
    } catch (e: any) {
      console.warn('Image picker error:', e);
      Alert.alert(
        'Rebuild Required',
        'You added `expo-image-picker` after building your APK. Run `npx expo run:android` in your terminal to rebuild your custom APK with the new image picker native code.'
      );
    }
  };

  // Take photo with camera
  const handleTakeCameraPhoto = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow camera access in your device settings.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setEditAvatarUri(result.assets[0].uri);
      }
    } catch (e: any) {
      console.warn('Camera error:', e);
      Alert.alert(
        'Rebuild Required',
        'You added `expo-image-picker` after building your APK. Run `npx expo run:android` in your terminal to rebuild your custom APK with the camera native code.'
      );
    }
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setEditAvatarUri(null);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a valid username.');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile(editName.trim(), editAvatarUri);
      setActiveModal(null);
      Alert.alert('Profile Updated', 'Your username and profile picture have been updated.');
    } catch (e: any) {
      Alert.alert('Error saving profile', e.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Progress stats (dynamically fetched from Supabase)
  const totalSavedFormatted = stats?.totalInsights !== undefined
    ? stats.totalInsights.toLocaleString()
    : '0';
  const totalReviewedFormatted = stats?.totalReviews !== undefined
    ? stats.totalReviews.toLocaleString()
    : '0';
  const streakFormatted = stats?.currentStreak !== undefined 
    ? `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}` 
    : '0 days';
  const retentionFormatted = stats?.knowledgeScore !== undefined 
    ? `${stats.knowledgeScore}%` 
    : '0%';

  // Options
  const reviewTimeOptions = ['7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM', '8:00 PM'];
  const dailyGoalOptions = ['3 memories a day', '5 memories a day', '10 memories a day', '15 memories a day'];
  const sortOptions = ['Newest first', 'Oldest first', 'Alphabetical', 'Highest retention'];
  const appearanceOptions: ('System' | 'Light' | 'Dark')[] = ['System', 'Light', 'Dark'];

  const handleAction = (title: string, msg?: string) => {
    Alert.alert(title, msg || `${title} options.`);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Recall?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your saved memories, tags, and review history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const uid = session?.user?.id;

              // 1. Invoke Supabase delete-account Edge Function
              try {
                await supabase.functions.invoke('delete-account');
              } catch (fnErr) {
                console.warn('Edge function delete-account fallback:', fnErr);
              }

              // 2. Direct database cleanup fallback
              if (uid) {
                await supabase.from('reviews').delete().eq('user_id', uid);
                await supabase.from('insight_items').delete().eq('user_id', uid);
                await supabase.from('insights').delete().eq('user_id', uid);
                await supabase.from('notes').delete().eq('user_id', uid);
                await supabase.from('notification_settings').delete().eq('user_id', uid);

                // Clear user-specific storage keys
                await AsyncStorage.removeItem(`recall_user_name_${uid}`);
                await AsyncStorage.removeItem(`recall_user_avatar_${uid}`);
                await AsyncStorage.removeItem(`recall_pro_status_${uid}`);
                await AsyncStorage.removeItem(`recall_user_plan_${uid}`);
                await AsyncStorage.removeItem(`recall_trial_used_${uid}`);
                await AsyncStorage.removeItem(`recall_trial_start_${uid}`);
                await clearOnboardingCompleted(uid);
              }

              // 3. Clear cache and sign out
              const { resetSubscriptionCache } = await import('@/hooks/useSubscription');
              resetSubscriptionCache();
              queryClient.clear();
              await supabase.auth.signOut();

              Alert.alert('Account Deleted', 'Your account and all saved memories have been permanently deleted.');
              router.replace('/(auth)/signup');
            } catch (err: any) {
              console.error('Account deletion failed:', err);
              Alert.alert('Error', err.message || 'Failed to delete account. Please try again.');
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top']}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2">
        <Text className="font-display text-[32px] font-bold text-[#1A1A2E] tracking-tight">
          Settings
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveModal('profile')}
          className="bg-white border border-[#EEE9FF] rounded-[22px] px-4 py-3.5 mb-6 flex-row items-center justify-between shadow-sm shadow-purple-900/5"
        >
          <View className="flex-row items-center flex-1 pr-2">
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                className="w-12 h-12 rounded-full mr-3.5 border border-[#EEE9FF]"
              />
            ) : (
              <View className="w-12 h-12 rounded-full bg-[#7A6BFF] items-center justify-center mr-3.5 border border-white shadow-sm">
                <Text className="font-display text-[18px] font-bold text-white">{userInitial}</Text>
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="font-display text-[16px] font-bold text-[#1A1A2E] leading-tight mr-2">
                  {name}
                </Text>
                <View className="bg-[#F3F0FF] px-2 py-0.5 rounded-full border border-[#E3DCFF]">
                  <Text className="text-[10px] font-body-medium text-[#7A6BFF]">Edit</Text>
                </View>
              </View>
              <Text className="font-body text-[13px] text-[#8888A0] mt-0.5" numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
        </TouchableOpacity>

        {/* SECTION 1 — DAILY RECALL */}
        <View className="mb-6">
          <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2 px-1">
            Daily Recall
          </Text>
          <View className="bg-white border border-[#EEE9FF] rounded-[22px] overflow-hidden shadow-sm shadow-purple-900/5">
            {/* Row 1: Review Time */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveModal('reviewTime')}
              className="px-4 py-3.5 min-h-[56px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-[10px] bg-[#F3F0FF] items-center justify-center mr-3">
                  <Ionicons name="time-outline" size={18} color="#7A6BFF" />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Review Time</Text>
                  <Text className="font-body text-[12px] text-[#8888A0] mt-0.5">
                    Every morning at {reviewTime}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            {/* Row 2: Daily Goal */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveModal('dailyGoal')}
              className="px-4 py-3.5 min-h-[56px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-[10px] bg-[#F3F0FF] items-center justify-center mr-3">
                  <Ionicons name="checkmark-circle-outline" size={18} color="#7A6BFF" />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Daily Goal</Text>
                  <Text className="font-body text-[12px] text-[#8888A0] mt-0.5">
                    {dailyGoal.includes('memories') ? dailyGoal : `${dailyGoal} memories a day`}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            {/* Row 3: Daily Reminder */}
            <View className="px-4 py-3.5 min-h-[56px] flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-[10px] bg-[#F3F0FF] items-center justify-center mr-3">
                  <Ionicons name="notifications-outline" size={18} color="#7A6BFF" />
                </View>
                <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Daily Reminder</Text>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={handleToggleReminder}
                trackColor={{ false: '#E9E7F2', true: '#7A6BFF' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E9E7F2"
              />
            </View>
          </View>
        </View>

        {/* SECTION 2 — SAVING */}
        <View className="mb-6">
          <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2 px-1">
            Saving
          </Text>
          <View className="bg-white border border-[#EEE9FF] rounded-[22px] overflow-hidden shadow-sm shadow-purple-900/5">
            {/* Row 1: Save Automatically */}
            <View className="px-4 py-3.5 min-h-[56px] border-b border-[#F4F2FF] flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-[10px] bg-[#F3F0FF] items-center justify-center mr-3">
                  <Ionicons name="share-outline" size={18} color="#7A6BFF" />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Save Automatically</Text>
                  <Text className="font-body text-[12px] text-[#8888A0] mt-0.5">Save shared links instantly</Text>
                </View>
              </View>
              <Switch
                value={saveAutomatically}
                onValueChange={setSaveAutomatically}
                trackColor={{ false: '#E9E7F2', true: '#7A6BFF' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E9E7F2"
              />
            </View>

            {/* Row 2: Extract Insights Automatically */}
            <View className="px-4 py-3.5 min-h-[56px] flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-[10px] bg-[#F3F0FF] items-center justify-center mr-3">
                  <Ionicons name="sparkles-outline" size={18} color="#7A6BFF" />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">
                    Extract Insights Automatically
                  </Text>
                  <Text className="font-body text-[12px] text-[#8888A0] mt-0.5">
                    Turn saved content into memories
                  </Text>
                </View>
              </View>
              <Switch
                value={extractInsights}
                onValueChange={setExtractInsights}
                trackColor={{ false: '#E9E7F2', true: '#7A6BFF' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E9E7F2"
              />
            </View>
          </View>
        </View>

        {/* SECTION 3 — LIBRARY */}
        <View className="mb-6">
          <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2 px-1">
            Library
          </Text>
          <View className="bg-white border border-[#EEE9FF] rounded-[22px] overflow-hidden shadow-sm shadow-purple-900/5">
            {/* Row 1: Sort Memories */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveModal('sortOrder')}
              className="px-4 py-3.5 min-h-[56px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <View className="flex-1 mr-2">
                <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Sort Memories</Text>
                <Text className="font-body text-[12px] text-[#8888A0] mt-0.5">{sortOrder}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            {/* Row 2: Archive Completed Memories */}
            <View className="px-4 py-3.5 min-h-[56px] flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">
                  Archive Completed Memories
                </Text>
                <Text className="font-body text-[12px] text-[#8888A0] mt-0.5 leading-snug">
                  Keep mastered memories out of your active library
                </Text>
              </View>
              <Switch
                value={archiveCompleted}
                onValueChange={setArchiveCompleted}
                trackColor={{ false: '#E9E7F2', true: '#7A6BFF' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E9E7F2"
              />
            </View>
          </View>
        </View>

        {/* SECTION 4 — APPEARANCE */}
        <View className="mb-6">
          <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2 px-1">
            Appearance
          </Text>
          <View className="bg-white border border-[#EEE9FF] rounded-[22px] overflow-hidden shadow-sm shadow-purple-900/5">
            {/* Appearance */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveModal('appearance')}
              className="px-4 py-3.5 min-h-[56px] flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-[10px] bg-[#F3F0FF] items-center justify-center mr-3">
                  <Ionicons name="moon-outline" size={18} color="#7A6BFF" />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Appearance</Text>
                  <Text className="font-body text-[12px] text-[#8888A0] mt-0.5">{appearance}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 5 — YOUR PROGRESS */}
        <View className="mb-6">
          <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2.5 px-1">
            Your Progress
          </Text>

          <View className="gap-3">
            {/* Row 1 */}
            <View className="flex-row gap-3">
              {/* 1. Ideas Saved */}
              <View className="flex-1 bg-white border border-[#EEE9FF] rounded-[22px] p-4 shadow-sm shadow-purple-900/5">
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="w-9 h-9 rounded-[12px] bg-[#F4F0FF] items-center justify-center">
                    <Ionicons name="bulb-outline" size={18} color="#6C5CE7" />
                  </View>
                  <View className="bg-[#F4F0FF] px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-[#6C5CE7]">Saved</Text>
                  </View>
                </View>
                <Text className="font-display text-[26px] font-bold text-[#1A1A2E] leading-tight">
                  {totalSavedFormatted}
                </Text>
                <Text className="font-body text-[12px] font-medium text-[#8888A0] mt-0.5">
                  Ideas Saved
                </Text>
              </View>

              {/* 2. Reviewed */}
              <View className="flex-1 bg-white border border-[#EEE9FF] rounded-[22px] p-4 shadow-sm shadow-purple-900/5">
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="w-9 h-9 rounded-[12px] bg-[#EBFBEE] items-center justify-center">
                    <Ionicons name="checkmark-done-outline" size={18} color="#27AE60" />
                  </View>
                  <View className="bg-[#EBFBEE] px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-[#27AE60]">Done</Text>
                  </View>
                </View>
                <Text className="font-display text-[26px] font-bold text-[#1A1A2E] leading-tight">
                  {totalReviewedFormatted}
                </Text>
                <Text className="font-body text-[12px] font-medium text-[#8888A0] mt-0.5">
                  Reviewed
                </Text>
              </View>
            </View>

            {/* Row 2 */}
            <View className="flex-row gap-3">
              {/* 3. Review Streak */}
              <View className="flex-1 bg-white border border-[#EEE9FF] rounded-[22px] p-4 shadow-sm shadow-purple-900/5">
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="w-9 h-9 rounded-[12px] bg-[#FFF0F0] items-center justify-center">
                    <Ionicons name="flame-outline" size={18} color="#FF6B6B" />
                  </View>
                  <View className="bg-[#FFF0F0] px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-[#FF6B6B]">Streak</Text>
                  </View>
                </View>
                <Text className="font-display text-[26px] font-bold text-[#1A1A2E] leading-tight">
                  {streakFormatted}
                </Text>
                <Text className="font-body text-[12px] font-medium text-[#8888A0] mt-0.5">
                  Daily Streak
                </Text>
              </View>

              {/* 4. Retention Rate */}
              <View className="flex-1 bg-white border border-[#EEE9FF] rounded-[22px] p-4 shadow-sm shadow-purple-900/5">
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="w-9 h-9 rounded-[12px] bg-[#FFF8E7] items-center justify-center">
                    <Ionicons name="trending-up-outline" size={18} color="#F2994A" />
                  </View>
                  <View className="bg-[#FFF8E7] px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-[#F2994A]">Score</Text>
                  </View>
                </View>
                <Text className="font-display text-[26px] font-bold text-[#1A1A2E] leading-tight">
                  {retentionFormatted}
                </Text>
                <Text className="font-body text-[12px] font-medium text-[#8888A0] mt-0.5">
                  Retention Rate
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 6 — ACCOUNT */}
        <View className="mb-6">
          <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2 px-1">
            Account
          </Text>
          <View className="bg-white border border-[#EEE9FF] rounded-[22px] overflow-hidden shadow-sm shadow-purple-900/5">
            {/* Edit Profile */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveModal('profile')}
              className="px-4 py-3.5 min-h-[52px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Edit Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            {/* Manage Subscription */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowPaywall(true)}
              className="px-4 py-3.5 min-h-[52px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2">
                <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Manage Subscription</Text>
                {isPro && (
                  <View className="px-2 py-0.5 rounded-full bg-[#7A6BFF]">
                    <Text className="text-[10px] font-bold text-white">PRO</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            {/* Export Memories */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAction('Export Memories', 'Exporting JSON / Markdown archive of your memories.')}
              className="px-4 py-3.5 min-h-[52px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Export Memories</Text>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDeleteAccount}
              className="px-4 py-3.5 min-h-[52px] flex-row items-center justify-between"
            >
              <Text className="font-display text-[15px] font-medium text-[#EF4444]">Delete Account</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFC4C4" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 7 — SUPPORT */}
        <View className="mb-8">
          <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2 px-1">
            Support
          </Text>
          <View className="bg-white border border-[#EEE9FF] rounded-[22px] overflow-hidden shadow-sm shadow-purple-900/5">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAction('Help Center')}
              className="px-4 py-3.5 min-h-[52px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Help Center</Text>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAction('Send Feedback')}
              className="px-4 py-3.5 min-h-[52px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Send Feedback</Text>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/privacy-policy')}
              className="px-4 py-3.5 min-h-[52px] border-b border-[#F4F2FF] flex-row items-center justify-between"
            >
              <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/terms-of-service')}
              className="px-4 py-3.5 min-h-[52px] flex-row items-center justify-between"
            >
              <Text className="font-display text-[15px] font-medium text-[#1A1A2E]">Terms of Use</Text>
              <Ionicons name="chevron-forward" size={18} color="#C4C4D0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* FOOTER */}
        <View className="items-center py-6">
          <Text className="font-display text-[16px] font-bold text-[#8888A0] tracking-tight">
            Recall
          </Text>
          <Text className="font-body text-[12px] text-[#AFAAC0] mt-1">
            Your ideas. Remembered.
          </Text>
          <Text className="font-body text-[11px] text-[#C4C4D0] mt-3">
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* ── Selection Modals ───────────────────────────────────── */}
      {/* 1. Profile Edit Sheet Modal */}
      <Modal
        transparent
        visible={activeModal === 'profile'}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-t-[28px] p-6 pb-10 max-h-[85%]"
          >
            <View className="w-10 h-1 bg-[#E9E7F2] rounded-full self-center mb-5" />

            <View className="flex-row items-center justify-between mb-6">
              <Text className="font-display text-[20px] font-bold text-[#1A1A2E]">
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#F4F2FF] items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#8888A0" />
              </TouchableOpacity>
            </View>

            {/* Avatar Edit Area */}
            <View className="items-center mb-6">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickPhoto}
                className="relative"
              >
                {editAvatarUri ? (
                  <Image
                    source={{ uri: editAvatarUri }}
                    className="w-24 h-24 rounded-full border-2 border-[#EEE9FF]"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-[#7A6BFF] items-center justify-center border-2 border-white shadow-sm">
                    <Text className="font-display text-[36px] font-bold text-white">
                      {userInitial}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Photo Action Buttons */}
              <View className="flex-row items-center gap-3 mt-3.5">
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  className="flex-row items-center bg-[#F3F0FF] px-3.5 py-2 rounded-full border border-[#E3DCFF]"
                >
                  <Ionicons name="image-outline" size={15} color="#7A6BFF" style={{ marginRight: 4 }} />
                  <Text className="font-display text-[12px] font-bold text-[#7A6BFF]">
                    Gallery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleTakeCameraPhoto}
                  className="flex-row items-center bg-[#F3F0FF] px-3.5 py-2 rounded-full border border-[#E3DCFF]"
                >
                  <Ionicons name="camera-outline" size={15} color="#7A6BFF" style={{ marginRight: 4 }} />
                  <Text className="font-display text-[12px] font-bold text-[#7A6BFF]">
                    Camera
                  </Text>
                </TouchableOpacity>

                {editAvatarUri && (
                  <TouchableOpacity
                    onPress={handleRemovePhoto}
                    className="flex-row items-center bg-[#FFF0F0] px-3 py-2 rounded-full border border-[#FFD5D5]"
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text className="font-display text-[12px] font-bold text-[#EF4444]">
                      Remove
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Preset Avatars */}
              <View className="flex-row items-center gap-2.5 mt-4">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
                  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
                  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
                ].map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setEditAvatarUri(url)}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 ${
                      editAvatarUri === url ? 'border-[#7A6BFF]' : 'border-transparent'
                    }`}
                  >
                    <Image source={{ uri: url }} className="w-full h-full" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Photo URL Input Field */}
            <View className="mb-4">
              <Text className="text-[12px] font-semibold text-[#8888A0] uppercase tracking-wider mb-1.5 px-1">
                Profile Photo Link / URL
              </Text>
              <View className="bg-[#F8F7FF] border border-[#EEE9FF] rounded-[16px] px-4 h-[48px] flex-row items-center justify-between">
                <TextInput
                  value={editAvatarUri || ''}
                  onChangeText={(val) => setEditAvatarUri(val.trim() || null)}
                  placeholder="https://example.com/avatar.jpg"
                  placeholderTextColor="#AFAAC0"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 font-body text-[13px] text-[#1A1A2E] h-full"
                />
                {editAvatarUri && (
                  <TouchableOpacity onPress={() => setEditAvatarUri(null)}>
                    <Ionicons name="close-circle" size={16} color="#C4C4D0" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Username Input */}
            <View className="mb-4">
              <Text className="text-[12px] font-semibold text-[#8888A0] uppercase tracking-wider mb-1.5 px-1">
                Username
              </Text>
              <View className="bg-[#F8F7FF] border border-[#EEE9FF] rounded-[16px] px-4 h-[52px] flex-row items-center justify-between">
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor="#AFAAC0"
                  className="flex-1 font-display text-[15px] text-[#1A1A2E] h-full"
                />
                {editName.length > 0 && (
                  <TouchableOpacity onPress={() => setEditName('')}>
                    <Ionicons name="close-circle" size={18} color="#C4C4D0" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Email (Read-Only) */}
            <View className="mb-6">
              <Text className="text-[12px] font-semibold text-[#8888A0] uppercase tracking-wider mb-1.5 px-1">
                Email Address
              </Text>
              <View className="bg-[#F4F4F8] border border-[#EBEBF0] rounded-[16px] px-4 h-[52px] flex-row items-center justify-between opacity-80">
                <Text className="font-body text-[14px] text-[#7A7593]">{email}</Text>
                <Ionicons name="lock-closed" size={14} color="#AFAAC0" />
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
              className="bg-[#7A6BFF] h-[52px] rounded-[16px] items-center justify-center mb-3 shadow-sm shadow-purple-900/20"
            >
              <Text className="font-display text-[15px] font-bold text-white">
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignOut}
              className="py-3 items-center justify-center flex-row"
            >
              <Ionicons name="log-out-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text className="font-display text-[14px] font-bold text-[#EF4444]">
                Sign Out
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 2. Review Time Modal */}
      <Modal
        transparent
        visible={activeModal === 'reviewTime'}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/30 justify-end"
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View className="bg-white rounded-t-[28px] p-6 pb-10">
            <View className="w-10 h-1 bg-[#E9E7F2] rounded-full self-center mb-5" />
            <Text className="font-display text-[18px] font-bold text-[#1A1A2E] mb-4">
              Daily Review Time
            </Text>
            {reviewTimeOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => handleSelectReviewTime(item)}
                className="py-3.5 border-b border-[#F4F2FF] flex-row items-center justify-between"
              >
                <Text
                  className={`font-body text-[15px] ${
                    reviewTime === item ? 'font-bold text-[#7A6BFF]' : 'text-[#1A1A2E]'
                  }`}
                >
                  {item}
                </Text>
                {reviewTime === item && <Ionicons name="checkmark" size={18} color="#7A6BFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 3. Daily Goal Modal */}
      <Modal
        transparent
        visible={activeModal === 'dailyGoal'}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/30 justify-end"
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View className="bg-white rounded-t-[28px] p-6 pb-10">
            <View className="w-10 h-1 bg-[#E9E7F2] rounded-full self-center mb-5" />
            <Text className="font-display text-[18px] font-bold text-[#1A1A2E] mb-4">
              Daily Memory Goal
            </Text>
            {dailyGoalOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setDailyGoal(item);
                  setActiveModal(null);
                }}
                className="py-3.5 border-b border-[#F4F2FF] flex-row items-center justify-between"
              >
                <Text
                  className={`font-body text-[15px] ${
                    dailyGoal === item || dailyGoal.includes(item.split(' ')[0])
                      ? 'font-bold text-[#7A6BFF]'
                      : 'text-[#1A1A2E]'
                  }`}
                >
                  {item}
                </Text>
                {(dailyGoal === item || dailyGoal.includes(item.split(' ')[0])) && (
                  <Ionicons name="checkmark" size={18} color="#7A6BFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 4. Sort Order Modal */}
      <Modal
        transparent
        visible={activeModal === 'sortOrder'}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/30 justify-end"
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View className="bg-white rounded-t-[28px] p-6 pb-10">
            <View className="w-10 h-1 bg-[#E9E7F2] rounded-full self-center mb-5" />
            <Text className="font-display text-[18px] font-bold text-[#1A1A2E] mb-4">
              Sort Memories
            </Text>
            {sortOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setSortOrder(item);
                  setActiveModal(null);
                }}
                className="py-3.5 border-b border-[#F4F2FF] flex-row items-center justify-between"
              >
                <Text
                  className={`font-body text-[15px] ${
                    sortOrder === item ? 'font-bold text-[#7A6BFF]' : 'text-[#1A1A2E]'
                  }`}
                >
                  {item}
                </Text>
                {sortOrder === item && <Ionicons name="checkmark" size={18} color="#7A6BFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 5. Appearance Modal */}
      <Modal
        transparent
        visible={activeModal === 'appearance'}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/30 justify-end"
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View className="bg-white rounded-t-[28px] p-6 pb-10">
            <View className="w-10 h-1 bg-[#E9E7F2] rounded-full self-center mb-5" />
            <Text className="font-display text-[18px] font-bold text-[#1A1A2E] mb-4">
              Appearance
            </Text>
            {appearanceOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setAppearance(item);
                  setActiveModal(null);
                }}
                className="py-3.5 border-b border-[#F4F2FF] flex-row items-center justify-between"
              >
                <Text
                  className={`font-body text-[15px] ${
                    appearance === item ? 'font-bold text-[#7A6BFF]' : 'text-[#1A1A2E]'
                  }`}
                >
                  {item}
                </Text>
                {appearance === item && <Ionicons name="checkmark" size={18} color="#7A6BFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 5. RevenueCat Paywall / Manage Subscription Modal */}
      <PaywallModal
        visible={showPaywall}
        mode="manage"
        isPro={isPro}
        onClose={() => setShowPaywall(false)}
      />
    </SafeAreaView>
  );
}
