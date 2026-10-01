-- -----------------------------------------------------------------------------
-- Migration: Recall Intelligence Pipeline Upgrade
-- All new columns are nullable — existing rows are unaffected.
-- -----------------------------------------------------------------------------

-- insight_items: add rich structured columns from the new extraction pipeline
ALTER TABLE insight_items
  ADD COLUMN IF NOT EXISTS headline            TEXT,
  ADD COLUMN IF NOT EXISTS explanation         TEXT,
  ADD COLUMN IF NOT EXISTS application         TEXT,
  ADD COLUMN IF NOT EXISTS insight_type        TEXT,
  ADD COLUMN IF NOT EXISTS recall_question     TEXT,
  ADD COLUMN IF NOT EXISTS source_evidence     TEXT,
  ADD COLUMN IF NOT EXISTS memorability_score  SMALLINT,
  ADD COLUMN IF NOT EXISTS actionability_score SMALLINT,
  ADD COLUMN IF NOT EXISTS novelty_score       SMALLINT,
  ADD COLUMN IF NOT EXISTS specificity_score   SMALLINT,
  ADD COLUMN IF NOT EXISTS long_term_value_score SMALLINT;

-- insights: add content classification, entity extraction, and summary
ALTER TABLE insights
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS entities     JSONB,
  ADD COLUMN IF NOT EXISTS summary      TEXT;

-- Index for future queries that filter by content_type (Phase 2 daily recall)
CREATE INDEX IF NOT EXISTS idx_insights_content_type ON insights(content_type);

-- Index to allow efficient lookup of insight_items by recall_question presence
CREATE INDEX IF NOT EXISTS idx_insight_items_recall_question
  ON insight_items(insight_id)
  WHERE recall_question IS NOT NULL;
