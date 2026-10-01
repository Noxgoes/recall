import type { ReviewRating, InsightItem } from '@/types'
import { supabase } from './supabase'

// ─── SM-2 Algorithm (BACKEND.MD §4) ──────────────────────────

type Rating = ReviewRating

interface SM2State {
  easeFactor: number
  intervalDays: number
  repetitions: number
}

const RATING_QUALITY: Record<Rating, number> = {
  again:  1,
  forgot: 2,
  hard:   3,
  good:   4,
  easy:   5,
}

export function getEstimatedIntervals(state: { easeFactor?: number; intervalDays?: number; repetitions?: number }) {
  const ef = state.easeFactor ?? 2.5;
  const reps = state.repetitions ?? 0;
  const currInterval = state.intervalDays ?? 0;

  // Again (q=1) -> 1d
  const again = '1d';

  // Hard (q=3) -> max(1, round(currInterval * 1.2)) or 2d
  const hardDays = reps === 0 ? 1 : Math.max(2, Math.round(currInterval * 1.2));
  const hard = `${hardDays}d`;

  // Good (q=4) -> 1d, 6d, currInterval * ef
  let goodDays = 1;
  if (reps === 0) goodDays = 1;
  else if (reps === 1) goodDays = 6;
  else goodDays = Math.max(6, Math.round(currInterval * ef));
  const good = goodDays >= 30 ? `${Math.round(goodDays / 30)}mo` : `${goodDays}d`;

  // Easy (q=5) -> currInterval * ef * 1.3
  let easyDays = 3;
  if (reps === 0) easyDays = 4;
  else if (reps === 1) easyDays = 10;
  else easyDays = Math.max(10, Math.round(currInterval * ef * 1.3));
  const easy = easyDays >= 30 ? `${Math.round(easyDays / 30)}mo` : `${easyDays}d`;

  return { again, hard, good, easy };
}

export function calculateNextReview(
  state: SM2State,
  rating: Rating
): SM2State & { nextReviewAt: Date } {
  const q = RATING_QUALITY[rating]
  let { easeFactor, intervalDays, repetitions } = state

  if (q < 3) {
    // "forgot" — reset interval but keep ease_factor from dropping below floor
    repetitions  = 0
    intervalDays = 1
  } else {
    repetitions += 1
    if (repetitions === 1)      intervalDays = 1
    else if (repetitions === 2) intervalDays = 6
    else                        intervalDays = Math.round(intervalDays * easeFactor)
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  )

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays)

  return { easeFactor, intervalDays, repetitions, nextReviewAt }
}

// ─── Get due review queue (per insight_item) ─────────────────

export async function getReviewQueue(userId: string): Promise<InsightItem[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('insight_items')
    .select('*, insights(id, title, platform:source, url, tags, raw_input, content_type)')
    .eq('user_id', userId)
    .eq('saved', true)
    .lte('next_review_at', now)
    .order('next_review_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('getReviewQueue error:', error.message)
    return []
  }

  return (data ?? []) as InsightItem[]
}

// ─── Record a review for an insight_item ─────────────────────

export async function recordReview(
  userId: string,
  item: InsightItem,
  rating: ReviewRating
): Promise<void> {
  const currentState: SM2State = {
    easeFactor:  item.ease_factor  ?? 2.5,
    intervalDays: item.interval_days ?? 0,
    repetitions:  item.repetitions  ?? 0,
  }

  const { easeFactor, intervalDays, repetitions, nextReviewAt } =
    calculateNextReview(currentState, rating)

  // 1. Log review in audit table
  const { error: reviewErr } = await supabase.from('reviews').insert({
    user_id:           userId,
    insight_item_id:   item.id,
    rating,
    ease_factor_before: currentState.easeFactor,
    ease_factor_after:  easeFactor,
    interval_before:   currentState.intervalDays,
    interval_after:    intervalDays,
  })
  if (reviewErr) {
    console.error('recordReview - insert error:', reviewErr.message)
    throw reviewErr
  }

  // 2. Update insight_item with new SM-2 state
  const { error: updateErr } = await supabase
    .from('insight_items')
    .update({
      ease_factor:      easeFactor,
      interval_days:    intervalDays,
      repetitions,
      next_review_at:   nextReviewAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', item.id)

  if (updateErr) {
    console.error('recordReview - update error:', updateErr.message)
    throw updateErr
  }
}
