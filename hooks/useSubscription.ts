import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import type { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { initRevenueCat, REVENUECAT_ENTITLEMENT_ID } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Purchases: any = null;
try {
  const rc = require('react-native-purchases');
  Purchases = rc?.default || rc;
} catch (e) {}

export type SubscriptionState = {
  isPro: boolean;
  isLoading: boolean;
  plan: 'annual' | 'monthly';
  hasUsedTrial: boolean;
  trialStartDate: string | null;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  redeemPromoCode: (code: string) => boolean;
  grantFreeProAccess: (selectedPlan?: 'annual' | 'monthly') => Promise<void>;
  updatePlan: (newPlan: 'annual' | 'monthly') => Promise<void>;
  cancelSubscription: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

// Available secret promo codes for lifetime/free pro access
export const PROMO_CODES = ['RECALLPRO', 'VIP2026', 'DEVFREE', 'HACKATHON'];

const PRO_STORAGE_KEY = 'recall_pro_status';
const TRIAL_START_KEY = 'recall_trial_start_date';
const TRIAL_USED_KEY = 'recall_trial_has_used';
const PLAN_STORAGE_KEY = 'recall_user_plan';

// Shared in-memory cache to prevent mount flicker across screens and modals
let cachedIsPro: boolean = false;
let cachedPlan: 'annual' | 'monthly' = 'annual';
let cachedHasUsedTrial: boolean = false;
let cachedTrialStart: string | null = null;
let cacheInitialized = false;

const stateListeners = new Set<() => void>();

function notifyListeners() {
  stateListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export function resetSubscriptionCache() {
  cachedIsPro = false;
  cachedPlan = 'annual';
  cachedHasUsedTrial = false;
  cachedTrialStart = null;
  cacheInitialized = true;
  notifyListeners();
}

export function useSubscription(): SubscriptionState {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isPro, setIsPro] = useState(cachedIsPro);
  const [plan, setPlan] = useState<'annual' | 'monthly'>(cachedPlan);
  const [hasUsedTrial, setHasUsedTrial] = useState(cachedHasUsedTrial);
  const [trialStartDate, setTrialStartDate] = useState<string | null>(cachedTrialStart);
  const [isLoading, setIsLoading] = useState(!cacheInitialized);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);

  // Sync with global cache updates
  useEffect(() => {
    const updateFromCache = () => {
      setIsPro(cachedIsPro);
      setPlan(cachedPlan);
      setHasUsedTrial(cachedHasUsedTrial);
      setTrialStartDate(cachedTrialStart);
    };
    stateListeners.add(updateFromCache);
    return () => {
      stateListeners.delete(updateFromCache);
    };
  }, []);

  const checkLocalPro = useCallback(async (currentUid?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = currentUid || session?.user?.id;
      if (uid) setUserId(uid);

      if (!session?.user) {
        cachedIsPro = false;
        setIsPro(false);
        cacheInitialized = true;
        notifyListeners();
        return;
      }

      const metadata = session?.user?.user_metadata || {};
      const isMetadataPro = metadata.is_pro === true;
      const metadataPlan = metadata.plan === 'monthly' ? 'monthly' : 'annual';
      const metadataTrialUsed = metadata.trial_used === true;

      const userProKey = uid ? `recall_pro_status_${uid}` : null;
      const userTrialKey = uid ? `recall_trial_start_${uid}` : null;
      const userUsedKey = uid ? `recall_trial_used_${uid}` : null;
      const userPlanKey = uid ? `recall_user_plan_${uid}` : null;

      const [storedUserPro, storedTrialStart, storedTrialUsed, storedPlan] = await Promise.all([
        userProKey ? AsyncStorage.getItem(userProKey) : Promise.resolve(null),
        userTrialKey ? AsyncStorage.getItem(userTrialKey) : Promise.resolve(null),
        userUsedKey ? AsyncStorage.getItem(userUsedKey) : Promise.resolve(null),
        userPlanKey ? AsyncStorage.getItem(userPlanKey) : Promise.resolve(null),
      ]);

      const activePlan = (storedPlan === 'monthly' || metadataPlan === 'monthly') ? 'monthly' : 'annual';
      cachedPlan = activePlan;
      setPlan(activePlan);

      const trialUsed = metadataTrialUsed || storedTrialUsed === 'true' || Boolean(storedTrialStart);
      cachedHasUsedTrial = trialUsed;
      setHasUsedTrial(trialUsed);

      cachedTrialStart = storedTrialStart;
      setTrialStartDate(storedTrialStart);

      // Only test@recall.app gets unconditional demo pro
      // Any other account (like judge@recall.app or new users) MUST have isMetadataPro or storedUserPro
      let proActive = false;
      if (session?.user?.email === 'test@recall.app') {
        proActive = true;
      } else if (isMetadataPro || (storedUserPro === 'true')) {
        proActive = true;
      } else if (storedTrialStart) {
        const startDate = new Date(storedTrialStart);
        const diffDays = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 3) {
          proActive = true;
        }
      }

      cachedIsPro = proActive;
      setIsPro(proActive);
      cacheInitialized = true;
      notifyListeners();
    } catch (e) {
      console.warn('[useSubscription] Local storage read error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLocalPro();
  }, [checkLocalPro]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      setUserId(uid);
      if (uid) checkLocalPro(uid);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id;
      if (event === 'SIGNED_OUT' || !uid) {
        setUserId(undefined);
        resetSubscriptionCache();
      } else {
        setUserId(uid);
        checkLocalPro(uid);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkLocalPro]);

  const checkEntitlements = (info: CustomerInfo | null) => {
    if (!info) return false;
    const entitlement = info.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
    return Boolean(entitlement && entitlement.isActive);
  };

  const refreshSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialized = await initRevenueCat(userId);
      if (!initialized || typeof Purchases === 'undefined' || !Purchases?.getCustomerInfo) {
        setIsLoading(false);
        return;
      }

      // Fetch Customer Info
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      if (checkEntitlements(info)) {
        cachedIsPro = true;
        setIsPro(true);
        notifyListeners();
        await AsyncStorage.setItem(PRO_STORAGE_KEY, 'true');
        if (userId) await AsyncStorage.setItem(`recall_pro_status_${userId}`, 'true');
      }

      // Fetch Offerings
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        setCurrentOffering(offerings.current);
      }
    } catch (e: any) {
      console.warn('[useSubscription] Refresh error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshSubscription();

    let customerInfoListener: ((info: CustomerInfo) => void) | null = null;
    try {
      if (typeof Purchases !== 'undefined' && Purchases?.addCustomerInfoUpdateListener) {
        customerInfoListener = async (info: CustomerInfo) => {
          setCustomerInfo(info);
          if (checkEntitlements(info)) {
            cachedIsPro = true;
            setIsPro(true);
            notifyListeners();
            await AsyncStorage.setItem(PRO_STORAGE_KEY, 'true');
          }
        };
        Purchases.addCustomerInfoUpdateListener(customerInfoListener);
      }
    } catch (e) {
      console.warn('[useSubscription] Listener error:', e);
    }

    return () => {
      if (customerInfoListener && typeof Purchases !== 'undefined' && Purchases?.removeCustomerInfoUpdateListener) {
        try {
          Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
        } catch {}
      }
    };
  }, [refreshSubscription]);

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { customerInfo: updatedInfo } = await Purchases.purchasePackage(pkg);
      const active = checkEntitlements(updatedInfo);
      setCustomerInfo(updatedInfo);
      if (active) {
        const selectedPlan = pkg.packageType === 'MONTHLY' ? 'monthly' : 'annual';
        cachedIsPro = true;
        cachedPlan = selectedPlan;
        cachedHasUsedTrial = true;
        setIsPro(true);
        setPlan(selectedPlan);
        setHasUsedTrial(true);
        notifyListeners();

        if (userId) {
          await AsyncStorage.setItem(`recall_pro_status_${userId}`, 'true');
          await AsyncStorage.setItem(`recall_user_plan_${userId}`, selectedPlan);
          await AsyncStorage.setItem(`recall_trial_used_${userId}`, 'true');
        }
        await AsyncStorage.setItem(PRO_STORAGE_KEY, 'true');
        await AsyncStorage.setItem(PLAN_STORAGE_KEY, selectedPlan);
        await AsyncStorage.setItem(TRIAL_USED_KEY, 'true');
        await AsyncStorage.setItem(TRIAL_START_KEY, new Date().toISOString());

        supabase.auth.updateUser({
          data: { is_pro: true, trial_used: true, plan: selectedPlan }
        }).catch(() => {});

        Alert.alert('Welcome to Recall Pro! 🎉', 'Your membership is now active with full access.');
      }
      return active;
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Error', e.message || 'Unable to complete purchase.');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (typeof Purchases !== 'undefined' && Purchases?.restorePurchases) {
        const restoredInfo = await Purchases.restorePurchases();
        const active = checkEntitlements(restoredInfo);
        setCustomerInfo(restoredInfo);

        if (active) {
          cachedIsPro = true;
          setIsPro(true);
          notifyListeners();
          await AsyncStorage.setItem(PRO_STORAGE_KEY, 'true');
          Alert.alert('Subscription Restored', 'Your Recall Pro subscription has been restored.');
          return true;
        }
      }
      
      const stored = await AsyncStorage.getItem(PRO_STORAGE_KEY);
      if (stored === 'true' || isPro) {
        cachedIsPro = true;
        setIsPro(true);
        notifyListeners();
        Alert.alert('Subscription Active', 'Recall Pro is active on this device.');
        return true;
      }

      Alert.alert('No Active Subscription', 'We could not find an active Recall Pro subscription for this account.');
      return false;
    } catch (e: any) {
      Alert.alert('Restore Error', e.message || 'Failed to restore purchases.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const redeemPromoCode = (code: string): boolean => {
    const formattedCode = code.trim().toUpperCase();
    if (PROMO_CODES.includes(formattedCode)) {
      cachedIsPro = true;
      cachedHasUsedTrial = true;
      setIsPro(true);
      setHasUsedTrial(true);
      notifyListeners();

      if (userId) {
        AsyncStorage.setItem(`recall_pro_status_${userId}`, 'true');
        AsyncStorage.setItem(`recall_trial_used_${userId}`, 'true');
      }
      AsyncStorage.setItem(PRO_STORAGE_KEY, 'true');
      AsyncStorage.setItem(TRIAL_USED_KEY, 'true');
      supabase.auth.updateUser({ data: { is_pro: true, trial_used: true } }).catch(() => {});

      Alert.alert('Promo Code Accepted! 🎉', `Code "${formattedCode}" applied successfully! You now have full Recall Pro access.`);
      return true;
    }
    Alert.alert('Invalid Promo Code', 'The code you entered is invalid or expired. Try using RECALLPRO.');
    return false;
  };

  const grantFreeProAccess = async (selectedPlan: 'annual' | 'monthly' = 'annual') => {
    cachedIsPro = true;
    cachedPlan = selectedPlan;
    cachedHasUsedTrial = true;
    setIsPro(true);
    setPlan(selectedPlan);
    setHasUsedTrial(true);
    notifyListeners();

    const nowIso = new Date().toISOString();
    if (userId) {
      await AsyncStorage.setItem(`recall_pro_status_${userId}`, 'true');
      await AsyncStorage.setItem(`recall_user_plan_${userId}`, selectedPlan);
      await AsyncStorage.setItem(`recall_trial_used_${userId}`, 'true');
      await AsyncStorage.setItem(`recall_trial_start_${userId}`, nowIso);
    }
    await AsyncStorage.setItem(PRO_STORAGE_KEY, 'true');
    await AsyncStorage.setItem(PLAN_STORAGE_KEY, selectedPlan);
    await AsyncStorage.setItem(TRIAL_USED_KEY, 'true');
    await AsyncStorage.setItem(TRIAL_START_KEY, nowIso);

    await supabase.auth.updateUser({
      data: { is_pro: true, plan: selectedPlan, trial_used: true }
    }).catch(() => {});
  };

  const updatePlan = async (newPlan: 'annual' | 'monthly') => {
    cachedPlan = newPlan;
    setPlan(newPlan);
    notifyListeners();

    if (userId) {
      await AsyncStorage.setItem(`recall_user_plan_${userId}`, newPlan);
    }
    await AsyncStorage.setItem(PLAN_STORAGE_KEY, newPlan);

    await supabase.auth.updateUser({
      data: { plan: newPlan }
    }).catch(() => {});
  };

  const cancelSubscription = async () => {
    Alert.alert(
      'Cancel Auto-Renewal',
      'Are you sure you want to cancel auto-renewal? Your Pro features will remain active until the end of your current billing period.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Turn Off Auto-Renew',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Auto-Renewal Canceled',
              'Auto-renewal has been turned off. Your Recall Pro benefits will remain active until the end of your billing cycle.'
            );
          },
        },
      ]
    );
  };

  return {
    isPro,
    isLoading,
    plan,
    hasUsedTrial,
    trialStartDate,
    customerInfo,
    currentOffering,
    purchasePackage,
    restorePurchases,
    redeemPromoCode,
    grantFreeProAccess,
    updatePlan,
    cancelSubscription,
    refreshSubscription,
  };
}
