// Vista de cima do pesqueiro e do arremesso (pesca-bass T9; ARREM-01, ARREM-05, PONTO-01): a
// matemática pura (onde a isca cai, onde fica o botão do ponto) e o desenho com e sem sprites.
import { describe, expect, it } from 'vitest';
import { episodes } from '../content';
import { ep1 } from '../content/episodes/ep1';
import { CAST_FLIGHT_S, M_PER_PX } from '../domain/tuning';
import { ADILSON_BOX, ADILSON_PALETTE, rodHandIn } from './adilson';
import {
  CAST_ADILSON_SCALE,
  CAST_COLORS,
  CAST_CONTROLS_CSS,
  CAST_FULL_SHARE,
  CAST_ROD_TIP,
  castLanding,
  castPlacement,
  createCastRenderer,
  landingPoint,
  spotAnchor,
  type CastView,
} from './castRenderer';
import { computeLayout, PALETTE, SCENE_H, SCENE_W } from './fishingRenderer';
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
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

/** Renderizador montado no Pixel 7 (412 × 839), com só os arquivos de `present` no build. */
function mounted(present: string[] = []) {
  const { ctx, calls } = fakeCtx();
  const canvas = document.createElement('canvas');
  canvas.getContext = (() => ctx) as unknown as typeof canvas.getContext;
  const renderer = createCastRenderer({
    resolve: (path) => (present.includes(path) ? `/${path}` : null),
    load: async () => ({ naturalWidth: 96, naturalHeight: 29 }) as HTMLImageElement,
  });
  renderer.mount(canvas, { width: 412, height: 839 });
  return { renderer, calls };
}

const l = computeLayout(412, 839);
const v = (p: { x: number; y: number }) => ({ x: l.offsetX + p.x, y: l.offsetY + p.y });
const flush = () => new Promise((r) => setTimeout(r, 0));
const loc = ep1.locations[0];
const base: CastView = { background: loc.background, place: loc.id, spots: [], aim: null, flight: null };

const VIEWS: Record<string, CastView> = {
  pesqueiro: {
    ...base,
    spots: loc.zones.map((zone, i) => ({ zone, locked: i > 0, selected: i === 0 })),
  },
  mira: { ...base, aim: { angleDeg: -30, locked: false } },
  força: { ...base, aim: { angleDeg: 20, locked: true, previewM: 5 } },
  voo: { ...base, flight: { angleDeg: -45, distanceM: 10.8, sinceS: CAST_FLIGHT_S / 2 } },
  respingo: { ...base, flight: { angleDeg: 0, distanceM: 6, sinceS: CAST_FLIGHT_S + 0.1 } },
  'longe demais': { ...base, maxM: 25.2, flight: { angleDeg: 45, distanceM: 25.2, sinceS: CAST_FLIGHT_S + 0.1 } },
};

/** A vista sem pontos é a tela de arremesso: a disposição dela no Pixel 7, com a Vara de Bambu. */
const DEFAULT_MAX_M = 10.8;

describe('landingPoint', () => {
  it('ARREM-01, ARREM-03: 0° cai reto à frente da ponta da vara, a 10 px por metro', () => {
    const p = landingPoint(0, 6);
    expect(p.x).toBeCloseTo(CAST_ROD_TIP.x, 9);
    expect(p.y).toBeCloseTo(CAST_ROD_TIP.y - 60, 9);
  });

  it('-45° cai à esquerda e 45° à direita, na mesma distância', () => {
    const left = landingPoint(-45, 10);
    const right = landingPoint(45, 10);
    const r = 100 * Math.SQRT1_2;
    expect(left.x).toBeCloseTo(CAST_ROD_TIP.x - r, 9);
    expect(left.y).toBeCloseTo(CAST_ROD_TIP.y - r, 9);
    expect(right.x).toBeCloseTo(CAST_ROD_TIP.x + r, 9);
    expect(right.y).toBeCloseTo(CAST_ROD_TIP.y - r, 9);
    expect(Math.hypot(left.x - CAST_ROD_TIP.x, left.y - CAST_ROD_TIP.y)).toBeCloseTo(100, 9);
  });

  it('a ponta da vara é a do sprite do Adilson: pixel (0, 2) da caixa dele', () => {
    expect(CAST_ROD_TIP).toEqual({ x: ADILSON_BOX.x, y: ADILSON_BOX.y + 2 });
  });
});

