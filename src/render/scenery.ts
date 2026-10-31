// Cenário de cada local (spec, "Layout da tela de pesca" e "Visual da pescaria"): cada um dos 6
// locais tem o próprio céu, um marco no horizonte, a cor da água, detalhes de margem e o fundo
// debaixo d'água, tudo desenhado em código, em pixels, no estilo do jogo. O castRenderer pinta o
// pano de fundo (drawBackdrop) e os detalhes da margem (drawMarginDetails); o underwaterRenderer
// pinta o chão (drawBottomFeature). A chave é o id do local (Location.id); local desconhecido usa
// o cenário padrão.

import type { LocationId } from '../content/types';

/** De onde o Adilson pesca. */
export type StandKind = 'pier' | 'barranco' | 'ponte' | 'pedras' | 'barragem' | 'barco';

/** O que jaz no chão debaixo d'água. */
export type BottomKind = 'plantas' | 'troncos' | 'entulho' | 'corais' | 'pedras' | 'corais-fundos';

export interface Scenery {
  /** Véu translúcido por cima do pano de fundo: a cor da água do local. */
  tint: string;
  /** Textura animada da água: brilhos (`light`) e ondinhas (`wave`). */
  water: { light: string; wave: string };
  stand: StandKind;
  /** Céu do local, do alto até o horizonte. */
  sky: { top: string; horizon: string };
  /** Cor base da água na vista de cima: longe (perto do horizonte) e perto da beira. */
  surface: { far: string; near: string };
  bottom: BottomKind;
}

const SCENERY: Record<LocationId, Scenery> = {
  // Represa ao entardecer: céu quente no horizonte, morros escuros, píer de madeira com lampiões.
  'poco-do-magro': {
    tint: 'rgba(70, 170, 235, 0.18)',
    water: { light: '#bfe9ff', wave: '#7cc4ff' },
    stand: 'pier',
    sky: { top: '#13335f', horizon: '#e8824a' },
    surface: { far: '#2e6da8', near: '#174a80' },
    bottom: 'plantas',
  },
  // Rio de mata fechada: paredão de copas verdes, água verde-oliva escura, troncos afundados.
  'rio-jacuipe': {
    tint: 'rgba(120, 112, 30, 0.34)',
    water: { light: '#e3e6a8', wave: '#a3ad5e' },
    stand: 'barranco',
    sky: { top: '#9fc27c', horizon: '#dde8a9' },
    surface: { far: '#5d6b2e', near: '#434f1e' },
    bottom: 'troncos',
  },
  // Estuário sob a ponte: céu cinza-esverdeado, pilares de concreto e a sombra do vão por cima.
  'ponte-da-cetrel': {
    tint: 'rgba(10, 170, 140, 0.34)',
    water: { light: '#b8f2e2', wave: '#5fcfb4' },
    stand: 'ponte',
    sky: { top: '#7fa6a3', horizon: '#c3ddd2' },
    surface: { far: '#1c7a68', near: '#115546' },
    bottom: 'entulho',
  },
  // Mar da ilha: céu claro, ilha ao longe, mar turquesa e pedras grandes na beira.
  'vera-cruz': {
    tint: 'rgba(40, 220, 200, 0.28)',
    water: { light: '#dafff8', wave: '#7fe8dc' },
    stand: 'pedras',
    sky: { top: '#5fc6ef', horizon: '#cdeffa' },
    surface: { far: '#19a89b', near: '#0d7f78' },
    bottom: 'corais',
  },
  // Açude no pé das eólicas: céu pálido, torres com as pás girando e o paredão cinza-azulado.
  'parque-dos-ventos': {
    tint: 'rgba(150, 165, 190, 0.30)',
    water: { light: '#eef3fb', wave: '#a9bcd6' },
    stand: 'barragem',
    sky: { top: '#8ba3c4', horizon: '#dbe5f1' },
    surface: { far: '#54739c', near: '#3a5478' },
    bottom: 'pedras',
  },
  // Mar aberto: céu fundo com nuvens baixas, navio ao longe, água azul-marinho quase preta.
  'alto-mar-da-bahia': {
    tint: 'rgba(0, 8, 60, 0.38)',
    water: { light: '#a9c8ff', wave: '#4f7fd6' },
    stand: 'barco',
    sky: { top: '#0d2552', horizon: '#4f74a8' },
    surface: { far: '#12356b', near: '#081d44' },
    bottom: 'corais-fundos',
  },
};

