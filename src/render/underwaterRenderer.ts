// Vista debaixo d'água, de lado (design.md da pesca-bass, "underwaterRenderer"): céu, superfície,
// água e fundo na paleta do local, plantas, os peixes do arremesso, a isca e a linha até a vara, o
// "!" do ataque, o balão "não gostou" e, na briga, o peixe fisgado se debatendo com a linha esticada.
// Lê o estado da pesca e desenha; não decide nada. A câmera segue a isca na horizontal e mostra
// sempre da superfície ao fundo, acima do quarto de baixo da tela (lá ficam os botões).
// Peixes sem arte: silhueta na cor de cada espécie (colorOf), até os sprites chegarem.

import type { LocationId, Point } from '../content/types';
import type { FishAgent } from '../domain/lure';
import type { PescaState } from '../domain/pesca';
import { computeLayout, colorOf, PALETTE, SCENE_H, SCENE_W, type Layout } from './fishingRenderer';
import { drawBottomFeature, sceneryOf, type StandKind } from './scenery';
import { createSprite, loadImage, resolveAsset, type ImageLoader, type SheetSpec, type Sprite } from './sprites';

/** Escala horizontal da vista de lado, em px lógicos por metro. */
export const UNDERWATER_PX_PER_M = 16;
/** A isca fica nesta fração da largura, a partir da esquerda (o Adilson fica à esquerda). */
export const LURE_AT = 0.4;
/** Quanto da margem, à esquerda do Adilson, aparece quando a isca chega perto dele. */
export const BANK_M = 1.5;
/** A vista vai até o começo do quarto de baixo da tela; a superfície fica abaixo do céu. */
export const WATER_BOTTOM_SHARE = 0.75;
// SPEC_DEVIATION: o T10 punha a superfície em 15% da área acima dos botões.
// Reason: na tela ligada (T15), o painel de cima cobria a superfície e a isca que sobe até ela.
const SKY_SHARE = 0.3; // do topo da vista até a superfície, em fração da área acima dos botões
const FLOOR_GAP_SHARE = 0.05; // do fundo até o quarto de baixo
/** Até esta profundidade a escala é linear; abaixo dela, o resto do ponto cabe em DEEP_SHARE da água. */
export const LINEAR_DEPTH_M = 10;
const DEEP_SHARE = 0.2;
/** Ponta da vara acima da superfície, em px lógicos. */
const ROD_ABOVE_PX = 18;
const FISH = { w: 18, h: 8 };

export const UNDERWATER_COLORS = {
  sky: '#bfe3f5',
  water: '#1f5d86',
  surface: '#e6f6ff',
  lure: '#e04a3a',
  plant: '#3f8f4a',
  plantDark: '#2a6234',
  balloon: '#fafafa',
};

/** Cor do fundo de cada lugar de pesca (um por local). */
const FLOOR: Record<StandKind, string> = {
  pier: '#7a6a4a', // represa: lama clara
  barranco: '#4f3d24', // rio: lama escura
  ponte: '#7d7f78', // estuário: areia cinza
  pedras: '#cdbb8a', // mar da ilha: areia
  barragem: '#6e6658', // açude: barro
  barco: '#1d2433', // alto-mar: escuro
};

/** Como a vista debaixo d'água mostra os metros. */
export interface Camera {
  leftM: number; // metros (distância até o Adilson) na borda esquerda
  pxPerM: number; // escala horizontal
  surfaceY: number; // y da superfície
  waterH: number; // px da superfície ao fundo
  bottomM: number; // profundidade do ponto
}

export interface UnderwaterView {
  place?: LocationId; // Location.id: escolhe a paleta (scenery.ts)
  pesca: Extract<PescaState, { phase: 'Lure' | 'Strike' | 'Fight' }>;
}

export interface UnderwaterRenderer {
  mount(canvas: HTMLCanvasElement, size: { width: number; height: number }): void;
  resize(size: { width: number; height: number }): void;
  draw(view: UnderwaterView, t: number): void;
  destroy(): void;
}

