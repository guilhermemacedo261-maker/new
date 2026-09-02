import Link from 'next/link';

const LINKS = [
  { href: '/', label: '🏠 Início' },
  { href: '/picks', label: '🏈 Fazer Palpites' },
  { href: '/ao-vivo', label: '🔴 Ao Vivo' },
  { href: '/ranking', label: '🏆 Ranking' },
  { href: '/historico', label: '📊 Histórico' },
  { href: '/hall-da-fama', label: '👑 Hall da Fama' },
];

export default function Header() {
  return (
    <header className="hidden md:flex sticky top-0 z-40 items-center justify-between px-8 py-4 bg-buteco-charcoal border-b border-black/60">
      <Link href="/" className="font-display text-2xl tracking-wide">
        🏈 NFL DE BUTECO
      </Link>
      <nav className="flex gap-6 text-sm font-semibold text-buteco-white/80">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-buteco-gold transition-colors">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
