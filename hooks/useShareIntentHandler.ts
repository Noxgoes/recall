import { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';

import * as Haptics from 'expo-haptics';

function extractUrl(text: string | null): string | null {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

export function useShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('Saving...');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!hasShareIntent) return;

    const url = shareIntent.webUrl || extractUrl(shareIntent.text ?? null);
    if (!url) {
      console.warn('[ShareIntent] Received share intent but no URL was found:', shareIntent);
      resetShareIntent();
      return;
    }

    async function handleShare() {
      try {
        setIsProcessing(true);
        setMessage('Saving to Recall...');

        // 1. Get current authenticated user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setMessage('Please log in first');
          setSuccess(false);
          setTimeout(() => {
            resetShareIntent();
            setIsProcessing(false);
          }, 2000);
          return;
        }

        const userId = session.user.id;

        // 2. Check for duplicate URL
        const { data: existing } = await supabase
          .from('insights')
          .select('id, raw_input')
          .eq('user_id', userId)
          .eq('url', url)
          .maybeSingle();

        // Check if the link is from X / Twitter
        const isXOrTwitter = url ? /twitter\.com|x\.com/i.test(url) : false;

        // Extract accompanying post text specifically for X / Twitter (excluding the URL itself)
        const sharedText = shareIntent.text ?? '';
        const notes = isXOrTwitter && url ? sharedText.replace(url, '').trim() : '';

        let insightId = '';

        if (existing) {
          // Update timestamp for duplicate
          insightId = existing.id;
          await supabase
            .from('insights')
            .update({
              created_at: new Date().toISOString(),
              status: 'processing',
              raw_input: notes || existing.raw_input,
            })
            .eq('id', insightId);
        } else {
          // Insert new pending insight
          const { data: newInsight, error: insertErr } = await supabase
            .from('insights')
            .insert({
              user_id: userId,
              url: url,
              status: 'processing',
              raw_input: notes || null,
            })
            .select()
            .single();

          if (insertErr) throw insertErr;
          insightId = newInsight.id;
        }

        // 3. Trigger AI Insight Extraction in background via the process-insight Edge Function
        console.log(`[ShareIntent] Triggering background extraction for ID: ${insightId}`);
        supabase.functions.invoke('process-insight', {
          body: {
            insightId,
            url,
            notes: notes || undefined,
            userId,
          },
        }).catch((err) => {
          console.error('[ShareIntent] Error calling process-insight:', err);
        });

        // 4. Invalidate queries so the new item shows up immediately
        queryClient.invalidateQueries({ queryKey: queryKeys.insights(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.today(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats(userId) });

        // 5. Show success confirmation overlay
        setSuccess(true);
        setMessage('Saved to Recall');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 5. Native auto-dismiss after 800ms
        setTimeout(() => {
          resetShareIntent();
          setIsProcessing(false);
          setSuccess(false);

          if (Platform.OS === 'android') {
            BackHandler.exitApp();
          }
        }, 850);

      } catch (err: any) {
        console.error('[ShareIntent] Failed to handle shared content:', err.message);
        setMessage('Failed to save link');
        setSuccess(false);
        setTimeout(() => {
          resetShareIntent();
          setIsProcessing(false);
        }, 1500);
      }
    }

    handleShare();
  }, [hasShareIntent, shareIntent]);

  return {
    isShareProcessing: isProcessing,
    shareMessage: message,
    shareSuccess: success,
  };
}
