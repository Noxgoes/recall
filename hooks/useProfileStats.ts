import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from './useAuth'
import type { ProfileStats, Achievement } from '@/types'

export function useProfileStats() {
  const { session } = useAuth()
  const uid = session?.user?.id

  return useQuery({
    queryKey: queryKeys.stats(uid ?? ''),
    enabled: !!uid,
    queryFn: async (): Promise<ProfileStats> => {
      // Parallel queries against the database schema
      const [insightsRes, itemsRes, reviewsRes] = await Promise.all([
        supabase
          .from('insights')
          .select('id, tags, is_favorited, created_at')
          .eq('user_id', uid!)
          .eq('status', 'ready'),
        supabase
          .from('insight_items')
          .select('id, ease_factor')
          .eq('user_id', uid!)
          .eq('saved', true),
        supabase
          .from('reviews')
          .select('reviewed_at, rating')
          .eq('user_id', uid!)
          .order('reviewed_at', { ascending: false }),
      ])

      if (insightsRes.error) console.error('useProfileStats insights error:', insightsRes.error.message)
      if (reviewsRes.error)  console.error('useProfileStats reviews error:',  reviewsRes.error.message)

      const insights = insightsRes.data ?? []
      const items    = itemsRes.data    ?? []
      const reviews  = reviewsRes.data  ?? []

      // ── Totals ──────────────────────────────────────────────
      const totalInsights = insights.length
      const totalReviews  = reviews.length

      // ── Streak (consecutive days with at least one saved memory) ──
      const currentStreak = computeStreak(insights.map(i => i.created_at))

      // ── Retention / Knowledge score ──────────────────────────
      // Derived from ease_factor & reviews rating (1.3 = initial, 4.0 = high retention)
      // High rating reviews count towards retention percentage (0 - 100%)
      const goodReviews = reviews.filter(r => r.rating === 'good' || r.rating === 'easy').length
      const retentionPercentage = totalReviews > 0
        ? Math.round((goodReviews / totalReviews) * 100)
        : items.length > 0
        ? Math.round(((items.reduce((s, i) => s + (i.ease_factor ?? 2.5), 0) / items.length - 1.3) / 2.7) * 100)
        : 0 // New accounts start at 0% until memories are reviewed

      const knowledgeScore = Math.min(100, Math.max(0, retentionPercentage))

      // ── Top tags from insights ───────────────────────────────
      const tagCounts: Record<string, number> = {}
      for (const insight of insights) {
        const tags: string[] = Array.isArray(insight.tags) ? insight.tags : []
        for (const t of tags) {
          tagCounts[t] = (tagCounts[t] ?? 0) + 1
        }
      }
      const totalTagCount = Object.values(tagCounts).reduce((s, v) => s + v, 0)
      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({
          tag,
          count,
          percent: totalTagCount > 0 ? Math.round((count / totalTagCount) * 100) : 0,
        }))

      // ── Achievements ────────────────────────────────────────
      const achievements: Achievement[] = [
        {
          id:          'explorer',
          title:       'Memory Explorer',
          description: 'Save your first 50 insights',
          isEarned:    totalInsights >= 50,
          earnedAt:    totalInsights >= 50 ? (insights[49]?.created_at ?? null) : null,
          badge:       'explorer',
        },
        {
          id:          'trophy',
          title:       'Consistency Master',
          description: 'Maintain a 7-day streak',
          isEarned:    currentStreak >= 7,
          earnedAt:    currentStreak >= 7 ? (insights[0]?.created_at ?? null) : null,
          badge:       'trophy',
        },
        {
          id:          'hundred',
          title:       '100 Reviews',
          description: 'Complete 100 reviews',
          isEarned:    totalReviews >= 100,
          earnedAt:    totalReviews >= 100 ? (reviews[99]?.reviewed_at ?? null) : null,
          badge:       'hundred',
        },
      ]

      return { totalInsights, totalReviews, currentStreak, knowledgeScore, topTags, achievements }
    },
  })
}

// ── Streak: consecutive calendar days with at least 1 saved memory ──
function computeStreak(dateList: string[]): number {
  if (dateList.length === 0) return 0

  const formatDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

  const dateSet = new Set(dateList.map(d => formatDateKey(new Date(d))))

  let checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)

  const hasToday = dateSet.has(formatDateKey(checkDate))
  
  const yesterday = new Date(checkDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const hasYesterday = dateSet.has(formatDateKey(yesterday))

  // If user hasn't saved today or yesterday, streak is broken (0)
  if (!hasToday && !hasYesterday) {
    return 0
  }

  // Start counting from today if saved today, otherwise count back from yesterday
  if (!hasToday) {
    checkDate = yesterday
  }

  let streak = 0
  while (dateSet.has(formatDateKey(checkDate))) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}
