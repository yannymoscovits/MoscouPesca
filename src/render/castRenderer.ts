// Vista de cima do pesqueiro e do arremesso (design.md da pesca-bass, "castRenderer"): a água na
// paleta do local, os pontos do pesqueiro marcados, o lugar de onde o Adilson pesca, o Adilson de
// costas, a seta da mira, o voo da isca e o respingo. Lê a vista e desenha; não decide nada.
// Uma vara só: com o sprite do Adilson, a vara é a do sprite e a linha sai da ponta dela; sem o
// sprite, a forma provisória ganha uma vara em pixels até a mesma ponta (na fishingRenderer.ts
// a vara em pixels era desenhada por cima do sprite, que já tem a dele).

import type { LocationId, Point, Zone } from '../content/types';
import { CAST_FLIGHT_S, M_PER_PX } from '../domain/tuning';
import { ADILSON_BOX, drawAdilson, rodHand, type Pose } from './adilson';
import { computeLayout, PALETTE, SCENE_H, SCENE_W } from './fishingRenderer';
import { sceneryOf } from './scenery';
import { createSprite, loadImage, resolveAsset, type ImageLoader, type SheetSpec, type Sprite } from './sprites';
import { drawStand, SHORE_TOP } from './stands';

/** Ponta da vara do sprite do Adilson (pixel (0, 2) do quadro de 24 × 29): linha e seta saem daqui. */
export const CAST_ROD_TIP: Point = { x: ADILSON_BOX.x, y: ADILSON_BOX.y + 2 };
/** Escala da vista de cima: 10 px lógicos por metro, a mesma do alcance da v1. */
export const PX_PER_M = 1 / M_PER_PX;
/** Comprimento da seta da mira, em px lógicos. */
export const ARROW_PX = 40;
/** Respingo da isca ao cair na água, em segundos. */
export const SPLASH_S = 0.6;
/** Distância mínima das bordas da cena para a isca e o respingo continuarem à vista. */
const EDGE_PX = 6;
/** Faixa da água com textura (brilhos e ondinhas), em y da cena. */
const WATER_TEXTURE = { top: 40, bottom: SHORE_TOP - 6 };

export const CAST_COLORS = {
  arrow: PALETTE.alert, // seta balançando
  arrowLocked: '#ff8a3d', // seta travada, enchendo a força
  spot: 'rgba(255, 255, 255, 0.14)',
  spotEdge: 'rgba(255, 255, 255, 0.7)',
  spotSelected: 'rgba(255, 210, 63, 0.32)', // ponto tocado (PONTO-02)
  spotSelectedEdge: PALETTE.alert,
  spotLocked: 'rgba(8, 10, 24, 0.42)', // ponto com cadeado (PONTO-03)
  lure: '#e04a3a',
};

/** Ponto do pesqueiro marcado na água. */
export interface SpotMark {
  zone: Zone;
  locked: boolean;
  selected: boolean;
}

export interface CastView {
  background: string; // Location.background
  place?: LocationId; // Location.id: escolhe o cenário (scenery.ts)
  spots: SpotMark[]; // pesqueiro (PONTO-01); vazio na tela de arremesso
  aim: { angleDeg: number; locked: boolean } | null; // seta da mira (ARREM-01) e travada (ARREM-02)
  // Isca no ar; de CAST_FLIGHT_S em diante, na água com o respingo (ARREM-05).
  flight: { angleDeg: number; distanceM: number; sinceS: number } | null;
}

export interface CastRenderer {
  /** Liga ao canvas; `size` é a área CSS da cena. */
  mount(canvas: HTMLCanvasElement, size: { width: number; height: number }): void;
  resize(size: { width: number; height: number }): void;
  draw(view: CastView, t: number): void;
  destroy(): void;
}

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));

/** Número entre 0 e 1 com cara de sorteio, sempre o mesmo para o mesmo `i`. */
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** Onde a isca cai: `distanceM` à frente da ponta da vara, girada `angleDeg` (negativo = esquerda). */
export function landingPoint(angleDeg: number, distanceM: number): Point {
  const a = (angleDeg * Math.PI) / 180;
  const d = distanceM * PX_PER_M;
  return { x: CAST_ROD_TIP.x + Math.sin(a) * d, y: CAST_ROD_TIP.y - Math.cos(a) * d };
}

