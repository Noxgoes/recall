import { Readability } from 'https://esm.sh/@mozilla/readability@0.5.0';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

export async function fetchArticleText(url: string): Promise<{ text: string; title: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();

  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Could not parse HTML');

  const reader = new Readability(doc as any);
  const article = reader.parse();

  if (!article || !article.textContent) throw new Error('Could not extract article content');

  return {
    text: article.textContent.trim().slice(0, 12000),
    title: article.title || 'Untitled Article',
  };
}
