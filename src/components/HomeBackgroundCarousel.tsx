'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import type { Game } from '@/types/database';

const SLIDE_DURATION_MS = 2000;

type Slide =
  | { type: 'photo'; url: string }
  | {
      type: 'game';
      awayLogo: string | null;
      homeLogo: string | null;
      awayAbbr: string;
      homeAbbr: string;
    };

/**
 * Plano de fundo da tela inicial: foto do grupo por 2s, depois os
 * confrontos da semana, 2s cada, em loop, com fade entre eles. Fica
 * atras do conteudo normal da home (z-index negativo) com um degrade
 * escuro por cima pra nao atrapalhar a leitura.
 */
export default function HomeBackgroundCarousel({ groupPhotoUrl, games }: { groupPhotoUrl: string | null; games: Game[] }) {
  const slides: Slide[] = [
    ...(groupPhotoUrl ? [{ type: 'photo' as const, url: groupPhotoUrl }] : []),
    ...games.map((g) => ({
      type: 'game' as const,
      awayLogo: g.away_team_logo,
      homeLogo: g.home_team_logo,
      awayAbbr: g.away_team_abbreviation,
      homeAbbr: g.home_team_abbreviation,
    })),
  ];

  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_DURATION_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  if (!mounted || slides.length === 0) return null;

  // Renderizado direto em <body> (portal) - se ficasse dentro de <main>,
  // o "fixed" cuida da posicao mas o z-index continua sendo comparado
  // dentro do contexto de empilhamento do <main>, podendo terminar por
  // cima do cabecalho/conteudo mesmo com z-index baixo. Como filho direto
  // do body, a comparacao com o wrapper z-10 do layout fica inequivoca.
  return createPortal(
    <div className="fixed inset-0 z-0 overflow-hidden bg-buteco-black" aria-hidden="true">
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          {slide.type === 'photo' ? (
            <Image src={slide.url} alt="" fill className="object-cover" priority={i === 0} />
          ) : (
            <div className="w-full h-full flex items-center justify-center gap-10">
              {slide.awayLogo && (
                <Image src={slide.awayLogo} alt={slide.awayAbbr} width={180} height={180} className="object-contain" />
              )}
              <span className="font-display text-6xl text-buteco-white/50">@</span>
              {slide.homeLogo && (
                <Image src={slide.homeLogo} alt={slide.homeAbbr} width={180} height={180} className="object-contain" />
              )}
            </div>
          )}
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-buteco-black/70 via-buteco-black/85 to-buteco-black" />
    </div>,
    document.body
  );
}
