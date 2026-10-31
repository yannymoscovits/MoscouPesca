// Desenho da cena da água (design.md, "FishingRenderer"): véu do local, píer, Adilson, isca, linha,
// peixe, "!" e ondinhas. Lê o estado e desenha; não decide nada. Sem arte, usa formas coloridas.
// O fundo do mar fica atrás do canvas (FishingScreen); o canvas é transparente onde não desenha.

import { ROD_TIP } from '../app/controller';
import type { LocationId, Point } from '../content/types';
import { FLIGHT_S, tensionBand, type FishingState } from '../domain/fishing';
import { FIGHT_START_DISTANCE } from '../domain/tuning';
import { sceneryOf } from './scenery';
import { createSprite, loadImage, resolveAsset, type ImageLoader, type SheetSpec, type Sprite } from './sprites';

/** Cena lógica (spec, "Tamanho da cena"); zonas e alcance usam estas coordenadas. */
export const SCENE_W = 180;
export const SCENE_H = 400;
/** A partir desta largura CSS, a escala passa de 2× para 3×. */
export const WIDE_SCREEN_PX = 540;

const COLORS = {
  ripple: '#cfe8f5',
  line: '#f4f4f4',
  bait: '#e04a3a',
  alert: '#ffd23f',
  adilson: '#3b7d3a',
  tension: { verde: '#4caf50', amarelo: '#ffd23f', vermelho: '#e53935' },
};
/** Faixa de margem embaixo da cena, onde o Adilson fica. */
const SHORE_TOP = 372;
/** Píer de madeira (mockup tela-de-pesca-v2.png), desenhado em código até a arte chegar. */
const WOOD = {
  deck: '#a06c3a',
  plank: '#bd8650',
  seam: '#55361a',
  beam: '#7a4f28',
  beamLight: '#d6a464',
  dark: '#3b2410',
  post: '#7a4c26',
  postTop: '#c79457',
};
const FISH = { w: 16, h: 8 };
const ADILSON = { w: 14, h: 24 };

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
  place?: LocationId; // Location.id: escolhe o cenário provisório (scenery.ts); sem ele, o padrão
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