/** Local sem cenário cadastrado: represa clara e o píer. */
export const DEFAULT_SCENERY: Scenery = {
  tint: 'rgba(0, 0, 0, 0)',
  water: { light: '#cfe8f5', wave: '#7cb6dd' },
  stand: 'pier',
  sky: { top: '#1b3d6c', horizon: '#9fc3e0' },
  surface: { far: '#2a5d92', near: '#1b4878' },
  bottom: 'plantas',
};

export function sceneryOf(place: LocationId | undefined): Scenery {
  return (place && SCENERY[place]) || DEFAULT_SCENERY;
}

// ---------- Desenho do pano de fundo (vista de cima) ----------

type Ctx = CanvasRenderingContext2D;

/** Área do pano de fundo, em px lógicos: o horizonte e a beira (onde o lugar de pesca começa). */
export interface BackdropArea {
  w: number;
  h: number;
  horizon: number;
  ground: number;
}

/** Número entre 0 e 1 com cara de sorteio, sempre o mesmo para o mesmo `i`. */
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

function rect(c: Ctx, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Mistura duas cores hex na proporção `k` (0 = a, 1 = b). */
export function mix(a: string, b: string, k: number): string {
  const ca = a.match(/[\da-f]{2}/gi)!.map((v) => parseInt(v, 16));
  const cb = b.match(/[\da-f]{2}/gi)!.map((v) => parseInt(v, 16));
  const to = (i: number) =>
    Math.round(ca[i] + (cb[i] - ca[i]) * k)
      .toString(16)
      .padStart(2, '0');
  return `#${to(0)}${to(1)}${to(2)}`;
}

/**
 * Céu em faixas até o horizonte, o marco do local no horizonte e a água em faixas até a beira.
 * O véu (tint) e a textura da água vêm por cima, no castRenderer.
 */
export function drawBackdrop(c: Ctx, place: LocationId | undefined, a: BackdropArea, t: number) {
  const s = sceneryOf(place);
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    rect(c, mix(s.sky.top, s.sky.horizon, i / (bands - 1)), 0, (a.horizon * i) / bands, a.w, Math.ceil(a.horizon / bands) + 1);
  }
  for (let i = 0; i < bands; i++) {
    const y = a.horizon + ((a.ground - a.horizon) * i) / bands;
    rect(c, mix(s.surface.far, s.surface.near, i / (bands - 1)), 0, y, a.w, Math.ceil((a.ground - a.horizon) / bands) + 1);
  }
  LANDMARK[place && SCENERY[place] ? place : 'poco-do-magro'](c, a, t, s);
}

