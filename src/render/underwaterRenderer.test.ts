// Vista debaixo d'água (pesca-bass T10; ISCA-01, BRIGA-13): a câmera e a conversão de metros para a
// tela, e o desenho de cada fase da isca com as formas provisórias.
import { describe, expect, it } from 'vitest';
import { episodes } from '../content';
import { ep1 } from '../content/episodes/ep1';
import type { Species } from '../content/types';
import { barRulesFor, startBar } from '../domain/catchBar';
import { spawnWater, type FishAgent, type Water } from '../domain/lure';
import type { PescaState } from '../domain/pesca';
import { createRng } from '../domain/rng';
import { colorOf, computeLayout, fishBox } from './fishingRenderer';
import {
  camera,
  createUnderwaterRenderer,
  fromScene,
  toScene,
  TURN_S,
  UNDERWATER_COLORS,
  UNDERWATER_PX_PER_M,
  WATER_BOTTOM_SHARE,
  type UnderwaterView,
} from './underwaterRenderer';

/**
 * Contexto 2D de mentira: aceita qualquer chamada e guarda cada uma com os argumentos. Acompanha
 * save/restore/translate/scale/rotate e grava cada fillRect já em coordenadas da tela (a caixa dos
 * cantos transformados): os peixes agora viram, inclinam e encolhem por transformações, e os testes
 * continuam conferindo ONDE as coisas aparecem.
 */
