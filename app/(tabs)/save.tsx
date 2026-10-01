import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useSaveLink } from '@/hooks/useInsights';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SaveLink() {
  const { session } = useAuth();
  const saveLink = useSaveLink();

  const [url, setUrl] = useState('');
  const [userPoints, setUserPoints] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!url) {
      Alert.alert('Error', 'Please enter a URL.');
      return;
    }
    setLoading(true);

    try {
      await saveLink.mutateAsync({
        url,
        notes: userPoints,
      });

      Alert.alert('Saved! 🎉', 'Your insights are in your library.');
      setUrl('');
      setUserPoints('');
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg: string = error?.message ?? '';
      if (msg.includes('NEEDS_NOTES') || msg === 'NEEDS_NOTES') {
        Alert.alert(
          'Add a Note First ✍️',
          "We couldn't automatically read this link.\n\nType a quick summary or key points of what you want to remember, then tap Save again."
        );
      } else {
        Alert.alert('Save Failed', msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F3F1FC', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          contentContainerClassName="px-6 pb-12"
          showsVerticalScrollIndicator={false}
        >
          {/* Header row: Circular back arrow */}
          <View className="flex-row items-center justify-between pt-3 pb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shadow-purple-900/10"
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color="#1A1A2E" />
            </TouchableOpacity>
            <View className="w-10" />
          </View>

          {/* Title and Mascot cluster container */}
          <View className="relative min-h-[142px] mb-5 flex-row justify-between pr-[150px]">
            <View className="flex-1 justify-center">
              <Text className="font-display text-[32px] font-bold text-[#1A1A2E]">
                Save a link
              </Text>
              <Text className="mt-2 font-body text-[13.5px] leading-relaxed text-[#8888A0]">
                Paste a link from anywhere. AI will find the key insights for you.
              </Text>
            </View>

            {/* Large Mascot & badging decoration cluster */}
            <View
              className="absolute right-[-10px] top-[-10px] w-[180px] h-[150px] overflow-visible"
              style={{ pointerEvents: 'none' }}
            >
              {/* Large Floating Mascot */}
              <Image
                source={require('../../assets/images/mascot_homepage.png')}
                style={{
                  width: 200,
                  height: 105,
                  position: 'absolute',
                  right: -10,
                  top: 15,
                  transform: [{ scale: 3. }],
                }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* URL Input pill */}
          <View className="flex-row items-center bg-white border border-[#EEE9FF] rounded-full px-4 h-[50px] mb-4 shadow-sm shadow-purple-900/5">
            <Ionicons name="link-outline" size={20} color="#8888A0" />
            <TextInput
              className="flex-1 px-3 text-[#1A1A2E] font-body text-[13.5px]"
              placeholder="Paste any link here"
              placeholderTextColor="#AFAAC0"
              keyboardType="url"
              autoCapitalize="none"
              value={url}
              onChangeText={setUrl}
            />
            {url.length > 0 && (
              <TouchableOpacity onPress={() => setUrl('')}>
                <Ionicons name="close-circle" size={18} color="#AFAAC0" />
              </TouchableOpacity>
            )}
          </View>

          {/* Supported platforms list */}
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1.5 mb-5 px-1">
            <Text className="font-body text-[10.5px] text-[#AFAAC0]">Supports</Text>

            {/* YouTube Badge */}
            <View className="flex-row items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-[#EEE9FF]">
              <Ionicons name="logo-youtube" size={10} color="#FF0000" />
              <Text className="font-body text-[9.5px] text-[#8888A0]">YouTube</Text>
            </View>

            {/* Instagram Badge */}
            <View className="flex-row items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-[#EEE9FF]">
              <Ionicons name="logo-instagram" size={10} color="#E1306C" />
              <Text className="font-body text-[9.5px] text-[#8888A0]">Instagram</Text>
            </View>

            {/* TikTok Badge */}
            <View className="flex-row items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-[#EEE9FF]">
              <Ionicons name="play-circle" size={10} color="#000000" />
              <Text className="font-body text-[9.5px] text-[#8888A0]">TikTok</Text>
            </View>

            {/* X Badge */}
            <View className="flex-row items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-[#EEE9FF]">
              <Ionicons name="logo-twitter" size={10} color="#000000" />
              <Text className="font-body text-[9.5px] text-[#8888A0]">X</Text>
            </View>

            {/* Articles Badge */}
            <View className="flex-row items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-[#EEE9FF]">
              <Ionicons name="document-text-outline" size={10} color="#6C5CE7" />
              <Text className="font-body text-[9.5px] text-[#8888A0]">Articles</Text>
            </View>
          </View>

          {/* Notes Input Area */}
          <View className="mb-6">
            <View className="flex-row items-center gap-1.5 mb-2.5 px-1">
              <Ionicons name="create-outline" size={14} color="#1A1A2E" />
              <Text className="font-display text-[13.5px] font-bold text-[#1A1A2E]">
                Optional Notes
              </Text>
            </View>
            <TextInput
              className="w-full bg-white border border-[#EEE9FF] rounded-[20px] p-4 text-[#1A1A2E] font-body text-[13.5px] min-h-[96px] textAlignVertical-top shadow-sm shadow-purple-900/5"
              placeholder="What stood out to you? (Optional)"
              placeholderTextColor="#AFAAC0"
              multiline
              maxLength={500}
              numberOfLines={4}
              value={userPoints}
              onChangeText={setUserPoints}
            />
          </View>

          {/* Save to Recall Bottom CTA Button */}
          <View className="w-full mt-4">
            <TouchableOpacity
              className="w-full h-12 flex-row items-center justify-center rounded-full bg-[#6C5CE7] shadow-md shadow-[#6C5CE7]/30"
              style={{
                shadowColor: '#6C5CE7',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 4,
              }}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="bookmark" size={14} color="#FFFFFF" />
                  <Text className="ml-2 font-display text-[14px] font-bold text-white">Save to Recall</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