/** O marco do horizonte de cada local, desenhado em volta de `a.horizon`. */
const LANDMARK: Record<LocationId, (c: Ctx, a: BackdropArea, t: number, s: Scenery) => void> = {
  // Morros escuros contra o entardecer, com o claro do sol se pondo e o reflexo na água.
  'poco-do-magro'(c, a) {
    const h0 = a.horizon;
    rect(c, '#f8c568', a.w * 0.58 - 7, h0 - 9, 14, 9); // o sol baixando atrás do morro
    rect(c, '#fde6a2', a.w * 0.58 - 4, h0 - 9, 8, 5);
    for (let x = 0; x < a.w; x += 3) {
      const tall = 7 + 5 * Math.sin(x / 17 + 1) + 3 * Math.sin(x / 7);
      rect(c, '#122743', x, h0 - tall, 3, tall);
    }
    rect(c, '#0e3c66', 0, h0, a.w, 2); // a linha d'água
    c.globalAlpha = 0.4;
    for (let i = 0; i < 9; i++) rect(c, '#f0a95e', a.w * 0.58 - 10 + hash(i) * 20, h0 + 2 + i * 2.5, 5 + hash(i + 9) * 9, 1);
    c.globalAlpha = 1;
  },

  // Paredão de copas: duas camadas de mata, troncos aparecendo e a linha d'água escura.
  'rio-jacuipe'(c, a) {
    const h0 = a.horizon;
    for (let x = 0; x < a.w; x += 4) {
      rect(c, '#44691f', x, h0 - 16 - 6 * Math.sin(x / 9) - 3 * Math.sin(x / 3.4), 4, 24);
    }
    for (let x = 2; x < a.w; x += 4) {
      rect(c, '#2d4b12', x, h0 - 9 - 5 * Math.sin(x / 6 + 2), 4, 14);
    }
    for (let x = 6; x < a.w; x += 22) {
      rect(c, '#3c2a12', x + Math.floor(hash(x) * 8), h0 - 4, 2, 5); // troncos na beira da mata
    }
    rect(c, '#24330e', 0, h0, a.w, 2);
  },

  // A ponte por cima: o vão atravessando o alto, dois pilares descendo na água e a sombra do vão.
  'ponte-da-cetrel'(c, a) {
    const h0 = a.horizon;
    rect(c, '#55606a', 0, h0 - 1, a.w, 2); // a outra margem, bem fina
    const deck = Math.max(4, h0 - 26);
    rect(c, '#6d757d', 0, deck - 8, a.w, 8); // o vão da ponte, de lado a lado
    rect(c, '#9aa4ad', 0, deck - 8, a.w, 2);
    rect(c, '#454d55', 0, deck - 1, a.w, 1);
    for (let x = 8; x < a.w; x += 10) rect(c, '#545c64', x, deck - 10, 2, 2); // o guarda-corpo
    for (const px of [a.w * 0.26, a.w * 0.74]) {
      rect(c, '#454d55', px - 5, deck, 10, h0 - deck + 6); // pilares de concreto na água
      rect(c, '#767f88', px - 3, deck, 3, h0 - deck + 6);
      rect(c, '#2e343a', px - 5, h0 + 4, 10, 2); // a linha molhada do pilar
    }
    c.globalAlpha = 0.18;
    rect(c, '#02131c', 0, h0 + 6, a.w, Math.max(6, (a.ground - h0) * 0.3)); // a sombra do vão na água
    c.globalAlpha = 1;
  },

  // Ilha ao longe com coqueiros, nuvens compridas e pedras grandes saindo do mar perto da beira.
  'vera-cruz'(c, a, t) {
    const h0 = a.horizon;
    c.globalAlpha = 0.8;
    for (const [cx, cy, cw] of [
      [a.w * 0.16, h0 - 26, 20],
      [a.w * 0.62, h0 - 34, 26],
      [a.w * 0.87, h0 - 22, 16],
    ]) {
      rect(c, '#f4fbff', cx, cy, cw, 3);
      rect(c, '#f4fbff', cx + 3, cy - 2, cw - 8, 2);
    }
    c.globalAlpha = 1;
    const ix = a.w * 0.68;
    for (let x = -16; x <= 16; x += 2) {
      const tall = Math.max(0, 8 - (x * x) / 24);
      rect(c, '#2c6b46', ix + x, h0 - tall, 2, tall); // o morro da ilha
    }
    rect(c, '#1d4f33', ix - 1, h0 - 12, 1, 5); // o coqueiro
    rect(c, '#2c6b46', ix - 4, h0 - 14, 7, 2);
    rect(c, '#0d6b64', 0, h0, a.w, 2);
    // Pedras grandes na água, perto da beira, com a espuma piscando.
    for (const [px, pw] of [
      [a.w * 0.12, 16],
      [a.w * 0.82, 20],
    ]) {
      const py = a.ground - 16;
      rect(c, '#3e4a50', px, py - 8, pw, 10);
      rect(c, '#5d6d74', px + 2, py - 8, pw - 6, 3);
      if (Math.sin(t * 2 + px) > -0.3) rect(c, '#e7fffb', px - 2, py + 2, pw + 4, 1); // espuma
    }
  },

  // O paredão da barragem e três eólicas com as pás girando devagar (por `t`).
  'parque-dos-ventos'(c, a, t) {
    const h0 = a.horizon;
    rect(c, '#77808f', 0, h0 - 7, a.w, 7); // o paredão cinza-azulado
    rect(c, '#9aa5b5', 0, h0 - 7, a.w, 2);
    for (let x = 6; x < a.w; x += 14) rect(c, '#5d6673', x, h0 - 5, 1, 5); // as juntas do concreto
    rect(c, '#4a5260', 0, h0, a.w, 2);
    for (const [k, bx] of ([[0, a.w * 0.2], [1, a.w * 0.5], [2, a.w * 0.8]] as const)) {
      const by = h0 - 7;
      const tall = 16 + k * 3;
      rect(c, '#e8edf4', bx, by - tall, 2, tall); // a torre
      rect(c, '#c2cbd8', bx + 1, by - tall, 1, tall);
      const hub = { x: bx + 1, y: by - tall };
      const spin = t * 0.9 + k * 2.1; // devagar, cada uma num ponto do giro
      for (let blade = 0; blade < 3; blade++) {
        const ang = spin + (blade * Math.PI * 2) / 3;
        for (let r = 1; r <= 9; r++) {
          rect(c, '#f4f7fb', hub.x + Math.cos(ang) * r, hub.y + Math.sin(ang) * r, 1, 1);
        }
      }
      rect(c, '#aeb9c6', hub.x - 1, hub.y - 1, 3, 3); // o cubo
    }
  },

  // Mar aberto: nuvens baixas, um navio cargueiro ao longe e gaivotas.
  'alto-mar-da-bahia'(c, a, t) {
    const h0 = a.horizon;
    c.globalAlpha = 0.5;
    for (const [cx, cy, cw] of [
      [a.w * 0.1, h0 - 30, 30],
      [a.w * 0.55, h0 - 20, 38],
      [a.w * 0.85, h0 - 36, 22],
    ]) {
      rect(c, '#8aa5c8', cx, cy, cw, 3);
      rect(c, '#8aa5c8', cx + 4, cy - 2, cw - 10, 2);
    }
    c.globalAlpha = 1;
    const nx = a.w * 0.24;
    rect(c, '#1a2430', nx, h0 - 5, 26, 5); // o casco
    rect(c, '#2d3a48', nx + 4, h0 - 8, 7, 3); // o castelo
    rect(c, '#2d3a48', nx + 17, h0 - 9, 3, 4); // a chaminé
    rect(c, '#0a1626', 0, h0, a.w, 2);
    for (const [gx, gy, k] of [
      [a.w * 0.7, h0 - 24, 0],
      [a.w * 0.76, h0 - 28, 1],
    ]) {
      const flap = Math.sin(t * 6 + k * 2) > 0 ? 1 : 0; // gaivotas batendo asa
      rect(c, '#dde8f4', gx - 3, gy + flap, 3, 1);
      rect(c, '#dde8f4', gx + 1, gy + flap, 3, 1);
      rect(c, '#dde8f4', gx, gy - 1 + flap, 1, 1);
    }
  },
};

