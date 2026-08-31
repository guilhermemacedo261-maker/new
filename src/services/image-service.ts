import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { generatePicksTableImage, type PicksTableRecord, type PicksTableRow } from '@/lib/image-generator/picksTable';
import type { Game, Participant, Pick, Week, WeeklyResult } from '@/types/database';

/**
 * Monta a tabela de palpites de uma semana e gera o PNG (secao 12).
 * Antes do encerramento/resultados, todas as celulas mostram apenas o
 * palpite (sem verde/vermelho) - so ha cor quando o jogo correspondente
 * ja tem is_correct calculado (secao 13).
 */
export async function buildWeekPicksImage(weekId: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();

  const { data: week, error: weekError } = await supabase.from('weeks').select('*').eq('id', weekId).single();
  if (weekError) throw weekError;

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .eq('week_id', weekId)
    .order('game_time', { ascending: true });
  if (gamesError) throw gamesError;

  const { data: participants, error: pError } = await supabase
    .from('participants')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true });
  if (pError) throw pError;

  const { data: picks, error: picksError } = await supabase.from('picks').select('*').eq('week_id', weekId);
  if (picksError) throw picksError;

  const { data: weeklyResults } = await supabase.from('weekly_results').select('*').eq('week_id', weekId);

  const rows: PicksTableRow[] = (games as Game[]).map((game) => {
    const cellsByParticipantId: PicksTableRow['cellsByParticipantId'] = {};

    for (const participant of participants as Participant[]) {
      const pick = (picks as Pick[]).find((p) => p.game_id === game.id && p.participant_id === participant.id);
      if (!pick) {
        cellsByParticipantId[participant.id] = { selectedAbbreviation: null, selectedLogoUrl: null, isCorrect: null };
        continue;
      }
      const isHome = pick.selected_team === 'home';
      cellsByParticipantId[participant.id] = {
        selectedAbbreviation: isHome ? game.home_team_abbreviation : game.away_team_abbreviation,
        selectedLogoUrl: isHome ? game.home_team_logo : game.away_team_logo,
        isCorrect: pick.is_correct,
      };
    }

    return {
      awayAbbreviation: game.away_team_abbreviation,
      homeAbbreviation: game.home_team_abbreviation,
      cellsByParticipantId,
    };
  });

  const records: PicksTableRecord[] = (participants as Participant[]).map((participant) => {
    const result = (weeklyResults as WeeklyResult[] | null)?.find((r) => r.participant_id === participant.id);
    return {
      participantId: participant.id,
      correct: result?.correct_picks ?? 0,
      wrong: result?.wrong_picks ?? 0,
      hasResults: (result?.total_picks ?? 0) > 0,
    };
  });

  return generatePicksTableImage({
    weekLabel: `Semana ${(week as Week).week_number}`,
    participants: participants as Participant[],
    rows,
    records,
  });
}
