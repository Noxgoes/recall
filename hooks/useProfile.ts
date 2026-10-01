import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const email = session?.user?.email || '';

  const meta = session?.user?.user_metadata;
  const googleName = meta?.full_name || meta?.name;
  const initialFallback = email ? email.split('@')[0] : 'User';
  const formattedDefaultName = initialFallback.charAt(0).toUpperCase() + initialFallback.slice(1);
  const defaultName = googleName || formattedDefaultName;
  const defaultAvatar = meta?.avatar_url || meta?.picture || null;

  const [name, setName] = useState<string>(defaultName);
  const [avatarUri, setAvatarUri] = useState<string | null>(defaultAvatar);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStoredProfile() {
      if (!userId) {
        setName(defaultName);
        setAvatarUri(defaultAvatar);
        setLoading(false);
        return;
      }

      try {
        const storedName = await AsyncStorage.getItem(`recall_user_name_${userId}`);
        const storedAvatar = await AsyncStorage.getItem(`recall_user_avatar_${userId}`);

        setName(storedName || defaultName);
        setAvatarUri(storedAvatar !== null ? storedAvatar || null : defaultAvatar);
      } catch (e) {
        console.error('Failed to load profile settings:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStoredProfile();
  }, [userId, session, defaultName, defaultAvatar]);

  const updateProfile = async (newName: string, newAvatarUri: string | null) => {
    const trimmedName = newName.trim() || defaultName;
    setName(trimmedName);
    setAvatarUri(newAvatarUri);

    if (!userId) return;

    try {
      await AsyncStorage.setItem(`recall_user_name_${userId}`, trimmedName);
      if (newAvatarUri) {
        await AsyncStorage.setItem(`recall_user_avatar_${userId}`, newAvatarUri);
      } else {
        await AsyncStorage.setItem(`recall_user_avatar_${userId}`, '');
      }

      // Sync with Supabase Auth session if active
      if (session) {
        await supabase.auth.updateUser({
          data: {
            full_name: trimmedName,
            name: trimmedName,
            avatar_url: newAvatarUri,
          },
        });
      }
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  return { name, avatarUri, loading, updateProfile, email };
}
