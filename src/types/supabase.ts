import type {
  Achievement,
  Game,
  Participant,
  ParticipantAchievement,
  Pick as PickRow,
  Season,
  SeasonResult,
  Week,
  WeeklyResult,
  WhatsappSend,
} from './database';

// Tipagem minima do schema para o client do supabase-js. Sem isso,
// createClient() sem generic (ou com um generic que nao bate exatamente
// com o formato GenericSchema/GenericTable esperado pelo postgrest-js)
// faz `.from(table)` inferir `never` para insert/update, escondendo
// erros de digitacao em nomes de coluna. Insert/Update ficam como
// Partial<Row> (permissivo o bastante para os upserts do projeto, mas
// ainda pega nomes de coluna errados).
type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      seasons: TableDef<Season>;
      participants: TableDef<Participant>;
      weeks: TableDef<Week>;
      games: TableDef<Game>;
      picks: TableDef<PickRow>;
      weekly_results: TableDef<WeeklyResult>;
      season_results: TableDef<SeasonResult>;
      achievements: TableDef<Achievement>;
      participant_achievements: TableDef<ParticipantAchievement>;
      whatsapp_sends: TableDef<WhatsappSend>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
