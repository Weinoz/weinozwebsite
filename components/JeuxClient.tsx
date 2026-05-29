'use client';

import { useState, useMemo } from 'react';
import GameCard from '@/components/GameCard';
import GameModal from '@/components/GameModal';
import { Game, GameStatus, GamePlatform, GameTier } from '@/data/games';
import { Star, Clock, Gamepad2, Trophy, Play, X, BookMarked, Infinity, Search, FilterX, LayoutGrid, CalendarDays, List, ImageOff } from 'lucide-react';
import { addGameAction } from '@/app/admin/actions';

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: 'all' | GameStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'all',               label: 'Tous',       icon: <Gamepad2   className="w-3.5 h-3.5" /> },
  { value: 'terminé',           label: 'Terminés',   icon: <Trophy     className="w-3.5 h-3.5" /> },
  { value: 'en cours',          label: 'En cours',   icon: <Play       className="w-3.5 h-3.5" /> },
  { value: 'infini',            label: 'Infinis',    icon: <Infinity   className="w-3.5 h-3.5" /> },
  { value: 'abandonné',         label: 'Abandonnés', icon: <X          className="w-3.5 h-3.5" /> },
  { value: 'liste de souhaits', label: 'Wishlist',   icon: <BookMarked className="w-3.5 h-3.5" /> },
];

const TIER_FILTERS: { value: GameTier; color: string }[] = [
  { value: 'S', color: '#FF4444' },
  { value: 'A', color: '#FF8C00' },
  { value: 'B', color: '#FFD700' },
  { value: 'C', color: '#22c55e' },
  { value: 'D', color: '#818cf8' },
];

const PLATFORMS: GamePlatform[] = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Switch', 'Mobile'];

const SORT_OPTIONS = [
  { value: 'rating-desc', label: '★ Note ↓' },
  { value: 'rating-asc',  label: '★ Note ↑' },
  { value: 'hours-desc',  label: '⏱ Heures ↓' },
  { value: 'year-desc',   label: '📅 Année ↓' },
  { value: 'year-asc',    label: '📅 Année ↑' },
  { value: 'title-asc',   label: 'A → Z' },
];