describe('castPlacement (disposição da tela de arremesso)', () => {
  const p = castPlacement(l, DEFAULT_MAX_M);

  it('a beira fica acima dos controles e o campo todo acima dela', () => {
    expect(p.ground).toBe(l.viewH - Math.round(CAST_CONTROLS_CSS / l.scale));
    expect(p.topY).toBeLessThan(p.tip.y);
    expect(p.box.y + p.box.h).toBeLessThanOrEqual(p.ground + 10 + 1); // os pés afundam só um pouco
  });

  it('o Adilson fica 2× maior e exatamente no centro da tela, com a mira em cima da cabeça', () => {
    expect([p.box.w, p.box.h]).toEqual([ADILSON_BOX.w * CAST_ADILSON_SCALE, ADILSON_BOX.h * CAST_ADILSON_SCALE]);
    expect(p.box.x + p.box.w / 2).toBeCloseTo(l.viewW / 2, 0);
    expect(p.tip.x).toBeCloseTo(l.viewW / 2, 0); // o leque de -45° a 45° fica simétrico
    expect(p.tip.y).toBe(p.box.y + 2 * CAST_ADILSON_SCALE);
  });

  it('a escala segue a vara: o arremesso de força cheia cai perto do alto jogável, o fraco bem antes', () => {
    for (const maxM of [DEFAULT_MAX_M, 18, 25.2]) {
      const pm = castPlacement(l, maxM);
      const full = castLanding(pm, 0, maxM);
      expect(full.y, `força cheia com ${maxM} m`).toBeCloseTo(pm.tip.y - CAST_FULL_SHARE * (pm.tip.y - pm.topY), 6);
      const weak = castLanding(pm, 0, maxM * 0.3);
      // A diferença entre fraco e forte aparece grande na tela: mais da metade do campo jogável.
      expect(full.y - weak.y, `fraco × forte com ${maxM} m`).toBeLessThan(-0.5 * CAST_FULL_SHARE * (pm.tip.y - pm.topY));
    }
  });
});

describe('spotAnchor', () => {
  it('PONTO-01: é o centro do polígono do ponto', () => {
    const [raso] = loc.zones; // faixa de y 250 a 360, largura toda
    expect(spotAnchor(raso)).toEqual({ x: 90, y: 305 });
  });

  it('o botão de todo ponto de todos os locais fica dentro do polígono e da cena', () => {
    for (const zone of episodes.flatMap((ep) => ep.locations.flatMap((lc) => lc.zones))) {
      const a = spotAnchor(zone);
      const xs = zone.polygon.map((p) => p.x);
      const ys = zone.polygon.map((p) => p.y);
      expect(a.x, zone.id).toBeGreaterThan(Math.min(...xs));
      expect(a.x, zone.id).toBeLessThan(Math.max(...xs));
      expect(a.y, zone.id).toBeGreaterThan(Math.min(...ys));
      expect(a.y, zone.id).toBeLessThan(Math.max(...ys));
      expect(a.x >= 0 && a.x <= SCENE_W && a.y >= 0 && a.y <= SCENE_H, zone.id).toBe(true);
    }
  });
});

