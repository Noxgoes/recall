import React from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsOfServiceScreen() {
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
          Terms of Service
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

        <Text className="font-body text-[14px] text-[#444466] leading-relaxed mb-6">
          Welcome to Recall. These Terms of Service ("Terms") govern your use of the Recall mobile application ("App," "Service"). By creating an account or using Recall, you agree to be bound by these Terms.
        </Text>

        {/* Section 1 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          1. About Recall
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          Recall is a mobile application that allows you to save links from platforms like YouTube, Instagram, X (Twitter), and others, attach personal notes, and receive AI-extracted actionable insights. The app resurfaces saved content through daily digest notifications and spaced repetition to help you retain what you learn.
        </Text>

        {/* Section 2 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          2. Eligibility
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          You must be at least 13 years old (or 16 in the EU/EEA) to create an account and use Recall. By using the App, you represent that you meet this age requirement.
        </Text>

        {/* Section 3 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          3. Your Account
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          You must provide a valid email address and create a password to use Recall. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          You may delete your account at any time through the Settings screen. Upon deletion, all your data will be permanently removed. This action is irreversible.
        </Text>

        {/* Section 4 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          4. Acceptable Use
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          You agree to use Recall only for its intended purpose: saving, organizing, and reviewing personal insights from online content.
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          You may not: use Recall for any illegal or abusive purpose; reverse-engineer or decompile the App; use automated tools, bots, or scripts to interact with the App; abuse the AI extraction service; create multiple accounts to circumvent restrictions; or upload content that is illegal or infringes on the rights of others.
        </Text>

        {/* Section 5 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          5. Your Content
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          You own your content. The URLs you save, the notes you write, and any edits you make remain yours. By using Recall, you grant us a limited license to process your content solely to provide the Service (e.g., sending your notes to the AI for insight extraction). This license terminates when you delete your content or your account.
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          AI-generated insights derived from your notes are considered your content. We do not claim ownership over them.
        </Text>

        {/* Section 6 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          6. AI Disclaimer
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          Recall uses artificial intelligence to extract insights from your notes. AI-generated insights may be inaccurate, incomplete, or misleading. Insights should not be relied upon as professional, medical, financial, legal, or any other form of expert advice. You are responsible for verifying the accuracy of any insight before acting on it. We provide AI features "as-is" and make no warranties about the accuracy or completeness of AI-generated content.
        </Text>

        {/* Section 7 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          7. Third-Party Content
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          Recall allows you to save URLs from third-party platforms. We are not responsible for the content, availability, or accuracy of any third-party website or platform. Saving a URL in Recall does not imply our endorsement of that content. Recall relies on third-party services (Supabase, Groq, Expo) to function, and we are not responsible for outages or disruptions to these services.
        </Text>

        {/* Section 8 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          8. Intellectual Property
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          The Recall app — including its name, logo, design, user interface, code, and documentation — is owned by us and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works from the App without our written permission.
        </Text>

        {/* Section 9 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          9. Service Availability
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          We strive to keep Recall available and functional, but we do not guarantee uninterrupted service. The App may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
        </Text>

        {/* Section 10 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          10. Limitation of Liability
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          Recall is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App. We are not liable for any loss of data, missed notifications, or inaccurate AI extractions. Our total liability shall not exceed the amount you paid us in the 12 months preceding any claim.
        </Text>

        {/* Section 11 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          11. Account Termination
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          You may stop using Recall and delete your account at any time. We may suspend or terminate your account if you violate these Terms, use the App in a way that could harm us, other users, or third parties, or engage in abusive or illegal activity.
        </Text>

        {/* Section 12 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          12. Changes to These Terms
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          We may update these Terms from time to time. When we make significant changes, we will update the "Last Updated" date at the top. Your continued use of Recall after changes constitutes acceptance of the updated Terms.
        </Text>

        {/* Section 13 */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          13. Governing Law
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-6">
          These Terms are governed by the laws of India, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through informal negotiation first. You agree to resolve disputes on an individual basis.
        </Text>

        {/* Contact */}
        <Text className="font-display text-[16px] font-bold text-[#1A1A2E] mb-3">
          14. Contact Us
        </Text>
        <Text className="font-body text-[13.5px] text-[#444466] leading-relaxed mb-2">
          If you have any questions about these Terms of Service, contact us at:
        </Text>
        <Text className="font-display text-[13.5px] font-semibold text-[#7A6BFF]">
          hello@recallapp.co
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
