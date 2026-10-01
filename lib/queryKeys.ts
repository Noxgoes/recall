// ─── Centralized Query Keys ────────────────────────────────────
// ALWAYS use these — never hand-type query key arrays inline.
// A mismatched key means invalidation silently does nothing.

export const queryKeys = {
  insights:     (uid: string) => ['insights',      uid]            as const,
  insightItems: (uid: string) => ['insight_items', uid]            as const,
  dueReviews:   (uid: string) => ['insight_items', uid, 'due']    as const,
  insight:      (id: string)  => ['insight',       id]             as const,
  insightWithItems: (id: string) => ['insight', id, 'full']        as const,
  reviews:      (uid: string) => ['reviews',       uid]            as const,
  stats:        (uid: string) => ['stats',         uid]            as const,
  today:        (uid: string) => ['insights',      uid, 'today']   as const,
  yesterday:    (uid: string) => ['insights',      uid, 'yesterday'] as const,
}
