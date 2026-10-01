// ─── Core domain types ────────────────────────────────────────

export type Platform = 'youtube' | 'shorts' | 'instagram' | 'twitter' | 'other'

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy' | 'forgot'

/** Controlled topic taxonomy — matches the AI extraction pipeline */
export type TopicTag =
  | 'Mindset'
  | 'Psychology'
  | 'Productivity'
  | 'Learning'
  | 'Technology'
  | 'Programming'
  | 'Design'
  | 'Business'
  | 'Career'
  | 'Finance'
  | 'Leadership'
  | 'Health'
  | 'Fitness'
  | 'Relationships'
  | 'Creativity'
  | 'Science'
  | 'Philosophy'
  | 'Books'
  | 'Marketing'
  | 'Entrepreneurship'
  | 'Other'

export type TagFilter =
  | 'all'
  | 'coding'
  | 'design'
  | 'business'
  | 'fitness'
  | 'mindset'
  | 'cooking'
  | 'career'
  | 'finance'
  | 'relationships'
  | 'general'
  | 'productivity'
  | 'health'
  | 'psychology'
  | 'books'
  // New controlled taxonomy tags
  | 'Mindset'
  | 'Psychology'
  | 'Productivity'
  | 'Learning'
  | 'Technology'
  | 'Programming'
  | 'Design'
  | 'Business'
  | 'Career'
  | 'Finance'
  | 'Leadership'
  | 'Health'
  | 'Fitness'
  | 'Relationships'
  | 'Creativity'
  | 'Science'
  | 'Philosophy'
  | 'Books'
  | 'Marketing'
  | 'Entrepreneurship'
  | 'Other'

/** Classified content type from the extraction pipeline */
export type ContentType =
  | 'youtube_video'
  | 'short_form_video'
  | 'article'
  | 'tweet'
  | 'tweet_thread'
  | 'podcast'
  | 'pdf'
  | 'book'
  | 'tutorial'
  | 'research'
  | 'other'

/** Insight type classification for individual takeaways */
export type InsightType =
  | 'principle'
  | 'strategy'
  | 'mental_model'
  | 'fact'
  | 'warning'
  | 'framework'
  | 'example'
  | 'actionable_tip'

/** Entity extraction result */
export type Entities = {
  people: string[]
  companies: string[]
  concepts: string[]
}

/** Per-insight quality scores (1–10 each) */
export type InsightScores = {
  memorability: number
  actionability: number
  novelty: number
  specificity: number
  long_term_value: number
}

// ─── Insight (one per saved link) ─────────────────────────────
export type Insight = {
  id: string
  user_id: string
  url: string
  platform: Platform
  title: string | null
  raw_input: string | null     // user's original notes
  tags: string[]
  status: 'pending' | 'processing' | 'ready' | 'failed'
  error_message: string | null
  is_favorited: boolean
  created_at: string
  updated_at: string
  user_points?: string | null
  ai_insights?: string[] | null
  // New intelligence pipeline fields (nullable for backward compat)
  content_type?: ContentType | null
  summary?: string | null
  entities?: Entities | null
  // virtual — joined from insight_items when needed
  insight_items?: InsightItem[]
}

// ─── InsightItem (individual AI takeaway — SM-2 per item) ─────
export type InsightItem = {
  id: string
  insight_id: string
  user_id: string
  /** Legacy flat content: "{headline}. {explanation}" — always populated */
  content: string
  order_index: number
  saved: boolean
  // SM-2 fields
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_at: string
  last_reviewed_at: string | null
  created_at: string
  // New rich structured fields (nullable — absent on older rows)
  headline?: string | null
  explanation?: string | null
  application?: string | null
  insight_type?: InsightType | null
  recall_question?: string | null
  source_evidence?: string | null
  memorability_score?: number | null
  actionability_score?: number | null
  novelty_score?: number | null
  specificity_score?: number | null
  long_term_value_score?: number | null
  // virtual — joined from insights when needed
  insights?: Pick<Insight, 'id' | 'title' | 'platform' | 'url' | 'tags'>
}

// ─── Review (audit log per insight_item review) ──────────────
export type Review = {
  id: string
  user_id: string
  insight_item_id: string
  rating: ReviewRating
  ease_factor_before: number | null
  ease_factor_after: number | null
  interval_before: number | null
  interval_after: number | null
  reviewed_at: string
}

// ─── Notes ────────────────────────────────────────────────────
export type Note = {
  id: string
  user_id: string
  insight_id: string
  content: string
  updated_at: string
}

// ─── Notification Settings ────────────────────────────────────
export type NotificationSettings = {
  id: string
  user_id: string
  enabled: boolean
  notify_time: string   // "HH:MM"
}

// ─── Structured insight from the AI pipeline ──────────────────
export type StructuredInsight = {
  headline: string
  explanation: string
  application: string | null
  type: InsightType
  recall_question: string
  source_evidence: string
  order_index: number
  scores: InsightScores
}

// ─── AI Extraction result ─────────────────────────────────────
export type ExtractionResult = {
  // Legacy flat fields (always present for backward compat)
  title: string
  insights: string[]
  tags: string[]
  source: string
  author?: string
  // New structured fields (present on upgraded pipeline responses)
  status?: 'ok' | 'insufficient_content'
  content_type?: ContentType
  summary?: string
  topics?: string[]
  entities?: Entities
  structured_insights?: StructuredInsight[]
}

// ─── Profile Stats ────────────────────────────────────────────
export type ProfileStats = {
  totalInsights: number
  totalReviews: number
  currentStreak: number
  knowledgeScore: number
  topTags: Array<{ tag: string; count: number; percent: number }>
  achievements: Achievement[]
}

export type Achievement = {
  id: string
  title: string
  description: string
  earnedAt: string | null
  isEarned: boolean
  badge: 'explorer' | 'trophy' | 'hundred'
}
