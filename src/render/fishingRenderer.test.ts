import { describe, expect, it } from 'vitest';
import { episodes } from '../content';
import { ep1 } from '../content/episodes/ep1';
import { FLIGHT_S, type FishingState } from '../domain/fishing';
import { ADILSON_BOX, ADILSON_PALETTE, rodHand } from './adilson';
import { PALETTE, SCENE_H, SCENE_W, computeLayout, createFishingRenderer, sceneScale } from './fishingRenderer';
import { DEFAULT_SCENERY, sceneryOf, type StandKind } from './scenery';
import { STAND_PALETTE } from './stands';

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

// Cena da pescaria (T79; spec, "Visual da pescaria"): a água e o lugar de pesca de cada local, os
// elementos de cada estado da pesca e a troca da forma provisória pelo sprite do PixelLab.

/** Local → de onde o Adilson pesca. Parque dos Ventos e alto-mar ainda vêm de outra branch: aqui são fixtures. */
const STANDS: Record<string, StandKind> = {
  'poco-do-magro': 'pier',
  'rio-jacuipe': 'barranco',
  'ponte-da-cetrel': 'ponte',
  'vera-cruz': 'pedras',
  'parque-dos-ventos': 'barragem',
  'alto-mar-da-bahia': 'barco',
};

type Call = { name: string; args: unknown[]; fillStyle: unknown };
const fills = (calls: Call[], color: string) =>
  calls.filter((c) => c.name === 'fillRect' && c.fillStyle === color).map((c) => c.args as number[]);
/** Centro do conjunto de retângulos. */
const centerOf = (rects: number[][]) => ({
  x: rects.reduce((s, [x, , w]) => s + x + w / 2, 0) / rects.length,
  y: rects.reduce((s, [, y, , h]) => s + y + h / 2, 0) / rects.length,
});
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Renderizador montado no Pixel 7 (412 × 839), com o desenho de um estado num lugar e num instante. */
function drawn(fishing: FishingState, place: string | undefined = 'poco-do-magro', t = 0) {
  const { renderer, calls } = mounted(412, 839);
  renderer.draw({ fishing, background: ep1.locations[0].background, place }, t);
  return calls;
}
const l = computeLayout(412, 839);
const v = (p: { x: number; y: number }) => ({ x: l.offsetX + p.x, y: l.offsetY + p.y });

describe('cenário de cada local', () => {
  it('todo local registrado no conteúdo tem cenário próprio e o lugar de pesca certo', () => {
    const places = episodes.flatMap((ep) => ep.locations.map((loc) => loc.id));
    expect(places.length).toBeGreaterThan(0);
    for (const id of places) {
      expect(STANDS[id], `${id} sem lugar de pesca na spec`).toBeDefined();
      expect(sceneryOf(id), id).not.toBe(DEFAULT_SCENERY);
      expect(sceneryOf(id).stand, id).toBe(STANDS[id]);
    }
  });

  it.each(Object.entries(STANDS))('%s: o véu e a textura da água na paleta do local e o lugar "%s"', (place, stand) => {
    const calls = drawn({ phase: 'Idle' }, place);
    const { tint, water } = sceneryOf(place);

    expect(fills(calls, tint).some(([x, y, w, h]) => x <= 0 && y <= 0 && x + w >= l.viewW && y + h >= l.viewH)).toBe(true);
    expect(fills(calls, water.wave).length, 'ondinhas').toBeGreaterThan(0);
    expect(fills(calls, water.light).length, 'brilhos').toBeGreaterThan(0);
    expect(fills(calls, STAND_PALETTE[stand].main).length, stand).toBeGreaterThan(0);
    for (const other of Object.keys(STAND_PALETTE) as StandKind[]) {
      if (other !== stand) expect(fills(calls, STAND_PALETTE[other].main), `não desenha ${other}`).toEqual([]);
    }
  });

  it('cada local tem a sua cor de água e o seu lugar de pesca', () => {
    const all = Object.keys(STANDS).map(sceneryOf);
    expect(new Set(all.map((s) => s.tint)).size).toBe(all.length);
    expect(new Set(all.map((s) => s.water.light)).size).toBe(all.length);
    expect(new Set(all.map((s) => s.stand)).size).toBe(all.length);
  });

  it('local desconhecido: o cenário padrão, com o píer, sem erro', () => {
    expect(sceneryOf('nao-existe')).toBe(DEFAULT_SCENERY);
    expect(sceneryOf(undefined)).toBe(DEFAULT_SCENERY);
    const calls = drawn({ phase: 'Idle' }, 'nao-existe');
    expect(fills(calls, STAND_PALETTE.pier.main).length).toBeGreaterThan(0);
  });
});

