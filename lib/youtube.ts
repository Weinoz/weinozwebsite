import { Video } from '@/data/videos';

function decode(str: string) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function fetchYouTubeVideos(channelId: string): Promise<Video[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { next: { revalidate: 3600 } } // rafraîchi toutes les heures
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

    return entries.slice(0, 20).map((entry) => {
      const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ?? '';
      const title = decode(entry.match(/<title>(.*?)<\/title>/)?.[1] ?? '');
      const published = entry.match(/<published>(.*?)<\/published>/)?.[1] ?? '';
      const views = entry.match(/<media:statistics views="(\d+)"/)?.[1];

      return {
        id: `yt-${videoId}`,
        title,
        platform: 'youtube' as const,
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        date: published.split('T')[0],
        views: views ? formatViews(Number(views)) : undefined,
      };
    });
  } catch {
    return [];
  }
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Fetch the tags array for a batch of YouTube video IDs using the Data API v3.
 * Requires a YOUTUBE_API_KEY.  Returns Map<videoId, tags[]>.
 * Tags often contain the game title when the creator has tagged the video properly.
 */
export async function fetchYouTubeVideoTags(
  videoIds: string[],
  apiKey: string,
): Promise<Map<string, string[]>> {
  if (!videoIds.length) return new Map();
  try {
    const ids = videoIds.slice(0, 50).join(','); // API max = 50 per call
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return new Map();
    const data = await res.json();
    const result = new Map<string, string[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of (data.items ?? []) as any[]) {
      result.set(item.id as string, (item.snippet?.tags as string[]) ?? []);
    }
    return result;
  } catch {
    return new Map();
  }
}
