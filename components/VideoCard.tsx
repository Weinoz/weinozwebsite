'use client';

import { Video } from '@/data/videos';
import { Eye, ExternalLink } from 'lucide-react';
import { YoutubeIcon, TwitchIcon, TikTokIcon } from './SocialIcons';

const platformConfig = {
  youtube: {
    label: 'YouTube',
    color: '#FF3B3B',
    bg: 'rgba(255,59,59,0.1)',
    Icon: YoutubeIcon,
  },
  twitch: {
    label: 'Twitch',
    color: '#9146FF',
    bg: 'rgba(145,70,255,0.1)',
    Icon: TwitchIcon,
  },
  tiktok: {
    label: 'TikTok',
    color: '#69C9D0',
    bg: 'rgba(105,201,208,0.1)',
    Icon: TikTokIcon,
  },
};

interface Props {
  video: Video;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function VideoCard({ video }: Props) {
  const cfg = platformConfig[video.platform];
  const Icon = cfg.Icon;

  const thumbnailUrl =
    video.thumbnail ??
    (video.platform === 'youtube' && video.videoId
      ? `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`
      : null);

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group card-hover flex flex-col overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          overflow: 'hidden',
          background: '#1a0030',
        }}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={video.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease',
            }}
            className="group-hover:scale-105"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: cfg.bg,
            }}
          >
            <span style={{ color: cfg.color, opacity: 0.4, transform: 'scale(2)' }}>
              <Icon className="w-6 h-6" />
            </span>
          </div>
        )}

        {/* Duration */}
        {video.duration && (
          <span
            style={{
              position: 'absolute',
              bottom: '0.5rem',
              right: '0.5rem',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
            }}
          >
            {video.duration}
          </span>
        )}

        {/* Platform */}
        <span
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            background: cfg.bg,
            backdropFilter: 'blur(8px)',
            color: cfg.color,
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            padding: '0.2rem 0.6rem',
            borderRadius: '100px',
            border: `1px solid ${cfg.color}30`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
        <h3
          style={{
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          className="group-hover:text-white transition-colors"
        >
          {video.title}
        </h3>
        {video.description && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
            {video.description}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: '0.5rem',
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          <span>{formatDate(video.date)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {video.views && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Eye className="w-3 h-3" /> {video.views}
              </span>
            )}
            <ExternalLink
              className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>
    </a>
  );
}
