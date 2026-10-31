// Desenho da cena da água (design.md, "FishingRenderer"; spec, "Visual da pescaria"): véu e textura da
// água na paleta do local, o lugar de onde o Adilson pesca, o Adilson de costas com a vara, a linha com
// curva, a boia, o respingo, as ondinhas, a sombra do peixe e o "!". Lê o estado e desenha; não decide
// nada. O fundo do mar fica atrás do canvas (FishingScreen); o canvas é transparente onde não desenha.
// Sem arte, tudo é desenhado em pixels no código; com a arte do PixelLab, o sprite entra no lugar.

import { ROD_TIP } from '../app/controller';
import type { LocationId, Point } from '../content/types';
import { FLIGHT_S, tensionBand, type FishingState } from '../domain/fishing';
import { FIGHT_START_DISTANCE } from '../domain/tuning';
import { ADILSON_BOX, drawAdilson, rodHand, type Pose } from './adilson';
import { sceneryOf, type Scenery } from './scenery';
import { createSprite, loadImage, resolveAsset, type ImageLoader, type SheetSpec, type Sprite } from './sprites';
import { drawStand, SHORE_TOP } from './stands';

/** Cena lógica (spec, "Tamanho da cena"); zonas e alcance usam estas coordenadas. */
export const SCENE_W = 180;
export const SCENE_H = 400;
/** A partir desta largura CSS, a escala passa de 2× para 3×. */
export const WIDE_SCREEN_PX = 540;

/** Cores dos elementos da pescaria. */
export const PALETTE = {
  line: '#f4f4f4',
  bobberTop: '#e04a3a', // boia: vermelha em cima, branca embaixo
  bobberBottom: '#fafafa',
  outline: '#14110f',
  rod: '#c9a25a',
  rodDark: '#3a2a14',
  splash: '#ffffff',
  shadow: 'rgba(2, 10, 24, 0.5)', // sombra do peixe embaixo d'água
  alert: '#ffd23f',
  tension: { verde: '#4caf50', amarelo: '#ffd23f', vermelho: '#e53935' },
};
const FISH = { w: 16, h: 8 };
/** Respingo da boia ao cair na água, em segundos. */
const SPLASH_S = 0.6;
/** Faixa da água com textura (brilhos e ondinhas), em y da cena. */
const WATER_TEXTURE = { top: 40, bottom: SHORE_TOP - 6 };

export function sceneScale(cssWidth: number): 2 | 3 {
  return cssWidth >= WIDE_SCREEN_PX ? 3 : 2;
}

/** Vista em px lógicos: a tela inteira na escala inteira, com a cena 180 × 400 dentro dela. */
export interface Layout {
  scale: number;
  viewW: number;
  viewH: number;
  offsetX: number; // canto esquerdo da cena na vista
  offsetY: number; // canto de cima da cena na vista; negativo corta o fundo em telas baixas
}

// Telas mais largas que a cena: cena centralizada e laterais com o cenário (spec, "Tamanho da cena").
// Na vertical, a cena encosta embaixo: a margem e o Adilson ficam sempre à vista.
export function computeLayout(cssWidth: number, cssHeight: number): Layout {
  const scale = sceneScale(cssWidth);
  const viewW = Math.max(SCENE_W, Math.ceil(cssWidth / scale));
  const viewH = Math.max(1, Math.ceil(cssHeight / scale));
  return { scale, viewW, viewH, offsetX: Math.floor((viewW - SCENE_W) / 2), offsetY: viewH - SCENE_H };
}

export interface FishingViewState {
  fishing: FishingState;
  background: string; // Location.background
  place?: LocationId; // Location.id: escolhe o cenário (scenery.ts); sem ele, o padrão
}

export interface FishingRenderer {
  /** Liga ao canvas; `size` é a área CSS da cena (padrão: a janela). */
  mount(canvas: HTMLCanvasElement, size?: { width: number; height: number }): void;
  resize(size: { width: number; height: number }): void;
  draw(s: FishingViewState, t: number): void;
  /** Ponto da tela (clientX/Y) → ponto da cena lógica. */
  toLogical(clientX: number, clientY: number): Point;
}

