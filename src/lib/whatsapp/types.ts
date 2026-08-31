export interface WhatsappImageMessage {
  /** Numero ou ID de grupo de destino, no formato aceito pelo provedor. */
  to: string;
  caption: string;
  imageBuffer: Buffer;
  imageMimeType: string;
}

export interface WhatsappSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Contrato que qualquer provedor de WhatsApp precisa implementar.
 * Trocar de Evolution API para outro provedor = criar uma nova classe
 * que implemente esta interface e apontar para ela em index.ts.
 */
export interface WhatsappProvider {
  sendImage(message: WhatsappImageMessage): Promise<WhatsappSendResult>;
}
