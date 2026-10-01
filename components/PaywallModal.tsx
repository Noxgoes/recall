import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/hooks/useSubscription';

export type PaywallModalProps = {
  visible: boolean;
  onClose: () => void;
  mode?: 'manage' | 'paywall';
  isPro?: boolean;
};

export function PaywallModal({ visible, onClose, mode, isPro }: PaywallModalProps) {
  if (!visible) return null;
  return <PaywallModalContent visible={visible} onClose={onClose} mode={mode} initialIsPro={isPro} />;
}

function PaywallModalContent({
  visible,
  onClose,
  mode = 'paywall',
  initialIsPro,
}: {
  visible: boolean;
  onClose: () => void;
  mode?: 'manage' | 'paywall';
  initialIsPro?: boolean;
}) {
  const {
    isPro: hookIsPro,
    isLoading,
    plan,
    hasUsedTrial,
    currentOffering,
    purchasePackage,
    restorePurchases,
    redeemPromoCode,
    grantFreeProAccess,
    updatePlan,
    cancelSubscription,
  } = useSubscription();

  const effectiveIsPro = initialIsPro !== undefined ? initialIsPro : hookIsPro;
  const isManageMode = mode === 'manage' || effectiveIsPro;

  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>(plan || 'annual');
  const [isProcessing, setIsProcessing] = useState(false);

  const annualPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === 'ANNUAL' || p.identifier.includes('annual')
  );
  const monthlyPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === 'MONTHLY' || p.identifier.includes('monthly')
  );

  // Dynamic calculation for renewal / trial date
  const getNextBillingDate = () => {
    const date = new Date();
    if (selectedPlan === 'annual' || plan === 'annual') {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getTrialEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const pkgToBuy = selectedPlan === 'annual' ? annualPkg : monthlyPkg;

      if (pkgToBuy) {
        const success = await purchasePackage(pkgToBuy);
        if (success) onClose();
      } else {
        await grantFreeProAccess(selectedPlan);
        Alert.alert(
          'Recall Pro Activated 🎉',
          `Your ${selectedPlan.toUpperCase()} membership (${selectedPlan === 'annual' ? '$39.99/year' : '$4.99/month'}) is now active with full access.`,
          [{ text: 'Continue', onPress: onClose }]
        );
      }
    } catch (e: any) {
      Alert.alert('Subscription Error', e.message || 'Unable to complete request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    await restorePurchases();
    setIsProcessing(false);
  };

  const handleManageInStore = () => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Manage Subscription',
        'Please manage your subscription in your device App Store / Google Play account settings.'
      );
    });
  };

  const handleSwitchBilling = () => {
    const targetPlan = plan === 'annual' ? 'monthly' : 'annual';
    const targetPrice = targetPlan === 'annual' ? '$39.99/year ($3.33/mo)' : '$4.99/month';

    Alert.alert(
      'Switch Billing Frequency',
      `Would you like to switch your plan from ${plan.toUpperCase()} to ${targetPlan.toUpperCase()} (${targetPrice})?`,
      [
        { text: 'Keep Current', style: 'cancel' },
        {
          text: `Switch to ${targetPlan === 'annual' ? 'Annual' : 'Monthly'}`,
          onPress: async () => {
            setIsProcessing(true);
            await updatePlan(targetPlan);
            setIsProcessing(false);
            Alert.alert('Plan Updated 🎉', `Your billing frequency has been changed to ${targetPlan.toUpperCase()}.`);
          },
        },
      ]
    );
  };

  const handleCancelPrompt = () => {
    Alert.alert(
      'Cancel Subscription',
      'To cancel or change your auto-renewal, please manage it through your Apple App Store or Google Play Store account. Your Pro features will remain active until the end of your current billing period.',
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Open Store Subscriptions', onPress: handleManageInStore },
        {
          text: 'Turn Off Auto-Renew (Demo)',
          style: 'destructive',
          onPress: () => cancelSubscription(),
        },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────
  // 1. ACTIVE SUBSCRIBER VIEW (Manage Subscription)
  // ─────────────────────────────────────────────────────────────
  if (effectiveIsPro) {
    const isAnnual = plan === 'annual';
    const planTitle = isAnnual ? 'Recall Pro Annual' : 'Recall Pro Monthly';
    const planPrice = isAnnual ? '$39.99 / year' : '$4.99 / month';
    const planSubtext = isAnnual ? '$3.33/month billed annually' : 'Billed monthly';

    return (
      <Modal transparent={false} visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top', 'bottom']}>
          {/* Top Header */}
          <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-[#F0EDF9] bg-white">
            <View>
              <Text className="font-display text-[22px] font-bold text-[#1A1A2E]">
                Subscription
              </Text>
              <Text className="font-body text-[12px] text-[#70708C]">
                Manage your membership and plan
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-[#F4F0FF] items-center justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#1A1A2E" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Membership Hero Card */}
            <View className="bg-white border-2 border-[#7C5CFC] rounded-[24px] p-5 shadow-sm shadow-purple-900/10 mb-5 relative overflow-hidden">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-[#EDE7FF] items-center justify-center">
                    <Ionicons name="sparkles" size={17} color="#7C5CFC" />
                  </View>
                  <Text className="font-display text-[18px] font-bold text-[#1A1A2E]">
                    {planTitle}
                  </Text>
                </View>
                <View className="bg-[#EBFBEE] border border-[#C5F3CB] px-2.5 py-1 rounded-full flex-row items-center gap-1">
                  <View className="w-2 h-2 rounded-full bg-[#27AE60]" />
                  <Text className="text-[11px] font-bold text-[#27AE60]">ACTIVE</Text>
                </View>
              </View>

              <Text className="font-display text-[22px] font-bold text-[#1A1A2E] mb-0.5">
                {planPrice}
              </Text>
              <Text className="font-body text-[13px] text-[#70708C] leading-snug">
                {planSubtext} • Unlimited Saves & AI Extraction
              </Text>

              <View className="mt-4 pt-3.5 border-t border-[#F0EDF9] flex-row items-center justify-between">
                <Text className="font-body text-[12px] text-[#8888A0]">Renewal Date</Text>
                <Text className="font-body text-[12.5px] font-semibold text-[#1A1A2E]">
                  {getNextBillingDate()}
                </Text>
              </View>
            </View>

            {/* What's Included */}
            <View className="mb-6">
              <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2.5 px-1">
                Your Pro Benefits
              </Text>
              <View className="bg-white border border-[#EEE9FF] rounded-[22px] p-4 shadow-sm shadow-purple-900/5 gap-3">
                {[
                  {
                    icon: 'infinite',
                    title: 'Unlimited Saves',
                    desc: 'YouTube, Instagram Reels, X/Twitter threads & web articles',
                  },
                  {
                    icon: 'bulb-outline',
                    title: 'Groq AI Insight Extraction',
                    desc: 'Clean, actionable takeaways distilled from every saved link',
                  },
                  {
                    icon: 'repeat-outline',
                    title: 'Spaced Repetition Reviews',
                    desc: 'Active recall schedule so you never forget what matters',
                  },
                  {
                    icon: 'notifications-outline',
                    title: 'Smart Push Recaps',
                    desc: 'Daily digest notifications and memory nudges',
                  },
                ].map((item, idx) => (
                  <View key={idx} className="flex-row items-start">
                    <View className="w-7 h-7 rounded-[10px] bg-[#F4F0FF] items-center justify-center mr-3 mt-0.5">
                      <Ionicons name={item.icon as any} size={15} color="#7C5CFC" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-display text-[14px] font-bold text-[#1A1A2E]">{item.title}</Text>
                      <Text className="font-body text-[12px] text-[#70708C] leading-tight mt-0.5">{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Management Actions */}
            <View className="mb-6">
              <Text className="text-[11px] font-semibold text-[#8888A0] uppercase tracking-wider mb-2.5 px-1">
                Manage Subscription
              </Text>
              <View className="bg-white border border-[#EEE9FF] rounded-[22px] overflow-hidden shadow-sm shadow-purple-900/5">
                {/* Switch Plan */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSwitchBilling}
                  disabled={isProcessing}
                  className="px-4 py-3.5 border-b border-[#F4F2FF] flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="swap-horizontal-outline" size={18} color="#7C5CFC" />
                    <View>
                      <Text className="font-display text-[14.5px] font-medium text-[#1A1A2E]">
                        Change Billing Frequency
                      </Text>
                      <Text className="font-body text-[11.5px] text-[#8888A0]">
                        Currently {isAnnual ? 'Annual ($39.99/yr)' : 'Monthly ($4.99/mo)'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color="#C4C4D0" />
                </TouchableOpacity>

                {/* Manage in Store */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleManageInStore}
                  className="px-4 py-3.5 border-b border-[#F4F2FF] flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="card-outline" size={18} color="#7C5CFC" />
                    <Text className="font-display text-[14.5px] font-medium text-[#1A1A2E]">
                      {Platform.OS === 'ios' ? 'Manage in Apple Subscriptions' : 'Manage in Google Play'}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={17} color="#C4C4D0" />
                </TouchableOpacity>

                {/* Restore Purchases */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleRestore}
                  disabled={isProcessing}
                  className="px-4 py-3.5 border-b border-[#F4F2FF] flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="refresh-outline" size={18} color="#7C5CFC" />
                    <Text className="font-display text-[14.5px] font-medium text-[#1A1A2E]">
                      Restore Purchases
                    </Text>
                  </View>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#7C5CFC" />
                  ) : (
                    <Ionicons name="chevron-forward" size={17} color="#C4C4D0" />
                  )}
                </TouchableOpacity>

                {/* Cancel Subscription */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCancelPrompt}
                  className="px-4 py-3.5 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    <Text className="font-display text-[14.5px] font-medium text-[#EF4444]">
                      Cancel Subscription
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color="#FFC4C4" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Done Button */}
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              className="w-full bg-[#7C5CFC] h-[50px] rounded-full items-center justify-center shadow-md shadow-purple-900/15"
            >
              <Text className="font-display text-[15px] font-bold text-white">Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EXPIRED TRIAL / NON-MEMBER IN MANAGE MODE (NO TRIAL OPTION)
  // ─────────────────────────────────────────────────────────────
  if (isManageMode && !effectiveIsPro) {
    return (
      <Modal transparent={false} visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView className="flex-1 bg-[#FAFAFC]" edges={['top', 'bottom']}>
          {/* Top Header */}
          <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-[#F0EDF9] bg-white">
            <View>
              <Text className="font-display text-[22px] font-bold text-[#1A1A2E]">
                Subscription
              </Text>
              <Text className="font-body text-[12px] text-[#70708C]">
                Upgrade to unlock full features
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-[#F4F0FF] items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#1A1A2E" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Free Status Hero Card */}
            <View className="bg-white border border-[#EBE8F5] rounded-[24px] p-5 mb-5 relative">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-display text-[18px] font-bold text-[#1A1A2E]">
                  Recall Free Plan
                </Text>
                <View className="bg-[#F0EDF9] px-2.5 py-1 rounded-full">
                  <Text className="text-[11px] font-bold text-[#70708C]">INACTIVE</Text>
                </View>
              </View>
              <Text className="font-body text-[13px] text-[#70708C]">
                Your 3-day free trial has expired. Subscribe below to restore unlimited AI insights and spaced repetition.
              </Text>
            </View>

            {/* Plan Options */}
            <View className="w-full mb-4">
              {/* Annual */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedPlan('annual')}
                className={`p-4 rounded-[20px] border-2 mb-3 flex-row items-center justify-between ${
                  selectedPlan === 'annual' ? 'bg-[#F4F0FF] border-[#7C5CFC]' : 'bg-white border-[#EBE8F5]'
                }`}
              >
                <View className="flex-1 mr-2">
                  <View className="bg-[#E6DDFF] px-2 py-0.5 rounded-md self-start mb-1">
                    <Text className="text-[#7C5CFC] text-[9.5px] font-bold uppercase tracking-wider">
                      BEST VALUE — SAVE $19.89/YR
                    </Text>
                  </View>
                  <Text className="font-display text-[15.5px] font-bold text-[#1A1A2E]">Recall Pro Annual</Text>
                  <Text className="font-display text-[14px] font-bold text-[#1A1A2E] mt-0.5">$39.99 / year</Text>
                  <Text className="font-body text-[12px] text-[#8888A0] mt-0.5">$3.33/month billed annually</Text>
                </View>
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedPlan === 'annual' ? 'border-[#7C5CFC] bg-[#7C5CFC]' : 'border-[#D1CBDD]'
                  }`}
                >
                  {selectedPlan === 'annual' && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
              </TouchableOpacity>

              {/* Monthly */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedPlan('monthly')}
                className={`p-4 rounded-[20px] border-2 flex-row items-center justify-between ${
                  selectedPlan === 'monthly' ? 'bg-[#F4F0FF] border-[#7C5CFC]' : 'bg-white border-[#EBE8F5]'
                }`}
              >
                <View className="flex-1 mr-2">
                  <Text className="font-display text-[15px] font-bold text-[#1A1A2E]">Monthly Plan</Text>
                  <Text className="font-display text-[14px] font-bold text-[#1A1A2E] mt-0.5">$4.99 / month</Text>
                  <Text className="font-body text-[12px] text-[#8888A0] mt-0.5">Cancel anytime</Text>
                </View>
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedPlan === 'monthly' ? 'border-[#7C5CFC] bg-[#7C5CFC]' : 'border-[#D1CBDD]'
                  }`}
                >
                  {selectedPlan === 'monthly' && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Subscribe Now Button (Notice: NO "3-Day Trial" text since trial already used) */}
            <TouchableOpacity
              onPress={handleSubscribe}
              disabled={isProcessing || isLoading}
              activeOpacity={0.9}
              className="w-full bg-[#7C5CFC] h-[52px] rounded-full flex-row items-center justify-center shadow-md shadow-purple-900/20"
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-display text-[15.5px] font-bold text-white mr-1.5">
                  Subscribe to Recall Pro
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRestore} disabled={isProcessing} className="items-center mt-4">
              <Text className="font-body text-[12px] text-[#8888A0]">Restore Purchases</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. FIRST-TIME SALES PAYWALL VIEW (New Users Only)
  // ─────────────────────────────────────────────────────────────
  const canTakeTrial = !hasUsedTrial;

  return (
    <Modal transparent={false} visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Mascot Header */}
          <View className="relative w-full h-[145px] bg-[#EFEAFF] items-center justify-center overflow-hidden">
            <Image
              source={require('../assets/images/paywall_header.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />

            {/* Top Floating Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-4 right-5 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md items-center justify-center shadow-sm z-10"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#1A1A2E" />
            </TouchableOpacity>
          </View>

          {/* Main Headline & Subtitle */}
          <View className="px-5 pt-3 items-center">
            <Text className="font-display text-[26px] font-bold text-[#1A1A2E] text-center tracking-tight leading-[32px]">
              Remember more of{'\n'}
              <Text className="text-[#7C5CFC]">what matters.</Text>
            </Text>

            <Text className="font-body text-[12.5px] text-[#666680] text-center mt-1 px-3 leading-snug">
              Turn the things you save into knowledge you’ll actually remember.
            </Text>

            {/* 3-Step Continuous Timeline */}
            <View className="w-full mt-4 mb-2 px-1 relative">
              <View className="absolute left-[31px] top-4 bottom-4 w-[2px] bg-[#E8E2F7]" />

              {[
                {
                  icon: 'checkmark-circle-outline',
                  title: 'Today',
                  desc: 'Save and organize everything with the full Recall Pro library.',
                },
                {
                  icon: 'notifications-outline',
                  title: canTakeTrial ? 'Day 3' : 'Daily',
                  desc: canTakeTrial
                    ? "We'll remind you before your trial ends."
                    : 'Personalized AI insights delivered to your daily digest.',
                },
                {
                  icon: 'calendar-outline',
                  title: canTakeTrial ? 'Day 4' : 'Ongoing',
                  desc: canTakeTrial
                    ? `You're charged ${selectedPlan === 'annual' ? '$39.99' : '$4.99'} on ${getTrialEndDate()}. Cancel anytime before this date.`
                    : 'Uninterrupted spaced repetition and intelligent memory resurfacing.',
                },
              ].map((item, idx) => (
                <View key={idx} className="flex-row items-center mb-3 relative">
                  <View className="w-8 h-8 rounded-[12px] bg-[#F4F0FF] items-center justify-center mr-3 z-10 border-2 border-white shadow-xs">
                    <Ionicons name={item.icon as any} size={16} color="#7C5CFC" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-display text-[13.5px] font-bold text-[#1A1A2E] leading-tight">
                      {item.title}
                    </Text>
                    <Text className="font-body text-[11.5px] text-[#70708C] leading-snug mt-0.5">
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Pricing Plan Selector Cards */}
            <View className="w-full mt-1 mb-3">
              {/* 1. Recall Pro Annual */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedPlan('annual')}
                className={`p-3.5 rounded-[18px] border-2 mb-2.5 relative flex-row items-center justify-between ${
                  selectedPlan === 'annual' ? 'bg-[#F4F0FF] border-[#7C5CFC]' : 'bg-white border-[#EBE8F5]'
                }`}
              >
                <View className="flex-1 mr-2">
                  <View className="bg-[#E6DDFF] px-2 py-0.5 rounded-md self-start mb-1">
                    <Text className="text-[#7C5CFC] text-[9.5px] font-bold uppercase tracking-wider">
                      BEST VALUE — SAVE $19.89/YR
                    </Text>
                  </View>
                  <Text className="font-display text-[15px] font-bold text-[#1A1A2E]">
                    Recall Pro Annual
                  </Text>
                  <Text className="font-display text-[14px] font-bold text-[#1A1A2E] mt-0.5">
                    {annualPkg ? annualPkg.product.priceString + ' / year' : '$39.99 / year'}
                  </Text>
                  <Text className="font-body text-[11.5px] text-[#8888A0] mt-0.5">
                    $3.33/month {canTakeTrial ? '• 3-Day Free Trial' : '• Unlimited Access'}
                  </Text>
                </View>

                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedPlan === 'annual' ? 'border-[#7C5CFC] bg-[#7C5CFC]' : 'border-[#D1CBDD]'
                  }`}
                >
                  {selectedPlan === 'annual' && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
              </TouchableOpacity>

              {/* 2. Monthly Card */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedPlan('monthly')}
                className={`p-3.5 rounded-[18px] border-2 flex-row items-center justify-between ${
                  selectedPlan === 'monthly' ? 'bg-[#F4F0FF] border-[#7C5CFC]' : 'bg-white border-[#EBE8F5]'
                }`}
              >
                <View className="flex-1 mr-2">
                  <Text className="font-display text-[14.5px] font-bold text-[#1A1A2E]">
                    Monthly Plan
                  </Text>
                  <Text className="font-display text-[13.5px] font-bold text-[#1A1A2E] mt-0.5">
                    {monthlyPkg ? monthlyPkg.product.priceString + ' / month' : '$4.99 / month'}
                  </Text>
                  <Text className="font-body text-[11.5px] text-[#8888A0] mt-0.5">
                    $4.99/month {canTakeTrial ? '• 3-Day Free Trial' : '• Cancel anytime'}
                  </Text>
                </View>

                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedPlan === 'monthly' ? 'border-[#7C5CFC] bg-[#7C5CFC]' : 'border-[#D1CBDD]'
                  }`}
                >
                  {selectedPlan === 'monthly' && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Primary Action CTA Button */}
            <TouchableOpacity
              onPress={handleSubscribe}
              disabled={isProcessing || isLoading}
              activeOpacity={0.9}
              className="w-full bg-[#7C5CFC] h-[52px] rounded-full flex-row items-center justify-center shadow-md shadow-purple-900/20 mt-1"
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="font-display text-[15.5px] font-bold text-white mr-1.5">
                    {canTakeTrial ? 'Start 3-Day Free Trial' : 'Subscribe to Recall Pro'}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <Text className="font-body text-[12px] text-[#8888A0] text-center mt-2.5">
              {canTakeTrial ? 'Try free for 3 days. Cancel anytime.' : 'Cancel anytime in store settings.'}
            </Text>

            {/* Footer Links & Redeem Promo Code */}
            <View className="items-center mt-3 gap-2 pb-2 w-full">
              <TouchableOpacity onPress={handleRestore} disabled={isProcessing}>
                <Text className="font-body text-[11.5px] text-[#8888A0]">
                  Restore Purchases
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Alert.prompt(
                    'Redeem Promo Code 🎁',
                    'Enter your secret code for free Recall Pro access (e.g. RECALLPRO):',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Redeem',
                        onPress: (code?: string) => {
                          if (code) {
                            const success = redeemPromoCode(code);
                            if (success) onClose();
                          }
                        },
                      },
                    ],
                    'plain-text',
                    'RECALLPRO'
                  );
                }}
                className="bg-[#F4F0FF] px-3.5 py-1.5 rounded-full border border-[#E4DCFF] mt-1"
              >
                <Text className="font-display text-[11.5px] font-bold text-[#7C5CFC]">
                  Have a Promo Code? Redeem here
                </Text>
              </TouchableOpacity>

              <View className="flex-row items-center gap-1.5 mt-1">
                <TouchableOpacity onPress={() => Linking.openURL('https://recall.app/privacy').catch(() => {})}>
                  <Text className="font-body text-[11.5px] text-[#AFAAC0]">Privacy</Text>
                </TouchableOpacity>
                <Text className="text-[11.5px] text-[#AFAAC0]">•</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://recall.app/terms').catch(() => {})}>
                  <Text className="font-body text-[11.5px] text-[#AFAAC0]">Terms</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
