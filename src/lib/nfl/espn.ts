// Integracao com o endpoint publico de scoreboard da ESPN.
// Nao requer API key e e amplamente usado pela comunidade para dados
// de calendario/resultados da NFL. Se precisar trocar para Sportradar
// ou outra API paga no futuro, so este arquivo (e o types.ts) muda -
// o resto do sistema depende apenas do formato NflGame abaixo.

import type { NflGame, NflWeekInfo } from './types';

const BASE_URL = process.env.NFL_API_URL || 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  score?: string;
  team: {
    displayName: string;
    abbreviation: string;
    logo?: string;
  };
}

interface EspnEvent {
  id: string;
  date: string;
  status: {
    type: {
      state: 'pre' | 'in' | 'post';
      completed: boolean;
    };
  };
  competitions: Array<{
    venue?: { fullName?: string };
    competitors: EspnCompetitor[];
  }>;
}

interface EspnScoreboardResponse {
  season: { year: number; type: number };
  week: { number: number };
  events: EspnEvent[];
}

function mapStatus(state: string, completed: boolean): NflGame['status'] {
  if (completed) return 'final';
  if (state === 'in') return 'in_progress';
  return 'scheduled';
}

function toNflGame(event: EspnEvent): NflGame {
  const competition = event.competitions[0];
  const home = competition.competitors.find((c) => c.homeAway === 'home');
  const away = competition.competitors.find((c) => c.homeAway === 'away');

  if (!home || !away) {
    throw new Error(`Evento ${event.id} sem competidores home/away validos`);
  }

  const kickoff = new Date(event.date);
  const status = mapStatus(event.status.type.state, event.status.type.completed);

  return {
    externalId: event.id,
    homeTeam: home.team.displayName,
    homeTeamAbbreviation: home.team.abbreviation,
    homeTeamLogo: home.team.logo ?? null,
    awayTeam: away.team.displayName,
    awayTeamAbbreviation: away.team.abbreviation,
    awayTeamLogo: away.team.logo ?? null,
    gameDate: kickoff.toISOString().slice(0, 10),
    gameTime: kickoff.toISOString(),
    venue: competition.venue?.fullName ?? null,
    status,
    homeScore: home.score !== undefined ? Number(home.score) : null,
    awayScore: away.score !== undefined ? Number(away.score) : null,
  };
}

/**
 * Busca os jogos de uma semana especifica da temporada regular.
 * Se `week` for omitido, a ESPN retorna a semana atual/proxima.
 */
export async function fetchNflWeek(params: { season?: number; week?: number } = {}): Promise<{
  info: NflWeekInfo;
  games: NflGame[];
}> {
  const query = new URLSearchParams();
  if (params.season) query.set('dates', String(params.season));
  if (params.week) query.set('week', String(params.week));
  query.set('seasontype', '2'); // 2 = temporada regular

  const url = `${BASE_URL}/scoreboard${query.toString() ? `?${query.toString()}` : ''}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Falha ao consultar API da NFL (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as EspnScoreboardResponse;

  return {
    info: { season: data.season.year, weekNumber: data.week.number },
    games: data.events.map(toNflGame),
  };
}