const STATUS_COLORS: Record<string, string> = {
  'terminé':           '#22c55e',
  'en cours':          '#3b82f6',
  'infini':            '#06b6d4',
  'abandonné':         '#ef4444',
  'liste de souhaits': '#eab308',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props { initialGames: Game[]; isAdmin?: boolean }

export default function JeuxClient({ initialGames, isAdmin = false }: Props) {
  const [search,          setSearch]          = useState('');
  const [activeStatus,    setActiveStatus]    = useState<'all' | GameStatus>('all');
  const [activePlatform,  setActivePlatform]  = useState<'all' | GamePlatform>('all');
  const [activeTier,      setActiveTier]      = useState<'all' | GameTier>('all');
  const [activeGenre,     setActiveGenre]     = useState('all');
  const [sortBy,          setSortBy]          = useState('rating-desc');
  const [selectedGame,    setSelectedGame]    = useState<Game | null>(null);
  const [view,            setView]            = useState<'grid' | 'timeline' | 'compact'>('grid');
  const [quickEdit,       setQuickEdit]       = useState<{ id: string; field: 'status' | 'rating' } | null>(null);

  // Unique genres sorted alphabetically
  const genres = useMemo(() => {
    const set = new Set(initialGames.map((g) => g.genre).filter(Boolean) as string[]);
    return [...set].sort();
  }, [initialGames]);

  const isFiltered = search.trim() || activeStatus !== 'all' || activePlatform !== 'all'
    || activeTier !== 'all' || activeGenre !== 'all';

  function resetFilters() {
    setSearch(''); setActiveStatus('all'); setActivePlatform('all');
    setActiveTier('all'); setActiveGenre('all');
  }

  const filtered = useMemo(() => {
    let list = [...initialGames];
    if (search.trim()) {
      const q = normalize(search.trim());
      list = list.filter((g) => normalize(g.title).includes(q) || normalize(g.genre ?? '').includes(q));
    }
    if (activeStatus   !== 'all') list = list.filter((g) => g.status   === activeStatus);
    if (activePlatform !== 'all') list = list.filter((g) => g.platforms.includes(activePlatform));
    if (activeTier     !== 'all') list = list.filter((g) => g.tier     === activeTier);
    if (activeGenre    !== 'all') list = list.filter((g) => g.genre    === activeGenre);
    switch (sortBy) {
      case 'rating-desc': list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1)); break;
      case 'rating-asc':  list.sort((a, b) => (a.rating ?? -1) - (b.rating ?? -1)); break;
      case 'hours-desc':  list.sort((a, b) => (b.hours ?? 0)   - (a.hours ?? 0));   break;
      case 'year-desc':   list.sort((a, b) => (b.year ?? 0)    - (a.year ?? 0));    break;
      case 'year-asc':    list.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)); break;
      case 'title-asc':   list.sort((a, b) => a.title.localeCompare(b.title));       break;
    }
    return list;
  }, [initialGames, search, activeStatus, activePlatform, activeTier, activeGenre, sortBy]);

  // Timeline groups (year desc, games sorted by rating desc within year)
  const timelineGroups = useMemo(() => {
    const withYear    = filtered.filter((g) => g.year !== undefined);
    const withoutYear = filtered.filter((g) => g.year === undefined);
    const map = new Map<number, Game[]>();
    for (const g of withYear) {
      const yr = g.year!;
      if (!map.has(yr)) map.set(yr, []);
      map.get(yr)!.push(g);
    }
    // sort within year by rating desc
    for (const [, arr] of map) arr.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    const sorted = [...map.entries()].sort((a, b) => b[0] - a[0]);
    if (withoutYear.length) sorted.push([0, withoutYear]);
    return sorted;
  }, [filtered]);

  // Stats
  const totalHours    = initialGames.reduce((acc, g) => acc + (g.hours ?? 0), 0);
  const completedCount = initialGames.filter((g) => g.status === 'terminé').length;
  const ratedGames    = initialGames.filter((g) => g.rating !== undefined);
  const avgRating     = ratedGames.length
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
          { label: 'Jeux totaux',   value: initialGames.length,               icon: <Gamepad2 className="w-5 h-5" /> },
          { label: 'Terminés',      value: completedCount,                     icon: <Trophy   className="w-5 h-5" /> },
          { label: 'Heures totales',value: totalHours > 0 ? `${totalHours}h` : '—', icon: <Clock className="w-5 h-5" /> },
          { label: 'Note moyenne',  value: avgRating === '—' ? '—' : `${avgRating}/10`, icon: <Star className="w-5 h-5" /> },
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

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 mb-8">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un jeu ou un genre…"
            className="w-full pl-11 pr-10 py-3 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: 'rgba(168,85,247,0.06)',
              border: '1px solid rgba(168,85,247,0.18)',
              color: 'white',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/40 hover:text-purple-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label, icon }) => {
            const isActive = activeStatus === value;
            const count = value === 'all'
              ? initialGames.length
              : initialGames.filter((g) => g.status === value).length;
            return (
              <button
                key={value}
                onClick={() => setActiveStatus(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive ? 'glow-sm' : 'glass hover:bg-purple-500/10'
                }`}
                style={isActive ? {
                  background: value === 'all'
                    ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                    : `${STATUS_COLORS[value] ?? '#7c3aed'}bb`,
                  color: 'white',
                } : { color: '#c084fc' }}
              >
                {icon} {label}
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(168,85,247,0.15)',
                    color: isActive ? 'white' : '#c084fc',
                  }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tier pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-purple-300/40 font-semibold uppercase tracking-widest mr-1">Tier</span>
          <button
            onClick={() => setActiveTier('all')}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: activeTier === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: activeTier === 'all' ? 'white' : 'rgba(255,255,255,0.3)',
            }}
          >
            Tous
          </button>
          {TIER_FILTERS.map(({ value, color }) => {
            const isActive = activeTier === value;
            const count = initialGames.filter((g) => g.tier === value).length;
            if (count === 0) return null;
            return (
              <button
                key={value}
                onClick={() => setActiveTier(isActive ? 'all' : value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all"
                style={{
                  background: isActive ? `${color}22` : 'transparent',
                  border: `1px solid ${isActive ? color + '66' : 'rgba(255,255,255,0.1)'}`,
                  color: isActive ? color : 'rgba(255,255,255,0.35)',
                }}
              >
                {value}
                <span style={{
                  background: isActive ? `${color}33` : 'rgba(255,255,255,0.06)',
                  color: isActive ? color : 'rgba(255,255,255,0.25)',
                  borderRadius: '100px', padding: '0 5px', fontSize: '10px',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Platform + Genre + Sort + Reset */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Platform */}
          <select
            value={activePlatform}
            onChange={(e) => setActivePlatform(e.target.value as 'all' | GamePlatform)}
            className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer"
            style={{
              background: activePlatform !== 'all' ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.07)',
              border: `1px solid ${activePlatform !== 'all' ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.18)'}`,
              color: '#c084fc', colorScheme: 'dark',
            }}
          >
            <option value="all">Toutes plateformes</option>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Genre */}
          {genres.length > 0 && (
            <select
              value={activeGenre}
              onChange={(e) => setActiveGenre(e.target.value)}
              className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer"
              style={{
                background: activeGenre !== 'all' ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.07)',
                border: `1px solid ${activeGenre !== 'all' ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.18)'}`,
                color: '#c084fc', colorScheme: 'dark',
              }}
            >
              <option value="all">Tous les genres</option>
              {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer"
            style={{
              background: 'rgba(168,85,247,0.07)',
              border: '1px solid rgba(168,85,247,0.18)',
              color: '#c084fc', colorScheme: 'dark',
            }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Result count + reset */}
          <span className="text-sm text-purple-300/40 ml-1">
            {filtered.length} jeu{filtered.length !== 1 ? 'x' : ''}
          </span>
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:bg-red-500/10"
              style={{ border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(239,68,68,0.6)' }}
            >
              <FilterX className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          )}

          {/* View toggle */}
          <div className="flex ml-auto glass rounded-full p-0.5 gap-0.5">
            {([
              ['grid',     <LayoutGrid  key="g" className="w-3.5 h-3.5" />, 'Vue grille'   ],
              ['timeline', <CalendarDays key="t" className="w-3.5 h-3.5" />, 'Vue timeline' ],
              ['compact',  <List        key="c" className="w-3.5 h-3.5" />, 'Vue compacte' ],
            ] as const).map(([v, icon, title]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                title={title}
                className="p-1.5 rounded-full transition-all"
                style={{
                  background: view === v ? 'rgba(168,85,247,0.25)' : 'transparent',
                  color: view === v ? '#c084fc' : 'rgba(168,85,247,0.35)',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-24 text-purple-300/40">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">Aucun jeu pour ces filtres.</p>
          <button onClick={resetFilters} className="mt-3 text-sm text-purple-400/60 underline underline-offset-2">
            Réinitialiser
          </button>
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((g) => (
            <div key={g.id} style={{ position: 'relative' }}>
              <GameCard game={g} onClick={() => setSelectedGame(g)} />
              {isAdmin && !g.cover && (
                <span title="Pas de cover" style={{
                  position: 'absolute', top: '0.4rem', left: '0.4rem', zIndex: 2,
                  background: 'rgba(239,68,68,0.85)', borderRadius: '4px',
                  padding: '0.1rem 0.35rem', fontSize: '0.55rem', fontWeight: 700, color: 'white',
                  display: 'flex', alignItems: 'center', gap: '0.2rem',
                }}>
                  <ImageOff style={{ width: '10px', height: '10px' }} /> No cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Timeline view */}
      {filtered.length > 0 && view === 'timeline' && (
        <div className="flex flex-col gap-10">
          {timelineGroups.map(([year, games]) => (
            <section key={year}>
              <div className="flex items-center gap-4 mb-5">
                <span style={{
                  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, lineHeight: 1,
                  background: 'linear-gradient(135deg, #D06EFF 0%, #7B6FFF 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', flexShrink: 0,
                }}>
                  {year === 0 ? '—' : year}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(168,85,247,0.35) 0%, transparent 100%)' }} />
                <span className="text-xs text-purple-300/30 font-semibold">{games.length} jeu{games.length > 1 ? 'x' : ''}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {games.map((g) => (
                  <div key={g.id} style={{ position: 'relative' }}>
                    <GameCard game={g} onClick={() => setSelectedGame(g)} />
                    {isAdmin && !g.cover && (
                      <span style={{
                        position: 'absolute', top: '0.4rem', left: '0.4rem', zIndex: 2,
                        background: 'rgba(239,68,68,0.85)', borderRadius: '4px',
                        padding: '0.1rem 0.35rem', fontSize: '0.55rem', fontWeight: 700, color: 'white',
                        display: 'flex', alignItems: 'center', gap: '0.2rem',
                      }}>
                        <ImageOff style={{ width: '10px', height: '10px' }} /> No cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Compact / table view */}
      {filtered.length > 0 && view === 'compact' && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 60px 60px',
            padding: '0.5rem 1rem', gap: '0.5rem',
            background: 'rgba(255,255,255,0.04)',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
          }}>
            <span>Titre</span>
            <span>Statut</span>
            <span>Plateforme</span>
            <span style={{ textAlign: 'center' }}>Note</span>
            <span style={{ textAlign: 'center' }}>Heures</span>
            <span style={{ textAlign: 'center' }}>Tier</span>
          </div>
          {filtered.map((g, i) => {
            const isEven = i % 2 === 0;
            const statusColors: Record<string, string> = {
              'terminé': '#4ade80', 'en cours': '#60a5fa', 'infini': '#22d3ee',
              'abandonné': '#f87171', 'liste de souhaits': '#facc15',
            };
            const tierColors: Record<string, string> = { S: '#FF4444', A: '#FF8C00', B: '#FFD700', C: '#22c55e', D: '#818cf8' };
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGame(g)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 60px 60px',
                  width: '100%', padding: '0.55rem 1rem', gap: '0.5rem', alignItems: 'center',
                  background: isEven ? 'rgba(255,255,255,0.015)' : 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                }}
                className="hover:bg-purple-900/10"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  {g.cover && <img src={g.cover} alt="" style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />}
                  {isAdmin && !g.cover && <ImageOff style={{ width: '16px', height: '16px', color: 'rgba(239,68,68,0.6)', flexShrink: 0 }} />}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.title}
                  </span>
                  {g.completion && (
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: g.completion === 'platine' ? '#c8c8ff' : '#FFD700', flexShrink: 0 }}>
                      {g.completion === 'platine' ? '♦' : '✓'}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColors[g.status] ?? '#a78bfa' }}>
                  {g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                  {g.platforms.join(' · ')}
                </span>
                <span style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: g.rating != null ? '#facc15' : 'rgba(255,255,255,0.2)' }}>
                  {g.rating != null ? `${g.rating}/10` : '—'}
                </span>
                <span style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                  {g.hours != null ? `${g.hours}h` : '—'}
                </span>
                <span style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: g.tier ? tierColors[g.tier] : 'rgba(255,255,255,0.15)' }}>
                  {g.tier ?? '—'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedGame && (
        <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} allGames={initialGames} />
      )}
    </div>
  );
}
