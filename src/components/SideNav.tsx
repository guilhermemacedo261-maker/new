'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', icon: '🏠', label: 'Início' },
  { href: '/picks', icon: '🏈', label: 'Palpites' },
  { href: '/ao-vivo', icon: '🔴', label: 'Ao Vivo' },
  { href: '/ranking', icon: '🏆', label: 'Ranking' },
  { href: '/historico', icon: '📊', label: 'Histórico' },
  { href: '/caixa', icon: '🐷', label: 'Caixa' },
  { href: '/hall-da-fama', icon: '👑', label: 'Hall' },
  { href: '/perfil', icon: '👤', label: 'Perfil' },
];

const PANEL_WIDTH = 'w-48';

/** Menu lateral esquerdo (mobile) - fica todo recolhido (so um botao na borda) e desliza pra fora ao tocar nele. */
export default function SideNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {expanded && (
        <button
          aria-label="Fechar menu"
          onClick={() => setExpanded(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/50"
        />
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Recolher menu' : 'Abrir menu'}
        aria-expanded={expanded}
        className={`md:hidden fixed top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-7 h-14 rounded-r-xl bg-buteco-charcoal border border-l-0 border-white/10 text-buteco-white/70 shadow-lg transition-[left] duration-200 ease-out ${
          expanded ? 'left-48' : 'left-0'
        }`}
      >
        <span className={`inline-block transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>›</span>
      </button>

      <nav
        className={`md:hidden fixed left-0 top-0 bottom-0 z-40 ${PANEL_WIDTH} flex flex-col bg-buteco-charcoal border-r border-black/60 shadow-xl transition-transform duration-200 ease-out ${
          expanded ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto py-4 pb-[env(safe-area-inset-bottom)]">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setExpanded(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                  active ? 'text-buteco-gold' : 'text-buteco-white/60'
                }`}
              >
                <span className="text-lg leading-none shrink-0">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
