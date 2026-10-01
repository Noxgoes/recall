import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { queryKeys } from '@/lib/queryKeys'
import { getReviewQueue, recordReview } from '@/lib/spaced-repetition'
import type { InsightItem, ReviewRating } from '@/types'

// ─── Due review queue (insight_items with next_review_at <= now) ─
export function useReviewQueue() {
  const { session } = useAuth()
  const uid = session?.user?.id

  return useQuery({
    queryKey: queryKeys.dueReviews(uid ?? ''),
    enabled: !!uid,
    queryFn: () => getReviewQueue(uid!),
    staleTime: 1000 * 60, // refresh queue every minute
  })
}

// ─── Record a review ─────────────────────────────────────────
export function useRecordReview() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const uid = session?.user?.id

  return useMutation({
    mutationFn: async ({
      item,
      rating,
    }: {
      item: InsightItem
      rating: ReviewRating
    }) => {
      if (!uid) throw new Error('Not authenticated')
      await recordReview(uid, item, rating)
    },
    onSuccess: () => {
      if (!uid) return
      qc.invalidateQueries({ queryKey: queryKeys.dueReviews(uid) })
      qc.invalidateQueries({ queryKey: queryKeys.insightItems(uid) })
      qc.invalidateQueries({ queryKey: queryKeys.reviews(uid) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(uid) })
    },
    onError: (err: Error) => {
      console.error('useRecordReview error:', err.message)
    },
  })
}

export { useReviewQueue as useDueReviews };
