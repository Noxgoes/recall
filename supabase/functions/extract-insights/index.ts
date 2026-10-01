import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { fetchSupadataTranscript } from './supadata.ts';
import { fetchArticleText } from './article.ts';
import { fetchTweetContent } from './tweet.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Platform detection ────────────────────────────────────────────────────────
function detectMediaType(url: string): 'video' | 'tweet' | 'article' {
  if (/twitter\.com|x\.com/i.test(url)) return 'tweet';
  const videoPatterns = [
    /youtube\.com|youtu\.be/,
    /tiktok\.com/,
    /instagram\.com/,
  ];
  return videoPatterns.some((p) => p.test(url)) ? 'video' : 'article';
}

function detectContentType(url: string): string {
  if (/youtube\.com\/shorts/i.test(url)) return 'short_form_video';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube_video';
  if (/tiktok\.com/i.test(url)) return 'short_form_video';
  if (/instagram\.com\/(reel|p\/)/i.test(url)) return 'short_form_video';
  if (/instagram\.com/i.test(url)) return 'short_form_video';
  if (/twitter\.com|x\.com/i.test(url)) return 'tweet';
  if (/podcast|overcast|spotify|anchor|buzzsprout/i.test(url)) return 'podcast';
  return 'article';
}

// ── Controlled topic taxonomy ─────────────────────────────────────────────────
const VALID_TOPICS = new Set([
  'Mindset', 'Psychology', 'Productivity', 'Learning', 'Technology',
  'Programming', 'Design', 'Business', 'Career', 'Finance', 'Leadership',
  'Health', 'Fitness', 'Relationships', 'Creativity', 'Science',
  'Philosophy', 'Books', 'Marketing', 'Entrepreneurship', 'Other',
]);

// ── Insight type enum ─────────────────────────────────────────────────────────
const VALID_INSIGHT_TYPES = new Set([
  'principle', 'strategy', 'mental_model', 'fact', 'warning',
  'framework', 'example', 'actionable_tip',
]);

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a knowledge extraction engine for Recall, a personal memory system.

You are NOT a summarizer. Your job is to identify the smallest number of ideas from this source that are genuinely worth remembering long-term.

PHILOSOPHY:
- Find what is actually worth remembering — not what is frequently mentioned
- Every insight must remain useful weeks or months after the user forgets the source
- Prefer principles, mental models, strategies, warnings, and frameworks over summaries
- Never invent statistics, claims, or conclusions not directly supported by the source

EXTRACTION PROCESS (follow in order):

STAGE 1 — Classify the content type. Choose one of:
youtube_video, short_form_video, article, tweet, tweet_thread, podcast, pdf, book, tutorial, research, other

STAGE 2 — Based on content type, extract 6–10 CANDIDATE ideas. Include:
- principles, strategies, mental models, frameworks, facts, warnings, techniques, non-obvious observations
Let quantity be generous at this stage.

STAGE 3 — Score every candidate on these dimensions (1–10 each):
- memorability: Would this be useful to remember a month from now?
- actionability: Can the user actually do something with this?
- novelty: Does this provide a meaningful idea rather than an obvious statement?
- specificity: Is this concrete enough to be useful?
- long_term_value: Would this remain useful after the user forgets the original source?

STAGE 4 — Remove duplicates. If two candidates express essentially the same idea, keep only the stronger one.

STAGE 5 — Select the 3–5 highest-scoring unique insights. Do NOT force exactly 5. Quality over quantity. Never create filler.

INSIGHT FORMATTING RULES:
- headline: 5–12 words. Strong, memorable. Do NOT always start with an imperative verb — use the strongest natural form for the idea (principle, warning, mental model, fact, strategy)
- explanation: 1–2 sentences explaining the idea and why it matters
- application: ONE concrete way to apply it. ONLY include if grounded in the source. Never invent advice.
- type: one of: principle, strategy, mental_model, fact, warning, framework, example, actionable_tip
- recall_question: A SHORT question that tests memory, not recognition. Should not repeat the headline. Answer should be derivable from the insight.
- source_evidence: The exact or near-exact passage from the source that grounds this insight. Reduces hallucination.

TOPIC TAXONOMY — select 1–3 topics ONLY from this exact list:
Mindset, Psychology, Productivity, Learning, Technology, Programming, Design, Business, Career, Finance, Leadership, Health, Fitness, Relationships, Creativity, Science, Philosophy, Books, Marketing, Entrepreneurship, Other

Do NOT create new topic names. Do NOT mix topics with people/brand names.

ENTITY EXTRACTION — separate from topics:
Extract only entities actually present in the source:
- people: names of real people mentioned
- companies: company or product brands mentioned
- concepts: key domain concepts or frameworks named in the source

