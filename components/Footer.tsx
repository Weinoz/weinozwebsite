import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'var(--purple-ink)',
        padding: '2.5rem 0',
      }}
    >
      <div
        className="max-w-7xl mx-auto px-5 sm:px-8"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.2)',
        }}
      >
        <span style={{ fontWeight: 900, letterSpacing: '0.2em', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
          WEINOZ
        </span>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/" className="hover:text-white/50 transition-colors">Accueil</Link>
          <Link href="/videos" className="hover:text-white/50 transition-colors">Vidéos</Link>
          <Link href="/jeux" className="hover:text-white/50 transition-colors">Jeux</Link>
        </div>
        <span>© {new Date().getFullYear()} weinoz.com</span>
      </div>
    </footer>
  );
}