/** Câmera que segue a isca: ela fica em LURE_AT da largura, sem passar da margem do Adilson. */
export function camera(lureXM: number, bottomM: number, layout: Layout): Camera {
  const above = layout.viewH * WATER_BOTTOM_SHARE;
  const surfaceY = above * SKY_SHARE;
  return {
    leftM: Math.max(lureXM - (layout.viewW * LURE_AT) / UNDERWATER_PX_PER_M, -BANK_M),
    pxPerM: UNDERWATER_PX_PER_M,
    surfaceY,
    waterH: above * (1 - FLOOR_GAP_SHARE) - surfaceY,
    bottomM,
  };
}

/** Parte da altura da água até `depthM`: linear até LINEAR_DEPTH_M; abaixo, comprimida. */
function depthShare(depthM: number, bottomM: number): number {
  if (bottomM <= LINEAR_DEPTH_M) return depthM / bottomM;
  const top = 1 - DEEP_SHARE;
  if (depthM <= LINEAR_DEPTH_M) return (depthM / LINEAR_DEPTH_M) * top;
  return top + ((depthM - LINEAR_DEPTH_M) / (bottomM - LINEAR_DEPTH_M)) * DEEP_SHARE;
}

function depthOf(share: number, bottomM: number): number {
  if (bottomM <= LINEAR_DEPTH_M) return share * bottomM;
  const top = 1 - DEEP_SHARE;
  if (share <= top) return (share / top) * LINEAR_DEPTH_M;
  return LINEAR_DEPTH_M + ((share - top) / DEEP_SHARE) * (bottomM - LINEAR_DEPTH_M);
}

/** Metros (distância até o Adilson, profundidade) → px lógicos da vista. */
export function toScene(cam: Camera, xM: number, depthM: number): Point {
  return { x: (xM - cam.leftM) * cam.pxPerM, y: cam.surfaceY + cam.waterH * depthShare(depthM, cam.bottomM) };
}

/** px lógicos da vista → metros; o inverso de toScene. */
export function fromScene(cam: Camera, p: Point): { xM: number; depthM: number } {
  return { xM: p.x / cam.pxPerM + cam.leftM, depthM: depthOf((p.y - cam.surfaceY) / cam.waterH, cam.bottomM) };
}

/** Número entre 0 e 1 com cara de sorteio, sempre o mesmo para o mesmo `i`. */
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