function adilsonPose(f: FishingState): string {
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

export function createFishingRenderer(opts: { load?: ImageLoader } = {}): FishingRenderer {
  const load = opts.load ?? loadImage;
  const sprites = new Map<string, Sprite>();
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let layout = computeLayout(SCENE_W * 2, SCENE_H * 2);

  const sprite = (path: string, spec: SheetSpec) => {
    let s = sprites.get(path);
    if (!s) sprites.set(path, (s = createSprite(resolveAsset(path), spec, load)));
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

  /** Píer de tábuas na faixa de baixo, com a viga da frente e dois postes nos cantos. */
  function drawPier(c: CanvasRenderingContext2D) {
    const { viewW, viewH, offsetX: ox, offsetY: oy } = layout;
    const top = oy + SHORE_TOP;
    c.fillStyle = 'rgba(0, 0, 0, 0.25)'; // sombra do píer na água
    c.fillRect(0, top - 2, viewW, 2);
    c.fillStyle = WOOD.deck;
    c.fillRect(0, top, viewW, viewH - top);
    for (let x = (ox % 10) - 10; x < viewW; x += 10) {
      c.fillStyle = WOOD.plank; // luz no lado esquerdo da tábua
      c.fillRect(x + 1, top, 2, viewH - top);
      c.fillStyle = WOOD.seam; // fresta entre as tábuas
      c.fillRect(x, top, 1, viewH - top);
      c.fillRect(x + 5, top + 10 + (Math.abs(x) % 7), 1, 3); // veio da madeira
    }
    c.fillStyle = WOOD.beam; // viga da frente
    c.fillRect(0, top, viewW, 4);
    c.fillStyle = WOOD.beamLight;
    c.fillRect(0, top, viewW, 1);
    c.fillStyle = WOOD.dark;
    c.fillRect(0, top + 4, viewW, 1);
    // Postes nas pontas da vista, acima dos botões do píer.
    for (const px of [0, viewW - 12]) {
      c.fillStyle = WOOD.dark;
      c.fillRect(px, top - 26, 12, 34);
      c.fillStyle = WOOD.post;
      c.fillRect(px + 1, top - 24, 10, 31);
      c.fillStyle = WOOD.postTop;
      c.fillRect(px + 1, top - 26, 10, 3);
      c.fillStyle = WOOD.plank;
      c.fillRect(px + 3, top - 22, 2, 26);
      c.fillStyle = WOOD.seam;
      c.fillRect(px + 7, top - 18, 1, 4);
      c.fillRect(px + 4, top - 8, 1, 3);
    }
  }

  function drawScene(c: CanvasRenderingContext2D, s: FishingViewState, t: number) {
    const { viewW, viewH, offsetX: ox, offsetY: oy } = layout;
    const v = (p: Point): Point => ({ x: ox + p.x, y: oy + p.y }); // cena → vista
    const f = s.fishing;

    // Véu do local na vista inteira (as laterais continuam o cenário) e o píer. Com a arte do local,
    // ela cobre o fundo do mar; sem ela, o véu dá a cor e o tom provisórios do local (scenery.ts).
    c.clearRect(0, 0, viewW, viewH);
    const { tint } = sceneryOf(s.place);
    if (resolveAsset(s.background)) sprite(s.background, { color: tint }).draw(c, ox, oy, SCENE_W, SCENE_H, t);
    c.fillStyle = tint;
    c.fillRect(0, 0, viewW, viewH);
    drawPier(c);

    const tip = v(ROD_TIP);
    const pose = adilsonPose(f);
    sprite(`src/assets/adilson/${pose}.png`, { frames: 4, fps: 6, color: COLORS.adilson }).draw(
      c,
      tip.x - ADILSON.w / 2,
      oy + SHORE_TOP,
      ADILSON.w,
      ADILSON.h,
      t,
    );

    const line = (to: Point, color = COLORS.line) => {
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(tip.x, tip.y);
      c.lineTo(to.x, to.y);
      c.stroke();
    };
    const bait = (p: Point) => {
      c.fillStyle = COLORS.bait;
      c.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
    };
    const ripples = (p: Point) => {
      c.strokeStyle = COLORS.ripple;
      c.lineWidth = 1;
      for (const phase of [0, 0.5]) {
        const k = (t * 0.8 + phase) % 1; // ondinha cresce e some
        c.globalAlpha = 1 - k;
        c.beginPath();
        c.arc(p.x, p.y, 2 + k * 8, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = 1;
    };
    const fish = (key: string, path: string, p: Point) =>
      sprite(path, { frames: 4, fps: 8, color: colorOf(key) }).draw(c, p.x - FISH.w / 2, p.y - FISH.h / 2, FISH.w, FISH.h, t);

    switch (f.phase) {
      case 'Flying': {
        const k = Math.min(1, f.sinceCast / FLIGHT_S);
        const p = lerp(v(f.from), v(f.to), k);
        p.y -= Math.sin(k * Math.PI) * 20; // arco da isca no ar
        line(p);
        bait(p);
        break;
      }
      case 'Waiting': {
        const p = v(f.at);
        line(p);
        ripples(p);
        bait(p);
        break;
      }
      case 'Bite': {
        const p = v(f.at);
        p.y += Math.sin(t * 20) * 1.5; // a boia afunda e sobe
        line(p);
        ripples(p);
        bait(p);
        c.fillStyle = COLORS.alert;
        c.font = 'bold 16px monospace';
        c.textAlign = 'center';
        c.fillText('!', p.x, p.y - 8);
        break;
      }
      case 'Fight': {
        const k = Math.min(1, Math.max(0, f.distance / FIGHT_START_DISTANCE));
        const p = lerp(tip, v(f.at), k);
        p.x += Math.sin(t * 9) * 3; // o peixe se debate
        line(p, COLORS.tension[tensionBand(f.tension)]);
        ripples(p);
        fish(f.species.id, f.species.sprite, p);
        break;
      }
      case 'Result_Caught':
        fish(f.species.id, f.species.sprite, { x: tip.x, y: tip.y - 6 }); // o Adilson mostra o peixe
        break;
      default:
        break; // Idle e os avisos sem peixe: só a cena
    }
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