describe('desenho da vista de cima', () => {
  it('sem sprites (formas provisórias), todas as vistas desenham sem erro', () => {
    const { renderer } = mounted();
    for (const [name, view] of Object.entries(VIEWS)) {
      for (const t of [0, 0.37, 2.5]) expect(() => renderer.draw(view, t), name).not.toThrow();
    }
  });

  it('sem canvas 2D disponível, mount e draw não lançam erro', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => null) as unknown as typeof canvas.getContext;
    const renderer = createCastRenderer();
    expect(() => {
      renderer.mount(canvas, { width: 412, height: 839 });
      renderer.draw(VIEWS.mira, 0);
      renderer.destroy();
    }).not.toThrow();
  });

  it('PONTO-01: o pesqueiro marca na água cada ponto do local', () => {
    const { renderer, calls } = mounted();
    renderer.draw(VIEWS.pesqueiro, 0);
    const corners = calls.filter((c) => c.name === 'moveTo').map((c) => c.args);
    for (const zone of loc.zones) expect(corners, zone.id).toContainEqual([v(zone.polygon[0]).x, v(zone.polygon[0]).y]);
  });

  it.each([
    ['mira', CAST_COLORS.arrow],
    ['força', CAST_COLORS.arrowLocked],
  ])('ARREM-01, ARREM-02: na %s, a seta sai de cima do Adilson na direção do ângulo', (name, color) => {
    const { renderer, calls } = mounted();
    const view = VIEWS[name];
    renderer.draw(view, 0);
    const { tip } = castPlacement(l, DEFAULT_MAX_M);
    const a = (view.aim!.angleDeg * Math.PI) / 180;
    const dots = calls.filter((c) => c.name === 'fillRect' && c.fillStyle === color).map((c) => c.args as number[]);
    expect(dots.length).toBeGreaterThan(0);
    for (const [x, y, w] of dots) {
      const dx = x + w / 2 - tip.x;
      const dy = y + w / 2 - tip.y;
      expect(Math.abs(Math.atan2(dx, -dy) - a), `(${x}, ${y})`).toBeLessThan(0.3); // ao longo do raio da mira
    }
  });

  it('a seta é comprida: vai da cabeça do Adilson até o alcance máximo da vara', () => {
    const { renderer, calls } = mounted();
    renderer.draw(VIEWS.mira, 0);
    const p = castPlacement(l, DEFAULT_MAX_M);
    const dots = calls.filter((c) => c.name === 'fillRect' && c.fillStyle === CAST_COLORS.arrow).map((c) => c.args as number[]);
    const reach = DEFAULT_MAX_M * p.pxPerM;
    const far = Math.max(...dots.map(([x, y]) => Math.hypot(x - p.tip.x, y - p.tip.y)));
    expect(far).toBeGreaterThan(reach * 0.9); // a cabeça da seta fica no alcance máximo
    expect(far).toBeGreaterThan(80); // comprida de verdade na tela
  });

  it('ARREM-02: na força, o X marca onde a isca cairia com a força de agora', () => {
    const { renderer, calls } = mounted();
    renderer.draw(VIEWS.força, 0);
    const p = castPlacement(l, DEFAULT_MAX_M);
    const view = VIEWS.força;
    const end = castLanding(p, view.aim!.angleDeg, view.aim!.previewM!);
    // O X usa a cor da isca; sem voo na tela, só ele a usa.
    const dots = calls.filter((c) => c.name === 'fillRect' && c.fillStyle === CAST_COLORS.lure).map((c) => c.args as number[]);
    expect(dots.length).toBeGreaterThan(0);
    for (const [x, y] of dots) expect(Math.hypot(x - end.x, y - end.y), `(${x}, ${y})`).toBeLessThan(10);
  });

  it('o ponto escolhido fica marcado na água do arremesso, na escala da vara (zona consistente com a queda)', () => {
    const { renderer, calls } = mounted();
    const zone = loc.zones[0]; // raso: y da cena de 250 a 360
    renderer.draw({ ...base, zone }, 0);
    const p = castPlacement(l, DEFAULT_MAX_M);
    const k = p.pxPerM * M_PER_PX; // a cena do pesqueiro anda a 10 px por metro
    const first = zone.polygon[0];
    const corners = calls.filter((c) => c.name === 'moveTo').map((c) => c.args as number[]);
    expect(corners).toContainEqual([p.tip.x + (first.x - CAST_ROD_TIP.x) * k, p.tip.y + (first.y - CAST_ROD_TIP.y) * k]);
  });

  it('ARREM-05: na água, o respingo aparece onde a isca caiu', () => {
    const { renderer, calls } = mounted();
    renderer.draw(VIEWS.respingo, 0);
    const end = castLanding(castPlacement(l, DEFAULT_MAX_M), 0, 6);
    const drops = calls.filter((c) => c.name === 'fillRect' && c.fillStyle === PALETTE.splash).map((c) => c.args as number[]);
    expect(drops.length).toBeGreaterThan(0);
    for (const [x, y] of drops) expect(Math.hypot(x - end.x, y - end.y)).toBeLessThan(40);
  });

  it('ARREM-05: com a vara longa a 45°, o respingo fica à vista, na direção da mira', () => {
    const { renderer, calls } = mounted();
    renderer.draw(VIEWS['longe demais'], 0);
    const drops = calls.filter((c) => c.name === 'fillRect' && c.fillStyle === PALETTE.splash).map((c) => c.args as number[]);
    expect(drops.length).toBeGreaterThan(0);
    for (const [x] of drops) expect(x).toBeLessThanOrEqual(l.viewW);
    expect(Math.min(...drops.map(([x]) => x))).toBeGreaterThan(castPlacement(l, 25.2).tip.x); // à direita da vara
  });

  describe('o Adilson com uma vara só', () => {
    const rodPixels = (calls: ReturnType<typeof fakeCtx>['calls']) =>
      calls.filter((c) => c.name === 'fillRect' && c.fillStyle === PALETTE.rod).map((c) => c.args as number[]);
    const p = castPlacement(l, DEFAULT_MAX_M);

    it('sem o sprite: a forma provisória 2× ganha uma vara, da mão até a mira, e a linha sai dali', () => {
      const { renderer, calls } = mounted();
      renderer.draw(VIEWS.voo, 0);
      const rod = rodPixels(calls);
      const near = (q: { x: number; y: number }) => rod.some(([x, y]) => Math.abs(x - q.x) <= 1.5 && Math.abs(y - q.y) <= 1.5);
      expect(near(rodHandIn(p.box, 'arremessando', CAST_ADILSON_SCALE)), 'mão').toBe(true);
      expect(near(p.tip), 'ponta').toBe(true);
      expect(calls.filter((c) => c.name === 'fillRect' && c.fillStyle === ADILSON_PALETTE.H).length).toBeGreaterThan(0);
      expect(calls.find((c) => c.name === 'moveTo')?.args).toEqual([p.tip.x, p.tip.y]);
    });

    it.each(['parado', 'arremessando'])('com src/assets/adilson/%s.png: só a vara do sprite, sem vara em pixels', async (pose) => {
      const view = pose === 'parado' ? VIEWS.respingo : VIEWS.voo;
      const { renderer, calls } = mounted([`src/assets/adilson/${pose}.png`]);
      renderer.draw(view, 0);
      await flush();
      calls.length = 0;

      renderer.draw(view, 0);

      const images = calls.filter((c) => c.name === 'drawImage');
      expect(images.map((c) => c.args.slice(5))).toEqual([[p.box.x, p.box.y, p.box.w, p.box.h]]);
      expect(rodPixels(calls)).toEqual([]);
      expect(calls.find((c) => c.name === 'moveTo')?.args).toEqual([p.tip.x, p.tip.y]);
    });

    it('no pesqueiro (com pontos), o Adilson continua pequeno, na caixa da cena', async () => {
      const { renderer, calls } = mounted(['src/assets/adilson/parado.png']);
      renderer.draw(VIEWS.pesqueiro, 0);
      await flush();
      calls.length = 0;

      renderer.draw(VIEWS.pesqueiro, 0);

      const box = v(ADILSON_BOX);
      const images = calls.filter((c) => c.name === 'drawImage');
      expect(images.map((c) => c.args.slice(5))).toEqual([[box.x, box.y, ADILSON_BOX.w, ADILSON_BOX.h]]);
    });
  });
});

