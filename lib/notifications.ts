import * as Device from 'expo-device';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

let Notifications: any = null;

try {
  Notifications = require('expo-notifications');
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  console.warn("Notifications handler could not be initialized:", e);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn("Could not request notification permissions:", e);
    return false;
  }
}

/**
 * Parses time string like "8:00 AM" or "8:00 PM" into { hour, minute }
 */
export function parseTimeStringToHourMinute(timeStr: string): { hour: number; minute: number } {
  try {
    const [time, modifier] = timeStr.trim().split(' ');
    let [hoursStr, minutesStr] = time.split(':');
    let hour = parseInt(hoursStr, 10);
    let minute = parseInt(minutesStr, 10);

    if (modifier?.toUpperCase() === 'PM' && hour < 12) {
      hour += 12;
    }
    if (modifier?.toUpperCase() === 'AM' && hour === 12) {
      hour = 0;
    }
    return { hour, minute };
  } catch {
    return { hour: 8, minute: 0 };
  }
}

export async function scheduleDailyDigest(hour: number, minute: number) {
  if (!Notifications) return;
  try {
    // Cancel existing scheduled digest
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧠 Time for your Daily Recall',
        body: 'Review today’s saved insights & resurfaced memories before you forget them!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    console.log(`[Notifications] Daily digest scheduled for ${hour}:${minute < 10 ? '0' : ''}${minute}`);
  } catch (e) {
    console.warn("Could not schedule daily digest notification:", e);
  }
}

export async function cancelDailyDigest() {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] Cancelled all daily digest reminders');
  } catch (e) {
    console.warn("Could not cancel notifications:", e);
  }
}

import { supabase } from './supabase';

export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>, delaySeconds: number = 0) {
  if (!Notifications) return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('[Notifications] Cannot send local notification: permission not granted');
      return;
    }

    if (delaySeconds > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        },
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data,
        },
        trigger: null, // null trigger fires immediately
      });
    }
  } catch (e) {
    console.warn("Could not send immediate local notification:", e);
  }
}

/**
 * Sends a Daily Digest demo notification
 */
export async function triggerDemoDailyDigestNotification(delaySeconds: number = 2) {
  await sendLocalNotification(
    '🧠 Time for your Daily Recall',
    'You have 4 memories ready to review: Huberman Lab, Naval, and more.',
    { type: 'digest' },
    delaySeconds
  );
}

/**
 * Sends a Random Memory Serendipity demo notification
 */
export async function triggerDemoRandomMemoryNotification(delaySeconds: number = 3) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    let title = 'Naval: How to Get Rich Without Getting Lucky';
    let body = '“Arm yourself with specific knowledge & permissionless leverage (code & media) to build wealth.”';
    let insightId: string | undefined = undefined;

    if (session?.user?.id) {
      const { data: insights } = await supabase
        .from('insights')
        .select('id, title, summary, insight_items(headline, explanation)')
        .eq('user_id', session.user.id)
        .eq('status', 'ready')
        .limit(10);

      if (insights && insights.length > 0) {
        const randomItem = insights[Math.floor(Math.random() * insights.length)];
        title = randomItem.title || title;
        const itemTakeaway = (randomItem as any).insight_items?.[0];
        if (itemTakeaway?.headline) {
          body = `“${itemTakeaway.headline}”`;
        } else if (randomItem.summary) {
          body = `“${randomItem.summary}”`;
        }
        insightId = randomItem.id;
      }
    }

    await sendLocalNotification(
      `✨ Memory from your library: ${title}`,
      body,
      { insightId, type: 'serendipity' },
      delaySeconds
    );
  } catch (e) {
    console.warn('[Notifications] Error triggering random memory notification:', e);
  }
}

/**
 * Triggers BOTH notifications staggered (Digest at 2s, Random Memory at 5s) for a perfect demo recording!
 */
export async function triggerDemoRecordingNotifications() {
  await triggerDemoDailyDigestNotification(2);
  await triggerDemoRandomMemoryNotification(5);
}

/**
 * Schedules a spontaneous surprise memory drop at a random daytime hour tomorrow
 */
export async function scheduleRandomMemoryNudges() {
  if (!Notifications) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    // Fetch user's saved insights
    const { data: insights, error } = await supabase
      .from('insights')
      .select('id, title, ai_insights')
      .eq('user_id', session.user.id)
      .limit(30);

    if (error || !insights || insights.length === 0) return;

    // Pick a random saved insight
    const randomItem = insights[Math.floor(Math.random() * insights.length)];
    const title = randomItem.title || 'Saved Memory';
    
    // Extract first takeaway if available
    let takeaway = 'Tap to refresh this thought';
    if (Array.isArray(randomItem.ai_insights) && randomItem.ai_insights.length > 0) {
      takeaway = randomItem.ai_insights[0];
    } else if (typeof randomItem.ai_insights === 'string') {
      takeaway = randomItem.ai_insights;
    }

    // Pick a random hour between 10 AM (10) and 7 PM (19)
    const randomHour = Math.floor(Math.random() * (19 - 10 + 1)) + 10;
    const randomMinute = Math.floor(Math.random() * 60);

    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + 1);
    triggerDate.setHours(randomHour, randomMinute, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `✨ A thought for your day: ${title}`,
        body: takeaway,
        sound: true,
        data: { insightId: randomItem.id, type: 'serendipity' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    console.log(`[Notifications] Surprise memory nudge scheduled for: ${triggerDate.toLocaleString()}`);
  } catch (err) {
    console.warn('[Notifications] Could not schedule random memory nudge:', err);
  }
}
