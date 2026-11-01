// Vista debaixo d'água, de lado (design.md da pesca-bass, "underwaterRenderer"): céu, superfície,
// água e fundo na paleta do local, plantas, os peixes do arremesso, a isca e a linha até a vara, o
// "!" do ataque, o balão "não gostou" e, na briga, o peixe fisgado se debatendo com a linha esticada.
// Lê o estado da pesca e desenha; não decide nada. A câmera segue a isca na horizontal e mostra
// sempre da superfície ao fundo, reservando embaixo apenas o espaço dos botões.
// Peixes sem arte: silhueta na cor de cada espécie (colorOf), até os sprites chegarem.

import { IGNORE_RETRY_S, METER_START, VIEW_DEEP_SHARE, VIEW_LINEAR_DEPTH_M } from '../domain/tuning';
import type { LocationId, Point } from '../content/types';
import type { FishAgent } from '../domain/lure';
import type { PescaState } from '../domain/pesca';
import { computeLayout, colorOf, fishBox, sizeScale, PALETTE, SCENE_H, SCENE_W, type Layout } from './fishingRenderer';
import { drawBottomFeature, sceneryOf, type StandKind } from './scenery';
import { createSprite, fishSheet, loadImage, resolveAsset, type ImageLoader, type SheetSpec, type Sprite } from './sprites';

/** Escala horizontal da vista de lado, em px lógicos por metro. */
export const UNDERWATER_PX_PER_M = 16;
/** A isca fica nesta fração da largura, a partir da esquerda (o Adilson fica à esquerda). */
export const LURE_AT = 0.4;
/** Quanto da margem, à esquerda do Adilson, aparece quando a isca chega perto dele. */
export const BANK_M = 1.5;
/** Superfície abaixo do painel, mantendo o enquadramento do alto da cena. */
export const SURFACE_SHARE = 0.285;
/** Reserva só a altura dos controles e uma folga, em vez de um quarto da tela inteiro. */
export const UNDERWATER_CONTROLS_CSS = 128;
/** Até esta profundidade a escala é linear; abaixo dela, o resto do ponto cabe em DEEP_SHARE da água. */
export const LINEAR_DEPTH_M = VIEW_LINEAR_DEPTH_M; // a mesma régua do PUXAR (domain/lure.ts)
const DEEP_SHARE = VIEW_DEEP_SHARE;
/** Ponta da vara acima da superfície, em px lógicos. */
const ROD_ABOVE_PX = 18;
/** A guinada quando o peixe vira de lado: o corpo encolhe e estica de novo neste tempo. */
export const TURN_S = 0.25;

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

/** Embaixo d'água o peixe aparece no dobro do tamanho da vista de cima: dá para ver a espécie e o porte. */
export const UNDERWATER_FISH_SCALE = 2;