// A cena de cada local, que a v1 desenhava no fishingRenderer (T79), agora é a vista de cima do pesqueiro
// e do arremesso: véu e água na paleta do local, o lugar de pesca dele e a arte do PixelLab por cima.

/** Local → de onde o Adilson pesca. Parque dos Ventos e alto-mar ainda vêm de outra branch: aqui são fixtures. */
const STANDS: Record<string, StandKind> = {
  'poco-do-magro': 'pier',
  'rio-jacuipe': 'barranco',
  'ponte-da-cetrel': 'ponte',
  'vera-cruz': 'pedras',
  'parque-dos-ventos': 'barragem',
  'alto-mar-da-bahia': 'barco',
};

const fillsOf = (calls: { name: string; args: unknown[]; fillStyle: unknown }[], color: string) =>
  calls.filter((c) => c.name === 'fillRect' && c.fillStyle === color).map((c) => c.args as number[]);

/** Contexto falso que guarda também as propriedades (imageSmoothingEnabled). */
function mountedWithProps() {
  const calls: { name: string; args: unknown[]; fillStyle: unknown }[] = [];
  const props: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(props, {
    get: (t, k) => (k in t ? t[k] : (...args: unknown[]) => void calls.push({ name: String(k), args, fillStyle: t.fillStyle })),
    set: (t, k, val) => {
      t[k] = val;
      return true;
    },
  });
  const canvas = document.createElement('canvas');
  canvas.getContext = (() => ctx) as unknown as typeof canvas.getContext;
  const renderer = createCastRenderer({ resolve: () => null, load: () => new Promise(() => {}) });
  renderer.mount(canvas, { width: 412, height: 839 });
  return { renderer, calls, canvas, props };
}

/** A vista de cima, sem mira nem isca, num lugar. */
function drawnAt(place: string | undefined) {
  const { renderer, calls } = mountedWithProps();
  renderer.draw({ ...base, place }, 0);
  return calls;
}
const fills = fillsOf;

