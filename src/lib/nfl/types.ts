export interface NflWeekInfo {
  season: number;
  weekNumber: number;
}

export interface NflGame {
  externalId: string;
  homeTeam: string;
  homeTeamAbbreviation: string;
  homeTeamLogo: string | null;
  awayTeam: string;
  awayTeamAbbreviation: string;
  awayTeamLogo: string | null;
  gameDate: string;
  gameTime: string;
  venue: string | null;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed';
  homeScore: number | null;
  awayScore: number | null;
}