function fakeCtx() {
  const calls: { name: string; args: unknown[]; fillStyle: unknown }[] = [];
  const props: Record<string | symbol, unknown> = {};
  type M = [number, number, number, number, number, number];
  let m: M = [1, 0, 0, 1, 0, 0];
  const stack: M[] = [];
  const mul = (a: M, b: M): M => [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
  const apply = (x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const special: Record<string, (...args: number[]) => void> = {
    save: () => void stack.push(m),
    restore: () => void (m = stack.pop() ?? m),
    translate: (tx, ty) => void (m = mul(m, [1, 0, 0, 1, tx, ty])),
    scale: (sx, sy) => void (m = mul(m, [sx, 0, 0, sy, 0, 0])),
    rotate: (a) => void (m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0])),
  };
  const ctx = new Proxy(props, {
    get: (t, k) =>
      k in t
        ? t[k]
        : (...args: unknown[]) => {
            const name = String(k);
            let logged = args;
            if (name === 'fillRect') {
              const [x, y, w, h] = args as number[];
              const pts = [apply(x, y), apply(x + w, y), apply(x, y + h), apply(x + w, y + h)];
              const xs = pts.map((p) => p.x);
              const ys = pts.map((p) => p.y);
              logged = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
            }
            calls.push({ name, args: logged, fillStyle: t.fillStyle });
            special[name]?.(...(args as number[]));
          },
    set: (t, k, v) => {
      t[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

/** Renderizador montado no Pixel 7 (412 × 839), sem nenhuma arte no build. */
function mounted() {
  const { ctx, calls } = fakeCtx();
  const canvas = document.createElement('canvas');
  canvas.getContext = (() => ctx) as unknown as typeof canvas.getContext;
  const renderer = createUnderwaterRenderer({ resolve: () => null });
  renderer.mount(canvas, { width: 412, height: 839 });
  return { renderer, calls };
}

const PIXEL_7 = computeLayout(412, 839);
const loc = ep1.locations[0];
const raso = loc.zones[0];
const gear = { rod: ep1.rods[0], bait: 'minhoca' };
const water: Water = spawnWater(raso, ep1.species, 8, createRng(3), null, 'minhoca');
const lureS: PescaState = { phase: 'Lure', gear, water, notice: null };
const view = (pesca: UnderwaterView['pesca']): UnderwaterView => ({ place: loc.id, pesca });
const fillsOf = (calls: ReturnType<typeof fakeCtx>['calls'], color: string) =>
  calls.filter((c) => c.name === 'fillRect' && c.fillStyle === color).map((c) => c.args as number[]);

/** O peixe 1 atacou: está na isca. */
const struck: Water = {
  ...water,
  fish: water.fish.map((f) => (f.id === 1 ? { ...f, mode: 'seguindo', attackInS: 0, xM: water.lure.xM, depthM: water.lure.depthM } : f)),
};
const strikeS: PescaState = { phase: 'Strike', gear, water: struck, fishId: 1, sinceS: 0.2 };
const bar = startBar(struck.fish[0].species, gear.rod, barRulesFor('desafio'), createRng(1));
const fightS: PescaState = { phase: 'Fight', gear, water: struck, fishId: 1, bar };

describe('camera e toScene', () => {
  it('a câmera segue a isca: longe do Adilson, a isca fica sempre no mesmo lugar da tela', () => {
    const a = toScene(camera(8, 1.5, PIXEL_7), 8, 1);
    const b = toScene(camera(14, 1.5, PIXEL_7), 14, 1);
    expect(a.x).toBeCloseTo(b.x, 9);
  });

  it('a isca fica dentro da tela de perto do Adilson até o alcance da melhor vara', () => {
    for (const xM of [0, 0.5, 3, 10.8, 25.2]) {
      const p = toScene(camera(xM, 9, PIXEL_7), xM, 0);
      expect(p.x, `${xM} m`).toBeGreaterThanOrEqual(0);
      expect(p.x, `${xM} m`).toBeLessThanOrEqual(PIXEL_7.viewW);
    }
  });

  it.each([
    [412, 839],
    [360, 740],
    [600, 960],
  ])('%i × %i px: superfície e fundo aparecem acima do quarto de baixo da tela, em todo ponto', (w, h) => {
    const l = computeLayout(w, h);
    for (const bottomM of [1, 1.5, 9, 20, 60, 200]) {
      const cam = camera(5, bottomM, l);
      const surface = toScene(cam, 5, 0).y;
      const bottom = toScene(cam, 5, bottomM).y;
      expect(surface, `${bottomM} m`).toBeGreaterThan(0);
      expect(bottom, `${bottomM} m`).toBeGreaterThan(surface);
      expect(bottom, `${bottomM} m`).toBeLessThanOrEqual(l.viewH * WATER_BOTTOM_SHARE);
    }
  });

  it('ISCA-01: no ponto mais fundo (200 m), os peixes nadando até 6 m ainda ocupam metade da água', () => {
    const cam = camera(5, 200, PIXEL_7);
    const water6 = toScene(cam, 5, 6).y - toScene(cam, 5, 0).y;
    expect(water6 / (toScene(cam, 5, 200).y - toScene(cam, 5, 0).y)).toBeGreaterThanOrEqual(0.4);
  });

  it('toScene leva metros a px lógicos e fromScene volta (ida e volta igual)', () => {
    for (const bottomM of [1.5, 9, 60, 200]) {
      const cam = camera(7, bottomM, PIXEL_7);
      for (const [xM, depthM] of [
        [7, 0],
        [3.2, bottomM / 3],
        [11, bottomM],
        [0, 0.4],
      ]) {
        const back = fromScene(cam, toScene(cam, xM, depthM));
        expect(back.xM, `${bottomM} m`).toBeCloseTo(xM, 9);
        expect(back.depthM, `${bottomM} m`).toBeCloseTo(depthM, 9);
      }
    }
  });

  it(`na horizontal, ${UNDERWATER_PX_PER_M} px lógicos por metro`, () => {
    const cam = camera(8, 1.5, PIXEL_7);
    expect(toScene(cam, 9, 0).x - toScene(cam, 8, 0).x).toBeCloseTo(UNDERWATER_PX_PER_M, 9);
  });
});

describe('desenho debaixo d’água', () => {
  it('sem sprites (formas provisórias), isca, ataque e briga desenham sem erro, até no ponto de 200 m', () => {
    const { renderer } = mounted();
    const deep: PescaState = { ...lureS, water: { ...water, bottomM: 200, lure: { xM: 6, depthM: 150 } } };
    for (const s of [lureS, strikeS, fightS, deep]) {
      for (const t of [0, 0.37, 2.5]) expect(() => renderer.draw(view(s as UnderwaterView['pesca']), t), s.phase).not.toThrow();
    }
  });

  it('sem canvas 2D disponível, mount e draw não lançam erro', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => null) as unknown as typeof canvas.getContext;
    const renderer = createUnderwaterRenderer();
    expect(() => {
      renderer.mount(canvas, { width: 412, height: 839 });
      renderer.draw(view(lureS as UnderwaterView['pesca']), 0);
      renderer.destroy();
    }).not.toThrow();
  });

  it('ISCA-01: cada peixe do arremesso aparece na cor da espécie, onde ele está', () => {
    const { renderer, calls } = mounted();
    renderer.draw(view(lureS as UnderwaterView['pesca']), 0);
    const cam = camera(water.lure.xM, water.bottomM, PIXEL_7);
    expect(water.fish.length).toBeGreaterThanOrEqual(3);
    for (const f of water.fish) {
      const p = toScene(cam, f.xM, f.depthM);
      const body = fillsOf(calls, colorOf(f.species.id));
      expect(body.some(([x, y]) => Math.abs(x - p.x) <= 12 && Math.abs(y - p.y) <= 6), `peixe ${f.id}`).toBe(true);
    }
  });

  it('ISCA-06: o peixe que recusou mostra o balão "não gostou"', () => {
    const { renderer, calls } = mounted();
    const refused: Water = { ...water, fish: water.fish.map((f, i) => (i === 0 ? { ...f, mode: 'recusou' } : f)) };
    renderer.draw(view({ ...lureS, water: refused } as UnderwaterView['pesca']), 0);
    expect(calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])).toEqual(['não gostou']);
  });

  it('ISCA-08: no ataque, um "!" grande sobre o peixe que atacou', () => {
    const { renderer, calls } = mounted();
    renderer.draw(view(strikeS as UnderwaterView['pesca']), 0);
    const cam = camera(struck.lure.xM, struck.bottomM, PIXEL_7);
    const fishAt = toScene(cam, struck.fish[0].xM, struck.fish[0].depthM);
    const mark = calls.find((c) => c.name === 'fillText' && c.args[0] === '!');
    expect(mark).toBeDefined();
    const [, x, y] = mark!.args as [string, number, number];
    expect(Math.abs(x - fishAt.x)).toBeLessThanOrEqual(1);
    expect(y).toBeLessThan(fishAt.y);
  });

  it('BRIGA-13: na briga, a linha vai esticada até a vara e o peixe fisgado se debate', () => {
    const { renderer, calls } = mounted();
    renderer.draw(view(fightS as UnderwaterView['pesca']), 0);
    expect(calls.some((c) => c.name === 'quadraticCurveTo')).toBe(false);
    expect(calls.some((c) => c.name === 'lineTo')).toBe(true);

    const color = colorOf(struck.fish[0].species.id);
    const where = (t: number) => {
      calls.length = 0;
      renderer.draw(view(fightS as UnderwaterView['pesca']), t);
      return JSON.stringify(fillsOf(calls, color));
    };
    expect(new Set([where(0.1), where(0.2), where(0.3)]).size).toBeGreaterThan(1);

    // Com a isca andando, a linha fica solta (com barriga).
    calls.length = 0;
    renderer.draw(view(lureS as UnderwaterView['pesca']), 0);
    expect(calls.some((c) => c.name === 'quadraticCurveTo')).toBe(true);
  });

  it('ISCA-01: a isca aparece na posição dela', () => {
    const { renderer, calls } = mounted();
    renderer.draw(view(lureS as UnderwaterView['pesca']), 0);
    const p = toScene(camera(water.lure.xM, water.bottomM, PIXEL_7), water.lure.xM, water.lure.depthM);
    const lure = fillsOf(calls, UNDERWATER_COLORS.lure);
    expect(lure.some(([x, y]) => Math.abs(x - p.x) <= 3 && Math.abs(y - p.y) <= 2)).toBe(true);
  });
});

describe('peixes vivos e do tamanho da espécie', () => {
  const all = episodes.flatMap((ep) => ep.species);
  const big = all.find((sp) => sp.kg.max >= 20)!;
  const small = all.find((sp) => sp.kg.max <= 1)!;
  const mid = all.find((sp) => sp.kg.max > 1 && sp.kg.max < 20)!;

  /** Uma água com um peixe só, da espécie dada, nadando no meio da tela. */
  const alone = (species: Species, over: Partial<FishAgent> = {}): Water => ({
    ...water,
    fish: [{ ...water.fish[0], id: 1, species, xM: water.lure.xM + 2, depthM: 1, dir: 1, mode: 'nadando', attackInS: null, ...over }],
  });
  const lureIn = (w: Water) => view({ ...lureS, water: w } as UnderwaterView['pesca']);
  /** Caixa (largura, altura e centro) de tudo o que foi pintado na cor da espécie. */
  const bodyBox = (calls: ReturnType<typeof fakeCtx>['calls'], species: Species) => {
    const rects = fillsOf(calls, colorOf(species.id));
    const x0 = Math.min(...rects.map(([x]) => x));
    const x1 = Math.max(...rects.map(([x, , w]) => x + w));
    const y0 = Math.min(...rects.map(([, y]) => y));
    const y1 = Math.max(...rects.map(([, y, , h]) => y + h));
    return { w: x1 - x0, h: y1 - y0, cy: (y0 + y1) / 2 };
  };

  it('o peixe é desenhado na caixa da faixa dele: o gigante bem maior que o pequeno', () => {
    const width = (sp: Species) => {
      const { renderer, calls } = mounted();
      renderer.draw(lureIn(alone(sp)), 0);
      return bodyBox(calls, sp).w;
    };
    const [w36, w18, w12] = [width(big), width(mid), width(small)];
    expect(w36).toBeGreaterThan(w18 * 1.6);
    expect(w18).toBeGreaterThan(w12);
    expect(fishBox(big).w).toBe(36);
    expect(fishBox(small).w).toBe(12);
  });

  it('nadando, o peixe balança devagar para cima e para baixo', () => {
    const { renderer, calls } = mounted();
    const ys = [0, 0.35, 0.7, 1.05].map((t) => {
      calls.length = 0;
      renderer.draw(lureIn(alone(mid)), t);
      return bodyBox(calls, mid).cy;
    });
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.5);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(5); // de leve
  });

  it('ao virar de lado, o peixe dá uma guinada curta: encolhe e volta ao tamanho', () => {
    const { renderer, calls } = mounted();
    renderer.draw(lureIn(alone(mid, { dir: 1 })), 0);
    const width = (t: number) => {
      calls.length = 0;
      renderer.draw(lureIn(alone(mid, { dir: -1 })), t);
      return bodyBox(calls, mid).w;
    };
    const turning = width(1);
    const done = width(1 + TURN_S + 0.2);
    expect(turning).toBeLessThan(done * 0.75);
  });

  it('ISCA-08: o "!" do ataque fica acima até do peixe gigante', () => {
    const { renderer, calls } = mounted();
    const w = alone(big, { xM: water.lure.xM, depthM: water.lure.depthM + 1, mode: 'seguindo', attackInS: 0 });
    renderer.draw(view({ phase: 'Strike', gear, water: w, fishId: 1, sinceS: 0.2 } as UnderwaterView['pesca']), 0);
    const body = bodyBox(calls, big);
    const mark = calls.find((c) => c.name === 'fillText' && c.args[0] === '!')!;
    const [, , y] = mark.args as [string, number, number];
    expect(y + 9).toBeLessThan(body.cy - body.h / 2); // o balão (17 px) termina acima do peixe
  });
});