describe('vista lógica na tela', () => {
  it('as laterais da cena são preenchidas pelo cenário', () => {
    const calls = drawnAt('poco-do-magro');
    expect(fills(calls, sceneryOf('poco-do-magro').tint).some(([x, y, w, h]) => x <= 0 && y <= 0 && x + w >= l.viewW && y + h >= l.viewH)).toBe(true);
  });

  it('o canvas usa a vista lógica e é ampliado sem borrar', () => {
    const { canvas, props } = mountedWithProps();
    expect([canvas.width, canvas.height]).toEqual([l.viewW, l.viewH]);
    expect(canvas.style.width).toBe(`${l.viewW * 2}px`);
    expect(props.imageSmoothingEnabled).toBe(false);
  });
});

describe('cenário de cada local, na vista de cima (T79)', () => {
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
    const calls = drawnAt(place);
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
    const calls = drawnAt('nao-existe');
    expect(fills(calls, STAND_PALETTE.pier.main).length).toBeGreaterThan(0);
  });
});

describe('ambiente de cada local (céu, horizonte e fundo próprios)', () => {
  const places = Object.keys(STANDS);

  it('cada local pinta o próprio céu, de lado a lado', () => {
    for (const place of places) {
      const calls = drawnAt(place);
      const sky = fills(calls, sceneryOf(place).sky.top);
      expect(sky.some(([x, , w]) => x <= 0 && x + w >= l.viewW), place).toBe(true);
    }
  });

  it('céus e águas não se repetem entre os locais', () => {
    const all = places.map(sceneryOf);
    expect(new Set(all.map((s) => s.sky.top + s.sky.horizon)).size).toBe(all.length);
    expect(new Set(all.map((s) => s.surface.far + s.surface.near)).size).toBe(all.length);
    expect(new Set(all.map((s) => s.bottom)).size).toBeGreaterThanOrEqual(5); // corais repetem no mar
  });

  it('parque-dos-ventos: as pás das eólicas giram com o tempo', () => {
    const blades = (t: number) => {
      const { renderer, calls } = mountedWithProps();
      renderer.draw({ ...base, place: 'parque-dos-ventos' }, t);
      return JSON.stringify(fills(calls, '#f4f7fb'));
    };
    expect(blades(0)).not.toBe(blades(0.7));
  });
});

describe('sombras dos peixes do ponto (a água reflete quem vive ali)', () => {
  const zone = loc.zones[0];
  const shadowFills = (view: CastView) => {
    const { renderer, calls } = mountedWithProps();
    renderer.draw(view, 0.3);
    return fills(calls, CAST_COLORS.shadow);
  };

  it('com o ponto escolhido e a fauna dele, cada espécie vira uma sombra na água', () => {
    const dots = shadowFills({ ...base, zone, fauna: [{ id: 'tilapia', kgMax: 4 }, { id: 'piau', kgMax: 1.6 }] });
    expect(dots.length).toBeGreaterThan(0);
    const p = castPlacement(l, DEFAULT_MAX_M);
    for (const [, y] of dots) {
      expect(y).toBeLessThan(p.ground); // na água, nunca na beira
      expect(y).toBeGreaterThan(p.topY - 20);
    }
  });

  it('sem fauna, nenhuma sombra', () => {
    expect(shadowFills({ ...base, zone })).toEqual([]);
  });

  it('a espécie grande (>= 20 kg) tem sombra bem maior que a pequena (<= 1 kg)', () => {
    const widest = (kgMax: number) =>
      Math.max(...shadowFills({ ...base, zone, fauna: [{ id: 'peixe', kgMax }] }).map(([, , w]) => w));
    expect(widest(25)).toBeGreaterThan(widest(0.8) * 2);
  });
});

describe('arte do PixelLab no lugar de pesca', () => {
  it('com src/assets/stands/pier.png no build, a arte do píer é desenhada por cima da cena', async () => {
    const { renderer, calls } = mounted(['src/assets/stands/pier.png']);
    renderer.draw(base, 0);
    await flush();
    calls.length = 0;

    renderer.draw(base, 0);

    const images = calls.filter((c) => c.name === 'drawImage');
    expect(images).toHaveLength(1);
    const [, , , , , x, y, w, h] = images[0].args as number[];
    expect([x, w]).toEqual([l.offsetX, SCENE_W]);
    expect(y + h).toBe(l.viewH); // até o pé da tela
  });
});
