export type VideoPlatform = 'youtube' | 'twitch' | 'tiktok';

export interface Video {
  id: string;
  title: string;
  platform: VideoPlatform;
  videoId?: string;     // YouTube video ID
  streamId?: string;    // Twitch stream ID (links a VOD to a live session)
  thumbnail?: string;   // URL custom (Twitch, etc.)
  url: string;
  date: string;
  duration?: string;
  views?: string;
  description?: string;
}

// ─── YOUTUBE ──────────────────────────────────────────────────────────────────
// Les vidéos YouTube sont récupérées AUTOMATIQUEMENT via RSS si
// YOUTUBE_CHANNEL_ID est renseigné dans .env.local
// Ces entrées manuelles servent de fallback si l'ID n'est pas encore configuré.

export const videos: Video[] = [
  // ─── TWITCH ── récupéré automatiquement via l'API Twitch ─────────────────
  // (plus besoin d'ajouter manuellement tes streams ici)

  // TikTok et Instagram : pas d'API publique disponible, liens directs seulement.
];
