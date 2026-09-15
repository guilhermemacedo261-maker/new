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

/** Menu lateral esquerdo (mobile) - fica recolhido mostrando so os icones e desliza pra fora ao tocar no controle, revelando os rotulos. */
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

      <nav
        className={`md:hidden fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-buteco-charcoal border-r border-black/60 shadow-xl transition-[width] duration-200 ease-out overflow-hidden ${
          expanded ? 'w-48' : 'w-14'
        }`}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
          aria-expanded={expanded}
          className="flex items-center justify-center h-12 shrink-0 text-buteco-white/60 border-b border-black/40"
        >
          <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>›</span>
        </button>

        <div className="flex-1 overflow-y-auto py-2 pb-[env(safe-area-inset-bottom)]">
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