/** BRIGA-22: aonde o peixe chega com o medidor cheio: perto da margem e da superfície. */
const REEL_NEAR_M = 1.5;
const REEL_UP_M = 0.4;

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
  const surfaceY = layout.viewH * SURFACE_SHARE;
  const floorY = Math.max(surfaceY + 24, layout.viewH - UNDERWATER_CONTROLS_CSS / layout.scale);
  return {
    leftM: Math.max(lureXM - (layout.viewW * LURE_AT) / UNDERWATER_PX_PER_M, -BANK_M),
    pxPerM: UNDERWATER_PX_PER_M,
    surfaceY,
    waterH: floorY - surfaceY,
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
  /** A última direção de cada peixe e quando ele virou: a guinada é só do desenho. */
  const turns = new Map<number, { dir: 1 | -1; atT: number }>();
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
    // BRIGA-22: na briga, o peixe vem para a margem conforme o medidor enche (e volta se ele esvazia):
    // do ponto da fisgada até 1,5 m do Adilson, subindo até perto da superfície.
    const reel = s.phase === 'Fight' ? Math.min(1, Math.max(0, (s.bar.meter - METER_START) / (1 - METER_START))) : 0;
    const lureAt = {
      xM: water.lure.xM + (Math.min(water.lure.xM, REEL_NEAR_M) - water.lure.xM) * reel,
      depthM: water.lure.depthM + (Math.min(water.lure.depthM, REEL_UP_M) - water.lure.depthM) * reel,
    };
    const cam = camera(lureAt.xM, water.bottomM, layout);
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

    // Peixes; na briga, o fisgado se debate na isca (BRIGA-13). Quem saiu da água sai da memória
    // das viradas (os ids recomeçam a cada arremesso).
    for (const id of turns.keys()) if (!water.fish.some((f) => f.id === id)) turns.delete(id);
    const hookedId = s.phase === 'Fight' ? s.fishId : null;
    for (const f of water.fish) if (f.id !== hookedId) fish(f, at(f.xM, f.depthM));
    if (s.phase === 'Strike') {
      const f = water.fish.find((g) => g.id === s.fishId);
      if (f) {
        const p = at(f.xM, f.depthM);
        alert({ x: p.x, y: p.y - fishBox(f.species).h / 2 - 12 }); // ISCA-08, acima até do peixão
      }
    }

    // Isca e linha até a vara: solta enquanto a isca anda, esticada na briga.
    const tip = { x: bankX + 4, y: cam.surfaceY - ROD_ABOVE_PX };
    if (bankX > -8) rod(tip);
    const lure = at(lureAt.xM, lureAt.depthM);
    if (s.phase === 'Fight') {
      const f = water.fish.find((g) => g.id === s.fishId);
      const thrash = { x: lure.x + Math.sin(t * 18) * 3, y: lure.y + Math.sin(t * 11) * 2 + (0.5 - s.bar.fishY) * 8 };
      line(tip, thrash, 0);
      if (f) fish({ ...f, dir: 1 }, thrash, true); // puxando para longe da margem; o debater é o chacoalhão
      bubbles(thrash);
    } else {
      line(tip, lure, 10 + Math.sin(t * 1.5) * 2);
      px(PALETTE.outline, lure.x - 3, lure.y - 2, 6, 4);
      px(UNDERWATER_COLORS.lure, lure.x - 2, lure.y - 1, 4, 2);
    }

    /**
     * Peixe vivo, no tamanho da espécie (fishBox): balança devagar para cima e para baixo (fase
     * própria por peixe), inclina o nariz para onde vai (atrás da isca quando segue) e, quando vira
     * de lado, dá uma guinada curta (o corpo encolhe e estica, com bolhinhas atrás do rabo).
     * O fisgado (`hooked`) se debate chacoalhando o corpo, virado para longe da margem.
     */
    function fish(f: FishAgent, p: Point, hooked = false) {
      const { species } = f;
      const base = fishBox(species);
      const k = UNDERWATER_FISH_SCALE * sizeScale(f.size); // BRIGA-19: o tamanho dele dentro da espécie
      const box = { w: base.w * k, h: base.h * k };
      const prev = turns.get(f.id);
      // Só conta como virada a troca de direção com o tempo andando para a frente; o primeiro
      // quadro de um peixe (ou o relógio voltando) não dá guinada.
      if (!prev || t < prev.atT) turns.set(f.id, { dir: f.dir, atT: -Infinity });
      else if (prev.dir !== f.dir) turns.set(f.id, { dir: f.dir, atT: t });
      const sinceTurn = t - turns.get(f.id)!.atT;
      const burst = hooked ? 1 : Math.min(1, Math.max(0.45, sinceTurn / TURN_S));
      const sway = hooked ? 0 : Math.sin(t * 2.2 + f.id * 1.7);
      // O fisgado se debate chacoalhando o corpo (sem espelhar a arte, que no peixe grande parecia piscar).
      let tilt = hooked ? Math.sin(t * 14) * 0.22 : sway * 0.06;
      if (!hooked && f.mode === 'seguindo') {
        const lp = at(water.lure.xM, water.lure.depthM);
        tilt = Math.max(-0.35, Math.min(0.35, Math.atan2(lp.y - p.y, Math.max(10, Math.abs(lp.x - p.x)))));
      }
      c.save();
      c.translate(Math.round(p.x), Math.round(p.y + sway * 1.5));
      if (f.dir < 0) c.scale(-1, 1); // espelha no próprio centro
      c.rotate(tilt);
      if (burst < 1) c.scale(burst, 1); // a guinada
      sprite(species.sprite, {
        ...fishSheet(species.sprite),
        color: colorOf(species.id),
        fallback: (cc, bx, by, bw, bh, tt) => silhouette(cc, bx, by, bw, bh, colorOf(species.id), tt),
      }).draw(c, -box.w / 2, -box.h / 2, box.w, box.h, t);
      c.restore();
      if (!hooked && sinceTurn >= 0 && sinceTurn < TURN_S) {
        for (let i = 0; i < 3; i++) {
          px(UNDERWATER_COLORS.surface, p.x - f.dir * (box.w / 2 + 2 + i * 3), p.y - 1 + ((f.id + i) % 3), 1, 1);
        }
      }
      // ISCA-06: o balão diz quem recusou: só recusa quem não come a isca do arremesso.
      if (f.mode === 'recusou') balloon({ x: p.x, y: p.y - box.h / 2 - 8 }, `${f.species.name}: não come essa isca`);
      // PONTO-07: ele viu a isca, chegou perto e não quis; sem a vara dele, diz isso.
      if (f.mode === 'ignorou' && (f.retryS ?? 0) > IGNORE_RETRY_S - 2.5) {
        balloon({ x: p.x, y: p.y - box.h / 2 - 8 }, f.ignored === 'vara' ? 'vara fraca pra mim' : 'só olhou...');
      }
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

/** Silhueta provisória de peixe virado para a direita, esticada para a caixa (w × h) da espécie. */
function silhouette(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, t: number) {
  const u = w / 18; // a forma base tem 18 × 8
  const v = h / 8;
  const wag = Math.sin(t * 10) > 0 ? 1 : 0;
  const r = (rx: number, ry: number, rw: number, rh: number) =>
    c.fillRect(Math.round(x + rx * u), Math.round(y + ry * v), Math.max(1, Math.round(rw * u)), Math.max(1, Math.round(rh * v)));
  c.fillStyle = PALETTE.outline;
  r(3, 1, 14, 6);
  r(0, wag, 4, 3); // rabo
  r(0, 5 - wag, 4, 3);
  c.fillStyle = color;
  r(4, 2, 12, 4);
  r(1, 1 + wag, 2, 2);
  r(1, 5 - wag, 2, 2);
  c.fillStyle = PALETTE.outline;
  r(13, 3, 1, 1); // olho
}
