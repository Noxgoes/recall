const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY')!;
const SUPADATA_URL = 'https://api.supadata.ai/v1/transcript';

interface SupadataResult {
  content: string;
  lang: string;
  availableLangs: string[];
}

export async function fetchSupadataTranscript(
  url: string
): Promise<{ transcript: string }> {
  const params = new URLSearchParams({
    url,
    text: 'true', // plain text instead of timestamped chunks
    mode: 'auto', // try native captions first, fall back to AI generation if missing
  });

  const res = await fetch(`${SUPADATA_URL}?${params.toString()}`, {
    headers: { 'x-api-key': SUPADATA_API_KEY },
  });

  // Log credit usage to monitor free-tier limit
  console.log('SUPADATA CREDITS USED:', res.headers.get('x-billable-requests'));

  if (res.status === 206) {
    // Supadata returns 206 (not 4xx/5xx) when transcript is unavailable even after AI fallback
    throw new Error('TRANSCRIPT_UNAVAILABLE');
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    console.error('SUPADATA ERROR', res.status, errBody);
    throw new Error(errBody?.message || `Supadata request failed with status ${res.status}`);
  }

  const data: SupadataResult = await res.json();
  if (!data.content || data.content.trim().length === 0) {
    throw new Error('TRANSCRIPT_UNAVAILABLE');
  }

  return { transcript: data.content };
}
