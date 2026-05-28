'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Game, GameStatus, GamePlatform, GameTier } from '@/data/games';
import { RawgGame } from '@/lib/rawg';
import { SiteConfig } from '@/lib/redis';
import { SteamSearchHit, SteamGameInfo } from '@/lib/steam';
import { addGameAction, removeGameAction, logoutAction, setTopGamesAction, saveSiteConfigAction, syncVideoLinksAction, fetchVideosForAdminAction, linkVideoToGameAction, AdminVideo } from '@/app/admin/actions';
import { Star, Clock, Trash2, Plus, Search, X, LogOut, Gamepad2, Pencil, ExternalLink, Link, Video, RefreshCw, Trophy, User, Monitor, Mic } from 'lucide-react';

const PLATFORMS: GamePlatform[] = ['PC', 'PS5', 'PS4', 'Xbox Series', 'Switch', 'Mobile'];
const TIERS: { value: GameTier; label: string; color: string }[] = [
  { value: 'S', label: 'S — Chef-d\'œuvre', color: '#FF4444' },
  { value: 'A', label: 'A — Excellent',      color: '#FF8C00' },
  { value: 'B', label: 'B — Bon',            color: '#FFD700' },
  { value: 'C', label: 'C — Correct',        color: '#22c55e' },
  { value: 'D', label: 'D — Bof',            color: '#818cf8' },
];
const TIER_CYCLE: (GameTier | undefined)[] = [undefined, 'S', 'A', 'B', 'C', 'D'];
const STATUSES: { value: GameStatus; label: string; color: string }[] = [
  { value: 'terminé',           label: 'Terminé',   color: '#22c55e' },
  { value: 'en cours',          label: 'En cours',  color: '#6366f1' },
  { value: 'infini',            label: '∞ Infini',  color: '#06b6d4' },
  { value: 'abandonné',         label: 'Abandonné', color: '#ef4444' },
  { value: 'liste de souhaits', label: 'Wishlist',  color: '#eab308' },
];

interface Props { initialGames: Game[]; initialTopIds: string[]; initialConfig: SiteConfig }

type PanelMode = 'add' | 'edit' | 'manual' | 'steam' | null;
type AdminTab = 'games' | 'about' | 'videos';

