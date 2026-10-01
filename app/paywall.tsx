import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '@/hooks/useSubscription';

import { supabase } from '@/lib/supabase';

export default function PaywallScreen() {
  const { isPro, isLoading, hasUsedTrial, currentOffering, purchasePackage, restorePurchases, redeemPromoCode, grantFreeProAccess } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isPro) {
      router.replace('/(tabs)');
    }
  }, [isPro]);

  const canTakeTrial = !hasUsedTrial;

  const annualPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === 'ANNUAL' || p.identifier.includes('annual')
  );
  const monthlyPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === 'MONTHLY' || p.identifier.includes('monthly')
  );

  const getTrialEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;

      const pkgToBuy = selectedPlan === 'annual' ? annualPkg : monthlyPkg;

      if (pkgToBuy) {
        const success = await purchasePackage(pkgToBuy);
        if (success) {
          if (currentUid) {
            await AsyncStorage.setItem(`recall_pro_status_${currentUid}`, 'true');
          }
          await AsyncStorage.setItem('recall_pro_status', 'true');
          await supabase.auth.updateUser({ data: { is_pro: true, plan: selectedPlan } }).catch(() => {});
          router.replace('/(tabs)');
          return;
        }
      }

      // Persist trial/membership locally and in Supabase metadata
      if (currentUid) {
        await AsyncStorage.setItem(`recall_pro_status_${currentUid}`, 'true');
        await AsyncStorage.setItem(`recall_trial_start_${currentUid}`, new Date().toISOString());
      }
      await AsyncStorage.setItem('recall_pro_status', 'true');
      await AsyncStorage.setItem('recall_trial_start_date', new Date().toISOString());
      await grantFreeProAccess(selectedPlan);
      await supabase.auth.updateUser({ data: { is_pro: true, plan: selectedPlan, trial_used: true } }).catch(() => {});

      Alert.alert(
        'Recall Pro Activated 🎉',
        `Your ${selectedPlan.toUpperCase()} membership (${selectedPlan === 'annual' ? '$39.99/year' : '$4.99/mo'}) has been activated!`,
        [{ text: 'Get Started', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e: any) {
      Alert.alert('Subscription Error', e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    const success = await restorePurchases();
    if (success) router.replace('/(tabs)');
    setIsProcessing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Mascot Header */}
        <View className="relative w-full h-[155px] bg-[#EFEAFF] items-center justify-center overflow-hidden">
          <Image
            source={require('../assets/images/paywall_header.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>

        {/* Main Headline & Subtitle */}
        <View className="px-5 pt-3 items-center">
          <Text className="font-display text-[26px] font-bold text-[#1A1A2E] text-center tracking-tight leading-[32px]">
            Remember more of{'\n'}
            <Text className="text-[#7C5CFC]">what matters.</Text>
          </Text>

          <Text className="font-body text-[13px] text-[#666680] text-center mt-1 px-3 leading-snug">
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
                title: 'Day 3',
                desc: "We'll remind you before your trial ends.",
              },
              {
                icon: 'calendar-outline',
                title: 'Day 4',
                desc:
                  selectedPlan === 'annual'
                    ? `You're charged $39.99 on ${getTrialEndDate()}. Cancel anytime before this date.`
                    : `You're charged $4.99/mo starting ${getTrialEndDate()}. Cancel anytime before this date.`,
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
                selectedPlan === 'annual'
                  ? 'bg-[#F4F0FF] border-[#7C5CFC]'
                  : 'bg-white border-[#EBE8F5]'
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
                {selectedPlan === 'annual' && (
                  <View className="w-2 h-2 rounded-full bg-white" />
                )}
              </View>
            </TouchableOpacity>

            {/* 2. Monthly Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSelectedPlan('monthly')}
              className={`p-3.5 rounded-[18px] border-2 flex-row items-center justify-between ${
                selectedPlan === 'monthly'
                  ? 'bg-[#F4F0FF] border-[#7C5CFC]'
                  : 'bg-white border-[#EBE8F5]'
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
                {selectedPlan === 'monthly' && (
                  <View className="w-2 h-2 rounded-full bg-white" />
                )}
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
          <View className="items-center mt-3.5 gap-2 pb-2 w-full">
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
                          if (success) router.replace('/(tabs)');
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
              <TouchableOpacity>
                <Text className="font-body text-[11.5px] text-[#AFAAC0]">Privacy</Text>
              </TouchableOpacity>
              <Text className="text-[11.5px] text-[#AFAAC0]">•</Text>
              <TouchableOpacity>
                <Text className="font-body text-[11.5px] text-[#AFAAC0]">Terms</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

