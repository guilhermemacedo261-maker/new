import { EvolutionWhatsappProvider } from './evolution-provider';
import type { WhatsappProvider, WhatsappImageMessage, WhatsappSendResult } from './types';

export type { WhatsappProvider, WhatsappImageMessage, WhatsappSendResult };

let _provider: WhatsappProvider | null = null;

/**
 * Ponto unico de acesso ao WhatsApp. Para trocar de provedor no futuro,
 * troque apenas a implementacao retornada aqui - nenhum outro arquivo do
 * sistema conhece detalhes da Evolution API.
 */
export function getWhatsappProvider(): WhatsappProvider {
  if (_provider) return _provider;

  const url = process.env.WHATSAPP_API_URL;
  const key = process.env.WHATSAPP_API_KEY;
  const instance = process.env.WHATSAPP_INSTANCE;

  if (!url || !key || !instance) {
    throw new Error(
      'WhatsApp nao configurado. Defina WHATSAPP_API_URL, WHATSAPP_API_KEY e WHATSAPP_INSTANCE no .env.local'
    );
  }

  _provider = new EvolutionWhatsappProvider(url, key, instance);
  return _provider;
}

export function getWhatsappDestination(): string {
  const group = process.env.WHATSAPP_GROUP_ID;
  const direct = process.env.WHATSAPP_DESTINATION;
  const destination = group || direct;
  if (!destination) {
    throw new Error('Defina WHATSAPP_GROUP_ID ou WHATSAPP_DESTINATION no .env.local');
  }
  return destination;
}