/** Cor estável por nome, para o retângulo de cada espécie enquanto o sprite não chega. */
export function colorOf(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 65%, 55%)`;
}

const lerp = (a: Point, b: Point, k: number): Point => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));

/** Número entre 0 e 1 com cara de sorteio, sempre o mesmo para o mesmo `i`. */
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

function adilsonPose(f: FishingState): Pose {
  switch (f.phase) {
    case 'Flying':
      return 'arremessando';
    case 'Fight':
      return 'recolhendo';
    case 'Result_Caught':
      return 'posando';
    default:
      return 'parado';
  }
}

/** Ponto da boia no voo: da ponta da vara até onde vai cair, num arco. */
export function flightPoint(from: Point, to: Point, sinceCast: number): Point {
  const k = clamp01(sinceCast / FLIGHT_S);
  const p = lerp(from, to, k);
  return { x: p.x, y: p.y - Math.sin(k * Math.PI) * 20 };
}

/**
 * Onde está a sombra do peixe que vai morder: começa longe da boia (de um lado sorteado pelo ponto) e
 * chega nela na hora da mordida.
 */
export function shadowPoint(at: Point, sinceCast: number, biteAtS: number): Point {
  const k = clamp01((sinceCast - FLIGHT_S) / Math.max(0.1, biteAtS - FLIGHT_S));
  const a = hash(Math.round(at.x) * 31 + Math.round(at.y)) * Math.PI * 2;
  const start = { x: at.x + Math.cos(a) * 40, y: at.y + Math.sin(a) * 18 };
  return lerp(start, at, 1 - (1 - k) * (1 - k));
}

export function createFishingRenderer(opts: { load?: ImageLoader; resolve?: (path: string) => string | null } = {}): FishingRenderer {
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

  function drawScene(c: CanvasRenderingContext2D, s: FishingViewState, t: number) {
    const { viewW, viewH, offsetX: ox, offsetY: oy } = layout;
    const v = (p: Point): Point => ({ x: ox + p.x, y: oy + p.y }); // cena → vista
    const f = s.fishing;
    const scenery = sceneryOf(s.place);
    const px = (color: string, x: number, y: number, w = 1, h = 1) => {
      c.fillStyle = color;
      c.fillRect(Math.round(x), Math.round(y), w, h);
    };

    // Véu do local na vista inteira (as laterais continuam o cenário). Com a arte do local, ela cobre o
    // fundo do mar; sem ela, o véu dá a cor e o tom do local.
    c.clearRect(0, 0, viewW, viewH);
    if (resolve(s.background)) sprite(s.background, { color: scenery.tint }).draw(c, ox, oy, SCENE_W, SCENE_H, t);
    c.fillStyle = scenery.tint;
    c.fillRect(0, 0, viewW, viewH);
    drawWater(c, scenery, t);

    const tip = v(ROD_TIP);
    const pose = adilsonPose(f);

    // Embaixo d'água: a sombra do peixe; na superfície: ondinhas e respingo.
    switch (f.phase) {
      case 'Waiting':
        if (f.bite) fishShadow(v(shadowPoint(f.at, f.sinceCast, f.bite.atS)), v(f.at), t);
        ripples(v(f.at), scenery.water.light, t);
        if (f.sinceCast - FLIGHT_S < SPLASH_S) splash(v(f.at), f.sinceCast - FLIGHT_S);
        break;
      case 'Bite': {
        const at = v(f.at);
        fishShadow({ x: at.x + Math.sin(t * 14) * 2, y: at.y + 2 }, { x: at.x + 6, y: at.y }, t);
        ripples(at, scenery.water.light, t * 2);
        break;
      }
      case 'Fight': {
        const p = fightPoint(f, tip, v(f.at), t);
        fishShadow(p, { x: p.x + Math.sin(t * 9 + 1) * 8, y: p.y + 4 }, t);
        ripples(p, scenery.water.light, t * 1.5);
        if (f.tension >= 70) splash(p, (t * 2) % SPLASH_S); // o peixe se debate na superfície
        break;
      }
      default:
        break;
    }

    // O lugar de onde ele pesca e o Adilson de costas, com a vara saindo das mãos.
    drawStand(c, scenery.stand, { viewW, viewH, ox, oy });
    sprite(`src/assets/stands/${scenery.stand}.png`, { color: '', fallback: () => {} }).draw(
      c,
      ox,
      oy + SHORE_TOP - 30,
      SCENE_W,
      SCENE_H - SHORE_TOP + 30,
      t,
    );
    const box = { x: ox + ADILSON_BOX.x, y: oy + ADILSON_BOX.y };
    sprite(`src/assets/adilson/${pose}.png`, {
      frames: 4,
      fps: 6,
      color: '',
      fallback: (cc, x, y) => drawAdilson(cc, x, y, pose),
    }).draw(c, box.x, box.y, ADILSON_BOX.w, ADILSON_BOX.h, t);

    switch (f.phase) {
      case 'Flying': {
        const p = flightPoint(v(f.from), v(f.to), f.sinceCast);
        rod(v(rodHand(pose)), tip, 0);
        line(tip, p, 3);
        bobber(p);
        break;
      }
      case 'Waiting': {
        const p = v(f.at);
        rod(v(rodHand(pose)), tip, 0);
        line(tip, p, 10 + Math.sin(t * 1.5) * 1.5); // linha frouxa, balançando
        bobber({ x: p.x, y: p.y + (Math.sin(t * 3) > 0.6 ? 1 : 0) });
        break;
      }
      case 'Bite': {
        const p = v(f.at);
        rod(v(rodHand(pose)), tip, 1);
        line(tip, p, 2);
        bobber({ x: p.x, y: p.y + (Math.sin(t * 20) > 0 ? 2 : 0) }); // a boia afunda e sobe
        alert({ x: p.x, y: p.y - 14 });
        break;
      }
      case 'Fight': {
        const p = fightPoint(f, tip, v(f.at), t);
        rod(v(rodHand(pose)), tip, 3 + f.tension / 20, Math.sign(p.x - tip.x) || 1); // a vara enverga
        line(tip, p, 8 * (1 - f.tension / 100), PALETTE.tension[tensionBand(f.tension)]); // linha estica
        break;
      }
      case 'Result_Caught':
        rod(v(rodHand(pose)), tip, 0);
        fish(f.species.id, f.species.sprite, { x: tip.x, y: tip.y - 6 }); // o Adilson mostra o peixe
        break;
      default:
        rod(v(rodHand(pose)), tip, 0);
        break; // Idle e os avisos sem peixe: só a cena
    }

    /** Brilhos que piscam e ondinhas que andam devagar, na paleta do local. */
    function drawWater(cc: CanvasRenderingContext2D, sc: Scenery, time: number) {
      const span = WATER_TEXTURE.bottom - WATER_TEXTURE.top;
      cc.globalAlpha = 0.35;
      for (let i = 0; i < 26; i++) {
        const x = (hash(i) * viewW + time * (2 + hash(i + 7) * 3)) % viewW;
        const y = oy + WATER_TEXTURE.top + hash(i + 50) * span;
        px(sc.water.wave, x, y, 3 + Math.floor(hash(i + 9) * 4), 1);
      }
      cc.globalAlpha = 1;
      for (let i = 0; i < 32; i++) {
        if ((time * 0.8 + hash(i + 200)) % 1 > 0.35) continue; // cada brilho aparece um pouco e some
        const x = (hash(i + 300) * viewW + time * 1.5) % viewW;
        const y = oy + WATER_TEXTURE.top + hash(i + 400) * span;
        px(sc.water.light, x, y, 2, 1);
        px(sc.water.light, x + 0.5, y - 1, 1, 1);
      }
    }

    /** Vara em pixels da mão até a ponta; `bend` > 0 enverga para o lado `side`. */
    function rod(hand: Point, end: Point, bend: number, side = 1) {
      const dx = end.x - hand.x;
      const dy = end.y - hand.y;
      const len = Math.hypot(dx, dy) || 1;
      const ctrl = { x: (hand.x + end.x) / 2 + (-dy / len) * bend * side, y: (hand.y + end.y) / 2 + (dx / len) * bend * side };
      const steps = Math.ceil(len);
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const x = (1 - k) * (1 - k) * hand.x + 2 * (1 - k) * k * ctrl.x + k * k * end.x;
        const y = (1 - k) * (1 - k) * hand.y + 2 * (1 - k) * k * ctrl.y + k * k * end.y;
        px(PALETTE.rodDark, x + 1, y);
        px(PALETTE.rod, x, y);
      }
      px('#9aa3ad', hand.x - 2, hand.y - 1, 2, 2); // molinete
    }

    /** Linha da ponta até a boia, com a barriga de quem está frouxa: `sag` px para o lado, no meio. */
    function line(from: Point, to: Point, sag: number, color = PALETTE.line) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.max(0, sag);
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(from.x, from.y);
      c.quadraticCurveTo((from.x + to.x) / 2 - (dy / len) * bow, (from.y + to.y) / 2 + (dx / len) * bow, to.x, to.y);
      c.stroke();
    }

    function bobber(p: Point) {
      const x = Math.round(p.x) - 1;
      const y = Math.round(p.y) - 3;
      px(PALETTE.outline, x - 1, y - 1, 5, 6);
      px(PALETTE.bobberTop, x, y, 3, 2);
      px(PALETTE.bobberBottom, x, y + 2, 3, 2);
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
        const x = p.x + Math.cos(a) * speed * k * 1.4;
        const y = p.y + Math.sin(a) * speed * k + 30 * k * k;
        px(PALETTE.splash, x, y, i % 2 ? 2 : 1, i % 2 ? 2 : 1);
      }
      c.globalAlpha = 1;
    }

    /** Sombra escura de peixe em `p`, de frente para `towards`. */
    function fishShadow(p: Point, towards: Point, time: number) {
      const dir = towards.x >= p.x ? 1 : -1;
      const wag = Math.sin(time * 10) > 0 ? 1 : 0;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      c.fillStyle = PALETTE.shadow;
      c.fillRect(x - 7, y - 1, 14, 3); // corpo
      c.fillRect(x - 5, y - 2, 10, 5);
      c.fillRect(x - 7 * dir - (dir > 0 ? 4 : 0), y - 2 - wag, 4, 2); // rabo
      c.fillRect(x - 7 * dir - (dir > 0 ? 4 : 0), y + 1 + wag, 4, 2);
    }

    /** O "!" da mordida, num balãozinho. */
    function alert(p: Point) {
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      px(PALETTE.outline, x - 5, y - 7, 11, 13);
      px(PALETTE.alert, x - 4, y - 6, 9, 11);
      px(PALETTE.outline, x - 1, y + 6, 3, 2); // biquinho do balão
      c.fillStyle = PALETTE.outline;
      c.font = 'bold 10px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('!', x + 0.5, y);
    }

    function fish(key: string, path: string, p: Point) {
      sprite(path, { frames: 4, fps: 8, color: colorOf(key) }).draw(c, p.x - FISH.w / 2, p.y - FISH.h / 2, FISH.w, FISH.h, t);
    }
  }

  /** Ponto do peixe na briga: da boia até a ponta da vara conforme a distância, se debatendo. */
  function fightPoint(f: Extract<FishingState, { phase: 'Fight' }>, tip: Point, at: Point, t: number): Point {
    const k = clamp01(f.distance / FIGHT_START_DISTANCE);
    const p = lerp(tip, at, k);
    return { x: p.x + Math.sin(t * 9) * 3, y: p.y };
  }

  return {
    mount(el, size = { width: window.innerWidth, height: window.innerHeight }) {
      canvas = el;
      ctx = el.getContext('2d');
      resize(size);
    },

    resize,

    draw(s, t) {
      if (ctx) drawScene(ctx, s, t);
    },

    toLogical(clientX, clientY) {
      const rect = canvas?.getBoundingClientRect() ?? { left: 0, top: 0 };
      return {
        x: (clientX - rect.left) / layout.scale - layout.offsetX,
        y: (clientY - rect.top) / layout.scale - layout.offsetY,
      };
    },
  };
}
