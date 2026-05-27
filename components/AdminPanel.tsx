'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Game, GameStatus, GamePlatform } from '@/data/games';
import { RawgGame } from '@/lib/rawg';
import { addGameAction, removeGameAction, logoutAction } from '@/app/admin/actions';
import { Star, Clock, Trash2, Plus, Search, X, LogOut, Gamepad2 } from 'lucide-react';

const PLATFORMS: GamePlatform[] = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Switch', 'Mobile'];
const STATUSES: { value: GameStatus; label: string; color: string }[] = [
  { value: 'terminé',           label: 'Terminé',   color: '#22c55e' },
  { value: 'en cours',          label: 'En cours',  color: '#6366f1' },
  { value: 'abandonné',         label: 'Abandonné', color: '#ef4444' },
  { value: 'liste de souhaits', label: 'Wishlist',  color: '#eab308' },
];

interface Props {
  initialGames: Game[];
}

export default function AdminPanel({ initialGames }: Props) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawgGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<RawgGame | null>(null);

  // Form fields for the selected game
  const [platform, setPlatform] = useState<GamePlatform>('PC');
  const [status, setStatus] = useState<GameStatus>('terminé');
  const [rating, setRating] = useState('');
  const [hours, setHours] = useState('');
  const [comment, setComment] = useState('');

  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/rawg?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query]);

  function selectGame(g: RawgGame) {
    setSelected(g);
    setRating('');
    setHours('');
    setComment('');
    setStatus('terminé');
    setPlatform('PC');
  }

  function handleAdd() {
    if (!selected) return;
    const game: Game = {
      id: `rawg-${selected.id}`,
      title: selected.name,
      cover: selected.background_image ?? undefined,
      platform,
      status,
      rating: rating ? parseFloat(rating) : undefined,
      hours: hours ? parseInt(hours) : undefined,
      comment: comment.trim() || undefined,
      year: selected.released ? new Date(selected.released).getFullYear() : undefined,
      genre: selected.genres?.[0]?.name,
    };

    startTransition(async () => {
      await addGameAction(game);
      setGames((prev) => [game, ...prev.filter((g) => g.id !== game.id)]);
      setSelected(null);
      setQuery('');
      setResults([]);
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeGameAction(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    });
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.2s, transform 0.15s',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: '2rem', color: 'white', letterSpacing: '-0.03em' }}>
            Jeux-Vidéothèque
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem' }}>
            {games.length} jeux enregistrés
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: search + results */}
        <div>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search
              className="w-5 h-5"
              style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Recherche un jeu… (ex: Elden Ring)"
              style={{
                width: '100%', padding: '0.9rem 1rem 0.9rem 3rem',
                borderRadius: '12px',
                border: '1px solid rgba(160,32,240,0.25)',
                background: 'rgba(255,255,255,0.04)',
                color: 'white', fontSize: '1rem', outline: 'none',
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); }}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* RAWG results */}
          {searching && (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Recherche en cours…
            </p>
          )}

          {results.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <p className="section-label" style={{ marginBottom: '1rem' }}>
                Résultats RAWG — clique pour ajouter
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {results.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => selectGame(g)}
                    style={{
                      ...card,
                      textAlign: 'left',
                      padding: 0,
                      background: selected?.id === g.id ? 'rgba(160,32,240,0.15)' : 'rgba(255,255,255,0.04)',
                      borderColor: selected?.id === g.id ? 'rgba(160,32,240,0.5)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {g.background_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.background_image}
                        alt={g.name}
                        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(160,32,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Gamepad2 style={{ color: 'rgba(160,32,240,0.3)', width: '1.5rem', height: '1.5rem' }} />
                      </div>
                    )}
                    <div style={{ padding: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', lineHeight: 1.3 }}>
                        {g.name}
                      </p>
                      {g.released && (
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>
                          {new Date(g.released).getFullYear()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current library */}
          <div>
            <p className="section-label" style={{ marginBottom: '1rem' }}>
              Ma bibliothèque ({games.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {games.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {g.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.cover} alt={g.title} style={{ width: '40px', height: '28px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '40px', height: '28px', borderRadius: '4px', background: 'rgba(160,32,240,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Gamepad2 style={{ color: 'rgba(160,32,240,0.4)', width: '0.9rem', height: '0.9rem' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.title}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      {g.platform} · {g.status}
                      {g.rating !== undefined && ` · ★ ${g.rating}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(g.id)}
                    disabled={isPending}
                    style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: add form */}
        {selected && (
          <div
            style={{
              position: 'sticky', top: '80px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(160,32,240,0.25)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            {/* Cover */}
            {selected.background_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.background_image}
                alt={selected.name}
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(160,32,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Gamepad2 style={{ color: 'rgba(160,32,240,0.3)', width: '3rem', height: '3rem' }} />
              </div>
            )}

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title + close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1rem', color: 'white', lineHeight: 1.3 }}>
                    {selected.name}
                  </p>
                  {selected.released && (
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>
                      {new Date(selected.released).getFullYear()} · {selected.genres?.[0]?.name ?? ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status */}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Statut</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {STATUSES.map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setStatus(value)}
                      style={{
                        padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 600,
                        border: '1px solid',
                        background: status === value ? `${color}25` : 'transparent',
                        borderColor: status === value ? `${color}60` : 'rgba(255,255,255,0.1)',
                        color: status === value ? color : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Plateforme</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      style={{
                        padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 600,
                        border: '1px solid',
                        background: platform === p ? 'rgba(160,32,240,0.2)' : 'transparent',
                        borderColor: platform === p ? 'rgba(160,32,240,0.5)' : 'rgba(255,255,255,0.1)',
                        color: platform === p ? '#c084fc' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating + Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    <Star className="w-3 h-3" /> Note /10
                  </label>
                  <input
                    type="number" min="0" max="10" step="0.5"
                    value={rating} onChange={(e) => setRating(e.target.value)}
                    placeholder="8.5"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    <Clock className="w-3 h-3" /> Heures
                  </label>
                  <input
                    type="number" min="0"
                    value={hours} onChange={(e) => setHours(e.target.value)}
                    placeholder="40"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Avis (optionnel)</label>
                <textarea
                  value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Mon avis en quelques mots…"
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleAdd}
                disabled={isPending}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.8rem', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  color: 'white', fontWeight: 700, fontSize: '0.95rem',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                <Plus className="w-4 h-4" />
                {isPending ? 'Ajout…' : 'Ajouter à ma biblio'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
