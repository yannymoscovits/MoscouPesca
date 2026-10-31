// O lugar de onde o Adilson pesca, na faixa de baixo da cena (spec, "Visual da pescaria"): píer,
// barranco, ponte, pedras, barragem ou barco. Desenhado em código, em pixels, até a arte do PixelLab
// chegar (src/assets/stands/<lugar>.png, por cima da cena). Cada lugar tem cantos que sobem acima dos
// botões do HUD (postes, juncos, postes de luz, pedras, pilares ou a borda do barco).

import type { StandKind } from './scenery';

/** Topo da faixa do lugar, em y da cena: a água vai até aqui. */
export const SHORE_TOP = 372;

/** Cores de cada lugar; `main` é a cor que só aquele lugar usa. */
export const STAND_PALETTE: Record<StandKind, { main: string; light: string; dark: string; accent: string }> = {
  pier: { main: '#a06c3a', light: '#bd8650', dark: '#3b2410', accent: '#55361a' },
  barranco: { main: '#6b4a2b', light: '#8a6238', dark: '#2e1f12', accent: '#4f8a2b' },
  ponte: { main: '#8c9196', light: '#b5babf', dark: '#3d4247', accent: '#5d6670' },
  pedras: { main: '#6f6a63', light: '#9d978d', dark: '#2f2c29', accent: '#4f6b3a' },
  barragem: { main: '#a39f94', light: '#c9c5b8', dark: '#4f4c45', accent: '#7d7a6e' },
  barco: { main: '#f4f0e6', light: '#c08a52', dark: '#3a2a1c', accent: '#c8403a' },
};

/** Vista em px lógicos: largura, altura e a origem da cena dentro dela. */
export interface StandArea {
  viewW: number;
  viewH: number;
  ox: number;
  oy: number;
}

/** Número entre 0 e 1 com cara de sorteio, sempre o mesmo para o mesmo `i`. */
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

type Ctx = CanvasRenderingContext2D;

function rect(c: Ctx, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}

export function drawStand(c: Ctx, kind: StandKind, area: StandArea) {
  const top = area.oy + SHORE_TOP;
  rect(c, 'rgba(0, 0, 0, 0.25)', 0, top - 2, area.viewW, 2); // sombra do lugar na água
  DRAW[kind](c, area, top, STAND_PALETTE[kind]);
}

