'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Game, GameStatus, GamePlatform } from '@/data/games';
import { RawgGame } from '@/lib/rawg';
import { addGameAction, removeGameAction, logoutAction } from '@/app/admin/actions';
import { Star, Clock, Trash2, Plus, Search, X, LogOut, Gamepad2, Pencil, ExternalLink, Link, Video, RefreshCw } from 'lucide-react';

const PLATFORMS: GamePlatform[] = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Switch', 'Mobile'];
const STATUSES: { value: GameStatus; label: string; color: string }[] = [
  { value: 'terminé',           label: 'Terminé',   color: '#22c55e' },
  { value: 'en cours',          label: 'En cours',  color: '#6366f1' },
  { value: 'infini',            label: '∞ Infini',  color: '#06b6d4' },
  { value: 'abandonné',         label: 'Abandonné', color: '#ef4444' },
  { value: 'liste de souhaits', label: 'Wishlist',  color: '#eab308' },
];

interface Props { initialGames: Game[] }

type PanelMode = 'add' | 'edit' | null;

export default function AdminPanel({ initialGames }: Props) {
  const [games, setGames] = useState<Game[]>(initialGames);

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawgGame[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Panel mode
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedRawg, setSelectedRawg] = useState<RawgGame | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // Form fields
  const [platform, setPlatform] = useState<GamePlatform>('PC');
  const [status, setStatus] = useState<GameStatus>('terminé');
  const [rating, setRating] = useState('');
  const [hours, setHours] = useState('');
  const [comment, setComment] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [linkedVideos, setLinkedVideos] = useState<string[]>([]);
  const [videoInput, setVideoInput] = useState('');

  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState<string | null>(null); // game id being synced

  // Panel cover + title display
  const panelCover  = panelMode === 'add' ? selectedRawg?.background_image  : editingGame?.cover;
  const panelTitle  = panelMode === 'add' ? selectedRawg?.name              : editingGame?.title;
  const panelYear   = panelMode === 'add'
    ? (selectedRawg?.released ? new Date(selectedRawg.released).getFullYear() : null)
    : editingGame?.year;
  const panelGenre  = panelMode === 'add' ? selectedRawg?.genres?.[0]?.name : editingGame?.genre;

  // Debounced RAWG search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/rawg?q=${encodeURIComponent(query)}`);
        setResults(await res.json());
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  }, [query]);

  function resetForm() {
    setPlatform('PC'); setStatus('terminé');
    setRating(''); setHours(''); setComment(''); setStoreUrl('');
    setLinkedVideos([]); setVideoInput('');
  }

  function closePanel() {
    setPanelMode(null); setSelectedRawg(null); setEditingGame(null); resetForm();
  }

  async function openAddPanel(g: RawgGame) {
    setSelectedRawg(g); setEditingGame(null); resetForm(); setPanelMode('add');
    // Fetch store URL from RAWG detail
    setFetchingDetail(true);
    try {
      const res = await fetch(`/api/rawg/${g.id}`);
      const detail = await res.json();
      if (detail) {
        const steam = detail.stores?.find((s: { store: { slug: string } }) => s.store.slug === 'steam');
        setStoreUrl(steam?.url ?? detail.website ?? '');
      }
    } catch { /* ignore */ }
    finally { setFetchingDetail(false); }
  }

  function openEditPanel(g: Game) {
    setEditingGame(g); setSelectedRawg(null);
    setPlatform(g.platform); setStatus(g.status);
    setRating(g.rating?.toString() ?? '');
    setHours(g.hours?.toString() ?? '');
    setComment(g.comment ?? '');
    setStoreUrl(g.storeUrl ?? '');
    setLinkedVideos(g.linkedVideos ?? []);
    setVideoInput('');
    setPanelMode('edit');
  }

  function handleSubmit() {
    if (panelMode === 'add' && !selectedRawg) return;
    if (panelMode === 'edit' && !editingGame) return;

    const game: Game = panelMode === 'add' ? {
      id: `rawg-${selectedRawg!.id}`,
      title: selectedRawg!.name,
      cover: selectedRawg!.background_image ?? undefined,
      platform, status,
      rating: rating ? parseFloat(rating) : undefined,
      hours: hours ? parseInt(hours) : undefined,
      comment: comment.trim() || undefined,
      year: selectedRawg!.released ? new Date(selectedRawg!.released).getFullYear() : undefined,
      genre: selectedRawg!.genres?.[0]?.name,
      storeUrl: storeUrl.trim() || undefined,
      linkedVideos: linkedVideos.length > 0 ? linkedVideos : undefined,
    } : {
      ...editingGame!,
      platform, status,
      rating: rating ? parseFloat(rating) : undefined,
      hours: hours ? parseInt(hours) : undefined,
      comment: comment.trim() || undefined,
      storeUrl: storeUrl.trim() || undefined,
      linkedVideos: linkedVideos.length > 0 ? linkedVideos : undefined,
    };

    startTransition(async () => {
      await addGameAction(game);
      setGames((prev) => [game, ...prev.filter((g) => g.id !== game.id)]);
      closePanel();
      if (panelMode === 'add') { setQuery(''); setResults([]); }
    });
  }

  async function syncGameCover(game: Game) {
    setSyncing(game.id);
    try {
      const res = await fetch(`/api/rawg?q=${encodeURIComponent(game.title)}`);
      const results: RawgGame[] = await res.json();
      if (!results.length) return;
      const rawg = results[0];
      const updated: Game = {
        ...game,
        cover: rawg.background_image ?? game.cover,
        rawgId: rawg.id,
        genre: game.genre ?? rawg.genres?.[0]?.name,
        year: game.year ?? (rawg.released ? new Date(rawg.released).getFullYear() : undefined),
      };
      await addGameAction(updated);
      setGames((prev) => prev.map((g) => g.id === game.id ? updated : g));
    } catch { /* ignore */ }
    finally { setSyncing(null); }
  }

  async function syncAllCovers() {
    const toSync = games.filter((g) => !g.cover && !g.rawgId && !g.id.startsWith('rawg-'));
    for (const game of toSync) {
      await syncGameCover(game);
      await new Promise((r) => setTimeout(r, 300)); // small delay between calls
    }
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
          <button type="submit" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer',
          }}>
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: panelMode ? '1fr 380px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: search + results + library */}
        <div>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search className="w-5 h-5" style={{
              position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
            }} />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Recherche un jeu… (ex: Elden Ring)"
              style={{
                width: '100%', padding: '0.9rem 1rem 0.9rem 3rem', borderRadius: '12px',
                border: '1px solid rgba(160,32,240,0.25)', background: 'rgba(255,255,255,0.04)',
                color: 'white', fontSize: '1rem', outline: 'none',
              }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); }} style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
              }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searching && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginBottom: '1rem' }}>Recherche en cours…</p>}

          {/* RAWG results */}
          {results.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <p className="section-label" style={{ marginBottom: '1rem' }}>Résultats RAWG — clique pour ajouter</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {results.map((g) => (
                  <button key={g.id} onClick={() => openAddPanel(g)} style={{
                    ...card, textAlign: 'left', padding: 0,
                    background: selectedRawg?.id === g.id ? 'rgba(160,32,240,0.15)' : 'rgba(255,255,255,0.04)',
                    borderColor: selectedRawg?.id === g.id ? 'rgba(160,32,240,0.5)' : 'rgba(255,255,255,0.08)',
                  }}>
                    {g.background_image
                      ? <img src={g.background_image} alt={g.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(160,32,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Gamepad2 style={{ color: 'rgba(160,32,240,0.3)', width: '1.5rem', height: '1.5rem' }} />
                        </div>
                    }
                    <div style={{ padding: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{g.name}</p>
                      {g.released && <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>{new Date(g.released).getFullYear()}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Library */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p className="section-label">Ma bibliothèque ({games.length})</p>
              {games.some((g) => !g.cover && !g.rawgId && !g.id.startsWith('rawg-')) && (
                <button
                  onClick={syncAllCovers}
                  disabled={!!syncing}
                  title="Synchroniser les covers manquantes depuis RAWG"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                    background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
                    color: '#67e8f9', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.5 : 1,
                  }}
                >
                  <RefreshCw className="w-3 h-3" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                  Sync covers
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {games.map((g) => (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.75rem', borderRadius: '10px',
                  background: editingGame?.id === g.id ? 'rgba(160,32,240,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${editingGame?.id === g.id ? 'rgba(160,32,240,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  {/* Thumbnail */}
                  {g.cover
                    ? <img src={g.cover} alt={g.title} style={{ width: '40px', height: '28px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                    : <div style={{ width: '40px', height: '28px', borderRadius: '4px', background: 'rgba(160,32,240,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Gamepad2 style={{ color: 'rgba(160,32,240,0.4)', width: '0.9rem', height: '0.9rem' }} />
                      </div>
                  }
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.title}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      {g.platform} · {g.status}{g.rating !== undefined && ` · ★ ${g.rating}`}
                    </p>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    {/* Sync cover button — only for games without RAWG link */}
                    {!g.cover && !g.rawgId && !g.id.startsWith('rawg-') && (
                      <button onClick={() => syncGameCover(g)} disabled={!!syncing} title="Trouver la cover sur RAWG"
                        style={{ background: 'none', border: 'none', color: 'rgba(6,182,212,0.5)', cursor: 'pointer', padding: '0.25rem' }}>
                        <RefreshCw className="w-4 h-4" style={{ animation: syncing === g.id ? 'spin 1s linear infinite' : 'none' }} />
                      </button>
                    )}
                    {g.storeUrl && (
                      <a href={g.storeUrl} target="_blank" rel="noopener noreferrer"
                        style={{ background: 'none', border: 'none', color: 'rgba(160,32,240,0.5)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                        title="Ouvrir le store">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => openEditPanel(g)} disabled={isPending} title="Modifier"
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '0.25rem' }}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRemove(g.id)} disabled={isPending} title="Supprimer"
                      style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: '0.25rem' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: add / edit panel */}
        {panelMode && (
          <div style={{
            position: 'sticky', top: '80px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(160,32,240,0.25)',
            borderRadius: '16px', overflow: 'hidden',
          }}>
            {/* Cover */}
            {panelCover
              ? <img src={panelCover} alt={panelTitle ?? ''} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(160,32,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Gamepad2 style={{ color: 'rgba(160,32,240,0.3)', width: '3rem', height: '3rem' }} />
                </div>
            }

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title + close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1rem', color: 'white', lineHeight: 1.3 }}>{panelTitle}</p>
                  {(panelYear || panelGenre) && (
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>
                      {[panelYear, panelGenre].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p style={{ fontSize: '0.7rem', color: 'rgba(160,32,240,0.6)', marginTop: '0.2rem', fontWeight: 600 }}>
                    {panelMode === 'edit' ? 'Mode édition' : 'Nouveau jeu'}
                  </p>
                </div>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status */}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Statut</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {STATUSES.map(({ value, label, color }) => (
                    <button key={value} onClick={() => setStatus(value)} style={{
                      padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 600,
                      border: '1px solid',
                      background: status === value ? `${color}25` : 'transparent',
                      borderColor: status === value ? `${color}60` : 'rgba(255,255,255,0.1)',
                      color: status === value ? color : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                    }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Plateforme</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {PLATFORMS.map((p) => (
                    <button key={p} onClick={() => setPlatform(p)} style={{
                      padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 600,
                      border: '1px solid',
                      background: platform === p ? 'rgba(160,32,240,0.2)' : 'transparent',
                      borderColor: platform === p ? 'rgba(160,32,240,0.5)' : 'rgba(255,255,255,0.1)',
                      color: platform === p ? '#c084fc' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                    }}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Rating + Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    <Star className="w-3 h-3" /> Note /10
                  </label>
                  <input type="number" min="0" max="10" step="0.5" value={rating}
                    onChange={(e) => setRating(e.target.value)} placeholder="8.5"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    <Clock className="w-3 h-3" /> Heures
                  </label>
                  <input type="number" min="0" value={hours}
                    onChange={(e) => setHours(e.target.value)} placeholder="40"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Avis (optionnel)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Mon avis en quelques mots…" rows={2}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Store URL */}
              <div>
                <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                  <ExternalLink className="w-3 h-3" />
                  {fetchingDetail ? 'Lien store (récupération…)' : 'Lien store (Steam, site officiel…)'}
                </label>
                <input type="url" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://store.steampowered.com/app/…"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              {/* Linked videos */}
              <div>
                <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                  <Video className="w-3 h-3" /> Vidéos liées (YouTube / Twitch)
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <input
                    type="url" value={videoInput} onChange={(e) => setVideoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && videoInput.trim()) {
                        e.preventDefault();
                        setLinkedVideos(v => [...v, videoInput.trim()]);
                        setVideoInput('');
                      }
                    }}
                    placeholder="https://youtu.be/… ou twitch.tv/…"
                    style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                  />
                  <button
                    onClick={() => { if (videoInput.trim()) { setLinkedVideos(v => [...v, videoInput.trim()]); setVideoInput(''); } }}
                    style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', background: 'rgba(160,32,240,0.2)', border: '1px solid rgba(160,32,240,0.4)', color: '#c084fc', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {linkedVideos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {linkedVideos.map((url, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Link className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                        <button onClick={() => setLinkedVideos(v => v.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: '0.1rem', flexShrink: 0 }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={isPending} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.8rem', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color: 'white', fontWeight: 700, fontSize: '0.95rem',
                cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1,
              }}>
                {panelMode === 'edit' ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isPending ? 'Sauvegarde…' : panelMode === 'edit' ? 'Enregistrer les modifications' : 'Ajouter à ma biblio'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