export default function AdminPanel({ initialGames, initialTopIds, initialConfig }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('games');
  const [games, setGames] = useState<Game[]>(initialGames);
  const [topIds, setTopIds] = useState<string[]>(initialTopIds);

  // ── About / config state ──────────────────────────────────────────────────
  const [bio, setBio] = useState(initialConfig.bio ?? '');
  const [cfgCpu, setCfgCpu] = useState(initialConfig.pc?.cpu ?? '');
  const [cfgGpu, setCfgGpu] = useState(initialConfig.pc?.gpu ?? '');
  const [cfgRam, setCfgRam] = useState(initialConfig.pc?.ram ?? '');
  const [cfgScreen, setCfgScreen] = useState(initialConfig.pc?.screen ?? '');
  const [cfgKeyboard, setCfgKeyboard] = useState(initialConfig.pc?.keyboard ?? '');
  const [cfgMouse, setCfgMouse] = useState(initialConfig.pc?.mouse ?? '');
  const [cfgHeadset, setCfgHeadset] = useState(initialConfig.pc?.headset ?? '');
  const [cfgMicro, setCfgMicro] = useState(initialConfig.stream?.micro ?? '');
  const [cfgWebcam, setCfgWebcam] = useState(initialConfig.stream?.webcam ?? '');
  const [cfgSoftware, setCfgSoftware] = useState(initialConfig.stream?.software ?? 'OBS Studio');
  const [configSaved, setConfigSaved] = useState(false);
  const [isPendingConfig, startConfigTransition] = useTransition();

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawgGame[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Panel mode
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedRawg, setSelectedRawg] = useState<RawgGame | null>(null);
  const [selectedSteam, setSelectedSteam] = useState<SteamSearchHit | null>(null);
  const [steamGameInfo, setSteamGameInfo] = useState<SteamGameInfo | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // Steam fallback search (triggered automatically when RAWG returns nothing)
  const [steamFallbackResults, setSteamFallbackResults] = useState<SteamSearchHit[]>([]);
  const [steamFallbackSearching, setSteamFallbackSearching] = useState(false);

  // Form fields
  const [platform, setPlatform] = useState<GamePlatform>('PC');
  const [status, setStatus] = useState<GameStatus>('terminé');
  const [tier, setTier] = useState<GameTier | undefined>(undefined);
  const [rating, setRating] = useState('');
  const [hours, setHours] = useState('');
  const [comment, setComment] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [linkedVideos, setLinkedVideos] = useState<string[]>([]);
  const [videoInput, setVideoInput] = useState('');

  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState<string | null>(null); // game id being synced
  const [linkingVideos, setLinkingVideos] = useState(false);
  const [linkResult, setLinkResult] = useState<string | null>(null);

  // ── Videos tab state ─────────────────────────────────────────────────────
  const [adminVideos, setAdminVideos] = useState<AdminVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [liveGame, setLiveGame] = useState<{ streamId: string; gameName: string } | undefined>();
  const [videoPlatformFilter, setVideoPlatformFilter] = useState<'all' | 'youtube' | 'twitch'>('all');
  const [savingVideoId, setSavingVideoId] = useState<string | null>(null);
  // Pending game assignment per video id (before user clicks save)
  const [pendingAssign, setPendingAssign] = useState<Record<string, string | null>>({});

  // Cover picker
  const [coverPickerGame, setCoverPickerGame] = useState<Game | null>(null);
  const [coverPickerSource, setCoverPickerSource] = useState<'rawg' | 'steam'>('rawg');
  const [coverPickerResults, setCoverPickerResults] = useState<RawgGame[]>([]);
  const [coverPickerSteamResults, setCoverPickerSteamResults] = useState<SteamSearchHit[]>([]);
  const [coverPickerLoading, setCoverPickerLoading] = useState(false);
  const [coverPickerQuery, setCoverPickerQuery] = useState('');

  // Manual add fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualCover, setManualCover] = useState('');

  // Custom cover URL override (for add & edit modes)
  const [coverUrlOverride, setCoverUrlOverride] = useState('');

  // Panel cover + title display
  const panelCover  = panelMode === 'add'    ? (coverUrlOverride.trim() || selectedRawg?.background_image)
                    : panelMode === 'steam'  ? (coverUrlOverride.trim() || steamGameInfo?.headerImage || selectedSteam?.cover)
                    : panelMode === 'manual' ? (manualCover.trim() || undefined)
                    : (coverUrlOverride.trim() || editingGame?.cover);
  const panelTitle  = panelMode === 'add'    ? selectedRawg?.name
                    : panelMode === 'steam'  ? (steamGameInfo?.name ?? selectedSteam?.name)
                    : panelMode === 'manual' ? (manualTitle || 'Nouveau jeu')
                    : editingGame?.title;
  const panelYear   = panelMode === 'add'   ? (selectedRawg?.released ? new Date(selectedRawg.released).getFullYear() : null)
                    : panelMode === 'steam' ? (steamGameInfo?.year ?? null)
                    : editingGame?.year ?? null;
  const panelGenre  = panelMode === 'add'   ? selectedRawg?.genres?.[0]?.name
                    : panelMode === 'steam' ? steamGameInfo?.genre
                    : editingGame?.genre;

  // Debounced RAWG search — falls back to Steam when RAWG returns nothing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSteamFallbackResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSteamFallbackResults([]);
      try {
        const res = await fetch(`/api/rawg?q=${encodeURIComponent(query)}`);
        const hits: RawgGame[] = await res.json();
        setResults(hits);
        if (hits.length === 0) {
          // RAWG found nothing — automatically search Steam
          setSteamFallbackSearching(true);
          try {
            const sr = await fetch(`/api/steam/search?q=${encodeURIComponent(query)}`);
            setSteamFallbackResults(await sr.json());
          } catch { setSteamFallbackResults([]); }
          finally { setSteamFallbackSearching(false); }
        }
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  }, [query]);

  function resetForm() {
    setPlatform('PC'); setStatus('terminé'); setTier(undefined);
    setRating(''); setHours(''); setComment(''); setStoreUrl('');
    setLinkedVideos([]); setVideoInput('');
    setManualTitle(''); setManualCover(''); setCoverUrlOverride('');
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedRawg(null);
    setSelectedSteam(null); setSteamGameInfo(null);
    setEditingGame(null);
    resetForm();
  }

  function openManualPanel() {
    setSelectedRawg(null); setSelectedSteam(null); setSteamGameInfo(null);
    setEditingGame(null); resetForm(); setPanelMode('manual');
  }

  async function openSteamAddPanel(hit: SteamSearchHit) {
    setSelectedSteam(hit); setSelectedRawg(null); setSteamGameInfo(null);
    setEditingGame(null); resetForm(); setPanelMode('steam');
    setStoreUrl(hit.storeUrl);
    // Fetch full details (name / year / genre / hi-res cover)
    setFetchingDetail(true);
    try {
      const res = await fetch(`/api/steam/details/${hit.id}`);
      const info: SteamGameInfo | null = await res.json();
      if (info) {
        setSteamGameInfo(info);
        setStoreUrl(hit.storeUrl); // keep Steam store URL
      }
    } catch { /* ignore — we still have hit.name and hit.cover */ }
    finally { setFetchingDetail(false); }
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
    setPlatform(g.platform); setStatus(g.status); setTier(g.tier);
    setRating(g.rating?.toString() ?? '');
    setHours(g.hours?.toString() ?? '');
    setComment(g.comment ?? '');
    setStoreUrl(g.storeUrl ?? '');
    setLinkedVideos(g.linkedVideos ?? []);
    setVideoInput('');
    setCoverUrlOverride(g.cover ?? '');
    setPanelMode('edit');
  }

  function handleSubmit() {
    if (panelMode === 'add'    && !selectedRawg) return;
    if (panelMode === 'steam'  && !selectedSteam) return;
    if (panelMode === 'edit'   && !editingGame) return;
    if (panelMode === 'manual' && !manualTitle.trim()) return;

    const sharedFields = {
      platform, status, tier,
      rating: rating ? parseFloat(rating) : undefined,
      hours: hours ? parseInt(hours) : undefined,
      comment: comment.trim() || undefined,
      storeUrl: storeUrl.trim() || undefined,
      linkedVideos: linkedVideos.length > 0 ? linkedVideos : undefined,
    };

    const game: Game =
      panelMode === 'add' ? {
        id: `rawg-${selectedRawg!.id}`,
        title: selectedRawg!.name,
        cover: coverUrlOverride.trim() || selectedRawg!.background_image || undefined,
        rawgId: selectedRawg!.id,
        year: selectedRawg!.released ? new Date(selectedRawg!.released).getFullYear() : undefined,
        genre: selectedRawg!.genres?.[0]?.name,
        ...sharedFields,
      }
      : panelMode === 'steam' ? {
        id: `steam-${selectedSteam!.id}`,
        title: steamGameInfo?.name ?? selectedSteam!.name,
        cover: coverUrlOverride.trim() || steamGameInfo?.headerImage || selectedSteam!.cover || undefined,
        rawgId: undefined,
        year: steamGameInfo?.year,
        genre: steamGameInfo?.genre,
        ...sharedFields,
        // storeUrl from sharedFields (editable by user) takes priority; fall back to Steam URL
        storeUrl: sharedFields.storeUrl || selectedSteam!.storeUrl,
      }
      : panelMode === 'manual' ? {
        id: `manual-${Date.now()}`,
        title: manualTitle.trim(),
        cover: manualCover.trim() || undefined,
        ...sharedFields,
      }
      : {
        ...editingGame!,
        cover: coverUrlOverride.trim() || editingGame!.cover,
        ...sharedFields,
      };

    startTransition(async () => {
      await addGameAction(game);
      setGames((prev) => [game, ...prev.filter((g) => g.id !== game.id)]);
      closePanel();
      if (panelMode === 'add' || panelMode === 'manual' || panelMode === 'steam') {
        setQuery(''); setResults([]); setSteamFallbackResults([]);
      }
    });
  }

  /** Opens the cover picker for a specific game, pre-searches RAWG with its title. */
  async function openCoverPicker(game: Game) {
    setCoverPickerGame(game);
    setCoverPickerSource('rawg');
    setCoverPickerQuery(game.title);
    setCoverPickerResults([]);
    setCoverPickerSteamResults([]);
    setCoverPickerLoading(true);
    try {
      const res = await fetch(`/api/rawg?q=${encodeURIComponent(game.title)}`);
      setCoverPickerResults(await res.json());
    } catch { /* ignore */ }
    finally { setCoverPickerLoading(false); }
  }

  /** Search within the picker using the current source. */
  async function searchInPicker(q: string, source?: 'rawg' | 'steam') {
    if (!q.trim()) return;
    const src = source ?? coverPickerSource;
    setCoverPickerLoading(true);
    setCoverPickerResults([]);
    setCoverPickerSteamResults([]);
    try {
      if (src === 'steam') {
        const res = await fetch(`/api/steam/search?q=${encodeURIComponent(q)}`);
        setCoverPickerSteamResults(await res.json());
      } else {
        const res = await fetch(`/api/rawg?q=${encodeURIComponent(q)}`);
        setCoverPickerResults(await res.json());
      }
    } catch { /* ignore */ }
    finally { setCoverPickerLoading(false); }
  }

  /** Switch source tab and re-search. */
  function switchPickerSource(src: 'rawg' | 'steam') {
    setCoverPickerSource(src);
    searchInPicker(coverPickerQuery, src);
  }

  /** Apply a RAWG result as cover for the game in the picker. */
  async function applyCoverFromPicker(rawg: RawgGame) {
    if (!coverPickerGame) return;
    const updated: Game = {
      ...coverPickerGame,
      cover: rawg.background_image ?? coverPickerGame.cover,
      rawgId: rawg.id,
      genre: coverPickerGame.genre ?? rawg.genres?.[0]?.name,
      year: coverPickerGame.year ?? (rawg.released ? new Date(rawg.released).getFullYear() : undefined),
    };
    setSyncing(coverPickerGame.id);
    try {
      await addGameAction(updated);
      setGames((prev) => prev.map((g) => g.id === coverPickerGame.id ? updated : g));
      if (editingGame?.id === coverPickerGame.id) setEditingGame(updated);
      setCoverPickerGame(null);
      setCoverPickerResults([]);
      setCoverPickerSteamResults([]);
    } catch { /* ignore */ }
    finally { setSyncing(null); }
  }

  /** Apply a Steam search result as cover — also fetches year & genre from appdetails. */
  async function applyCoverFromSteam(hit: SteamSearchHit) {
    if (!coverPickerGame) return;
    setSyncing(coverPickerGame.id);
    // Snapshot game before async work so closures stay consistent
    const baseGame = coverPickerGame;
    try {
      // Fetch full Steam details for year + genre
      let info: SteamGameInfo | null = null;
      try {
        const res = await fetch(`/api/steam/details/${hit.id}`);
        info = await res.json();
      } catch { /* ignore, proceed without extra info */ }

      const updated: Game = {
        ...baseGame,
        cover: info?.headerImage ?? hit.cover,
        rawgId: undefined,
        storeUrl: baseGame.storeUrl || hit.storeUrl,
        // Overwrite year & genre with Steam data (they were wrong from the RAWG mismatch)
        year: info?.year ?? baseGame.year,
        genre: info?.genre ?? baseGame.genre,
      };
      await addGameAction(updated);
      setGames((prev) => prev.map((g) => g.id === baseGame.id ? updated : g));
      if (editingGame?.id === baseGame.id) setEditingGame(updated);
      setCoverPickerGame(null);
      setCoverPickerResults([]);
      setCoverPickerSteamResults([]);
    } catch { /* ignore */ }
    finally { setSyncing(null); }
  }

  /** Auto-sync (first RAWG result) — used only by the bulk "Sync covers" button. */
  async function autoSyncCover(game: Game) {
    setSyncing(game.id);
    try {
      const res = await fetch(`/api/rawg?q=${encodeURIComponent(game.title)}`);
      const hits: RawgGame[] = await res.json();
      if (!hits.length) return;
      const rawg = hits[0];
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

  async function toggleTop(id: string) {
    const next = topIds.includes(id)
      ? topIds.filter((t) => t !== id)
      : topIds.length >= 5 ? topIds : [...topIds, id];
    setTopIds(next);
    await setTopGamesAction(next);
  }

  async function syncAllCovers() {
    const toSync = games.filter((g) => !g.cover && !g.rawgId && !g.id.startsWith('rawg-'));
    for (const game of toSync) {
      await autoSyncCover(game);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  async function loadAdminVideos() {
    setVideosLoading(true);
    try {
      const { videos, liveGame: live } = await fetchVideosForAdminAction();
      setAdminVideos(videos);
      setLiveGame(live);
      setPendingAssign({});
    } catch { /* ignore */ }
    finally { setVideosLoading(false); }
  }

  useEffect(() => {
    if (activeTab === 'videos' && adminVideos.length === 0 && !videosLoading) {
      loadAdminVideos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function saveVideoAssignment(video: AdminVideo, gameId: string | null) {
    setSavingVideoId(video.id);
    try {
      await linkVideoToGameAction(video.url, gameId);
      setAdminVideos((prev) => prev.map((v) => {
        if (v.id !== video.id) return v;
        if (gameId === null) {
          return { ...v, currentGameId: undefined, currentGameTitle: undefined, detectedGameId: v.detectedGameId, detectedGameTitle: v.detectedGameTitle };
        }
        const g = games.find((x) => x.id === gameId);
        return { ...v, currentGameId: gameId, currentGameTitle: g?.title ?? gameId, detectedGameId: undefined, detectedGameTitle: undefined };
      }));
      setPendingAssign((p) => { const n = { ...p }; delete n[video.id]; return n; });
    } catch { /* ignore */ }
    finally { setSavingVideoId(null); }
  }

  async function runVideoSync() {
    setLinkingVideos(true);
    setLinkResult(null);
    try {
      const { added, gamesUpdated } = await syncVideoLinksAction();
      if (added === 0) {
        setLinkResult('Aucun nouveau lien trouvé.');
      } else {
        setLinkResult(`✓ ${added} lien${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} sur ${gamesUpdated} jeu${gamesUpdated > 1 ? 'x' : ''} !`);
      }
    } catch {
      setLinkResult('Erreur lors de la liaison des vidéos.');
    } finally {
      setLinkingVideos(false);
      setTimeout(() => setLinkResult(null), 5000);
    }
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeGameAction(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    });
  }

  async function cycleTier(game: Game) {
    const currentIdx = TIER_CYCLE.indexOf(game.tier);
    const nextTier = TIER_CYCLE[(currentIdx + 1) % TIER_CYCLE.length];
    const updated: Game = { ...game, tier: nextTier };
    await addGameAction(updated);
    setGames((prev) => prev.map((g) => g.id === game.id ? updated : g));
  }

  function saveConfig() {
    const config: SiteConfig = {
      bio: bio.trim() || undefined,
      pc: {
        cpu: cfgCpu.trim() || undefined,
        gpu: cfgGpu.trim() || undefined,
        ram: cfgRam.trim() || undefined,
        screen: cfgScreen.trim() || undefined,
        keyboard: cfgKeyboard.trim() || undefined,
        mouse: cfgMouse.trim() || undefined,
        headset: cfgHeadset.trim() || undefined,
      },
      stream: {
        micro: cfgMicro.trim() || undefined,
        webcam: cfgWebcam.trim() || undefined,
        software: cfgSoftware.trim() || undefined,
      },
    };
    startConfigTransition(async () => {
      await saveSiteConfigAction(config);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
    color: 'white', fontSize: '0.88rem', outline: 'none',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: '2rem', color: 'white', letterSpacing: '-0.03em' }}>
            Admin
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.04)', padding: '0.25rem', borderRadius: '10px', width: 'fit-content' }}>
        {([
          { id: 'games',  label: 'Jeux-Vidéothèque', icon: Gamepad2 },
          { id: 'about',  label: 'Page À propos',    icon: User     },
          { id: 'videos', label: 'Vidéos',           icon: Video    },
        ] as { id: AdminTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: activeTab === id ? 'rgba(160,32,240,0.25)' : 'transparent',
            color: activeTab === id ? '#c084fc' : 'rgba(255,255,255,0.35)',
          }}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB: À PROPOS ── */}
      {activeTab === 'about' && (
        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Bio */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <User className="w-4 h-4" style={{ color: '#c084fc' }} />
              <p style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Présentation</p>
            </div>
            <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Bio / description</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="Présente-toi en quelques lignes…" rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {/* PC Config */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Monitor className="w-4 h-4" style={{ color: '#c084fc' }} />
              <p style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Config PC</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {([
                { label: 'CPU',     value: cfgCpu,     set: setCfgCpu,     placeholder: 'ex: Intel Core i9-14900K' },
                { label: 'GPU',     value: cfgGpu,     set: setCfgGpu,     placeholder: 'ex: NVIDIA RTX 4090' },
                { label: 'RAM',     value: cfgRam,     set: setCfgRam,     placeholder: 'ex: 32 Go DDR5' },
                { label: 'Écran',   value: cfgScreen,  set: setCfgScreen,  placeholder: 'ex: LG 27GP850-B 165Hz' },
                { label: 'Clavier', value: cfgKeyboard,set: setCfgKeyboard,placeholder: 'ex: Keychron Q1' },
                { label: 'Souris',  value: cfgMouse,   set: setCfgMouse,   placeholder: 'ex: Logitech G Pro X Superlight' },
                { label: 'Casque',  value: cfgHeadset, set: setCfgHeadset, placeholder: 'ex: HyperX Cloud Alpha' },
              ] as { label: string; value: string; set: (v: string) => void; placeholder: string }[]).map(({ label, value, set, placeholder }) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: '0.75rem' }}>
                  <label className="section-label" style={{ textAlign: 'right' }}>{label}</label>
                  <input type="text" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>

          {/* Stream setup */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Mic className="w-4 h-4" style={{ color: '#c084fc' }} />
              <p style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Setup stream</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {([
                { label: 'Micro',    value: cfgMicro,   set: setCfgMicro,   placeholder: 'ex: Blue Yeti X' },
                { label: 'Webcam',   value: cfgWebcam,  set: setCfgWebcam,  placeholder: 'ex: Elgato Facecam' },
                { label: 'Logiciel', value: cfgSoftware,set: setCfgSoftware,placeholder: 'OBS Studio' },
              ] as { label: string; value: string; set: (v: string) => void; placeholder: string }[]).map(({ label, value, set, placeholder }) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: '0.75rem' }}>
                  <label className="section-label" style={{ textAlign: 'right' }}>{label}</label>
                  <input type="text" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button onClick={saveConfig} disabled={isPendingConfig} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.85rem', borderRadius: '10px', border: 'none', cursor: isPendingConfig ? 'not-allowed' : 'pointer',
            background: configSaved ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: 'white', fontWeight: 700, fontSize: '0.95rem', transition: 'background 0.3s',
            opacity: isPendingConfig ? 0.7 : 1,
          }}>
            {isPendingConfig ? 'Sauvegarde…' : configSaved ? '✓ Sauvegardé !' : 'Enregistrer la page À propos'}
          </button>
        </div>
      )}

      {/* ── TAB: VIDÉOS ── */}
      {activeTab === 'videos' && (
        <div>
          {/* Live indicator */}
          {liveGame && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.35rem 0.85rem', borderRadius: '100px', marginBottom: '1.5rem',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 700 }}>
                En direct · {liveGame.gameName}
              </span>
            </div>
          )}

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Platform filter tabs */}
            <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '8px' }}>
              {(['all', 'youtube', 'twitch'] as const).map((f) => (
                <button key={f} onClick={() => setVideoPlatformFilter(f)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: videoPlatformFilter === f ? 'rgba(160,32,240,0.25)' : 'transparent',
                  color: videoPlatformFilter === f ? '#c084fc' : 'rgba(255,255,255,0.35)',
                }}>
                  {f === 'all' ? 'Toutes' : f === 'youtube' ? '▶ YouTube' : '🎮 Twitch'}
                </button>
              ))}
            </div>
            <button onClick={loadAdminVideos} disabled={videosLoading} style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.35rem 0.8rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)', cursor: videosLoading ? 'not-allowed' : 'pointer',
            }}>
              <RefreshCw className="w-3 h-3" style={{ animation: videosLoading ? 'spin 1s linear infinite' : 'none' }} />
              Actualiser
            </button>
          </div>

          {videosLoading && (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', textAlign: 'center', padding: '4rem 0' }}>
              Chargement des vidéos…
            </p>
          )}

          {!videosLoading && adminVideos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <Video className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 0.75rem' }} />
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
                Aucune vidéo détectée. Vérifie que tes variables d&apos;environnement YouTube / Twitch sont configurées.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {adminVideos
              .filter((v) => videoPlatformFilter === 'all' || v.platform === videoPlatformFilter)
              .map((v) => {
                const pending = pendingAssign[v.id]; // undefined = not changed, null = délier, string = new gameId
                const hasPending = v.id in pendingAssign;
                const isSaving = savingVideoId === v.id;

                const assignedGame = hasPending
                  ? (pending ? games.find((g) => g.id === pending) : null)
                  : (v.currentGameId ? games.find((g) => g.id === v.currentGameId) : null);

                return (
                  <div key={v.id} style={{
                    display: 'flex', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    alignItems: 'flex-start',
                  }}>
                    {/* Thumbnail */}
                    {v.thumbnail ? (
                      <img src={v.thumbnail} alt="" style={{ width: '90px', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '90px', aspectRatio: '16/9', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Video className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '0.83rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, flex: 1, minWidth: 0 }}>
                          {v.title}
                        </p>
                        {/* Platform badge */}
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.45rem',
                          borderRadius: '4px', flexShrink: 0,
                          background: v.platform === 'youtube' ? 'rgba(239,68,68,0.15)' : 'rgba(145,70,255,0.15)',
                          color: v.platform === 'youtube' ? '#fca5a5' : '#c084fc',
                        }}>
                          {v.platform === 'youtube' ? 'YouTube' : 'Twitch'}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.2rem' }}>
                        {v.date}{v.duration ? ` · ${v.duration}` : ''}{v.views ? ` · ${v.views} vues` : ''}
                      </p>

                      {/* Game assignment row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
                        {/* Current / pending assignment badge */}
                        {assignedGame ? (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.55rem',
                            borderRadius: '5px',
                            background: hasPending ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                            color: hasPending ? '#fde047' : '#86efac',
                            border: `1px solid ${hasPending ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
                          }}>
                            {hasPending ? '→ ' : '✓ '}{assignedGame.title}
                          </span>
                        ) : v.detectedGameTitle && !hasPending ? (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.55rem',
                            borderRadius: '5px',
                            background: 'rgba(99,102,241,0.12)', color: 'rgba(165,180,252,0.7)',
                            border: '1px solid rgba(99,102,241,0.2)',
                          }}>
                            🔍 {v.detectedGameTitle}
                          </span>
                        ) : (
                          !hasPending && (
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>Non lié</span>
                          )
                        )}

                        {/* Dropdown */}
                        <select
                          value={hasPending ? (pending ?? '') : (v.currentGameId ?? '')}
                          onChange={(e) => setPendingAssign((p) => ({ ...p, [v.id]: e.target.value || null }))}
                          style={{
                            padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem',
                            background: '#1a0533', border: '1px solid rgba(160,32,240,0.3)',
                            color: 'rgba(255,255,255,0.7)', cursor: 'pointer', maxWidth: '180px',
                            colorScheme: 'dark',
                          }}
                        >
                          <option value="">— Délier —</option>
                          {/* Suggested first if auto-detected */}
                          {v.detectedGameId && !v.currentGameId && (
                            <option value={v.detectedGameId}>⚡ {v.detectedGameTitle}</option>
                          )}
                          {[...games]
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .filter((g) => g.id !== v.detectedGameId || v.currentGameId)
                            .map((g) => (
                              <option key={g.id} value={g.id}>{g.title}</option>
                            ))
                          }
                        </select>

                        {/* Save button — only shows when there's a pending change */}
                        {hasPending && (
                          <button
                            onClick={() => saveVideoAssignment(v, pending ?? null)}
                            disabled={isSaving}
                            style={{
                              padding: '0.2rem 0.7rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                              background: 'rgba(160,32,240,0.25)', border: '1px solid rgba(160,32,240,0.5)',
                              color: '#c084fc', cursor: isSaving ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isSaving ? '…' : 'Enregistrer'}
                          </button>
                        )}

                        {/* Apply detected game shortcut */}
                        {v.detectedGameId && !v.currentGameId && !hasPending && (
                          <button
                            onClick={() => saveVideoAssignment(v, v.detectedGameId!)}
                            disabled={isSaving}
                            title={`Lier à ${v.detectedGameTitle}`}
                            style={{
                              padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600,
                              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                              color: '#a5b4fc', cursor: 'pointer',
                            }}
                          >
                            Appliquer
                          </button>
                        )}
                      </div>
                    </div>

                    {/* External link */}
                    <a href={v.url} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, padding: '0.1rem' }}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
          </div>

          {!videosLoading && adminVideos.length > 0 && (
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.15)', marginTop: '1.5rem', textAlign: 'center' }}>
              {adminVideos.length} vidéo{adminVideos.length > 1 ? 's' : ''} détectée{adminVideos.length > 1 ? 's' : ''} ·
              Les jeux avec 🔍 sont des suggestions automatiques (titre, tags, catégorie Twitch)
            </p>
          )}
        </div>
      )}

      {/* ── TAB: JEUX ── */}
      {activeTab === 'games' && (
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

          {/* Manual add button */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={openManualPanel}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.9rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                background: panelMode === 'manual' ? 'rgba(160,32,240,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${panelMode === 'manual' ? 'rgba(160,32,240,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: panelMode === 'manual' ? '#c084fc' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter manuellement
            </button>
            {query.trim() && !searching && results.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                Aucun résultat RAWG — essaie l&apos;ajout manuel
              </p>
            )}
          </div>

          {(searching || steamFallbackSearching) && (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {searching ? 'Recherche RAWG…' : '🎮 Aucun résultat RAWG — recherche sur Steam…'}
            </p>
          )}

          {/* Steam fallback results (shown when RAWG returns nothing) */}
          {!searching && !steamFallbackSearching && steamFallbackResults.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <p className="section-label">Résultats Steam — clique pour ajouter</p>
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(6,182,212,0.1)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.25)', fontWeight: 700 }}>
                  RAWG vide
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {steamFallbackResults.map((g) => (
                  <button key={g.id} onClick={() => openSteamAddPanel(g)} style={{
                    ...card, textAlign: 'left', padding: 0,
                    background: selectedSteam?.id === g.id ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
                    borderColor: selectedSteam?.id === g.id ? 'rgba(6,182,212,0.45)' : 'rgba(255,255,255,0.08)',
                  }}>
                    <div style={{ position: 'relative' }}>
                      <img src={g.cover} alt={g.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span style={{ position: 'absolute', top: '0.3rem', right: '0.3rem', fontSize: '0.55rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: '3px', background: 'rgba(6,182,212,0.85)', color: '#fff' }}>
                        Steam
                      </span>
                    </div>
                    <div style={{ padding: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{g.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                <p className="section-label">Ma bibliothèque ({games.length})</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.2rem' }}>
                  <Star style={{ width: '0.6rem', height: '0.6rem', display: 'inline', verticalAlign: 'middle', color: '#facc15' }} /> Étoile = Mon Top 5 ({topIds.length}/5)
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Video auto-link button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  <button
                    onClick={runVideoSync}
                    disabled={linkingVideos || !!syncing}
                    title="Détecter les jeux dans les titres de vidéos YouTube / Twitch et les lier automatiquement"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                      background: 'rgba(160,32,240,0.1)', border: '1px solid rgba(160,32,240,0.3)',
                      color: '#c084fc', cursor: (linkingVideos || !!syncing) ? 'not-allowed' : 'pointer',
                      opacity: (linkingVideos || !!syncing) ? 0.5 : 1,
                    }}
                  >
                    <Video className="w-3 h-3" style={{ animation: linkingVideos ? 'spin 1s linear infinite' : 'none' }} />
                    {linkingVideos ? 'Analyse…' : '🔗 Lier les vidéos'}
                  </button>
                  {linkResult && (
                    <p style={{ fontSize: '0.65rem', color: linkResult.startsWith('✓') ? '#86efac' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                      {linkResult}
                    </p>
                  )}
                </div>
                {/* Sync covers button */}
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
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'center' }}>
                    {/* Tier cycle button */}
                    {(() => {
                      const t = g.tier;
                      const cfg = t ? TIERS.find((x) => x.value === t) : null;
                      return (
                        <button
                          onClick={() => cycleTier(g)}
                          title={t ? `Tier ${t} — clic pour changer` : 'Pas de tier — clic pour assigner'}
                          style={{
                            padding: '0.15rem 0.45rem', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 800,
                            border: `1px solid ${cfg ? cfg.color + '55' : 'rgba(255,255,255,0.1)'}`,
                            background: cfg ? cfg.color + '18' : 'transparent',
                            color: cfg ? cfg.color : 'rgba(255,255,255,0.2)',
                            cursor: 'pointer', minWidth: '28px', textAlign: 'center',
                            transition: 'all 0.15s',
                          }}
                        >
                          {t ?? '—'}
                        </button>
                      );
                    })()}
                    {/* Top 5 star */}
                    <button
                      onClick={() => toggleTop(g.id)}
                      disabled={!topIds.includes(g.id) && topIds.length >= 5}
                      title={topIds.includes(g.id) ? 'Retirer du Top 5' : topIds.length >= 5 ? 'Top 5 plein' : 'Ajouter au Top 5'}
                      style={{
                        background: 'none', border: 'none', cursor: topIds.length >= 5 && !topIds.includes(g.id) ? 'not-allowed' : 'pointer',
                        padding: '0.25rem', color: topIds.includes(g.id) ? '#facc15' : 'rgba(255,255,255,0.15)',
                        opacity: !topIds.includes(g.id) && topIds.length >= 5 ? 0.3 : 1,
                      }}
                    >
                      <Star className="w-4 h-4" style={{ fill: topIds.includes(g.id) ? '#facc15' : 'transparent' }} />
                    </button>
                    {/* Cover picker button — always visible */}
                    <button
                      onClick={() => openCoverPicker(g)}
                      disabled={!!syncing}
                      title={g.cover ? 'Changer la cover' : 'Chercher une cover sur RAWG'}
                      style={{
                        background: 'none', border: 'none', cursor: syncing ? 'not-allowed' : 'pointer', padding: '0.25rem',
                        color: g.cover ? 'rgba(255,255,255,0.18)' : 'rgba(6,182,212,0.55)',
                      }}
                    >
                      <RefreshCw className="w-4 h-4" style={{ animation: syncing === g.id ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
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
            position: 'sticky', top: '5rem',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(160,32,240,0.25)',
            borderRadius: '16px', overflow: 'hidden',
          }}>
            {/* Cover preview */}
            {panelMode === 'manual' ? (
              /* Manual mode: cover URL input with live preview */
              <div style={{ position: 'relative' }}>
                {manualCover.trim() ? (
                  <img src={manualCover.trim()} alt="cover" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(160,32,240,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Gamepad2 style={{ color: 'rgba(160,32,240,0.25)', width: '2.5rem', height: '2.5rem' }} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>Colle une URL d&apos;image ci-dessous</span>
                  </div>
                )}
              </div>
            ) : panelCover ? (
              <img src={panelCover} alt={panelTitle ?? ''} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(160,32,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Gamepad2 style={{ color: 'rgba(160,32,240,0.3)', width: '3rem', height: '3rem' }} />
              </div>
            )}

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title row + close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {panelMode === 'manual' ? (
                    /* Editable title in manual mode */
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Titre du jeu *"
                      autoFocus
                      style={{
                        width: '100%', padding: '0.4rem 0.6rem', borderRadius: '7px',
                        border: '1px solid rgba(160,32,240,0.35)', background: 'rgba(255,255,255,0.06)',
                        color: 'white', fontWeight: 800, fontSize: '1rem', outline: 'none',
                      }}
                    />
                  ) : (
                    <p style={{ fontWeight: 800, fontSize: '1rem', color: 'white', lineHeight: 1.3 }}>{panelTitle}</p>
                  )}
                  {(panelYear || panelGenre) && panelMode !== 'manual' && (
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>
                      {[panelYear, panelGenre].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <p style={{ fontSize: '0.7rem', color: panelMode === 'steam' ? 'rgba(6,182,212,0.7)' : 'rgba(160,32,240,0.6)', fontWeight: 600 }}>
                      {panelMode === 'edit' ? 'Mode édition' : panelMode === 'manual' ? 'Ajout manuel' : panelMode === 'steam' ? '🎮 Depuis Steam' : 'Nouveau jeu (RAWG)'}
                    </p>
                    {panelMode === 'edit' && editingGame && (
                      <button
                        onClick={() => openCoverPicker(editingGame)}
                        title="Changer la cover via RAWG"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          background: 'none', border: '1px solid rgba(6,182,212,0.3)',
                          borderRadius: '5px', padding: '0.1rem 0.4rem',
                          color: 'rgba(6,182,212,0.7)', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Changer la cover
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', flexShrink: 0 }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cover URL input — manual mode has its own, add/edit share this one */}
              {(panelMode === 'add' || panelMode === 'edit') && (
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                    URL de la cover {panelMode === 'add' ? '(remplace celle de RAWG)' : ''}
                  </label>
                  <input
                    type="url"
                    value={coverUrlOverride}
                    onChange={(e) => setCoverUrlOverride(e.target.value)}
                    placeholder="https://… (colle un lien image)"
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
                      color: 'white', fontSize: '0.82rem', outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Cover URL input (manual only) */}
              {panelMode === 'manual' && (
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>URL de la cover (optionnel)</label>
                  <input
                    type="url"
                    value={manualCover}
                    onChange={(e) => setManualCover(e.target.value)}
                    placeholder="https://… (image JPG/PNG)"
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
                      color: 'white', fontSize: '0.82rem', outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.3rem' }}>
                    Tu pourras aussi synchro la cover depuis RAWG plus tard via le bouton ⟳
                  </p>
                </div>
              )}

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

              {/* Tier */}
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Tier List (optionnel)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <button onClick={() => setTier(undefined)} style={{
                    padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 600,
                    border: '1px solid',
                    background: tier === undefined ? 'rgba(255,255,255,0.08)' : 'transparent',
                    borderColor: tier === undefined ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    color: tier === undefined ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                    cursor: 'pointer',
                  }}>— Aucun</button>
                  {TIERS.map(({ value, label, color }) => (
                    <button key={value} onClick={() => setTier(value)} style={{
                      padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700,
                      border: '1px solid',
                      background: tier === value ? `${color}25` : 'transparent',
                      borderColor: tier === value ? `${color}60` : 'rgba(255,255,255,0.1)',
                      color: tier === value ? color : 'rgba(255,255,255,0.3)',
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
              <button
                onClick={handleSubmit}
                disabled={isPending || (panelMode === 'manual' && !manualTitle.trim())}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.8rem', borderRadius: '10px', border: 'none',
                  background: panelMode === 'steam'
                    ? 'linear-gradient(135deg,#0369a1,#0ea5e9)'
                    : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  color: 'white', fontWeight: 700, fontSize: '0.95rem',
                  cursor: (isPending || (panelMode === 'manual' && !manualTitle.trim())) ? 'not-allowed' : 'pointer',
                  opacity: (isPending || (panelMode === 'manual' && !manualTitle.trim())) ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {panelMode === 'edit' ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isPending ? 'Sauvegarde…'
                  : panelMode === 'edit' ? 'Enregistrer les modifications'
                  : panelMode === 'steam' ? '🎮 Ajouter depuis Steam'
                  : 'Ajouter à ma biblio'}
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── COVER PICKER MODAL ── */}
      {coverPickerGame && (
        <div
          onClick={() => { setCoverPickerGame(null); setCoverPickerResults([]); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '660px',
              background: '#0D0020', border: '1px solid rgba(160,32,240,0.3)',
              borderRadius: '16px', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', maxHeight: '85vh',
            }}
          >
            {/* Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>
                  Choisir une cover
                </p>
                <p style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {coverPickerGame.title}
                </p>
              </div>
              <button
                onClick={() => { setCoverPickerGame(null); setCoverPickerResults([]); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', flexShrink: 0 }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source tabs + search bar */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0', padding: '0.6rem 1.25rem 0' }}>
                {(['rawg', 'steam'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => switchPickerSource(src)}
                    style={{
                      padding: '0.35rem 1rem', fontSize: '0.78rem', fontWeight: 700,
                      border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
                      background: coverPickerSource === src ? 'rgba(160,32,240,0.2)' : 'transparent',
                      color: coverPickerSource === src ? '#c084fc' : 'rgba(255,255,255,0.3)',
                      borderBottom: coverPickerSource === src ? '2px solid #a855f7' : '2px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {src === 'rawg' ? 'RAWG' : '🎮 Steam'}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div style={{ padding: '0.6rem 1.25rem 0.75rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={coverPickerQuery}
                  onChange={(e) => setCoverPickerQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchInPicker(coverPickerQuery); }}
                  placeholder="Nom du jeu…"
                  style={{
                    flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
                    color: 'white', fontSize: '0.88rem', outline: 'none',
                  }}
                />
                <button
                  onClick={() => searchInPicker(coverPickerQuery)}
                  disabled={coverPickerLoading || !coverPickerQuery.trim()}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '8px',
                    background: 'rgba(160,32,240,0.2)', border: '1px solid rgba(160,32,240,0.4)',
                    color: '#c084fc', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                    opacity: coverPickerLoading ? 0.6 : 1,
                  }}
                >
                  {coverPickerLoading ? '…' : 'Chercher'}
                </button>
              </div>
            </div>

            {/* Results grid */}
            <div style={{ overflowY: 'auto', padding: '0.75rem 1rem', flex: 1 }}>
              {coverPickerLoading && (
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>
                  Recherche en cours…
                </p>
              )}
              {!coverPickerLoading && coverPickerSource === 'rawg' && coverPickerResults.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>
                  Aucun résultat RAWG — essaie l&apos;onglet Steam.
                </p>
              )}
              {!coverPickerLoading && coverPickerSource === 'steam' && coverPickerSteamResults.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>
                  Aucun résultat Steam — modifie la recherche ci-dessus.
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem' }}>
                {/* RAWG results */}
                {coverPickerSource === 'rawg' && coverPickerResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => applyCoverFromPicker(r)}
                    title={`Appliquer : ${r.name}`}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '9px', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', padding: 0,
                      transition: 'border-color 0.15s, transform 0.15s',
                    }}
                    className="hover:border-purple-500 hover:scale-[1.02]"
                  >
                    {r.background_image ? (
                      <img src={r.background_image} alt={r.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(160,32,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Gamepad2 style={{ color: 'rgba(160,32,240,0.3)', width: '1.5rem', height: '1.5rem' }} />
                      </div>
                    )}
                    <div style={{ padding: '0.4rem 0.55rem 0.5rem' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35 }}>{r.name}</p>
                      {r.released && (
                        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>
                          {new Date(r.released).getFullYear()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}

                {/* Steam results */}
                {coverPickerSource === 'steam' && coverPickerSteamResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => applyCoverFromSteam(r)}
                    title={`Appliquer : ${r.name}`}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '9px', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', padding: 0,
                      transition: 'border-color 0.15s, transform 0.15s',
                    }}
                    className="hover:border-blue-400 hover:scale-[1.02]"
                  >
                    <img
                      src={r.cover}
                      alt={r.name}
                      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div style={{ padding: '0.4rem 0.55rem 0.5rem' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35 }}>{r.name}</p>
                      <p style={{ fontSize: '0.6rem', color: 'rgba(100,180,255,0.5)', marginTop: '0.15rem', fontWeight: 600 }}>Steam</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0.6rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)' }}>
                Clique sur une cover pour l&apos;appliquer · Echap ou clic extérieur pour annuler
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
