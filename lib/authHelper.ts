import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { router } from 'expo-router';
import { isOnboardingCompleted } from './onboardingHelper';

WebBrowser.maybeCompleteAuthSession();

export function getOAuthRedirectUri(): string {
  if (Constants.appOwnership === 'expo') {
    return Linking.createURL('/');
  }
  return 'recall://';
}

let isHandlingAuthLock = false;

export async function handleOAuthRedirectUrl(url: string): Promise<boolean> {
  if (isHandlingAuthLock) {
    return true;
  }
  isHandlingAuthLock = true;

  try {
    let currentUserId: string | undefined;

    if (url) {
      const hashIdx = url.indexOf('#');
      const queryIdx = url.indexOf('?');
      
      let paramsString = '';
      if (hashIdx !== -1) {
        paramsString = url.substring(hashIdx + 1);
      } else if (queryIdx !== -1) {
        paramsString = url.substring(queryIdx + 1);
      }
      
      const parsedLinking = Linking.parse(url);
      const searchParams = new URLSearchParams(paramsString);
      
      const code = (parsedLinking.queryParams?.code as string) || searchParams.get('code');
      const access_token = (parsedLinking.queryParams?.access_token as string) || searchParams.get('access_token');
      const refresh_token = (parsedLinking.queryParams?.refresh_token as string) || searchParams.get('refresh_token');

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn('[handleOAuthRedirectUrl] exchangeCodeForSession notice:', error.message);
        }
        currentUserId = data?.session?.user?.id;
      } else if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          console.warn('[handleOAuthRedirectUrl] setSession notice:', error.message);
        }
        currentUserId = data?.session?.user?.id;
      }
    }

    if (!currentUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      currentUserId = session?.user?.id;
    }

    const onboarded = await isOnboardingCompleted(currentUserId);
    if (onboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
    return true;
  } catch (err: any) {
    console.error('[handleOAuthRedirectUrl] error:', err);
    return false;
  } finally {
    setTimeout(() => {
      isHandlingAuthLock = false;
    }, 2500);
  }
}

export async function signInWithGoogleOAuth(): Promise<boolean> {
  const redirectUri = getOAuthRedirectUri();

  // 1. Request OAuth authorization URL from Supabase
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('No authorization URL returned from Supabase.');
  }

  // 2. Open auth session in browser
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (res.type === 'success' && res.url) {
    return await handleOAuthRedirectUrl(res.url);
  }

  // Check if session was already processed by deep link handler
  if (isHandlingAuthLock) {
    return true;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    return await handleOAuthRedirectUrl('');
  }

  return false;
}
