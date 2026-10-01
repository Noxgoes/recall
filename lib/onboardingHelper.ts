import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export async function isOnboardingCompleted(userId?: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = userId || session?.user?.id;
  const email = session?.user?.email;

  // The pre-loaded demo account should always land directly on the populated dashboard
  if (email === 'test@recall.app') {
    return true;
  }

  // If Supabase explicitly says false, onboarding is definitely NOT completed
  if (session?.user?.user_metadata?.onboarding_completed === false) {
    return false;
  }

  // Check Supabase user metadata
  if (session?.user?.user_metadata?.onboarding_completed === true) {
    return true;
  }

  if (uid) {
    const userFlag = await AsyncStorage.getItem(`recall_onboarding_complete_${uid}`);
    return userFlag === 'true';
  }

  return false;
}

export async function saveOnboardingSampleMemory(userId?: string, customUrl?: string): Promise<boolean> {
  try {
    let uid = userId;
    if (!uid) {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id;
    }
    if (!uid) return false;

    // Check if user already has this memory
    const { data: existing } = await supabase
      .from('insights')
      .select('id')
      .eq('user_id', uid)
      .eq('title', 'How to Build Better Habits')
      .limit(1);

    if (existing && existing.length > 0) {
      return true; // Already seeded
    }

    const savedUrl = customUrl || (await AsyncStorage.getItem('pending_onboarding_url')) || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    const { data: insight, error: insertErr } = await supabase
      .from('insights')
      .insert({
        user_id: uid,
        url: savedUrl,
        source: 'youtube',
        title: 'How to Build Better Habits',
        tags: ['Productivity', 'Mindset', 'Learning'],
        status: 'ready',
        raw_input: 'Saved during onboarding',
        summary: 'Core principles of building better systems and habits that stick.',
        content_type: 'youtube_video',
        is_favorited: true,
      })
      .select('id')
      .single();

    if (insertErr || !insight) {
      console.warn('Failed to insert onboarding insight:', insertErr?.message);
      return false;
    }

    const items = [
      {
        insight_id: insight.id,
        user_id: uid,
        order_index: 0,
        saved: true,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        headline: 'Build systems instead of goals',
        explanation: 'Winners and losers have the same goals. The difference is the systems they follow.',
        content: 'Build systems instead of goals. Winners and losers have the same goals. The difference is the systems they follow.',
        insight_type: 'principle',
        recall_question: 'Why do systems matter more than goals when building habits?',
        source_evidence: 'You do not rise to the level of your goals. You fall to the level of your systems.',
        memorability_score: 9,
        actionability_score: 9,
        novelty_score: 8,
        specificity_score: 8,
        long_term_value_score: 9,
      },
      {
        insight_id: insight.id,
        user_id: uid,
        order_index: 1,
        saved: true,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        headline: 'Identity shapes your behaviour',
        explanation: 'True behavior change is identity change. When a habit becomes who you are, consistency becomes effortless.',
        content: 'Identity shapes your behaviour. True behavior change is identity change. When a habit becomes who you are, consistency becomes effortless.',
        insight_type: 'mental_model',
        recall_question: 'What is the deepest layer of behavior change?',
        source_evidence: 'The goal is not to read a book, the goal is to become a reader.',
        memorability_score: 9,
        actionability_score: 9,
        novelty_score: 8,
        specificity_score: 8,
        long_term_value_score: 9,
      },
      {
        insight_id: insight.id,
        user_id: uid,
        order_index: 2,
        saved: true,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        headline: 'Tiny habits compound over time',
        explanation: 'Improving by 1 percent each day creates a massive compounding advantage over months and years.',
        content: 'Tiny habits compound over time. Improving by 1 percent each day creates a massive compounding advantage over months and years.',
        insight_type: 'framework',
        recall_question: 'How does compounding apply to daily habits?',
        source_evidence: 'Habits are the compound interest of self-improvement.',
        memorability_score: 8,
        actionability_score: 9,
        novelty_score: 7,
        specificity_score: 8,
        long_term_value_score: 9,
      },
      {
        insight_id: insight.id,
        user_id: uid,
        order_index: 3,
        saved: true,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        headline: 'Environment beats motivation',
        explanation: 'Design your visual surroundings so cues for positive habits are obvious and distractions are hidden.',
        content: 'Environment beats motivation. Design your visual surroundings so cues for positive habits are obvious and distractions are hidden.',
        insight_type: 'strategy',
        recall_question: 'How can you optimize your environment for better habits?',
        source_evidence: 'Environment is the invisible hand that shapes human behavior.',
        memorability_score: 9,
        actionability_score: 9,
        novelty_score: 8,
        specificity_score: 9,
        long_term_value_score: 9,
      },
      {
        insight_id: insight.id,
        user_id: uid,
        order_index: 4,
        saved: true,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        headline: 'Never miss twice',
        explanation: 'Missing once is an accident. Missing twice is the start of an unintended new habit.',
        content: 'Never miss twice. Missing once is an accident. Missing twice is the start of an unintended new habit.',
        insight_type: 'actionable_tip',
        recall_question: 'What rule helps recover quickly from an interrupted streak?',
        source_evidence: 'The first mistake is never the one that ruins you. It is the spiral of repeated mistakes that follows.',
        memorability_score: 9,
        actionability_score: 10,
        novelty_score: 8,
        specificity_score: 9,
        long_term_value_score: 9,
      },
    ];

    const { error: itemsErr } = await supabase.from('insight_items').insert(items);
    if (itemsErr) {
      console.warn('Failed to insert onboarding insight items:', itemsErr.message);
    }

    return true;
  } catch (e) {
    console.warn('saveOnboardingSampleMemory error:', e);
    return false;
  }
}

export async function setOnboardingCompleted(userId?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = userId || session?.user?.id;

  if (uid) {
    await AsyncStorage.setItem(`recall_onboarding_complete_${uid}`, 'true');
  }
  await AsyncStorage.setItem('recall_onboarding_complete', 'true');

  // Save the onboarding example memory into the user's library
  await saveOnboardingSampleMemory(uid);

  // Sync to Supabase user metadata so it persists across device re-installs
  if (session?.user) {
    await supabase.auth.updateUser({
      data: { onboarding_completed: true },
    }).catch(() => {});
  }
}

export async function clearOnboardingCompleted(userId?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = userId || session?.user?.id;

  if (uid) {
    await AsyncStorage.removeItem(`recall_onboarding_complete_${uid}`);
  }
  await AsyncStorage.removeItem('recall_onboarding_complete');

  if (session?.user) {
    await supabase.auth.updateUser({
      data: { onboarding_completed: false },
    }).catch(() => {});
  }
}
