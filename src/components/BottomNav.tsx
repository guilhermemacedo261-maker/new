'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', icon: '🏠', label: 'Início' },
  { href: '/picks', icon: '🏈', label: 'Palpites' },
  { href: '/ao-vivo', icon: '🔴', label: 'Ao Vivo' },
  { href: '/ranking', icon: '🏆', label: 'Ranking' },
  { href: '/historico', icon: '📊', label: 'Histórico' },
  { href: '/hall-da-fama', icon: '👑', label: 'Hall' },
  { href: '/perfil', icon: '👤', label: 'Perfil' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-buteco-charcoal border-t border-black/60 flex justify-between px-1 pb-[env(safe-area-inset-bottom)]">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
              active ? 'text-buteco-gold' : 'text-buteco-white/60'
            }`}
          >
            <span className="text-lg leading-none">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
