import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getWhatsappDestination, getWhatsappProvider } from '@/lib/whatsapp';
import { buildWeekPicksImage } from './image-service';
import type { Week } from '@/types/database';

const CLOSING_PHRASES = [
  '🍺 Bora ver quem entende de NFL...',
  '🔥 Quem vai pipocar essa semana?',
  '🏈 Hora de mostrar quem entende de football.',
  '🔒 Acabou! Agora não adianta chorar.',
];

function randomPhrase(): string {
  return CLOSING_PHRASES[Math.floor(Math.random() * CLOSING_PHRASES.length)];
}

/** Gera a imagem da semana e envia para o WhatsApp (secao 15/17). Registra o resultado em whatsapp_sends. */
export async function sendWeekPicksToWhatsapp(week: Week): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  try {
    const image = await buildWeekPicksImage(week.id);
    const provider = getWhatsappProvider();
    const destination = getWhatsappDestination();

    const caption = [
      '🏈 NFL DE BUTECO',
      '',
      '🚨 PALPITES ENCERRADOS!',
      '',
      `Semana ${week.week_number}`,
      '',
      'Confira os palpites da galera 👇',
      '',
      randomPhrase(),
    ].join('\n');

    const result = await provider.sendImage({
      to: destination,
      caption,
      imageBuffer: image,
      imageMimeType: 'image/png',
    });

    await supabase.from('whatsapp_sends').insert({
      week_id: week.id,
      status: result.success ? 'success' : 'failed',
      error_message: result.success ? null : result.error,
    });

    return { success: result.success, error: result.error };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await supabase.from('whatsapp_sends').insert({ week_id: week.id, status: 'failed', error_message: error });
    return { success: false, error };
  }
}
