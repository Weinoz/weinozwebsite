import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getGames } from '@/lib/redis';
import { Game, GameStatus } from '@/data/games';
import { ArrowLeft, Download } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Stats',
  description: 'Statistiques de ma jeux-vidéothèque.',
};

export const dynamic = 'force-dynamic';

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<GameStatus, { label: string; color: string; bg: string }> = {
  'terminé':           { label: 'Terminés',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  'en cours':          { label: 'En cours',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'infini':            { label: 'Infinis',    color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  'abandonné':         { label: 'Abandonnés', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'liste de souhaits': { label: 'Wishlist',   color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
};

const TIER_META: { value: string; color: string }[] = [
  { value: 'S', color: '#FF4444' },
  { value: 'A', color: '#FF8C00' },
  { value: 'B', color: '#FFD700' },
  { value: 'C', color: '#22c55e' },
  { value: 'D', color: '#818cf8' },
];

function pct(n: number, total: number) {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-3xl font-black gradient-text">{value}</p>
      <p className="text-sm font-semibold text-white/70">{label}</p>
      {sub && <p className="text-xs text-purple-300/40">{sub}</p>}
    </div>
  );
}

function HBar({ label, count, total, color, bg }: {
  label: string; count: number; total: number; color: string; bg: string;
}) {
  const width = pct(count, total);
  return (
    <div className="flex items-center gap-3">
      <span style={{ width: '110px', flexShrink: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', textAlign: 'right' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '10px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          width: `${width}%`, height: '100%', borderRadius: '100px',
          background: color, transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ width: '56px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
        {count} <span style={{ color }}>{width}%</span>
      </span>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const jar = await cookies();
  const session = jar.get('weinoz_admin');
  const isAdmin = !!(process.env.ADMIN_PASSWORD && session?.value === process.env.ADMIN_PASSWORD);

  const games: Game[] = await getGames();
  const n = games.length;

  // ── statuts ──
  const byStatus = Object.fromEntries(
    (Object.keys(STATUS_META) as GameStatus[]).map((s) => [
      s,
      games.filter((g) => g.status === s).length,
    ]),
  ) as Record<GameStatus, number>;

  // ── plateformes ──
  const platformMap = new Map<string, number>();
  for (const g of games) {
    for (const p of g.platforms) {
      platformMap.set(p, (platformMap.get(p) ?? 0) + 1);
    }
  }
  const platforms = [...platformMap.entries()].sort((a, b) => b[1] - a[1]);

  // ── genres ──
  const genreMap = new Map<string, number>();
  for (const g of games) {
    if (g.genre) genreMap.set(g.genre, (genreMap.get(g.genre) ?? 0) + 1);
  }
  const genres = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // ── années ──
  const yearMap = new Map<number, number>();
  for (const g of games) {
    if (g.year) yearMap.set(g.year, (yearMap.get(g.year) ?? 0) + 1);
  }
  const years = [...yearMap.entries()].sort((a, b) => a[0] - b[0]);
  const maxYearCount = Math.max(...years.map(([, c]) => c), 1);

  // ── tiers ──
  const tierMap = new Map<string, number>();
  for (const g of games) {
    if (g.tier) tierMap.set(g.tier, (tierMap.get(g.tier) ?? 0) + 1);
  }

  // ── rating stats ──
  const ratedGames = games.filter((g) => g.rating !== undefined);
  const avgRating = ratedGames.length
    ? (ratedGames.reduce((a, g) => a + (g.rating ?? 0), 0) / ratedGames.length).toFixed(1)
    : null;

  // ── heures ──
  const totalHours = games.reduce((a, g) => a + (g.hours ?? 0), 0);

  // ── top 5 rated ──
  const top5 = [...ratedGames]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  // ── records ──
  const mostHours   = [...games].sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0))[0];
  const lowestRated = [...ratedGames].sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0))[0];
  const newestGame  = [...games].filter(g => g.year).sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];
  const oldestGame  = [...games].filter(g => g.year).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))[0];
  const platineCount = games.filter(g => g.completion === 'platine').length;
  const completedPct = games.filter(g => g.status === 'terminé').length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

      {/* Header */}
      <div className="flex items-start justify-between mb-10 gap-4">
        <div>
          <Link href="/jeux" className="flex items-center gap-1.5 text-purple-400/50 hover:text-purple-400 text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Jeux
          </Link>
          <h1 className="text-4xl font-black gradient-text mb-1">Stats</h1>
          <p className="text-purple-300/40 text-sm">{n} jeux répertoriés</p>
        </div>
        {isAdmin && (
          <a
            href="/api/export/games"
            download="jeux.json"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 1.1rem', borderRadius: '100px',
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.25)',
              color: '#c084fc', fontSize: '0.8rem', fontWeight: 600,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
            title="Télécharger mes jeux au format JSON"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </a>
        )}
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <StatCard value={n}                  label="Jeux"          />
        <StatCard value={byStatus['terminé']} label="Terminés"     sub={`${pct(byStatus['terminé'], n)}% de la biblio`} />
        <StatCard value={totalHours > 0 ? `${totalHours}h` : '—'} label="Heures jouées" />
        <StatCard value={avgRating ? `${avgRating}/10` : '—'} label="Note moyenne" sub={`${ratedGames.length} jeux notés`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">

        {/* Statuts */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
            Répartition par statut
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {(Object.entries(byStatus) as [GameStatus, number][]).map(([status, count]) => {
              const meta = STATUS_META[status];
              return (
                <HBar
                  key={status}
                  label={meta.label}
                  count={count}
                  total={n}
                  color={meta.color}
                  bg={meta.bg}
                />
              );
            })}
          </div>
        </section>

        {/* Plateformes */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
            Plateformes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {platforms.map(([platform, count]) => (
              <HBar
                key={platform}
                label={platform}
                count={count}
                total={n}
                color="#a78bfa"
                bg="rgba(167,139,250,0.12)"
              />
            ))}
          </div>
        </section>
      </div>

      {/* Genres */}
      {genres.length > 0 && (
        <section className="mb-12">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
            Top genres
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {genres.map(([genre, count]) => (
              <HBar
                key={genre}
                label={genre}
                count={count}
                total={n}
                color="#c084fc"
                bg="rgba(192,132,252,0.1)"
              />
            ))}
          </div>
        </section>
      )}

      {/* Distribution par année */}
      {years.length > 0 && (
        <section className="mb-12">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '1.25rem' }}>
            Jeux par année de sortie
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100px' }}>
            {years.map(([year, count]) => (
              <div key={year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{count}</span>
                <div
                  title={`${year} — ${count} jeu${count > 1 ? 'x' : ''}`}
                  style={{
                    width: '100%',
                    height: `${Math.round((count / maxYearCount) * 72) + 8}px`,
                    borderRadius: '4px 4px 2px 2px',
                    background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
                    opacity: 0.75,
                    transition: 'opacity 0.2s',
                    cursor: 'default',
                  }}
                />
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}>
                  {year}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">

        {/* Tier breakdown */}
        {tierMap.size > 0 && (
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
              Tier List
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {TIER_META.map(({ value, color }) => {
                const count = tierMap.get(value) ?? 0;
                if (!count) return null;
                return (
                  <div key={value} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '0.75rem 1rem', borderRadius: '12px',
                    background: `${color}14`,
                    border: `1px solid ${color}33`,
                    minWidth: '60px',
                  }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color }}>{value}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{count} jeu{count > 1 ? 'x' : ''}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top 5 jeux */}
        {top5.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
              Meilleures notes
            </h2>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
              {top5.map((g, i) => (
                <li key={g.id}>
                  <Link
                    href={`/jeux/${g.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}
                    className="group"
                  >
                    <span style={{
                      width: '22px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800,
                      color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.25)',
                      flexShrink: 0,
                    }}>
                      #{i + 1}
                    </span>
                    {g.cover && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={g.cover} alt="" style={{ width: '32px', height: '24px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      className="group-hover:text-white transition-colors">
                      {g.title}
                    </span>
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 800, flexShrink: 0,
                      background: 'linear-gradient(135deg,#D06EFF,#7B6FFF)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                      {g.rating}/10
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {/* Records */}
      <section className="mb-4">
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
          Records &amp; anecdotes
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {([
            mostHours?.hours   ? { emoji: '⏱', label: 'Plus long',           value: `${mostHours.hours}h`,           sub: mostHours.title } : null,
            top5[0]?.rating    ? { emoji: '⭐', label: 'Meilleure note',       value: `${top5[0].rating}/10`,          sub: top5[0].title }   : null,
            lowestRated?.rating && ratedGames.length > 1 ? { emoji: '😬', label: 'Note la plus basse', value: `${lowestRated.rating}/10`, sub: lowestRated.title } : null,
            newestGame         ? { emoji: '🆕', label: 'Le plus récent',       value: String(newestGame.year),         sub: newestGame.title } : null,
            oldestGame && oldestGame.id !== newestGame?.id ? { emoji: '📼', label: 'Le plus vieux', value: String(oldestGame.year), sub: oldestGame.title } : null,
            platineCount > 0   ? { emoji: '♦',  label: 'Platines',            value: String(platineCount),            sub: 'trophées platine' } : null,
            n > 0              ? { emoji: '🏁', label: 'Taux de completion',   value: `${Math.round((completedPct / n) * 100)}%`, sub: `${completedPct} / ${n} terminés` } : null,
          ] as const).filter(Boolean).map((r) => (
            <div key={r!.label} style={{
              padding: '0.9rem 1rem', borderRadius: '12px',
              background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.12)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{r!.emoji}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{r!.label}</span>
              </div>
              <p style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{r!.value}</p>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r!.sub}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
