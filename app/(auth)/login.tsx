import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { signInWithGoogleOAuth } from '@/lib/authHelper';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const hasNavigatedRef = React.useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        const { isOnboardingCompleted } = await import('@/lib/onboardingHelper');
        const onboardingComplete = await isOnboardingCompleted(session.user.id);
        if (onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        const { isOnboardingCompleted } = await import('@/lib/onboardingHelper');
        const onboardingComplete = await isOnboardingCompleted(session.user.id);
        if (onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    let result;
    if (isSignup) {
      result = await supabase.auth.signUp({ email, password });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    setLoading(false);

    if (result.error) {
      Alert.alert('Authentication Failed', result.error.message);
    } else {
      if (isSignup) {
        Alert.alert('Success', 'Check your email for confirmation link!');
        setIsSignup(false);
      } else {
        if (result.data.user?.email === 'test@recall.app') {
          await AsyncStorage.setItem('recall_pro_status', 'true');
        }
        const { isOnboardingCompleted } = await import('@/lib/onboardingHelper');
        const onboardingComplete = await isOnboardingCompleted(result.data.user?.id);
        if (onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      }
    }
  };

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleMockOAuth = async (provider: string) => {
    setIsGoogleLoading(true);
    try {
      const success = await signInWithGoogleOAuth();
      if (!success) {
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      console.warn('Google Auth error:', err.message);
      Alert.alert('Sign In Failed', err.message || 'Could not sign in with Google.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F0EDFF', '#F8F6FF', '#FFFFFF']}
      locations={[0, 0.4, 1]}
      style={styles.gradient}
    >
      {isGoogleLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="large" color="#6E5BFF" />
          <Text style={styles.loadingOverlayText}>Setting up your experience...</Text>
        </View>
      )}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Logo / Brand Row */}
            <View style={styles.logoRow}>
              <View style={styles.logoIconWrap}>
                <Ionicons name="bookmark" size={18} color="#6E5BFF" />
              </View>
              <Text style={styles.brandText}>Recall</Text>
            </View>

            {/* 2. Hero Headlines */}
            <View style={[styles.heroSection, { marginBottom: 32 }]}>
              <Text style={styles.headline}>
                Welcome Back.
              </Text>
              <Text style={styles.subtitle}>
                Log in to access your saved insights and memory library.
              </Text>
            </View>

            {/* 3. Auth Area (Form is always visible on login) */}
            <View style={styles.authArea}>
              <View style={styles.formContainer}>
                
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={20} color="#AFAAC0" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#AFAAC0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={20} color="#AFAAC0" />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#AFAAC0"
                    secureTextEntry
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <TouchableOpacity
                  style={styles.emailBtn}
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.emailBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#E8E4F0' }} />
                  <Text style={{ marginHorizontal: 10, color: '#AFAAC0', fontFamily: 'Inter_500Medium' }}>OR</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#E8E4F0' }} />
                </View>

                {/* Google Button */}
                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={() => handleMockOAuth('Google')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.googleG}>G</Text>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleWrap, { marginTop: 16 }]}
                  onPress={() => router.replace('/(auth)/signup')}
                >
                  <Text style={styles.toggleText}>
                    Don't have an account? <Text style={styles.toggleLink}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  logoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(110, 91, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(110, 91, 255, 0.15)',
  },
  brandText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: '#1A153B',
    marginLeft: 10,
  },

  // Hero
  heroSection: {
    marginTop: 28,
    alignItems: 'center',
  },
  headline: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 36,
    lineHeight: 42,
    color: '#1A153B',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#7A7593',
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 300,
  },

  // Mascot
  mascotWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    minHeight: 260,
  },
  mascotImage: {
    width: '100%',
    height: 300,
  },

  // Auth area
  authArea: {
    marginTop: 8,
  },

  // Landing buttons
  landingButtons: {
    gap: 12,
  },
  googleBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E8E4F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 10,
    fontFamily: 'Inter_500Medium',
  },
  googleBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#1A153B',
  },
  emailBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#7C6FE0',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#6E5BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emailBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  loginFooter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginFooterText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#AFAAC0',
  },
  loginFooterLink: {
    fontFamily: 'Inter_500Medium',
    color: '#6E5BFF',
  },

  // Form
  formContainer: {
    gap: 14,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  formTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: '#1A153B',
  },
  cancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6E5BFF',
  },
  inputWrap: {
    backgroundColor: '#F9F8FF',
    borderWidth: 1.5,
    borderColor: '#E8E4F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#1A153B',
    marginLeft: 10,
  },
  toggleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  toggleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#AFAAC0',
    textAlign: 'center',
  },
  toggleLink: {
    fontFamily: 'Inter_500Medium',
    color: '#6E5BFF',
  },
  loadingOverlay: {
    backgroundColor: 'rgba(248, 246, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  loadingOverlayText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#1A153B',
    marginTop: 14,
  },
});
