import { createCanvas, loadImage, type Image } from '@napi-rs/canvas';
import type { Participant } from '@/types/database';

// ============================================================
// Gerador da imagem de palpites da semana, disponivel para o admin
// baixar em /admin/imagem e compartilhar onde quiser (WhatsApp, etc).
// Desenhado com @napi-rs/canvas (Rust/skia via N-API): roda em
// serverless sem precisar de um browser headless (Playwright/
// Puppeteer exigiriam um binario de Chromium pesado em produção),
// o que atende ao pedido de "solucao simples, robusta e barata".
//
// Cores configuraveis abaixo, conforme secao 13 do briefing.
// ============================================================

export const TABLE_COLORS = {
  background: '#0b0c0e',
  headerBackground: '#15171a',
  gridLine: '#000000',
  textPrimary: '#f5f5f0',
  textSecondary: '#9a9a94',
  correct: '#2fae4e',
  incorrect: '#e4392e',
  neutralCell: '#1c1f23',
  gold: '#d4af37',
};

export interface PickCell {
  /** null = participante nao palpitou esse jogo */
  selectedAbbreviation: string | null;
  selectedLogoUrl: string | null;
  /** null = resultado ainda desconhecido (nao mostrar verde/vermelho) */
  isCorrect: boolean | null;
}

export interface PicksTableRow {
  awayAbbreviation: string;
  homeAbbreviation: string;
  cellsByParticipantId: Record<string, PickCell>;
}

export interface PicksTableRecord {
  participantId: string;
  correct: number;
  wrong: number;
  /** false enquanto nenhum jogo da semana terminou ainda */
  hasResults: boolean;
}

export interface PicksTableInput {
  title?: string;
  weekLabel: string;
  participants: Participant[];
  rows: PicksTableRow[];
  records: PicksTableRecord[];
}

const CELL_W = 130;
const GAME_COL_W = 190;
const ROW_H = 64;
const HEADER_H = 150;
const TITLE_H = 90;
const PADDING = 24;
const LOGO_SIZE = 40;
const AVATAR_SIZE = 76;

async function safeLoadImage(url: string | null): Promise<Image | null> {
  if (!url) return null;
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

function drawInitialsAvatar(
  ctx: import('@napi-rs/canvas').SKRSContext2D,
  cx: number,
  cy: number,
  radius: number,
  name: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#2a2d32';
  ctx.fill();
  ctx.fillStyle = TABLE_COLORS.gold;
  ctx.font = `bold ${Math.floor(radius)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  ctx.fillText(initials, cx, cy + 2);
  ctx.restore();
}

function drawCircleClippedImage(
  ctx: import('@napi-rs/canvas').SKRSContext2D,
  img: Image,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

export async function generatePicksTableImage(input: PicksTableInput): Promise<Buffer> {
  const { participants, rows, records } = input;

  const width = PADDING * 2 + GAME_COL_W + participants.length * CELL_W;
  const height = TITLE_H + HEADER_H + rows.length * ROW_H + ROW_H + PADDING * 2;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // fundo
  ctx.fillStyle = TABLE_COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // titulo
  ctx.fillStyle = TABLE_COLORS.textPrimary;
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(`🏈 ${input.title ?? 'NFL DE BUTECO'}`, width / 2, 48);
  ctx.fillStyle = TABLE_COLORS.gold;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(input.weekLabel.toUpperCase(), width / 2, 80);

  const tableTop = TITLE_H;
  const tableLeft = PADDING;

  // cabecalho: fotos + nomes dos participantes
  ctx.fillStyle = TABLE_COLORS.headerBackground;
  ctx.fillRect(tableLeft, tableTop, width - PADDING * 2, HEADER_H);

  ctx.fillStyle = TABLE_COLORS.textSecondary;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('JOGO', tableLeft + 12, tableTop + HEADER_H / 2 + 6);

  const avatarImages = await Promise.all(participants.map((p) => safeLoadImage(p.photo_url)));

  participants.forEach((participant, i) => {
    const colX = tableLeft + GAME_COL_W + i * CELL_W;
    const cx = colX + CELL_W / 2;
    const cy = tableTop + 44;

    const img = avatarImages[i];
    if (img) {
      drawCircleClippedImage(ctx, img, cx, cy, AVATAR_SIZE / 2);
    } else {
      drawInitialsAvatar(ctx, cx, cy, AVATAR_SIZE / 2, participant.name);
    }

    ctx.fillStyle = TABLE_COLORS.textPrimary;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    const shortName = participant.name.length > 12 ? `${participant.name.slice(0, 11)}…` : participant.name;
    ctx.fillText(shortName, cx, tableTop + HEADER_H - 14);
  });

  // linhas de jogos
  const logoCache = new Map<string, Image | null>();
  async function getLogo(url: string | null): Promise<Image | null> {
    if (!url) return null;
    if (logoCache.has(url)) return logoCache.get(url) ?? null;
    const img = await safeLoadImage(url);
    logoCache.set(url, img);
    return img;
  }

  let y = tableTop + HEADER_H;
  for (const row of rows) {
    ctx.strokeStyle = TABLE_COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(tableLeft, y, width - PADDING * 2, ROW_H);

    ctx.fillStyle = TABLE_COLORS.textPrimary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${row.awayAbbreviation} x ${row.homeAbbreviation}`, tableLeft + 12, y + ROW_H / 2 + 5);

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const cell = row.cellsByParticipantId[participant.id];
      const colX = tableLeft + GAME_COL_W + i * CELL_W;

      let bg = TABLE_COLORS.neutralCell;
      if (cell?.isCorrect === true) bg = TABLE_COLORS.correct;
      if (cell?.isCorrect === false) bg = TABLE_COLORS.incorrect;

      ctx.fillStyle = bg;
      ctx.fillRect(colX, y, CELL_W, ROW_H);
      ctx.strokeStyle = TABLE_COLORS.gridLine;
      ctx.strokeRect(colX, y, CELL_W, ROW_H);

      const cx = colX + CELL_W / 2;
      const cy = y + ROW_H / 2;

      if (cell?.selectedAbbreviation) {
        // eslint-disable-next-line no-await-in-loop
        const logo = await getLogo(cell.selectedLogoUrl);
        if (logo) {
          ctx.drawImage(logo, cx - LOGO_SIZE / 2, cy - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
        } else {
          ctx.fillStyle = TABLE_COLORS.textPrimary;
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(cell.selectedAbbreviation, cx, cy + 5);
        }
      } else {
        ctx.fillStyle = TABLE_COLORS.textSecondary;
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('-', cx, cy + 6);
      }
    }

    y += ROW_H;
  }

  // linha RECORD
  ctx.fillStyle = TABLE_COLORS.headerBackground;
  ctx.fillRect(tableLeft, y, width - PADDING * 2, ROW_H);
  ctx.strokeStyle = TABLE_COLORS.gridLine;
  ctx.strokeRect(tableLeft, y, width - PADDING * 2, ROW_H);

  ctx.fillStyle = TABLE_COLORS.gold;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RECORD', tableLeft + 12, y + ROW_H / 2 + 5);

  participants.forEach((participant, i) => {
    const record = records.find((r) => r.participantId === participant.id);
    const colX = tableLeft + GAME_COL_W + i * CELL_W;
    const cx = colX + CELL_W / 2;

    ctx.strokeRect(colX, y, CELL_W, ROW_H);
    ctx.fillStyle = TABLE_COLORS.textPrimary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const label = record?.hasResults ? `${record.correct} - ${record.wrong}` : '-';
    ctx.fillText(label, cx, y + ROW_H / 2 + 5);
  });

  return canvas.encode('png');
}
