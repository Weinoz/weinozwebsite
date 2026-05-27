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
