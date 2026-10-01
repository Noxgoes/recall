import { Platform } from 'react-native';

let Purchases: any = null;
let LOG_LEVEL: any = null;

try {
  const rc = require('react-native-purchases');
  Purchases = rc?.default || rc;
  LOG_LEVEL = rc?.LOG_LEVEL;
} catch (e) {
  // Purchases not available in this environment
}

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || 'test_DMkDosNWtiSPaEUEQZwIutzvSBj',
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || 'test_DMkDosNWtiSPaEUEQZwIutzvSBj',
};

export const REVENUECAT_ENTITLEMENT_ID = 'pro';

let isInitialized = false;

/**
 * Check if Purchases native module is available in the current runtime environment
 */
export function isPurchasesSupported(): boolean {
  return Boolean(
    Purchases &&
    typeof Purchases === 'object' &&
    typeof Purchases.configure === 'function'
  );
}

/**
 * Initialize RevenueCat Purchases SDK
 */
export async function initRevenueCat(userId?: string): Promise<boolean> {
  try {
    if (!isPurchasesSupported()) {
      if (__DEV__) {
        console.warn('[RevenueCat] Native Purchases module is not available. Running in Mock / Trial mode.');
      }
      return false;
    }

    if (isInitialized) {
      if (userId && typeof Purchases?.logIn === 'function') {
        await Purchases.logIn(userId);
      }
      return true;
    }

    const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
    const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

    const apiKey = Platform.select({
      ios: iosKey,
      android: androidKey,
      default: androidKey || iosKey,
    });

    if (!apiKey || apiKey.includes('your_revenuecat')) {
      if (__DEV__) {
        console.log('[RevenueCat] Operating in Mock / Sandbox mode (No API Key set in .env)');
      }
      return false;
    }

    if (__DEV__ && Purchases?.setLogLevel && LOG_LEVEL?.DEBUG) {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      } catch (e) {
        // ignore log level error
      }
    }

    if (typeof Purchases?.configure === 'function') {
      Purchases.configure({
        apiKey,
        appUserID: userId || undefined,
      });
      isInitialized = true;
      console.log('[RevenueCat] Successfully initialized with user:', userId || 'anonymous');
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[RevenueCat] Initialization error:', error);
    return false;
  }
}

/**
 * Log out user from RevenueCat session
 */
export async function logoutRevenueCat(): Promise<void> {
  try {
    if (isPurchasesSupported() && isInitialized && typeof Purchases?.isConfigured === 'function') {
      if (await Purchases.isConfigured()) {
        await Purchases.logOut();
      }
    }
  } catch (error) {
    console.warn('[RevenueCat] Logout error:', error);
  }
}