type Palette = (typeof STAND_PALETTE)[StandKind];
const DRAW: Record<StandKind, (c: Ctx, a: StandArea, top: number, p: Palette) => void> = {
  // Tábuas de madeira na vertical, a viga da frente e dois postes nos cantos.
  pier(c, { viewW, viewH, ox }, top, p) {
    rect(c, p.main, 0, top, viewW, viewH - top);
    for (let x = (ox % 10) - 10; x < viewW; x += 10) {
      rect(c, p.light, x + 1, top, 2, viewH - top); // luz no lado esquerdo da tábua
      rect(c, p.accent, x, top, 1, viewH - top); // fresta entre as tábuas
      rect(c, p.accent, x + 5, top + 10 + (Math.abs(x) % 7), 1, 3); // veio da madeira
    }
    rect(c, '#7a4f28', 0, top, viewW, 4); // viga da frente
    rect(c, '#d6a464', 0, top, viewW, 1);
    rect(c, p.dark, 0, top + 4, viewW, 1);
    for (const px of [0, viewW - 12]) {
      rect(c, p.dark, px, top - 26, 12, 34);
      rect(c, '#7a4c26', px + 1, top - 24, 10, 31);
      rect(c, '#c79457', px + 1, top - 26, 10, 3);
      rect(c, p.light, px + 3, top - 22, 2, 26);
      rect(c, p.accent, px + 7, top - 18, 1, 4);
    }
  },

  // Barranco de terra com a beirada de capim, pedrinhas e juncos nos cantos.
  barranco(c, { viewW, viewH }, top, p) {
    rect(c, p.main, 0, top, viewW, viewH - top);
    rect(c, p.dark, 0, top, viewW, 2); // beirada molhada
    for (let x = 0; x < viewW; x += 3) {
      const h = 1 + Math.floor(hash(x) * 4);
      rect(c, p.accent, x, top - h + 2, 2, h); // tufos de capim
      if (hash(x + 50) > 0.6) rect(c, '#7bb53e', x, top - h + 2, 1, 1);
      if (hash(x + 90) > 0.8) rect(c, p.light, x, top + 6 + Math.floor(hash(x + 7) * 18), 2, 1); // pedrinha
      if (hash(x + 130) > 0.85) rect(c, p.dark, x + 1, top + 3, 1, 4 + Math.floor(hash(x + 3) * 5)); // raiz
    }
    for (const base of [2, viewW - 12]) {
      for (let i = 0; i < 4; i++) {
        const x = base + i * 3;
        const h = 22 + Math.floor(hash(base + i) * 10);
        rect(c, '#3f6e22', x, top - h, 1, h + 2); // junco
        rect(c, '#6b3f1e', x, top - h - 4, 2, 5); // a espiga
      }
    }
  },

  // Ponte de concreto com o guarda-corpo na frente e um poste de luz em cada canto.
  ponte(c, { viewW, viewH, ox }, top, p) {
    rect(c, p.main, 0, top, viewW, viewH - top);
    rect(c, p.light, 0, top, viewW, 3); // meio-fio
    rect(c, p.dark, 0, top + 3, viewW, 1);
    for (let x = (ox % 30) - 30; x < viewW; x += 30) rect(c, p.dark, x, top + 4, 1, viewH - top); // juntas
    rect(c, p.accent, 0, top - 12, viewW, 2); // corrimão
    rect(c, p.light, 0, top - 12, viewW, 1);
    for (let x = (ox % 8) - 8; x < viewW; x += 8) rect(c, p.accent, x, top - 10, 1, 10); // grades
    for (const px of [2, viewW - 8]) {
      rect(c, p.dark, px, top - 40, 6, 44);
      rect(c, p.accent, px + 1, top - 39, 4, 42);
      rect(c, '#ffe9a6', px - 1, top - 44, 8, 4); // luminária
    }
  },

  // Pedras grandes, molhadas embaixo, com musgo e pedras maiores nos cantos.
  pedras(c, { viewW, viewH }, top, p) {
    for (let x = 0; x < viewW; x += 2) {
      const bump = Math.round(3 * Math.sin(x / 9) + 2 * Math.sin(x / 3.7));
      const y = top - 2 + bump;
      rect(c, p.main, x, y, 2, viewH - y);
      rect(c, p.light, x, y, 2, 1);
      if (hash(x) > 0.5) rect(c, p.accent, x, y + 1, 2, 1); // musgo
      if (hash(x + 11) > 0.75) rect(c, p.dark, x, y + 4 + Math.floor(hash(x + 5) * 14), 1, 4); // rachadura
    }
    for (const [px, w] of [
      [0, 18],
      [viewW - 18, 18],
    ]) {
      rect(c, p.dark, px, top - 22, w, 30);
      rect(c, p.main, px + 1, top - 21, w - 2, 28);
      rect(c, p.light, px + 3, top - 21, w - 8, 2);
      rect(c, '#4a5559', px + 1, top + 2, w - 2, 5); // parte molhada
    }
  },

  // Paredão de concreto da barragem: blocos, a borda de cima e pilares nos cantos.
  barragem(c, { viewW, viewH, ox }, top, p) {
    rect(c, p.main, 0, top, viewW, viewH - top);
    rect(c, p.light, 0, top, viewW, 3); // borda de cima
    rect(c, p.dark, 0, top + 3, viewW, 1);
    for (let row = 0, y = top + 10; y < viewH; row++, y += 7) {
      rect(c, p.accent, 0, y, viewW, 1);
      for (let x = (ox % 16) - 16 + (row % 2) * 8; x < viewW; x += 16) rect(c, p.accent, x, y + 1, 1, 6);
    }
    for (let x = 0; x < viewW; x += 11) if (hash(x) > 0.6) rect(c, p.accent, x, top + 4, 1, 3 + Math.floor(hash(x + 1) * 6)); // manchas
    for (const px of [0, viewW - 14]) {
      rect(c, p.dark, px, top - 24, 14, 30);
      rect(c, p.light, px + 1, top - 23, 12, 27);
      rect(c, p.main, px + 1, top - 12, 12, 1);
    }
  },

  // Convés do barco: a borda branca em curva com a faixa vermelha, tábuas e um rolo de corda.
  barco(c, { viewW, viewH }, top, p) {
    const mid = viewW / 2;
    for (let x = 0; x < viewW; x += 2) {
      const k = (x - mid) / mid;
      const y = top - Math.round(5 * (1 - k * k)); // a proa sobe no meio
      rect(c, p.dark, x, y - 1, 2, 1);
      rect(c, p.main, x, y, 2, 3); // borda branca
      rect(c, p.accent, x, y + 3, 2, 2); // faixa vermelha
      rect(c, p.light, x, y + 5, 2, viewH - y - 5); // convés
    }
    for (let y = top + 10; y < viewH; y += 5) rect(c, '#8d5f36', 0, y, viewW, 1); // tábuas do convés
    for (const px of [4, viewW - 16]) {
      rect(c, p.dark, px, top + 9, 12, 8); // rolo de corda
      rect(c, '#d9c49a', px + 1, top + 10, 10, 6);
      rect(c, '#a8915f', px + 3, top + 12, 6, 2);
    }
    for (const px of [0, viewW - 6]) {
      rect(c, p.dark, px, top - 22, 6, 26); // mastro dos cantos
      rect(c, p.main, px + 1, top - 21, 4, 24);
    }
  },
};