/** Centro do polígono do ponto: onde fica o botão dele no pesqueiro. */
export function spotAnchor(zone: Zone): Point {
  const n = zone.polygon.length;
  return {
    x: zone.polygon.reduce((s, p) => s + p.x, 0) / n,
    y: zone.polygon.reduce((s, p) => s + p.y, 0) / n,
  };
}

/** O ponto `p`, puxado pela reta desde a ponta da vara até ficar dentro da cena. */
function onScene(p: Point): Point {
  const dx = p.x - CAST_ROD_TIP.x;
  const dy = p.y - CAST_ROD_TIP.y;
  let k = 1;
  if (p.x < EDGE_PX) k = Math.min(k, (EDGE_PX - CAST_ROD_TIP.x) / dx);
  if (p.x > SCENE_W - EDGE_PX) k = Math.min(k, (SCENE_W - EDGE_PX - CAST_ROD_TIP.x) / dx);
  if (p.y < EDGE_PX) k = Math.min(k, (EDGE_PX - CAST_ROD_TIP.y) / dy);
  return { x: CAST_ROD_TIP.x + dx * k, y: CAST_ROD_TIP.y + dy * k };
}

export function createCastRenderer(opts: { load?: ImageLoader; resolve?: (path: string) => string | null } = {}): CastRenderer {
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

  function drawScene(c: CanvasRenderingContext2D, view: CastView, t: number) {
    const { viewW, viewH, offsetX: ox, offsetY: oy } = layout;
    const v = (p: Point): Point => ({ x: ox + p.x, y: oy + p.y }); // cena → vista
    const scenery = sceneryOf(view.place);
    const px = (color: string, x: number, y: number, w = 1, h = 1) => {
      c.fillStyle = color;
      c.fillRect(Math.round(x), Math.round(y), w, h);
    };

    // Véu do local na vista inteira; com a arte do local, ela fica por baixo do véu.
    c.clearRect(0, 0, viewW, viewH);
    if (resolve(view.background)) sprite(view.background, { color: scenery.tint }).draw(c, ox, oy, SCENE_W, SCENE_H, t);
    c.fillStyle = scenery.tint;
    c.fillRect(0, 0, viewW, viewH);
    water(scenery.water.light, scenery.water.wave);

    for (const s of view.spots) spot(s);

    // O lugar de onde ele pesca e o Adilson de costas.
    const pose: Pose = view.flight && view.flight.sinceS < CAST_FLIGHT_S ? 'arremessando' : 'parado';
    drawStand(c, scenery.stand, { viewW, viewH, ox, oy });
    sprite(`src/assets/stands/${scenery.stand}.png`, { color: '', fallback: () => {} }).draw(
      c,
      ox,
      oy + SHORE_TOP - 30,
      SCENE_W,
      SCENE_H - SHORE_TOP + 30,
      t,
    );
    sprite(`src/assets/adilson/${pose}.png`, {
      frames: 4,
      fps: 6,
      color: '',
      fallback: (cc, x, y) => {
        drawAdilson(cc, x, y, pose);
        rod(v(rodHand(pose)), v(CAST_ROD_TIP)); // a forma provisória não tem vara: ganha uma
      },
    }).draw(c, ox + ADILSON_BOX.x, oy + ADILSON_BOX.y, ADILSON_BOX.w, ADILSON_BOX.h, t);

    const tip = v(CAST_ROD_TIP);
    if (view.aim) arrow(tip, view.aim.angleDeg, view.aim.locked ? CAST_COLORS.arrowLocked : CAST_COLORS.arrow);
    if (view.flight) {
      const { angleDeg, distanceM, sinceS } = view.flight;
      const end = v(onScene(landingPoint(angleDeg, distanceM)));
      const k = clamp01(sinceS / CAST_FLIGHT_S);
      // No ar a isca faz um arco; na água fica parada, com respingo e ondinhas.
      const lure = { x: tip.x + (end.x - tip.x) * k, y: tip.y + (end.y - tip.y) * k - Math.sin(k * Math.PI) * 20 };
      line(tip, lure);
      px(PALETTE.outline, lure.x - 2, lure.y - 2, 4, 4);
      px(CAST_COLORS.lure, lure.x - 1, lure.y - 1, 2, 2);
      if (k >= 1) {
        ripples(end, scenery.water.light, t);
        if (sinceS - CAST_FLIGHT_S < SPLASH_S) splash(end, sinceS - CAST_FLIGHT_S);
      }
    }

    /** Brilhos que piscam e ondinhas que andam devagar, na paleta do local. */
    function water(light: string, wave: string) {
      const span = WATER_TEXTURE.bottom - WATER_TEXTURE.top;
      c.globalAlpha = 0.35;
      for (let i = 0; i < 26; i++) {
        const x = (hash(i) * viewW + t * (2 + hash(i + 7) * 3)) % viewW;
        px(wave, x, oy + WATER_TEXTURE.top + hash(i + 50) * span, 3 + Math.floor(hash(i + 9) * 4), 1);
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 32; i++) {
        if ((t * 0.8 + hash(i + 200)) % 1 > 0.35) continue; // cada brilho aparece um pouco e some
        const x = (hash(i + 300) * viewW + t * 1.5) % viewW;
        const y = oy + WATER_TEXTURE.top + hash(i + 400) * span;
        px(light, x, y, 2, 1);
        px(light, x + 0.5, y - 1, 1, 1);
      }
    }

    /** O ponto na água: cor clara, destacado quando tocado e escurecido quando tem cadeado. */
    function spot(s: SpotMark) {
      const fill = s.selected ? CAST_COLORS.spotSelected : s.locked ? CAST_COLORS.spotLocked : CAST_COLORS.spot;
      c.beginPath();
      s.zone.polygon.forEach((p, i) => (i === 0 ? c.moveTo(ox + p.x, oy + p.y) : c.lineTo(ox + p.x, oy + p.y)));
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      c.strokeStyle = s.selected ? CAST_COLORS.spotSelectedEdge : CAST_COLORS.spotEdge;
      c.lineWidth = s.selected ? 2 : 1;
      c.stroke();
    }

    /** Vara em pixels, da mão até a ponta. */
    function rod(hand: Point, end: Point) {
      const steps = Math.ceil(Math.hypot(end.x - hand.x, end.y - hand.y)) || 1;
      for (let i = 0; i <= steps; i++) {
        const x = hand.x + ((end.x - hand.x) * i) / steps;
        const y = hand.y + ((end.y - hand.y) * i) / steps;
        px(PALETTE.rodDark, x + 1, y);
        px(PALETTE.rod, x, y);
      }
      px('#9aa3ad', hand.x - 2, hand.y - 1, 2, 2); // molinete
    }

    /** Linha da ponta da vara até a isca. */
    function line(from: Point, to: Point) {
      c.strokeStyle = PALETTE.line;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(from.x, from.y);
      c.lineTo(to.x, to.y);
      c.stroke();
    }

    /** Seta pontilhada saindo da ponta da vara, com a cabeça na direção da mira. */
    function arrow(from: Point, angleDeg: number, color: string) {
      const a = (angleDeg * Math.PI) / 180;
      const dir = { x: Math.sin(a), y: -Math.cos(a) };
      for (let d = 6; d < ARROW_PX; d += 4) px(color, from.x + dir.x * d - 1, from.y + dir.y * d - 1, 2, 2);
      const head = { x: from.x + dir.x * ARROW_PX, y: from.y + dir.y * ARROW_PX };
      for (let i = 0; i < 6; i++) {
        // as duas abas da cabeça, para trás e para os lados
        px(color, head.x - dir.x * i + dir.y * i - 1, head.y - dir.y * i - dir.x * i - 1, 2, 2);
        px(color, head.x - dir.x * i - dir.y * i - 1, head.y - dir.y * i + dir.x * i - 1, 2, 2);
      }
    }

    /** Ondinhas em volta de um ponto: elipses de pixels que crescem e somem. */
    function ripples(p: Point, color: string, time: number) {
      for (const phase of [0, 0.5]) {
        const k = (time * 0.8 + phase) % 1;
        const rx = 3 + k * 10;
        c.globalAlpha = 1 - k;
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          px(color, p.x + Math.cos(a) * rx, p.y + Math.sin(a) * rx * 0.4);
        }
      }
      c.globalAlpha = 1;
    }

    /** Respingo: gotas brancas subindo e caindo em volta do ponto, `since` segundos depois da queda. */
    function splash(p: Point, since: number) {
      const k = clamp01(since / SPLASH_S);
      c.globalAlpha = 1 - k;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI - Math.PI; // para cima, em leque
        const speed = 10 + (i % 3) * 4;
        px(PALETTE.splash, p.x + Math.cos(a) * speed * k * 1.4, p.y + Math.sin(a) * speed * k + 30 * k * k, i % 2 ? 2 : 1, i % 2 ? 2 : 1);
      }
      c.globalAlpha = 1;
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