LOW QUALITY CONTENT — if the source is too short, promotional, corrupted, or contains no meaningful ideas:
Return: { "status": "insufficient_content", "insights": [], "topics": [] }

OUTPUT — return ONLY valid JSON, no markdown. Use this exact schema:
{
  "status": "ok",
  "content_type": "<one of the types above>",
  "title": "<specific, accurate title — max 70 chars>",
  "summary": "<2–3 sentence executive summary of the core thesis and why it matters>",
  "topics": ["<1–3 topics from taxonomy>"],
  "entities": {
    "people": [],
    "companies": [],
    "concepts": []
  },
  "insights": [
    {
      "headline": "<5–12 word memorable statement>",
      "explanation": "<1–2 sentences>",
      "application": "<concrete application or null>",
      "type": "<principle|strategy|mental_model|fact|warning|framework|example|actionable_tip>",
      "recall_question": "<short memory-test question>",
      "source_evidence": "<relevant passage from source>",
      "scores": {
        "memorability": 0,
        "actionability": 0,
        "novelty": 0,
        "specificity": 0,
        "long_term_value": 0
      }
    }
  ]
}`;

// ── JSON validation helpers ───────────────────────────────────────────────────
function sanitizeTopics(topics: unknown[]): string[] {
  if (!Array.isArray(topics)) return ['Other'];
  const valid = topics.filter((t): t is string => typeof t === 'string' && VALID_TOPICS.has(t));
  return valid.length > 0 ? valid.slice(0, 3) : ['Other'];
}

function sanitizeInsights(insights: unknown[]): StructuredInsight[] {
  if (!Array.isArray(insights)) return [];
  return insights
    .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
    .filter((i) => typeof i.headline === 'string' && i.headline.trim().length > 0)
    .slice(0, 5)
    .map((i, idx) => ({
      headline: String(i.headline).trim(),
      explanation: typeof i.explanation === 'string' ? i.explanation.trim() : '',
      application: typeof i.application === 'string' && i.application.trim().length > 0
        ? i.application.trim()
        : null,
      type: typeof i.type === 'string' && VALID_INSIGHT_TYPES.has(i.type) ? i.type : 'principle',
      recall_question: typeof i.recall_question === 'string' ? i.recall_question.trim() : '',
      source_evidence: typeof i.source_evidence === 'string' ? i.source_evidence.trim() : '',
      order_index: idx,
      scores: sanitizeScores(i.scores),
    }));
}

function sanitizeScores(scores: unknown): InsightScores {
  const defaults: InsightScores = {
    memorability: 5, actionability: 5, novelty: 5, specificity: 5, long_term_value: 5,
  };
  if (typeof scores !== 'object' || scores === null) return defaults;
  const s = scores as Record<string, unknown>;
  const clamp = (v: unknown) => Math.min(10, Math.max(1, typeof v === 'number' ? Math.round(v) : 5));
  return {
    memorability: clamp(s.memorability),
    actionability: clamp(s.actionability),
    novelty: clamp(s.novelty),
    specificity: clamp(s.specificity),
    long_term_value: clamp(s.long_term_value),
  };
}

function sanitizeEntities(entities: unknown): Entities {
  const empty: Entities = { people: [], companies: [], concepts: [] };
  if (typeof entities !== 'object' || entities === null) return empty;
  const e = entities as Record<string, unknown>;
  const toStringArray = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return {
    people: toStringArray(e.people),
    companies: toStringArray(e.companies),
    concepts: toStringArray(e.concepts),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface InsightScores {
  memorability: number;
  actionability: number;
  novelty: number;
  specificity: number;
  long_term_value: number;
}

interface StructuredInsight {
  headline: string;
  explanation: string;
  application: string | null;
  type: string;
  recall_question: string;
  source_evidence: string;
  order_index: number;
  scores: InsightScores;
}

interface Entities {
  people: string[];
  companies: string[];
  concepts: string[];
}

interface ExtractionResult {
  status: 'ok' | 'insufficient_content';
  content_type: string;
  title: string;
  summary: string;
  topics: string[];
  entities: Entities;
  insights: StructuredInsight[];
}

// ── Groq call with model fallback ─────────────────────────────────────────────
async function callGroq(userPrompt: string): Promise<ExtractionResult> {
  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'qwen/qwen3.8-27b',
    'qwen/qwen3.6-27b',
    'groq/compound',
    'openai/gpt-oss-120b',
  ];

  let lastError: Error | null = null;
  let groqData: any = null;

  for (const model of models) {
    try {
      console.log(`[extract-insights] Trying Groq model: ${model}`);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Groq error ${res.status}`);
      }
      groqData = data;
      break; // Success!
    } catch (e: any) {
      console.warn(`[extract-insights] Attempt with ${model} failed:`, e.message);
      lastError = e;
    }
  }

  if (!groqData) {
    try {
      const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` }
      });
      const modelsList = await modelsRes.json();
      const availableModelIds = modelsList?.data?.map((m: any) => m.id) || [];
      throw new Error(`All Groq models failed. Last error: ${lastError?.message}. Available models on your API key: ${availableModelIds.join(', ')}`);
    } catch (err: any) {
      throw new Error(`All Groq models failed. Last error: ${lastError?.message}. (Failed to list models: ${err.message})`);
    }
  }

  const raw = groqData.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Groq returned empty content');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Groq returned invalid JSON');
  }

  // Handle insufficient_content gracefully
  if (parsed.status === 'insufficient_content') {
    return {
      status: 'insufficient_content',
      content_type: 'other',
      title: '',
      summary: '',
      topics: [],
      entities: { people: [], companies: [], concepts: [] },
      insights: [],
    };
  }

  const topics = sanitizeTopics(parsed.topics as unknown[]);
  const insights = sanitizeInsights(parsed.insights as unknown[]);
  const entities = sanitizeEntities(parsed.entities);

  return {
    status: 'ok',
    content_type: typeof parsed.content_type === 'string' ? parsed.content_type : 'other',
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    topics,
    entities,
    insights,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { url, notes } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const mediaType = detectMediaType(url);
    const hintedContentType = detectContentType(url);

    let sourceText = '';
    let articleTitle = '';

    const isYouTube = /youtube\.com|youtu\.be/i.test(url);

    if (mediaType === 'tweet') {
      try {
        const result = await fetchTweetContent(url);
        sourceText = result.text;
        articleTitle = result.title;
      } catch (e: any) {
        console.warn('[extract-insights] fetchTweetContent failed:', e.message);
        // If tweet extraction failed, but user provided notes/sharedText, use that
        if (notes && notes.trim().length > 0) {
          sourceText = notes;
        } else {
          return new Response(
            JSON.stringify({
              error: 'NEEDS_NOTES',
              message: `We couldn't automatically read this tweet (${e.message || 'Not Found'}) — please add a note about the key points.`,
            }),
            {
              status: 422,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            }
          );
        }
      }
    } else if (mediaType === 'video') {
      try {
        const result = await fetchSupadataTranscript(url);
        sourceText = result.transcript;
      } catch (e: any) {
        if (!notes || notes.trim().length === 0) {
          return new Response(
            JSON.stringify({
              error: 'NEEDS_NOTES',
              message: `We couldn't automatically read this content (${e.message || 'Not Found'}) — please add a note about the key points.`,
            }),
            {
              status: 422,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            }
          );
        }
        sourceText = notes;
      }
    } else {
      try {
        const result = await fetchArticleText(url);
        sourceText = result.text;
        articleTitle = result.title;
      } catch (e: any) {
        if (!notes || notes.trim().length === 0) {
          return new Response(
            JSON.stringify({
              error: 'NEEDS_NOTES',
              message: `Couldn't read this page (${e.message}) — please add notes about what you want to remember.`,
            }),
            {
              status: 422,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            }
          );
        }
        sourceText = notes;
      }
    }

    if (!sourceText || sourceText.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'NEEDS_NOTES',
          message: "We couldn't read this content automatically — please add a note describing what you want to remember.",
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    // Increase limit from 8k to 24k — meaningful improvement without chunking complexity
    const MAX_CHARS = 24000;
    const truncated = sourceText.length > MAX_CHARS
      ? sourceText.slice(0, MAX_CHARS) + '\n[content truncated for length]'
      : sourceText;

    const userPrompt = [
      `URL: ${url}`,
      `Detected content type hint: ${hintedContentType}`,
      ``,
      `Source content:`,
      truncated,
      ``,
      notes?.trim() ? `User notes (what they want to remember): ${notes}` : '',
    ].filter(Boolean).join('\n');

    const result = await callGroq(userPrompt);

    // Backward compat: also return flat `insights` string array and `tags`
    // so that any older call sites that expect the old shape still work.
    const flatInsights = result.insights.map(
      (i) => `${i.headline}. ${i.explanation}`
    );

    return new Response(
      JSON.stringify({
        // New structured fields
        ...result,
        // Legacy compat fields
        title: result.title || articleTitle,
        tags: result.topics,
        insights: flatInsights,
        source: hintedContentType,
        // Full structured insights under a separate key
        structured_insights: result.insights,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  } catch (e: any) {
    console.error('[extract-insights] error:', e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
});