describe('elementos de cada estado da pesca', () => {
  const gear = { rod: ep1.rods[0], bait: 'minhoca' };
  const species = ep1.species[0];
  const at = { x: 110, y: 250 };
  const waiting = (sinceCast: number, bite: { atS: number; species: typeof species } | null = { atS: 5, species }): FishingState => ({
    phase: 'Waiting',
    gear,
    at,
    sinceCast,
    bite,
  });
  const fightAt = (tension: number): FishingState => ({
    phase: 'Fight',
    gear,
    at,
    species,
    maxTension: 100,
    tension,
    distance: 60,
    atMaxS: 0,
    fightS: 2,
  });
  /** Centro da boia: a parte vermelha fica em cima da branca. */
  const bobber = (calls: Call[]) => {
    const [[x, y, w, h]] = fills(calls, PALETTE.bobberTop);
    return { x: x + w / 2, y: y + h };
  };

  it('no voo, a boia passa num arco acima da reta entre a vara e o ponto do arremesso', () => {
    const calls = drawn({ phase: 'Flying', gear, from: { x: 90, y: 370 }, to: { x: 130, y: 300 }, sinceCast: FLIGHT_S / 2 });
    const p = bobber(calls);
    const straight = v({ x: 110, y: 335 }); // meio da reta
    expect(Math.abs(p.x - straight.x)).toBeLessThanOrEqual(2);
    expect(straight.y - p.y, 'arco').toBeGreaterThan(10);
  });

  it('ao cair na água, a boia respinga; meio segundo depois o respingo acabou', () => {
    const landed = drawn(waiting(FLIGHT_S + 0.1));
    const drops = fills(landed, PALETTE.splash);
    expect(drops.length).toBeGreaterThan(0);
    expect(dist(centerOf(drops), v(at))).toBeLessThan(12);
    expect(fills(drawn(waiting(FLIGHT_S + 1)), PALETTE.splash)).toEqual([]);
  });

  it('na espera, a sombra do peixe vem chegando na boia até a hora da mordida', () => {
    const far = dist(centerOf(fills(drawn(waiting(FLIGHT_S + 0.2)), PALETTE.shadow)), v(at));
    const near = dist(centerOf(fills(drawn(waiting(4.8)), PALETTE.shadow)), v(at));
    expect(far).toBeGreaterThan(20);
    expect(near).toBeLessThan(far);
    expect(near).toBeLessThan(6);
    // Sem peixe que aceite a isca, nenhuma sombra.
    expect(fills(drawn(waiting(3, null)), PALETTE.shadow)).toEqual([]);
  });

  it('na mordida, "!" no balão em cima da boia e a sombra do peixe nela', () => {
    const calls = drawn({ phase: 'Bite', gear, at, species, sinceBite: 0.2 });
    const alert = calls.find((c) => c.name === 'fillText' && c.args[0] === '!')!;
    expect(alert).toBeDefined();
    expect(alert.args[2] as number).toBeLessThan(v(at).y);
    expect(dist(centerOf(fills(calls, PALETTE.shadow)), v(at))).toBeLessThan(8);
  });

  it('na briga, a sombra do peixe fica na ponta da linha e se debate', () => {
    const a = drawn(fightAt(40), 'poco-do-magro', 0);
    const b = drawn(fightAt(40), 'poco-do-magro', 0.15);
    const end = a.find((c) => c.name === 'quadraticCurveTo')!.args as number[];
    const shadowA = centerOf(fills(a, PALETTE.shadow));
    expect(dist(shadowA, { x: end[2], y: end[3] })).toBeLessThan(8);
    expect(dist(shadowA, centerOf(fills(b, PALETTE.shadow)))).toBeGreaterThan(1);
  });

  it('a linha faz curva: frouxa na espera, esticada com a tensão no máximo', () => {
    const sag = (calls: Call[]) => {
      const [sx, sy] = calls.find((c) => c.name === 'moveTo')!.args as number[];
      const [cx, cy, ex, ey] = calls.find((c) => c.name === 'quadraticCurveTo')!.args as number[];
      return dist({ x: cx, y: cy }, { x: (sx + ex) / 2, y: (sy + ey) / 2 });
    };
    expect(sag(drawn(waiting(3)))).toBeGreaterThanOrEqual(8);
    expect(sag(drawn(fightAt(100)))).toBeLessThan(1);
  });

  it('a vara sai da mão do Adilson e termina na ponta, em (90, 370)', () => {
    const rod = fills(drawn(waiting(3)), PALETTE.rod);
    const near = (p: { x: number; y: number }) => rod.some(([x, y]) => Math.abs(x - p.x) <= 1.5 && Math.abs(y - p.y) <= 1.5);
    expect(near(v({ x: 90, y: 370 })), 'ponta').toBe(true);
    expect(near(v(rodHand('parado'))), 'mão').toBe(true);
  });
});

