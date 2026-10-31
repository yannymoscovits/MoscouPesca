// Vista de cima do pesqueiro e do arremesso (design.md da pesca-bass, "castRenderer"): a água na
// paleta do local, os pontos do pesqueiro marcados, o lugar de onde o Adilson pesca, o Adilson de
// costas, a seta da mira, o voo da isca e o respingo. Lê a vista e desenha; não decide nada.
// Duas disposições:
// - pesqueiro (vista com `spots`): a cena lógica de 180 × 400 ancorada no pé da tela, o Adilson pequeno;
// - arremesso (vista sem `spots`): a beira sobe para o campo inteiro (Adilson, seta no arco todo e a
//   água da queda) caber acima dos botões e da barra de força; o Adilson fica 2× maior e a escala de
//   px por metro é calculada para o arremesso de força cheia da vara equipada cair perto do alto
//   jogável: a diferença de força aparece grande na tela (castPlacement).
// Uma vara só: com o sprite do Adilson, a vara é a do sprite e a linha sai da ponta dela; sem o
// sprite, a forma provisória ganha uma vara em pixels até a mesma ponta.

import type { LocationId, Point, Zone } from '../content/types';
import { CAST_FLIGHT_S, M_PER_PX } from '../domain/tuning';
import { ADILSON_BOX, drawAdilson, rodHandIn, type Pose } from './adilson';
import { computeLayout, PALETTE, SCENE_H, SCENE_W, type Layout } from './fishingRenderer';
import { sceneryOf } from './scenery';
import { createSprite, loadImage, resolveAsset, type ImageLoader, type SheetSpec, type Sprite } from './sprites';
import { drawStand, SHORE_TOP } from './stands';

/** Ponta da vara na cena do pesqueiro (pixel (0, 2) do quadro de 24 × 29 do sprite). */
export const CAST_ROD_TIP: Point = { x: ADILSON_BOX.x, y: ADILSON_BOX.y + 2 };
/** Escala da cena lógica do pesqueiro: 10 px lógicos por metro, a mesma do alcance da v1. */
export const PX_PER_M = 1 / M_PER_PX;
/** Respingo da isca ao cair na água, em segundos. */
export const SPLASH_S = 0.6;
/** Distância mínima das bordas da vista para a isca e o respingo continuarem à vista. */
const EDGE_PX = 6;
/** Faixa da água com textura (brilhos e ondinhas) no pesqueiro, em y da cena. */
const WATER_TEXTURE = { top: 40, bottom: SHORE_TOP - 6 };

// ---------- Disposição da tela de arremesso ----------

/** CSS px cobertos embaixo pelos controles (fileira do HUD + botões + barra de força). */
export const CAST_CONTROLS_CSS = 268;
/** CSS px cobertos em cima pelo painel do HUD. */
export const CAST_TOP_CSS = 172;
/** O arremesso de força cheia cai nesta fração do caminho da ponta da vara ao alto jogável. */
export const CAST_FULL_SHARE = 0.85;
/** O Adilson na tela de arremesso: 2× o sprite ("o boneco tá muito pequeno"). */
export const CAST_ADILSON_SCALE = 2;
/** Alcance usado quando a vista não diz o da vara (o da Vara de Bambu, 10,8 m). */
const DEFAULT_MAX_M = 10.8;

/** Onde a beira, o Adilson, a ponta da vara e a escala do arremesso ficam na tela de arremesso. */
export interface CastPlacement {
  ground: number; // y da vista onde a beira (o lugar de pesca) começa
  box: { x: number; y: number; w: number; h: number }; // caixa do Adilson na vista
  tip: Point; // ponta da vara na vista
  topY: number; // alto jogável, abaixo do painel
  pxPerM: number; // px lógicos por metro do arremesso
}

