import { supabase } from './supabase';
import type { ExtractionResult } from '@/types';

// Re-export the canonical type so existing imports of ExtractedInsight still work
export type ExtractedInsight = ExtractionResult;

export async function extractInsights(url: string, notes?: string): Promise<ExtractionResult> {
  const { data, error } = await supabase.functions.invoke('extract-insights', {
    body: { url, notes },
  });

  if (error) {
    // Parse the real error message from the Edge Function's HTTP response body
    if (error.context) {
      try {
        const text = await error.context.text();
        const body = JSON.parse(text);
        if (body?.error) throw new Error(body.error);
        if (body?.message) throw new Error(body.message);
      } catch (parseErr: any) {
        // Only re-throw if it's the Error we just threw above
        if (parseErr?.message && parseErr.message !== 'Unexpected token') {
          throw parseErr;
        }
      }
    }
    throw new Error(error.message ?? 'Edge Function failed');
  }

  if (data?.error) throw new Error(data.error);

  // Handle insufficient_content gracefully at call-site level
  if (data?.status === 'insufficient_content') {
    throw new Error("Recall couldn't find enough meaningful knowledge in this source. Try adding notes about what you want to remember.");
  }

  return data as ExtractionResult;
}

