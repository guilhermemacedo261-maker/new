import type { WhatsappImageMessage, WhatsappProvider, WhatsappSendResult } from './types';

/**
 * Provedor para a Evolution API (https://github.com/EvolutionAPI/evolution-api).
 * Escolhida por ser self-hosted, gratuita e simples de rodar via Docker -
 * atende ao pedido de "solucao inicialmente gratuita ou de baixo custo".
 *
 * IMPORTANTE (secao 16 do briefing): a API oficial do WhatsApp Business
 * (Meta Cloud API) tem restricoes para enviar mensagens nao-solicitadas e
 * NAO permite postar diretamente em grupos por API oficial. A Evolution
 * API contorna isso operando via WhatsApp Web multi-device, o que permite
 * enviar para o JID de um grupo normalmente (ex: "120363012345678901@g.us").
 * Antes de ir para producao, confirme com o numero/instancia que sera
 * usado que ele participa do grupo do NFL DE BUTECO.
 *
 * Endpoint de referencia: POST {WHATSAPP_API_URL}/message/sendMedia/{instance}
 */
export class EvolutionWhatsappProvider implements WhatsappProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly instance: string
  ) {}

  async sendImage(message: WhatsappImageMessage): Promise<WhatsappSendResult> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/message/sendMedia/${this.instance}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: message.to,
          mediatype: 'image',
          mimetype: message.imageMimeType,
          media: message.imageBuffer.toString('base64'),
          caption: message.caption,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${JSON.stringify(body)}` };
      }

      return { success: true, providerMessageId: body?.key?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
