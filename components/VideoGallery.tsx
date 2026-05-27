'use client';

import { useState } from 'react';
import VideoCard from './VideoCard';
import { YoutubeIcon, TwitchIcon, TikTokIcon } from './SocialIcons';
import { Video, VideoPlatform } from '@/data/videos';

const filters: { value: 'all' | VideoPlatform; label: string; icon: React.ReactNode }[] = [
  { value: 'all',     label: 'Tout',    icon: null },
  { value: 'youtube', label: 'YouTube', icon: <YoutubeIcon className="w-4 h-4" /> },
  { value: 'twitch',  label: 'Twitch',  icon: <TwitchIcon className="w-4 h-4" /> },
  { value: 'tiktok',  label: 'TikTok',  icon: <TikTokIcon className="w-4 h-4" /> },
];

interface Props {
  videos: Video[];
}

export default function VideoGallery({ videos }: Props) {
  const [active, setActive] = useState<'all' | VideoPlatform>('all');

  const filtered = active === 'all' ? videos : videos.filter((v) => v.platform === active);

  const count = (p: 'all' | VideoPlatform) =>
    p === 'all' ? videos.length : videos.filter((v) => v.platform === p).length;

  return (
    <>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-10">
        {filters.map(({ value, label, icon }) => {
          const isActive = active === value;
          const n = count(value);
          if (n === 0 && value !== 'all') return null;
          return (
            <button
              key={value}
              onClick={() => setActive(value)}
              style={
                isActive
                  ? { background: 'linear-gradient(135deg,#8B0EE8,#A020F0)', color: 'white' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
              }
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 hover:text-white"
            >
              {icon}
              {label}
              <span
                style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '100px',
                }}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <p>Aucune vidéo ici pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </>
  );
}