export function castPlacement(layout: Layout, maxM: number): CastPlacement {
  const ground = layout.viewH - Math.round(CAST_CONTROLS_CSS / layout.scale);
  const w = ADILSON_BOX.w * CAST_ADILSON_SCALE;
  const h = ADILSON_BOX.h * CAST_ADILSON_SCALE;
  // O Adilson exatamente no centro da tela, com os pés afundando um pouco na beira. A mira gira
  // bem em cima da cabeça dele: o leque de -45° a 45° fica simétrico em volta do corpo (o sprite
  // tem a ponta da vara no canto, o que deixava o leque torto para um lado).
  const box = { x: Math.round(layout.viewW / 2 - w / 2), y: ground - h + 5 * CAST_ADILSON_SCALE, w, h };
  const tip = { x: box.x + w / 2, y: box.y + 2 * CAST_ADILSON_SCALE };
  const topY = Math.round(CAST_TOP_CSS / layout.scale);
  const pxPerM = (CAST_FULL_SHARE * Math.max(40, tip.y - topY)) / maxM;
  return { ground, box, tip, topY, pxPerM };
}

/** Onde a isca cai na vista do arremesso: `distanceM` à frente da ponta, girada `angleDeg`. */
export function castLanding(p: CastPlacement, angleDeg: number, distanceM: number): Point {
  const a = (angleDeg * Math.PI) / 180;
  const d = distanceM * p.pxPerM;
  return { x: p.tip.x + Math.sin(a) * d, y: p.tip.y - Math.cos(a) * d };
}

