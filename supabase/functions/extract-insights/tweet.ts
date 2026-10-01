export async function fetchTweetContent(
  url: string
): Promise<{ text: string; title: string; author?: string }> {
  const match = url.match(/(?:twitter\.com|x\.com)\/(?:.*?\/)?status(?:es)?\/(\d+)/i);
  if (!match) {
    throw new Error('Invalid Twitter/X status URL');
  }

  const tweetId = match[1];

  const endpoints = [
    `https://api.fxtwitter.com/status/${tweetId}`,
    `https://api.fxtwitter.com/2/status/${tweetId}`,
    `https://api.vxtwitter.com/Twitter/status/${tweetId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': 'RecallApp/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const tweet = data.tweet || data.status;
        if (tweet && (tweet.text || tweet.raw_text?.text)) {
          const tweetText = (tweet.text || tweet.raw_text?.text || '').trim();
          const authorName = tweet.author?.name || tweet.author?.screen_name || 'X User';
          const screenName = tweet.author?.screen_name ? `@${tweet.author.screen_name}` : '';
          const authorInfo = screenName ? `${authorName} (${screenName})` : authorName;

          let fullContent = `Post by ${authorInfo}:\n"${tweetText}"`;

          if (tweet.quote && tweet.quote.text) {
            const quoteAuthor = tweet.quote.author?.name || tweet.quote.author?.screen_name || 'Quoted';
            fullContent += `\n\n[Quoting ${quoteAuthor}]:\n"${tweet.quote.text}"`;
          }

          const title = `Post by ${authorName}`;

          return {
            text: fullContent,
            title: title.slice(0, 70),
            author: authorInfo,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[fetchTweetContent] Endpoint ${endpoint} failed:`, err.message);
    }
  }

  throw new Error(`Could not fetch tweet content for ID ${tweetId}`);
}