// ---------- Detalhes da margem (desenhados por cima do lugar de pesca) ----------

/** Área da margem: a beira (`ground`) e o pé da vista. */
export interface MarginArea {
  w: number;
  h: number;
  ground: number;
}

/**
 * Detalhes de cada local na margem, por cima do lugar de pesca: lampiões no píer, troncos boiando,
 * nada na ponte (os pilares são do horizonte), espuma nas pedras, enrocamento na barragem e o
 * corrimão do barco.
 */
export function drawMarginDetails(c: Ctx, place: LocationId | undefined, a: MarginArea, t: number) {
  const kind = sceneryOf(place).stand;
  if (kind === 'pier') {
    // Lampiões quentes pendurados nos postes dos cantos (mockup do pesqueiro), com o brilho pulsando.
    for (const px of [5, a.w - 7]) {
      const ly = a.ground - 30;
      c.globalAlpha = 0.25 + 0.08 * Math.sin(t * 3 + px);
      rect(c, '#ffca55', px - 5, ly - 4, 12, 12); // o clarão
      c.globalAlpha = 1;
      rect(c, '#2e1c0c', px, ly - 6, 2, 3); // o gancho
      rect(c, '#1f1206', px - 1, ly - 3, 4, 5); // a caixinha do lampião
      rect(c, '#ffd35e', px, ly - 2, 2, 3); // a luz
    }
  }
  if (kind === 'barranco') {
    // Troncos boiando perto da margem, subindo e descendo de leve.
    for (const [bx, bw, k] of [
      [a.w * 0.16, 22, 0],
      [a.w * 0.7, 17, 1],
    ] as const) {
      const by = a.ground - 10 + Math.round(Math.sin(t * 1.2 + k * 3) * 1);
      rect(c, '#241505', bx, by, bw, 4);
      rect(c, '#4a2f10', bx, by, bw, 2);
      rect(c, '#6b4a26', bx + bw - 2, by, 2, 4); // o anel do corte
      rect(c, '#241505', bx + bw - 1, by + 1, 1, 2);
    }
  }
  if (kind === 'pedras') {
    // A espuma da onda lambendo a beira.
    c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2.4);
    rect(c, '#eafffb', 0, a.ground - 3, a.w, 2);
    c.globalAlpha = 1;
  }
  if (kind === 'barragem') {
    // Enrocamento: pedras soltas no pé do paredão.
    for (let x = 0; x < a.w; x += 9) {
      if (hash(x + 31) > 0.45) rect(c, '#525a66', x, a.ground - 4 - Math.floor(hash(x) * 3), 5, 4);
      if (hash(x + 77) > 0.7) rect(c, '#6d7784', x + 2, a.ground - 5, 3, 2);
    }
  }
  if (kind === 'barco') {
    // O corrimão do convés na frente do jogador.
    rect(c, '#caa35e', 0, a.ground - 13, a.w, 2);
    rect(c, '#8a6a33', 0, a.ground - 11, a.w, 1);
    for (let x = 4; x < a.w; x += 16) rect(c, '#8a6a33', x, a.ground - 11, 2, 11);
  }
}