describe('sprites do PixelLab no lugar das formas provisórias', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const sheet = { naturalWidth: 96, naturalHeight: 29 } as HTMLImageElement;

  /** Renderizador com só os arquivos de `present` no build. */
  function withArt(present: string[]) {
    const { ctx, calls } = fakeCtx();
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => ctx) as unknown as typeof canvas.getContext;
    const renderer = createFishingRenderer({
      resolve: (path) => (present.includes(path) ? `/${path}` : null),
      load: async () => sheet,
    });
    renderer.mount(canvas, { width: 412, height: 839 });
    return { renderer, calls };
  }
  const view = (fishing: FishingState) => ({ fishing, background: ep1.locations[0].background, place: 'poco-do-magro' });
  const hat = (calls: Call[]) => fills(calls, ADILSON_PALETTE.H);

  it('sem o sprite, o Adilson provisório (chapéu de pescador) é desenhado na caixa dele', () => {
    const calls = drawn({ phase: 'Idle' });
    const box = v(ADILSON_BOX);
    expect(hat(calls).length).toBeGreaterThan(0);
    for (const [x, y] of hat(calls)) {
      expect(x).toBeGreaterThanOrEqual(box.x);
      expect(y).toBeGreaterThanOrEqual(box.y);
    }
  });

  it.each([
    ['parado', { phase: 'Idle' } as FishingState],
    ['arremessando', ALL_STATES[1]],
    ['recolhendo', ALL_STATES[5]],
  ])('com src/assets/adilson/%s.png no build, o sprite entra no lugar da forma provisória', async (pose, state) => {
    const { renderer, calls } = withArt([`src/assets/adilson/${pose}.png`]);
    renderer.draw(view(state), 0);
    await flush();
    calls.length = 0;

    renderer.draw(view(state), 0);

    const box = v(ADILSON_BOX);
    const images = calls.filter((c) => c.name === 'drawImage');
    expect(images.map((c) => c.args.slice(5))).toEqual([[box.x, box.y, ADILSON_BOX.w, ADILSON_BOX.h]]);
    expect(images[0].args[0]).toBe(sheet);
    expect(hat(calls)).toEqual([]);
  });

  it('com src/assets/stands/pier.png no build, a arte do píer é desenhada por cima da cena', async () => {
    const { renderer, calls } = withArt(['src/assets/stands/pier.png']);
    renderer.draw(view({ phase: 'Idle' }), 0);
    await flush();
    calls.length = 0;

    renderer.draw(view({ phase: 'Idle' }), 0);

    const images = calls.filter((c) => c.name === 'drawImage');
    expect(images).toHaveLength(1);
    const [, , , , , x, y, w, h] = images[0].args as number[];
    expect([x, w]).toEqual([l.offsetX, SCENE_W]);
    expect(y + h).toBe(l.viewH); // até o pé da tela
  });
});