export const CAST_COLORS = {
  arrow: PALETTE.alert, // seta balançando
  arrowLocked: '#ff8a3d', // seta travada, enchendo a força
  spot: 'rgba(255, 255, 255, 0.14)',
  spotEdge: 'rgba(255, 255, 255, 0.7)',
  spotSelected: 'rgba(255, 210, 63, 0.32)', // ponto tocado (PONTO-02)
  spotSelectedEdge: PALETTE.alert,
  spotLocked: 'rgba(8, 10, 24, 0.42)', // ponto com cadeado (PONTO-03)
  zone: 'rgba(255, 255, 255, 0.08)', // o ponto escolhido, marcado na água do arremesso
  zoneEdge: 'rgba(255, 255, 255, 0.3)',
  lure: '#e04a3a',
  marker: '#ffffff', // onde a isca cairia com a força atual
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
  // Seta da mira (ARREM-01) e travada (ARREM-02); `previewM` marca onde a isca cairia com a força atual.
  aim: { angleDeg: number; locked: boolean; previewM?: number } | null;
  // Isca no ar; de CAST_FLIGHT_S em diante, na água com o respingo (ARREM-05).
  flight: { angleDeg: number; distanceM: number; sinceS: number } | null;
  maxM?: number; // alcance máximo da vara equipada, em metros: calibra a escala do arremesso
  zone?: Zone | null; // o ponto escolhido, marcado na água da tela de arremesso
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

/** Onde a isca cai na cena do pesqueiro: `distanceM` à frente da ponta da vara, girada `angleDeg`. */
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

/** O ponto `p`, puxado pela reta desde `tip` até ficar dentro da vista de `viewW` de largura. */
function onView(tip: Point, viewW: number, p: Point): Point {
  const dx = p.x - tip.x;
  const dy = p.y - tip.y;
  let k = 1;
  if (p.x < EDGE_PX) k = Math.min(k, (EDGE_PX - tip.x) / dx);
  if (p.x > viewW - EDGE_PX) k = Math.min(k, (viewW - EDGE_PX - tip.x) / dx);
  if (p.y < EDGE_PX) k = Math.min(k, (EDGE_PX - tip.y) / dy);
  return { x: tip.x + dx * k, y: tip.y + dy * k };
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
    const v = (p: Point): Point => ({ x: ox + p.x, y: oy + p.y }); // cena do pesqueiro → vista
    const scenery = sceneryOf(view.place);
    // Tela de arremesso (sem pontos): a beira sobe e a escala segue a vara (ver o alto do arquivo).
    const casting = view.spots.length === 0;
    const place = castPlacement(layout, view.maxM ?? DEFAULT_MAX_M);
    const px = (color: string, x: number, y: number, w = 1, h = 1) => {
      c.fillStyle = color;
      c.fillRect(Math.round(x), Math.round(y), w, h);
    };

    // Véu do local na vista inteira; com a arte do local, ela fica por baixo do véu.
    c.clearRect(0, 0, viewW, viewH);
    if (resolve(view.background)) sprite(view.background, { color: scenery.tint }).draw(c, ox, oy, SCENE_W, SCENE_H, t);
    c.fillStyle = scenery.tint;
    c.fillRect(0, 0, viewW, viewH);
    if (casting) water(scenery.water.light, scenery.water.wave, Math.max(8, place.topY - 30), place.ground - 6);
    else water(scenery.water.light, scenery.water.wave, oy + WATER_TEXTURE.top, oy + WATER_TEXTURE.bottom);

    // O ponto escolhido, marcado na água do arremesso na escala nova: dá para mirar nele.
    if (casting && view.zone) zoneBand(view.zone);

    for (const s of view.spots) spot(s);

    // O lugar de onde ele pesca e o Adilson de costas (2× na tela de arremesso).
    const pose: Pose = view.flight && view.flight.sinceS < CAST_FLIGHT_S ? 'arremessando' : 'parado';
    const shoreOy = casting ? place.ground - SHORE_TOP : oy;
    drawStand(c, scenery.stand, { viewW, viewH, ox, oy: shoreOy });
    sprite(`src/assets/stands/${scenery.stand}.png`, { color: '', fallback: () => {} }).draw(
      c,
      ox,
      shoreOy + SHORE_TOP - 30,
      SCENE_W,
      viewH - (shoreOy + SHORE_TOP) + 30,
      t,
    );
    const scale = casting ? CAST_ADILSON_SCALE : 1;
    const box = casting ? place.box : { x: ox + ADILSON_BOX.x, y: oy + ADILSON_BOX.y, w: ADILSON_BOX.w, h: ADILSON_BOX.h };
    const tip = casting ? place.tip : v(CAST_ROD_TIP);
    sprite(`src/assets/adilson/${pose}.png`, {
      frames: 4,
      fps: 6,
      color: '',
      fallback: (cc, x, y) => {
        drawAdilson(cc, x, y, pose, scale);
        rod(rodHandIn({ x, y }, pose, scale), tip); // a forma provisória não tem vara: ganha uma
      },
    }).draw(c, box.x, box.y, box.w, box.h, t);

    if (view.aim) {
      const reach = (view.maxM ?? DEFAULT_MAX_M) * place.pxPerM; // a seta vai até o alcance máximo
      arrow(tip, view.aim.angleDeg, view.aim.locked ? CAST_COLORS.arrowLocked : CAST_COLORS.arrow, reach);
      if (view.aim.previewM != null) marker(onView(tip, viewW, castLanding(place, view.aim.angleDeg, view.aim.previewM)));
    }
    if (view.flight) {
      const { angleDeg, distanceM, sinceS } = view.flight;
      const end = onView(tip, viewW, casting ? castLanding(place, angleDeg, distanceM) : v(landingPoint(angleDeg, distanceM)));
      const k = clamp01(sinceS / CAST_FLIGHT_S);
      // No ar a isca faz um arco; na água fica parada, com respingo e ondinhas.
      const arc = 12 + Math.hypot(end.x - tip.x, end.y - tip.y) * 0.12;
      const lure = { x: tip.x + (end.x - tip.x) * k, y: tip.y + (end.y - tip.y) * k - Math.sin(k * Math.PI) * arc };
      line(tip, lure);
      px(PALETTE.outline, lure.x - 2, lure.y - 2, 4, 4);
      px(CAST_COLORS.lure, lure.x - 1, lure.y - 1, 2, 2);
      if (k >= 1) {
        ripples(end, scenery.water.light, t);
        if (sinceS - CAST_FLIGHT_S < SPLASH_S) splash(end, sinceS - CAST_FLIGHT_S);
      }
    }

    /** Brilhos que piscam e ondinhas que andam devagar, na paleta do local, entre `top` e `bottom`. */
    function water(light: string, wave: string, top: number, bottom: number) {
      const span = Math.max(1, bottom - top);
      c.globalAlpha = 0.35;
      for (let i = 0; i < 26; i++) {
        const x = (hash(i) * viewW + t * (2 + hash(i + 7) * 3)) % viewW;
        px(wave, x, top + hash(i + 50) * span, 3 + Math.floor(hash(i + 9) * 4), 1);
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 32; i++) {
        if ((t * 0.8 + hash(i + 200)) % 1 > 0.35) continue; // cada brilho aparece um pouco e some
        const x = (hash(i + 300) * viewW + t * 1.5) % viewW;
        const y = top + hash(i + 400) * span;
        px(light, x, y, 2, 1);
        px(light, x + 0.5, y - 1, 1, 1);
      }
    }

    /** O ponto escolhido na água do arremesso: o polígono da cena, reescalado em volta da ponta da vara. */
    function zoneBand(zone: Zone) {
      const k = place.pxPerM * M_PER_PX; // px da vista por px da cena (a cena anda a 10 px/m)
      const map = (p: Point): Point => ({
        x: place.tip.x + (p.x - CAST_ROD_TIP.x) * k,
        y: place.tip.y + (p.y - CAST_ROD_TIP.y) * k,
      });
      c.beginPath();
      zone.polygon.forEach((p, i) => {
        const m = map(p);
        i === 0 ? c.moveTo(m.x, m.y) : c.lineTo(m.x, m.y);
      });
      c.closePath();
      c.fillStyle = CAST_COLORS.zone;
      c.fill();
      c.strokeStyle = CAST_COLORS.zoneEdge;
      c.lineWidth = 1;
      c.stroke();
    }

    /** O ponto na água do pesqueiro: cor clara, destacado quando tocado e escurecido quando tem cadeado. */
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

    /**
     * Seta grossa e comprida saindo da ponta da vara até o alcance máximo (`len` px): traços que
     * marcham para a frente, cabeça grande e o arco pontilhado do alcance, de -45° a 45°.
     */
    function arrow(from: Point, angleDeg: number, color: string, len: number) {
      const a = (angleDeg * Math.PI) / 180;
      const dir = { x: Math.sin(a), y: -Math.cos(a) };
      // O arco do alcance máximo: um pontinho a cada 5°, para o jogador ver até onde dá para jogar.
      c.globalAlpha = 0.5;
      for (let deg = -45; deg <= 45; deg += 5) {
        const r = (deg * Math.PI) / 180;
        px(CAST_COLORS.marker, from.x + Math.sin(r) * len - 1, from.y - Math.cos(r) * len - 1, 2, 2);
      }
      c.globalAlpha = 1;
      // Traços do corpo, marchando na direção da mira (os pixels andam com o tempo), desde a cabeça.
      const step = 8;
      const march = (t * 24) % step;
      for (let d = 6 + march; d < len - 12; d += step) {
        const x = from.x + dir.x * d;
        const y = from.y + dir.y * d;
        px(PALETTE.outline, x - 2.5, y - 2.5, 5, 5);
        px(color, x - 1.5, y - 1.5, 3, 3);
      }
      // Cabeça: um triângulo de abas grossas, com contorno.
      const head = { x: from.x + dir.x * len, y: from.y + dir.y * len };
      for (let i = 0; i < 9; i++) {
        for (const side of [1, -1]) {
          const x = head.x - dir.x * i + side * dir.y * i;
          const y = head.y - dir.y * i - side * dir.x * i;
          px(PALETTE.outline, x - 2.5, y - 2.5, 5, 5);
        }
      }
      for (let i = 0; i < 8; i++) {
        for (const side of [1, -1]) {
          const x = head.x - dir.x * i + side * dir.y * i;
          const y = head.y - dir.y * i - side * dir.x * i;
          px(color, x - 1.5, y - 1.5, 3, 3);
        }
      }
    }

    /** Onde a isca cairia com a força atual (ARREM-02): um X pulsando com um anel em volta. */
    function marker(p: Point) {
      const r = 6 + Math.sin(t * 7) * 1.5;
      c.globalAlpha = 0.9;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        px(CAST_COLORS.marker, p.x + Math.cos(a) * r - 0.5, p.y + Math.sin(a) * r * 0.5 - 0.5, 1, 1);
      }
      c.globalAlpha = 1;
      for (let i = -3; i <= 3; i++) {
        px(PALETTE.outline, p.x + i - 1.5, p.y + i - 1.5, 4, 4);
        px(PALETTE.outline, p.x + i - 1.5, p.y - i - 1.5, 4, 4);
      }
      for (let i = -3; i <= 3; i++) {
        px(CAST_COLORS.lure, p.x + i - 1, p.y + i - 1, 2, 2);
        px(CAST_COLORS.lure, p.x + i - 1, p.y - i - 1, 2, 2);
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