// ---------- Fundo debaixo d'água ----------

/**
 * Um detalhe do chão no metro `m` (inteiro): plantas, troncos, entulho, corais ou pedras, com a
 * base em (x, floorY). O sorteio por `m` é estável: o chão não muda com a câmera.
 */
export function drawBottomFeature(c: Ctx, place: LocationId | undefined, m: number, x: number, floorY: number, t: number) {
  const kind = sceneryOf(place).bottom;
  const roll = hash(m + 900);
  const px = (color: string, dx: number, dy: number, w = 1, h = 1) => rect(c, color, x + dx, floorY + dy, w, h);

  /** Alga balançando, igual à de antes. */
  const plant = (tall: number, light = '#3f8f4a', dark = '#2a6234') => {
    for (let k = 0; k < tall; k++) {
      const sway = Math.sin(t * 1.5 + m + k / 4) * (k / tall) * 2;
      px(k % 3 ? light : dark, sway, -k, 2, 1);
    }
  };

  if (kind === 'plantas') {
    if (roll > 0.55) return;
    plant(6 + hash(m + 902) * 14);
    if (hash(m + 903) > 0.7) px('#8a816d', 4, -2, 4, 2); // uma pedrinha ao lado
    return;
  }

  if (kind === 'troncos') {
    if (roll > 0.72) {
      // Um tronco afundado, deitado no chão, com um galho para cima.
      px('#241505', -2, -4, 16, 4);
      px('#4a2f10', -2, -4, 16, 2);
      px('#241505', 8, -8, 2, 4);
      return;
    }
    if (roll > 0.3) plant(8 + hash(m + 902) * 12, '#5d7a2e', '#3c5316');
    return;
  }

  if (kind === 'entulho') {
    if (roll > 0.75) {
      // Um bloco de concreto tombado, com ferragem aparecendo.
      px('#6d757d', -2, -6, 10, 6);
      px('#9aa4ad', -2, -6, 10, 2);
      px('#54301c', 5, -9, 1, 3);
      return;
    }
    if (roll > 0.42) plant(5 + hash(m + 902) * 8, '#3f8f6a', '#2a6248');
    return;
  }

  if (kind === 'corais' || kind === 'corais-fundos') {
    const deep = kind === 'corais-fundos';
    if (roll > 0.8) {
      plant(6 + hash(m + 902) * 10, deep ? '#3d6e5a' : '#49b08a', deep ? '#28493c' : '#2f7a5e');
      return;
    }
    if (roll > 0.55) {
      // Coral de galhos.
      const body = deep ? '#a8485e' : '#f06a7e';
      px(body, 0, -7, 2, 7);
      px(body, -3, -5, 2, 4);
      px(body, 3, -6, 2, 5);
      px(deep ? '#c76f80' : '#ffa3b0', 0, -8, 2, 1);
      return;
    }
    if (roll > 0.3) {
      // Coral redondo (cérebro) com um vizinho pequeno.
      const body = deep ? '#8a6a2e' : '#e8a84c';
      px(body, -3, -5, 9, 5);
      px(deep ? '#a8874a' : '#ffd08a', -2, -5, 7, 2);
      px(deep ? '#5e4a7a' : '#9a6ad4', 6, -3, 4, 3);
      return;
    }
    return;
  }

  // pedras (o açude): montinhos de pedra cinza.
  if (roll > 0.62) {
    px('#525a66', -3, -5, 9, 5);
    px('#6d7784', -2, -5, 5, 2);
    px('#454c57', 5, -3, 4, 3);
    return;
  }
  if (roll > 0.4) plant(4 + hash(m + 902) * 7, '#5a7a4e', '#3c5334');
}
