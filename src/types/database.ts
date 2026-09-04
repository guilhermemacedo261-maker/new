export type WeekStatus = 'upcoming' | 'open' | 'closed' | 'finished';
export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed';
export type TeamSide = 'home' | 'away';
export type Winner = TeamSide | 'tie';
export type SeasonStatus = 'active' | 'finished';
export type AchievementType = 'weekly' | 'season' | 'career';

// Tipos declarados com `type` (nao `interface`) de proposito: interfaces
// nao satisfazem os `Record<string, unknown>` que o supabase-js espera
// internamente (GenericTable), o que faz `.insert()`/`.update()` inferir
// `never` silenciosamente. Ver src/types/supabase.ts.

export type Season = {
  id: string;
  year: number;
  name: string;
  status: SeasonStatus;
  champion_photo_url: string | null;
  lanterna_photo_url: string | null;
  group_photo_url: string | null;
  created_at: string;
};

export type Participant = {
  id: string;
  name: string;
  photo_url: string | null;
  active: boolean;
  display_order: number;
  auth_user_id: string | null;
  password_salt: string | null;
  password_hash: string | null;
  created_at: string;
};

// Formato exposto ao navegador - nunca inclui o hash/salt da senha
// (secao 18: um participante nao pode ver nem indiretamente material
// que ajude a adivinhar a senha de outro).
export type PublicParticipant = Omit<Participant, 'password_salt' | 'password_hash'> & {
  has_password: boolean;
};

export type Week = {
  id: string;
  season_id: string;
  week_number: number;
  status: WeekStatus;
  picks_open_at: string;
  picks_close_at: string;
  created_at: string;
};

export type Game = {
  id: string;
  week_id: string;
  external_id: string;
  away_team: string;
  away_team_abbreviation: string;
  away_team_logo: string | null;
  home_team: string;
  home_team_abbreviation: string;
  home_team_logo: string | null;
  game_date: string;
  game_time: string;
  venue: string | null;
  status: GameStatus;
  away_score: number | null;
  home_score: number | null;
  winner: Winner | null;
  results_processed: boolean;
  manually_corrected: boolean;
  created_at: string;
};

export type Pick = {
  id: string;
  week_id: string;
  game_id: string;
  participant_id: string;
  selected_team: TeamSide;
  is_correct: boolean | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyResult = {
  id: string;
  week_id: string;
  participant_id: string;
  correct_picks: number;
  wrong_picks: number;
  total_picks: number;
  accuracy_percentage: number;
  weekly_position: number | null;
  created_at: string;
};

export type SeasonResult = {
  id: string;
  season_id: string;
  participant_id: string;
  correct_picks: number;
  wrong_picks: number;
  total_picks: number;
  accuracy_percentage: number;
  weekly_wins: number;
  current_position: number | null;
  updated_at: string;
};

export type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  type: AchievementType;
  created_at: string;
};

export type ParticipantAchievement = {
  id: string;
  participant_id: string;
  achievement_id: string;
  week_id: string | null;
  season_id: string | null;
  earned_at: string;
};

export type GameWithPick = Game & {
  my_pick: TeamSide | null;
};
