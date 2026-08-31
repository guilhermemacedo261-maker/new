// Todo o sistema de prazos usa America/Sao_Paulo, nunca o horario do
// servidor (Regra 4). Usamos Intl para converter "agora" (UTC real)
// para os componentes de data/hora em Brasilia, e Date.UTC com o
// offset correto para reconstruir instantes absolutos.

export const APP_TIMEZONE = 'America/Sao_Paulo';

/** Retorna o offset em minutos de America/Sao_Paulo em relacao a UTC, no instante `at`. */
function offsetMinutesAt(at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(at).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * Constroi um instante absoluto (UTC) a partir de uma data/hora "local"
 * em America/Sao_Paulo. Ex: brasiliaDate(2026, 9, 18, 16, 0) => quinta as 16h em Brasilia.
 */
export function brasiliaDate(
  year: number,
  month1to12: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  // aproxima com offset atual (-03:00 o ano todo, Brasil nao usa horario de verao desde 2019)
  const approx = new Date(Date.UTC(year, month1to12 - 1, day, hour, minute, second));
  const offset = offsetMinutesAt(approx);
  return new Date(approx.getTime() - offset * 60000);
}

/** Data/hora atual, com os campos already expressos em America/Sao_Paulo. */
export function nowInBrasilia(): {
  date: Date;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = domingo ... 4 = quinta
} {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  const parts = dtf.formatToParts(now).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    date: now,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday] ?? now.getUTCDay(),
  };
}

/** Dado um instante qualquer da semana, calcula a proxima quinta-feira 16:00 em Brasilia (fechamento de palpites). */
export function nextThursday16h(reference = new Date()): Date {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, weekday: 'short' });
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(reference);
  const map = parts.reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const currentWeekday = weekdayMap[map.weekday] ?? 0;
  let daysUntilThursday = (4 - currentWeekday + 7) % 7;

  let candidate = brasiliaDate(Number(map.year), Number(map.month), Number(map.day) + daysUntilThursday, 16, 0, 0);
  if (candidate.getTime() <= reference.getTime()) {
    candidate = brasiliaDate(Number(map.year), Number(map.month), Number(map.day) + daysUntilThursday + 7, 16, 0, 0);
  }
  return candidate;
}

export function formatDateBR(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, ...opts }).format(new Date(iso));
}

export function formatCountdown(msRemaining: number): { hours: string; minutes: string; seconds: string } {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}
