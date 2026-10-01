import React from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-3 border-b border-[#EEE9FF]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-[#F3F0FF] items-center justify-center mr-3"
        >
          <Ionicons name="chevron-back" size={20} color="#7A6BFF" />
        </TouchableOpacity>
        <Text className="font-display text-[18px] font-bold text-[#1A1A2E]">
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-body text-[12px] text-[#8888A0] mb-4">
          Last Updated: September 2026
        </Text>

        <Text className="font-body text-[14px] text-[#444466] leading-relaxed mb-4">
          Recall ("we," "our," or "us") is a mobile application that helps you save, organize, and retain actionable insights from online content. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
        </Text>

        <Text className="font-body text-[14px] text-[#444466] leading-relaxed mb-6">
          By using Recall, you agree to the collection and use of information as described in this policy.
        </Text>

        {/* Section 1 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          1. Information We Collect
        </Text>

        <Text className="font-display text-[14px] font-semibold text-[#1A1A2E] mb-1.5">
          Account Information
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-3">
          When you create an account, we collect your email address (used for authentication and account recovery) and password (securely hashed — we never have access to your plaintext password).
        </Text>

        <Text className="font-display text-[14px] font-semibold text-[#1A1A2E] mb-1.5">
          Content You Provide
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-3">
          When you use Recall, you choose to save URLs (links from YouTube, Instagram, X/Twitter, and other platforms), personal notes (the freeform text you type about what you want to remember), and any edits you make to AI-extracted insights.
        </Text>

        <Text className="font-display text-[14px] font-semibold text-[#1A1A2E] mb-1.5">
          Automatically Generated Data
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-3">
          Our service automatically creates AI-extracted insights (generated from your notes and the URL you provide), topic tags (auto-detected categories such as coding, fitness, business), and platform type (detected from the URL).
        </Text>

        <Text className="font-display text-[14px] font-semibold text-[#1A1A2E] mb-1.5">
          What We Do NOT Collect
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          We do not track your location, access your contacts, camera, or microphone, use analytics or advertising SDKs, or collect browsing history beyond the specific URLs you explicitly save.
        </Text>

        {/* Section 2 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          2. How We Use Your Information
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          We use your information solely to provide and improve the Recall service: account authentication, saving and organizing insights, AI insight extraction, daily digest notifications, and spaced repetition scheduling. We do not sell, rent, or share your personal data with advertisers or data brokers.
        </Text>

        {/* Section 3 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          3. Third-Party Services
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          <Text className="font-semibold">Supabase</Text> — Processes your email, password (hashed), and all saved content for user authentication and data storage.
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          <Text className="font-semibold">Groq</Text> — Processes the URLs you save and the notes you type to extract actionable insights. Your notes and URLs are sent to Groq's servers for processing. Groq does not use your data to train their models.
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          <Text className="font-semibold">Expo</Text> — Processes your device push token to deliver daily digest and spaced repetition reminder notifications.
        </Text>

        {/* Section 4 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          4. Data Storage and Security
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          All data is stored on Supabase servers. Data is encrypted in transit using TLS/HTTPS. Passwords are hashed using bcrypt. Database access is protected by Row Level Security (RLS) — users can only access their own data.
        </Text>

        {/* Section 5 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          5. Data Retention
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          Your data is retained as long as your account is active. When you delete your account, all associated data is permanently deleted (URLs, notes, insights, preferences). We do not retain backups of deleted user data beyond standard database backup windows.
        </Text>

        {/* Section 6 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          6. Your Rights
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          <Text className="font-semibold">All users:</Text> You have the right to access your data, edit your saved content, delete individual insights or your entire account, and opt out of notifications at any time.
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          <Text className="font-semibold">EU/EEA users (GDPR):</Text> You additionally have the right to data portability, rectification, erasure ("right to be forgotten"), restriction, objection, and withdrawal of consent. We process your data based on contractual necessity and consent.
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          <Text className="font-semibold">California residents (CCPA):</Text> You have the right to know what personal information we collect, delete your personal information, and non-discrimination. We do not sell personal information.
        </Text>

        {/* Section 7 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          7. Children's Privacy
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          Recall is not intended for children under the age of 13 (or 16 in the EU/EEA). We do not knowingly collect personal information from children. If we discover that a child has created an account, we will promptly delete it and all associated data.
        </Text>

        {/* Section 8 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          8. International Data Transfers
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          Your data may be processed and stored on servers located outside your country of residence. By using Recall, you consent to the transfer of your information to countries that may have different data protection laws than your own.
        </Text>

        {/* Section 9 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          9. Changes to This Policy
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          We may update this Privacy Policy from time to time. When we make significant changes, we will update the "Last Updated" date at the top. Your continued use of Recall after changes constitutes acceptance of the updated policy.
        </Text>

        {/* Section 10 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          10. Contact Us
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          If you have any questions or concerns regarding this Privacy Policy or your personal data, contact us at:
        </Text>
        <Text className="font-display text-[13.5px] font-semibold text-[#7A6BFF]">
          hello@recallapp.co
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
