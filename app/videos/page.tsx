import type { Metadata } from 'next';
import VideoGallery from '@/components/VideoGallery';
import { fetchYouTubeVideos } from '@/lib/youtube';
import { fetchTwitchVideos } from '@/lib/twitch';

export const metadata: Metadata = { title: 'Vidéos' };

export default async function VideosPage() {
  const [youtubeVideos, twitchVideos] = await Promise.all([
    process.env.YOUTUBE_CHANNEL_ID
      ? fetchYouTubeVideos(process.env.YOUTUBE_CHANNEL_ID)
      : Promise.resolve([]),
    process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET && process.env.TWITCH_LOGIN
      ? fetchTwitchVideos(
          process.env.TWITCH_CLIENT_ID,
          process.env.TWITCH_CLIENT_SECRET,
          process.env.TWITCH_LOGIN
        )
      : Promise.resolve([]),
  ]);

  const allVideos = [...youtubeVideos, ...twitchVideos].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
      <div className="mb-10">
        <h1
          style={{
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          Ce que j&apos;ai pondu
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {allVideos.length} vidéo{allVideos.length > 1 ? 's' : ''}
        </p>
      </div>

      <VideoGallery videos={allVideos} />
    </div>
  );
}
