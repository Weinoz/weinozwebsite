export type GameStatus = 'terminé' | 'en cours' | 'abandonné' | 'liste de souhaits' | 'infini';
export type GamePlatform = 'PC' | 'PS5' | 'PS4' | 'Xbox Series' | 'Switch' | 'Mobile';
export type GameTier       = 'S' | 'A' | 'B' | 'C' | 'D';
export type GameCompletion = '100%' | 'platine';

export interface Game {
  id: string;
  title: string;
  cover?: string;
  platforms: GamePlatform[];
  status: GameStatus;
  tier?: GameTier;         // Tier list ranking
  completion?: GameCompletion; // 100% or platine (for 'terminé' games)
  rating?: number; // sur 10
  comment?: string;
  hours?: number;
  year?: number;
  genre?: string;
  storeUrl?: string;
  linkedVideos?: string[]; // YouTube / Twitch URLs
  rawgId?: number;         // RAWG game ID (for screenshots in modal)
}

// ─── REMPLACE / COMPLÈTE AVEC TES VRAIS JEUX ────────────────────────────────
export const games: Game[] = [
  {
    id: '1',
    title: 'Elden Ring',
    platforms: ['PC'],
    status: 'terminé',
    rating: 9.5,
    hours: 120,
    year: 2022,
    genre: 'Action RPG',
    comment: 'Chef-d\'œuvre absolu. Difficile mais juste.',
  },
  {
    id: '2',
    title: 'The Witcher 3',
    platforms: ['PC'],
    status: 'terminé',
    rating: 10,
    hours: 200,
    year: 2015,
    genre: 'RPG',
    comment: 'L\'un des meilleurs jeux de tous les temps.',
  },
  {
    id: '3',
    title: 'Cyberpunk 2077',
    platforms: ['PC'],
    status: 'terminé',
    rating: 8.5,
    hours: 80,
    year: 2020,
    genre: 'Action RPG',
    comment: 'Raté au lancement, magnifique maintenant.',
  },
  {
    id: '4',
    title: 'Hollow Knight',
    platforms: ['PC'],
    status: 'terminé',
    rating: 9,
    hours: 45,
    year: 2017,
    genre: 'Metroidvania',
    comment: 'Atmosphère unique, boss fights incroyables.',
  },
  {
    id: '5',
    title: 'God of War Ragnarök',
    platforms: ['PS5'],
    status: 'terminé',
    rating: 9.5,
    hours: 55,
    year: 2022,
    genre: 'Action-Aventure',
    comment: 'Narration exceptionnelle.',
  },
  {
    id: '6',
    title: 'Baldur\'s Gate 3',
    platforms: ['PC'],
    status: 'en cours',
    rating: 9,
    hours: 60,
    year: 2023,
    genre: 'RPG',
    comment: 'Incroyable quantité de contenu.',
  },
  {
    id: '7',
    title: 'Hades',
    platforms: ['PC'],
    status: 'terminé',
    rating: 9,
    hours: 70,
    year: 2020,
    genre: 'Roguelite',
    comment: 'Le meilleur roguelite jamais fait.',
  },
  {
    id: '8',
    title: 'Red Dead Redemption 2',
    platforms: ['PC'],
    status: 'terminé',
    rating: 10,
    hours: 110,
    year: 2018,
    genre: 'Open World',
    comment: 'Un chef-d\'œuvre cinématographique.',
  },
  {
    id: '9',
    title: 'Dark Souls III',
    platforms: ['PC'],
    status: 'terminé',
    rating: 8.5,
    hours: 65,
    year: 2016,
    genre: 'Action RPG',
    comment: 'Plus accessible que les autres souls.',
  },
  {
    id: '10',
    title: 'Persona 5 Royal',
    platforms: ['PC'],
    status: 'en cours',
    rating: 9,
    hours: 40,
    year: 2019,
    genre: 'JRPG',
    comment: 'Style visuel époustouflant.',
  },
  {
    id: '11',
    title: 'Death Stranding',
    platforms: ['PC'],
    status: 'abandonné',
    rating: 5,
    hours: 20,
    year: 2019,
    genre: 'Action',
    comment: 'Trop lent pour moi, mais visuellement magnifique.',
  },
  {
    id: '12',
    title: 'Ghost of Tsushima',
    platforms: ['PS5'],
    status: 'terminé',
    rating: 9,
    hours: 50,
    year: 2020,
    genre: 'Action-Aventure',
    comment: 'Le jeu de samouraï ultime.',
  },
  {
    id: '13',
    title: 'Lies of P',
    platforms: ['PC'],
    status: 'terminé',
    rating: 8,
    hours: 35,
    year: 2023,
    genre: 'Soulslike',
    comment: 'Surprenant pour un soulslike coréen.',
  },
  {
    id: '14',
    title: 'Alan Wake 2',
    platforms: ['PC'],
    status: 'liste de souhaits',
    year: 2023,
    genre: 'Survival Horror',
  },
  {
    id: '15',
    title: 'Sekiro',
    platforms: ['PC'],
    status: 'terminé',
    rating: 9.5,
    hours: 55,
    year: 2019,
    genre: 'Action RPG',
    comment: 'Le plus difficile mais le plus satisfaisant.',
  },
];
