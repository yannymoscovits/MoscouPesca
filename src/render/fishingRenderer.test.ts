import { describe, expect, it } from 'vitest';
import { ep1 } from '../content/episodes/ep1';
import type { FishingState } from '../domain/fishing';
import { SCENE_H, SCENE_W, computeLayout, createFishingRenderer, sceneScale } from './fishingRenderer';

/** Contexto 2D de mentira: aceita qualquer chamada e guarda cada uma com os argumentos. */
function fakeCtx() {
  const calls: { name: string; args: unknown[]; fillStyle: unknown }[] = [];
  const props: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(props, {
    get: (t, k) => (k in t ? t[k] : (...args: unknown[]) => void calls.push({ name: String(k), args, fillStyle: t.fillStyle })),
    set: (t, k, v) => {
      t[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, props };
}

/** Canvas do happy-dom com o contexto falso e a posição na tela. */
function mounted(width: number, height: number, rect = { left: 0, top: 0 }) {
  const { ctx, calls, props } = fakeCtx();
  const canvas = document.createElement('canvas');
  canvas.getContext = (() => ctx) as unknown as typeof canvas.getContext;
  canvas.getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top }) as DOMRect;
  const renderer = createFishingRenderer({ load: () => new Promise(() => {}) }); // arte ainda não chegou
  renderer.mount(canvas, { width, height });
  return { renderer, canvas, calls, props };
}

const species = ep1.species[0];
const gear = { rod: ep1.rods[0], bait: 'minhoca' };
const at = { x: 90, y: 300 };
const ALL_STATES: FishingState[] = [
  { phase: 'Idle' },
  { phase: 'Flying', gear, from: { x: 90, y: 370 }, to: at, sinceCast: 0.4 },
  { phase: 'Waiting', gear, at, sinceCast: 2, bite: { atS: 5, species } },
  { phase: 'Waiting', gear, at, sinceCast: 2, bite: null },
  { phase: 'Bite', gear, at, species, sinceBite: 0.5 },
  { phase: 'Fight', gear, at, species, maxTension: 99, tension: 75, distance: 60, atMaxS: 0, fightS: 3 },
  { phase: 'Fight', gear, at, species, maxTension: 100, tension: 100, distance: 130, atMaxS: 0.5, fightS: 9 },
  { phase: 'Result_Caught', species, kg: 1.25, value: 10 },
  { phase: 'Result_Broken' },
  { phase: 'Result_Escaped' },
  { phase: 'Result_Nothing' },
];
const view = (fishing: FishingState) => ({ fishing, background: ep1.locations[0].background });

describe('escala da cena', () => {
  it('escala inteira: 2× até 539 px de largura e 3× a partir de 540 px', () => {
    expect(sceneScale(360)).toBe(2);
    expect(sceneScale(412)).toBe(2);
    expect(sceneScale(539)).toBe(2);
    expect(sceneScale(540)).toBe(3);
    expect(sceneScale(600)).toBe(3);
  });

  it.each([
    [360, 740, 2],
    [412, 839, 2],
    [600, 960, 3],
  ])('%i × %i px: cena lógica 180 × 400 centralizada e a vista cobre a tela inteira', (w, h, scale) => {
    const l = computeLayout(w, h);

    expect(l.scale).toBe(scale);
    expect(l.viewW * l.scale).toBeGreaterThanOrEqual(w);
    expect(l.viewH * l.scale).toBeGreaterThanOrEqual(h);
    const left = l.offsetX;
    const right = l.viewW - (l.offsetX + SCENE_W);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(l.offsetY + SCENE_H).toBe(l.viewH); // a margem da represa fica embaixo
  });

  it('as laterais da cena são preenchidas pelo cenário', () => {
    const { renderer, calls } = mounted(412, 839);
    const { viewW, viewH } = computeLayout(412, 839);

    renderer.draw(view({ phase: 'Idle' }), 0);

    const fills = calls.filter((c) => c.name === 'fillRect').map((c) => c.args as number[]);
    expect(fills.some(([x, y, w, h]) => x <= 0 && y <= 0 && x + w >= viewW && y + h >= viewH)).toBe(true);
  });

  it('o canvas usa a vista lógica e é ampliado sem borrar', () => {
    const { canvas, props } = mounted(412, 839);
    const l = computeLayout(412, 839);

    expect([canvas.width, canvas.height]).toEqual([l.viewW, l.viewH]);
    expect(canvas.style.width).toBe(`${l.viewW * 2}px`);
    expect(props.imageSmoothingEnabled).toBe(false);
  });
});

describe('toLogical', () => {
  it.each([
    [412, 839],
    [360, 740],
    [600, 960],
  ])('%i × %i px: cantos e centro da cena voltam com erro de no máximo 1 px lógico', (w, h) => {
    const rect = { left: 3, top: 5 }; // canvas fora da origem da página
    const { renderer } = mounted(w, h, rect);
    const l = computeLayout(w, h);
    const toClient = (x: number, y: number) => [rect.left + (l.offsetX + x) * l.scale, rect.top + (l.offsetY + y) * l.scale];

    for (const [x, y] of [
      [0, 0],
      [SCENE_W, 0],
      [0, SCENE_H],
      [SCENE_W, SCENE_H],
      [SCENE_W / 2, SCENE_H / 2],
      [90, 370], // ponta da vara
    ]) {
      const [cx, cy] = toClient(x, y);
      const p = renderer.toLogical(cx, cy);
      expect(Math.abs(p.x - x), `x de (${x}, ${y})`).toBeLessThanOrEqual(1);
      expect(Math.abs(p.y - y), `y de (${x}, ${y})`).toBeLessThanOrEqual(1);
    }
  });

  it('a linha sai da ponta da vara, em (90, 370) da cena', () => {
    const { renderer, calls } = mounted(412, 839);
    const l = computeLayout(412, 839);

    renderer.draw(view(ALL_STATES[2]), 0);

    const moveTo = calls.find((c) => c.name === 'moveTo');
    expect(moveTo?.args).toEqual([l.offsetX + 90, l.offsetY + 370]);
  });
});

describe('draw', () => {
  it('desenha todos os estados da pesca sem erro, com as formas provisórias', () => {
    const { renderer } = mounted(412, 839);
    for (const s of ALL_STATES) {
      for (const t of [0, 0.37, 2.5]) expect(() => renderer.draw(view(s), t), s.phase).not.toThrow();
    }
  });

  it('mordida mostra o "!"', () => {
    const { renderer, calls } = mounted(412, 839);

    renderer.draw(view(ALL_STATES[4]), 0);

    expect(calls.some((c) => c.name === 'fillText' && c.args[0] === '!')).toBe(true);
  });

  it('sem canvas 2D disponível, mount e draw não lançam erro', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => null) as unknown as typeof canvas.getContext;
    const renderer = createFishingRenderer();

    expect(() => {
      renderer.mount(canvas, { width: 412, height: 839 });
      renderer.draw(view({ phase: 'Idle' }), 0);
    }).not.toThrow();
  });
});
