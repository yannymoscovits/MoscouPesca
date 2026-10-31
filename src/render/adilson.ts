// O Adilson visto de costas (spec, "Visual da pescaria"): gordinho, cabelo branco aparecendo dos lados,
// chapéu de pescador, camisa clara e colete de pesca. Forma provisória em pixels até o sprite do
// PixelLab chegar (src/assets/adilson/<pose>.png, desenhado na mesma caixa).

import type { Point } from '../content/types';

export type Pose = 'parado' | 'arremessando' | 'recolhendo' | 'posando';

/** Caixa do Adilson na cena: em pé no lugar de pesca, um pouco à esquerda da ponta da vara (90, 370). */
export const ADILSON_BOX = { x: 72, y: 371, w: 24, h: 29 };

export const ADILSON_PALETTE: Record<string, string> = {
  k: '#1a1410', // contorno
  H: '#cdb57c', // chapéu
  S: '#a38b54', // aba do chapéu, na sombra
  B: '#6b5a32', // fita do chapéu
  w: '#f4f4f0', // cabelo branco
  g: '#c9ccd1', // sombra do cabelo
  c: '#d99a6c', // pele
  L: '#e6eef4', // camisa clara
  l: '#b8c6d2', // dobra da camisa
  V: '#7b7a46', // colete
  P: '#5e5c34', // bolsos do colete
  D: '#3a2c1c', // cinto
  T: '#3d4d6a', // calça
};

// 24 × 29, de costas. A mão direita (a da vara) é desenhada à parte, conforme a pose.
const BODY = [
  '........kkkkkkkk........',
  '.......kHHHHHHHHk.......',
  '.......kHHHHHHHHk.......',
  '.......kBBBBBBBBk.......',
  '.....kkHHHHHHHHHHkk.....',
  '...kkHHHHHHHHHHHHHHkk...',
  '..kSSSSSSSSSSSSSSSSSSk..',
  '...kkwwkkkkkkkkkkwwkk...',
  '....kwwwwwwwwwwwwwwk....',
  '.....kwgwwwwwwwwgwk.....',
  '......kkcccccccckk......',
  '....kkkLLccccccLLkkk....',
  '..kkLLLVVVVVVVVVVLLLkk..',
  '.kLLLLVVVVVVVVVVVVLLLLk.',
  '.kLLLLVVVVVVVVVVVVLLLLk.',
  'kLLLLVVPPPVVVVPPPVVLLLLk',
  'kLLLLVVPPPVVVVPPPVVLLLLk',
  'kLlLLVVVVVVVVVVVVVVLLlLk',
  'kLlLVVVVVVVVVVVVVVVVLlLk',
  'kllkVVVVVVVVVVVVVVVVkllk',
  '.kcckVVVVVVVVVVVVVVk....',
  '.kcckVVVVVVVVVVVVVVk....',
  '..kkkVVVVVVVVVVVVVVkk...',
  '....kVVVVVVVVVVVVVVk....',
  '....kDDDDDDDDDDDDDDk....',
  '....kTTTTTTTTTTTTTTk....',
  '....kTTTTTTkkTTTTTTk....',
  '....kTTTTTTkkTTTTTTk....',
  '....kTTTTTTkkTTTTTTk....',
];

/** Mão da vara, em px da caixa: ao lado do corpo; no arremesso, levantada; na briga, puxando. */
const HAND: Record<Pose, Point> = {
  parado: { x: 21, y: 20 },
  posando: { x: 21, y: 20 },
  arremessando: { x: 21, y: 13 },
  recolhendo: { x: 20, y: 18 },
};

/** Na briga ele se inclina para trás: a caixa desce 1 px. */
const LEAN: Record<Pose, number> = { parado: 0, posando: 0, arremessando: 0, recolhendo: 1 };

/** Mão da vara (centro da mão) numa caixa qualquer, em `scale`× o tamanho do sprite. */
export function rodHandIn(box: Point, pose: Pose, scale = 1): Point {
  return { x: box.x + (HAND[pose].x + 1) * scale, y: box.y + (LEAN[pose] + HAND[pose].y + 1) * scale };
}

/** Mão da vara na cena do pesqueiro (centro da mão), de onde a vara sai. */
export function rodHand(pose: Pose): Point {
  return rodHandIn(ADILSON_BOX, pose);
}

/** Desenha a forma provisória com o canto de cima à esquerda em (x, y) da vista, em `scale`× o tamanho. */
export function drawAdilson(c: CanvasRenderingContext2D, x: number, y: number, pose: Pose, scale = 1) {
  const top = y + LEAN[pose] * scale;
  for (let r = 0; r < BODY.length; r++) {
    const row = BODY[r];
    for (let col = 0; col < row.length; ) {
      let end = col + 1;
      while (row[end] === row[col]) end++;
      if (row[col] !== '.') {
        c.fillStyle = ADILSON_PALETTE[row[col]];
        c.fillRect(x + col * scale, top + r * scale, (end - col) * scale, scale);
      }
      col = end;
    }
  }
  const hand = HAND[pose];
  c.fillStyle = ADILSON_PALETTE.k;
  c.fillRect(x + (hand.x - 1) * scale, top + (hand.y - 1) * scale, 4 * scale, 4 * scale);
  c.fillStyle = ADILSON_PALETTE.c;
  c.fillRect(x + hand.x * scale, top + hand.y * scale, 2 * scale, 2 * scale);
}
