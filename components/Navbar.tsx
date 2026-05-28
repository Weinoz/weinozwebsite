'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { YoutubeIcon, TwitchIcon, TikTokIcon, InstagramIcon, XIcon, DiscordIcon } from './SocialIcons';
import LiveBadge from './LiveBadge';

const navLinks = [
  { href: '/',           label: 'Accueil'    },
  { href: '/videos',     label: 'Vidéos'     },
  { href: '/jeux',       label: 'Jeux'       },
  { href: '/stats',      label: 'Stats'      },
  { href: '/tier-list',  label: 'Tier List'  },
  { href: '/a-propos',   label: 'À propos'   },
];

const socialLinks = [
  { href: 'https://www.youtube.com/@weinoz',       icon: YoutubeIcon,   label: 'YouTube'   },
  { href: 'https://www.twitch.tv/weinoz',          icon: TwitchIcon,    label: 'Twitch'    },
  { href: 'https://www.tiktok.com/@weinoz',        icon: TikTokIcon,    label: 'TikTok'    },
  { href: 'https://www.instagram.com/weinoz_/',    icon: InstagramIcon, label: 'Instagram' },
  { href: 'https://x.com/weinoz_',                icon: XIcon,         label: 'X'         },
  { href: 'https://discord.gg/uBG6UDX56a',        icon: DiscordIcon,   label: 'Discord'   },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(10, 0, 20, 0.7)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(160, 32, 240, 0.12)',
      }}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0 font-black text-sm tracking-[0.3em] text-white/90 hover:text-white transition-colors">
          WEINOZ
        </Link>

        {/* Nav links + live badge — desktop */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href ? 'text-white' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <LiveBadge />
        </div>

        {/* Social icons — desktop */}
        <div className="hidden md:flex items-center gap-1.5">
          {socialLinks.map(({ href, icon: Icon, label }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/80 transition-colors">
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white/50 hover:text-white transition-colors" aria-label="Menu">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t px-5 py-5 flex flex-col gap-1"
          style={{ borderColor: 'rgba(160,32,240,0.12)', background: 'rgba(10,0,20,0.95)' }}>
          <div className="mb-2"><LiveBadge /></div>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
              className={`py-2.5 text-sm font-medium transition-colors ${
                pathname === link.href ? 'text-white' : 'text-white/40 hover:text-white/80'
              }`}>
              {link.label}
            </Link>
          ))}
          <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {socialLinks.map(({ href, icon: Icon, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
