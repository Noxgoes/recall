import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StructuredInsight {
  headline: string;
  explanation: string;
  application: string | null;
  type: string;
  recall_question: string;
  source_evidence: string;
  order_index: number;
  scores: {
    memorability: number;
    actionability: number;
    novelty: number;
    specificity: number;
    long_term_value: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  let requestBody: any = {};
  try {
    requestBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const { insightId, url, notes, userId } = requestBody;

  if (!insightId || !url) {
    return new Response(JSON.stringify({ error: 'Missing insightId or url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // 1. Set status to processing
    await supabase
      .from('insights')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', insightId);

    // 2. Invoke extract-insights
    const extractUrl = `${SUPABASE_URL}/functions/v1/extract-insights`;
    console.log(`[process-insight] Invoking extract-insights for: ${url}`);

    const extractRes = await fetch(extractUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ url, notes }),
    });

    const extractData = await extractRes.json();

    if (!extractRes.ok) {
      throw new Error(extractData?.error || extractData?.message || 'Failed to extract insights');
    }

    // Handle insufficient_content — mark as failed with a user-friendly message
    if (extractData.status === 'insufficient_content') {
      await supabase
        .from('insights')
        .update({
          status: 'failed',
          error_message: 'Recall couldn\'t find enough meaningful knowledge in this source.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', insightId);

      return new Response(JSON.stringify({ success: false, reason: 'insufficient_content' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Pull both legacy and new structured fields
    const {
      title,
      tags,          // controlled topics array
      source,        // platform string (legacy compat)
      summary,
      content_type,
      entities,
      structured_insights,
      insights: flatInsights, // legacy string array (fallback)
    } = extractData;

    console.log(
      `[process-insight] Extraction ok. Title: "${title}". Insights: ${structured_insights?.length ?? flatInsights?.length ?? 0}`
    );

    // 3. Update insights row with new rich fields
    const { error: updateErr } = await supabase
      .from('insights')
      .update({
        title: title || 'Untitled Saved Link',
        tags: tags || [],
        source: source || 'other',
        summary: summary || null,
        content_type: content_type || null,
        entities: entities || null,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', insightId);

    if (updateErr) throw new Error(`Failed to update insight: ${updateErr.message}`);

    // 4. Insert insight_items with rich structured columns
    const hasStructured = Array.isArray(structured_insights) && structured_insights.length > 0;
    const hasFallback = Array.isArray(flatInsights) && flatInsights.length > 0;

    if (hasStructured) {
      const items = structured_insights.map((ins: StructuredInsight, i: number) => ({
        insight_id: insightId,
        user_id: userId,
        // Legacy content field: "Headline. Explanation" — keeps existing UI working
        content: `${ins.headline}. ${ins.explanation}`,
        order_index: i,
        // New rich columns
        headline: ins.headline,
        explanation: ins.explanation,
        application: ins.application ?? null,
        insight_type: ins.type ?? null,
        recall_question: ins.recall_question ?? null,
        source_evidence: ins.source_evidence ?? null,
        memorability_score: ins.scores?.memorability ?? null,
        actionability_score: ins.scores?.actionability ?? null,
        novelty_score: ins.scores?.novelty ?? null,
        specificity_score: ins.scores?.specificity ?? null,
        long_term_value_score: ins.scores?.long_term_value ?? null,
      }));

      const { error: itemsErr } = await supabase.from('insight_items').insert(items);
      if (itemsErr) throw new Error(`Failed to insert insight items: ${itemsErr.message}`);
    } else if (hasFallback) {
      // Legacy fallback: flat string array (e.g. if structured_insights missing)
      const items = flatInsights.map((content: string, i: number) => ({
        insight_id: insightId,
        user_id: userId,
        content,
        order_index: i,
      }));
      const { error: itemsErr } = await supabase.from('insight_items').insert(items);
      if (itemsErr) throw new Error(`Failed to insert insight items: ${itemsErr.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (e: any) {
    console.error('[process-insight] Error:', e.message);

    try {
      await supabase
        .from('insights')
        .update({
          status: 'failed',
          error_message: e.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', insightId);
    } catch (dbErr) {
      console.error('[process-insight] Failed to write error status to DB:', dbErr);
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
