'use client';

import { useState, useMemo } from 'react';
import GameCard from '@/components/GameCard';
import { Game, GameStatus, GamePlatform } from '@/data/games';
import { Star, Clock, Gamepad2, Trophy, Play, X, BookMarked, Infinity } from 'lucide-react';

const statusFilters: { value: 'all' | GameStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'all',               label: 'Tous',       icon: <Gamepad2   className="w-4 h-4" /> },
  { value: 'terminé',           label: 'Terminés',   icon: <Trophy     className="w-4 h-4" /> },
  { value: 'en cours',          label: 'En cours',   icon: <Play       className="w-4 h-4" /> },
  { value: 'infini',            label: 'Infinis',    icon: <Infinity   className="w-4 h-4" /> },
  { value: 'abandonné',         label: 'Abandonnés', icon: <X          className="w-4 h-4" /> },
  { value: 'liste de souhaits', label: 'Wishlist',   icon: <BookMarked className="w-4 h-4" /> },
];

const platforms: GamePlatform[] = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Switch', 'Mobile'];

const sortOptions = [
  { value: 'rating-desc', label: 'Note ↓' },
  { value: 'rating-asc', label: 'Note ↑' },
  { value: 'hours-desc', label: 'Heures ↓' },
  { value: 'title-asc', label: 'A → Z' },
];

const statusColors: Record<string, string> = {
  'terminé':           '#22c55e',
  'en cours':          '#3b82f6',
  'infini':            '#06b6d4',
  'abandonné':         '#ef4444',
  'liste de souhaits': '#eab308',
};

interface Props {
  initialGames: Game[];
}

export default function JeuxClient({ initialGames }: Props) {
  const [activeStatus, setActiveStatus] = useState<'all' | GameStatus>('all');
  const [activePlatform, setActivePlatform] = useState<'all' | GamePlatform>('all');
  const [sortBy, setSortBy] = useState('rating-desc');

  const filtered = useMemo(() => {
    let list = [...initialGames];
    if (activeStatus !== 'all') list = list.filter((g) => g.status === activeStatus);
    if (activePlatform !== 'all') list = list.filter((g) => g.platform === activePlatform);
    switch (sortBy) {
      case 'rating-desc': list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case 'rating-asc': list.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0)); break;
      case 'hours-desc': list.sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0)); break;
      case 'title-asc': list.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return list;
  }, [initialGames, activeStatus, activePlatform, sortBy]);

  const totalHours = initialGames.reduce((acc, g) => acc + (g.hours ?? 0), 0);
  const completedCount = initialGames.filter((g) => g.status === 'terminé').length;
  const ratedGames = initialGames.filter((g) => g.rating !== undefined);
  const avgRating = ratedGames.length
    ? (ratedGames.reduce((acc, g) => acc + (g.rating ?? 0), 0) / ratedGames.length).toFixed(1)
    : '—';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black gradient-text mb-2">Ma Jeux-Vidéothèque</h1>
        <p className="text-purple-300/50">{initialGames.length} jeux répertoriés</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Jeux totaux', value: initialGames.length, icon: <Gamepad2 className="w-5 h-5" /> },
          { label: 'Terminés', value: completedCount, icon: <Trophy className="w-5 h-5" /> },
          { label: 'Heures totales', value: `${totalHours}h`, icon: <Clock className="w-5 h-5" /> },
          { label: 'Note moyenne', value: avgRating === '—' ? '—' : avgRating + '/10', icon: <Star className="w-5 h-5" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="glass rounded-2xl p-4 flex items-center gap-3">
            <span className="text-purple-400">{icon}</span>
            <div>
              <p className="text-xl font-black gradient-text-subtle">{value}</p>
              <p className="text-xs text-purple-300/50">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(({ value, label, icon }) => {
            const isActive = activeStatus === value;
            const count = value === 'all' ? initialGames.length : initialGames.filter((g) => g.status === value).length;
            return (
              <button
                key={value}
                onClick={() => setActiveStatus(value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive ? 'glow-sm' : 'glass hover:bg-purple-500/10'
                }`}
                style={
                  isActive
                    ? {
                        background:
                          value === 'all'
                            ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                            : `linear-gradient(135deg, ${statusColors[value] ?? '#7c3aed'}99, ${statusColors[value] ?? '#a855f7'})`,
                        color: 'white',
                      }
                    : { color: '#c084fc' }
                }
              >
                {icon}
                {label}
                <span
                  className="px-1.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(168,85,247,0.15)',
                    color: isActive ? 'white' : '#c084fc',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Platform + sort */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={activePlatform}
            onChange={(e) => setActivePlatform(e.target.value as 'all' | GamePlatform)}
            className="px-4 py-2 rounded-full text-sm font-medium appearance-none cursor-pointer"
            style={{
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.2)',
              color: '#c084fc',
            }}
          >
            <option value="all">Toutes plateformes</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-full text-sm font-medium appearance-none cursor-pointer"
            style={{
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.2)',
              color: '#c084fc',
            }}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <span className="text-sm text-purple-300/40 ml-2">{filtered.length} jeux</span>
        </div>
      </div>

      {/* Games grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-purple-300/40">
          <p className="text-lg">Aucun jeu pour ce filtre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