export function createUnderwaterRenderer(
  opts: { load?: ImageLoader; resolve?: (path: string) => string | null } = {},
): UnderwaterRenderer {
  const load = opts.load ?? loadImage;
  const resolve = opts.resolve ?? resolveAsset;
  const sprites = new Map<string, Sprite>();
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let layout = computeLayout(SCENE_W * 2, SCENE_H * 2);

  const sprite = (path: string, spec: SheetSpec) => {
    let s = sprites.get(path);
    if (!s) sprites.set(path, (s = createSprite(resolve(path), spec, load)));
    return s;
  };

  function resize(size: { width: number; height: number }) {
    layout = computeLayout(size.width, size.height);
    if (!canvas) return;
    canvas.width = layout.viewW;
    canvas.height = layout.viewH;
    canvas.style.width = `${layout.viewW * layout.scale}px`;
    canvas.style.height = `${layout.viewH * layout.scale}px`;
    canvas.style.imageRendering = 'pixelated';
    if (ctx) ctx.imageSmoothingEnabled = false; // redimensionar o canvas zera o contexto
  }

  function drawScene(c: CanvasRenderingContext2D, view: UnderwaterView, t: number) {
    const { viewW, viewH } = layout;
    const s = view.pesca;
    const { water } = s;
    const scenery = sceneryOf(view.place);
    const cam = camera(water.lure.xM, water.bottomM, layout);
    const at = (xM: number, depthM: number) => toScene(cam, xM, depthM);
    const floorY = cam.surfaceY + cam.waterH;
    const px = (color: string, x: number, y: number, w = 1, h = 1) => {
      c.fillStyle = color;
      c.fillRect(Math.round(x), Math.round(y), w, h);
    };

    // Céu do local em duas faixas, água com o véu do local, fundo e a margem do Adilson.
    c.clearRect(0, 0, viewW, viewH);
    px(scenery.sky.top, 0, 0, viewW, Math.ceil(cam.surfaceY));
    px(scenery.sky.horizon, 0, Math.floor(cam.surfaceY * 0.55), viewW, Math.ceil(cam.surfaceY * 0.45) + 1);
    px(UNDERWATER_COLORS.water, 0, cam.surfaceY, viewW, Math.ceil(floorY - cam.surfaceY));
    c.fillStyle = scenery.tint;
    c.fillRect(0, cam.surfaceY, viewW, floorY - cam.surfaceY);
    px(FLOOR[scenery.stand], 0, floorY, viewW, viewH - floorY);
    const bankX = at(0, 0).x;
    if (bankX > 0) px(FLOOR[scenery.stand], 0, cam.surfaceY - 4, bankX, floorY - cam.surfaceY + 4);

    // Brilhos na água e a superfície ondulando, presos aos metros (andam com a câmera).
    for (let i = 0; i < 24; i++) {
      const x = (((hash(i) * viewW - cam.leftM * cam.pxPerM + t * 3) % viewW) + viewW) % viewW;
      px(scenery.water.wave, x, cam.surfaceY + 4 + hash(i + 40) * (floorY - cam.surfaceY - 8), 3, 1);
    }
    for (let x = Math.max(0, Math.ceil(bankX)); x < viewW; x += 2) {
      px(UNDERWATER_COLORS.surface, x, cam.surfaceY + Math.round(Math.sin(x / 6 + t * 2)), 2, 1);
    }

    // O chão do local (plantas, troncos, entulho, corais ou pedras), um detalhe a cada metro e pouco.
    const first = Math.floor(cam.leftM);
    for (let m = Math.max(first, 0); m < first + viewW / cam.pxPerM + 1; m++) {
      drawBottomFeature(c, view.place, m, at(m + hash(m + 901), 0).x, floorY, t);
    }

    // Peixes; na briga, o fisgado se debate na isca (BRIGA-13).
    const hookedId = s.phase === 'Fight' ? s.fishId : null;
    for (const f of water.fish) if (f.id !== hookedId) fish(f, at(f.xM, f.depthM));
    if (s.phase === 'Strike') {
      const f = water.fish.find((g) => g.id === s.fishId);
      if (f) {
        const p = at(f.xM, f.depthM);
        alert({ x: p.x, y: p.y - 16 }); // ISCA-08
      }
    }

    // Isca e linha até a vara: solta enquanto a isca anda, esticada na briga.
    const tip = { x: bankX + 4, y: cam.surfaceY - ROD_ABOVE_PX };
    if (bankX > -8) rod(tip);
    const lure = at(water.lure.xM, water.lure.depthM);
    if (s.phase === 'Fight') {
      const f = water.fish.find((g) => g.id === s.fishId);
      const thrash = { x: lure.x + Math.sin(t * 18) * 3, y: lure.y + Math.sin(t * 11) * 2 + (0.5 - s.bar.fishY) * 8 };
      line(tip, thrash, 0);
      if (f) fish({ ...f, dir: Math.sin(t * 9) > 0 ? 1 : -1 }, thrash);
      bubbles(thrash);
    } else {
      line(tip, lure, 10 + Math.sin(t * 1.5) * 2);
      px(PALETTE.outline, lure.x - 3, lure.y - 2, 6, 4);
      px(UNDERWATER_COLORS.lure, lure.x - 2, lure.y - 1, 4, 2);
    }

    /** Peixe virado para onde nada: sprite da espécie ou a silhueta na cor dela. */
    function fish(f: FishAgent, p: Point) {
      const { species } = f;
      const x = Math.round(p.x - FISH.w / 2);
      const y = Math.round(p.y - FISH.h / 2);
      const flip = f.dir < 0;
      c.save();
      if (flip) {
        c.translate(x * 2 + FISH.w, 0); // espelha na caixa do peixe
        c.scale(-1, 1);
      }
      sprite(species.sprite, {
        frames: 4,
        fps: 8,
        color: colorOf(species.id),
        fallback: (cc, bx, by) => silhouette(cc, bx, by, colorOf(species.id), t),
      }).draw(c, x, y, FISH.w, FISH.h, t);
      c.restore();
      if (f.mode === 'recusou') balloon({ x: p.x, y: p.y - 12 }, 'não gostou'); // ISCA-06
    }

    function rod(end: Point) {
      const hand = { x: end.x - 12, y: end.y + 14 };
      for (let k = 0; k <= 18; k++) {
        px(PALETTE.rodDark, hand.x + ((end.x - hand.x) * k) / 18 + 1, hand.y + ((end.y - hand.y) * k) / 18);
        px(PALETTE.rod, hand.x + ((end.x - hand.x) * k) / 18, hand.y + ((end.y - hand.y) * k) / 18);
      }
    }

    /** Linha da vara até a isca; `sag` px de barriga no meio (0 = esticada). */
    function line(from: Point, to: Point, sag: number) {
      c.strokeStyle = PALETTE.line;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(from.x, from.y);
      if (sag > 0) c.quadraticCurveTo((from.x + to.x) / 2, Math.max(from.y, to.y) + sag, to.x, to.y);
      else c.lineTo(to.x, to.y);
      c.stroke();
    }

    function bubbles(p: Point) {
      for (let i = 0; i < 4; i++) {
        const k = (t * 1.2 + i / 4) % 1;
        px(UNDERWATER_COLORS.surface, p.x + Math.sin(i * 2 + t * 4) * 4, p.y - 6 - k * 18, 1, 1);
      }
    }

    /** O "!" grande do ataque, num balão. */
    function alert(p: Point) {
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      px(PALETTE.outline, x - 7, y - 9, 15, 17);
      px(PALETTE.alert, x - 6, y - 8, 13, 15);
      px(PALETTE.outline, x - 1, y + 8, 3, 2); // biquinho do balão
      c.fillStyle = PALETTE.outline;
      c.font = 'bold 14px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('!', x + 0.5, y);
    }

    /** Balãozinho com texto sobre o peixe. */
    function balloon(p: Point, text: string) {
      c.font = 'bold 7px monospace';
      const w = Math.ceil(text.length * 4.4) + 4;
      const x = Math.round(p.x - w / 2);
      const y = Math.round(p.y - 6);
      px(PALETTE.outline, x - 1, y - 1, w + 2, 10);
      px(UNDERWATER_COLORS.balloon, x, y, w, 8);
      c.fillStyle = PALETTE.outline;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, p.x, y + 4);
    }
  }

  return {
    mount(el, size) {
      canvas = el;
      ctx = el.getContext('2d');
      resize(size);
    },

    resize,

    draw(view, t) {
      if (ctx) drawScene(ctx, view, t);
    },

    destroy() {
      canvas = null;
      ctx = null;
    },
  };
}

/** Silhueta provisória de peixe virado para a direita, na caixa FISH: corpo, rabo e olho. */
function silhouette(c: CanvasRenderingContext2D, x: number, y: number, color: string, t: number) {
  const wag = Math.sin(t * 10) > 0 ? 1 : 0;
  c.fillStyle = PALETTE.outline;
  c.fillRect(x + 3, y + 1, 14, 6);
  c.fillRect(x, y + wag, 4, 3); // rabo
  c.fillRect(x, y + 5 - wag, 4, 3);
  c.fillStyle = color;
  c.fillRect(x + 4, y + 2, 12, 4);
  c.fillRect(x + 1, y + 1 + wag, 2, 2);
  c.fillRect(x + 1, y + 5 - wag, 2, 2);
  c.fillStyle = PALETTE.outline;
  c.fillRect(x + 13, y + 3, 1, 1); // olho
}
