import { describe, expect, it } from 'vitest';
import type { Episode, GameEvent, Point, Profile, Rod, Species, Zone } from '../content/types';
import { cast, press, rulesFor, tensionBand, tick as fishingTick, type FishingState, type TickContext } from './fishing';
import { createRng } from './rng';
import { currentObjective, onEvent } from './story';
import { onFishing, rules, start, tick, type TutorialState, type TutorialStep } from './tutorial';

const ORIGIN: Point = { x: 0, y: 0 };
const TARGET: Point = { x: 0, y: -50 };
const BAMBU: Rod = { id: 'bambu', name: 'Vara de Bambu', price: 0, force: 1, reach: 2, episode: 1 };

function species(power: number): Species {
  return {
    id: 'tilapia',
    name: 'Tilápia',
    sprite: '',
    kg: { min: 0.5, max: 2 },
    pricePerKg: 10,
    power,
    stamina: 5,
    baits: ['minhoca'],
    rarity: 1,
    description: '',
    rare: false,
  };
}

const ZONE: Zone = {
  id: 'margem',
  polygon: [
    { x: -40, y: -90 },
    { x: 40, y: -90 },
    { x: 40, y: -10 },
    { x: -40, y: -10 },
  ],
  species: ['tilapia'],
  depthM: 1,
};

function ctx(t: TutorialState, seed: number, power = 5): TickContext {
  return { rng: createRng(seed), rules: rules(t, 'desafio'), zones: [ZONE], species: [species(power)] };
}

const castNow = (s: FishingState) => cast(s, TARGET, { origin: ORIGIN, rod: BAMBU, bait: 'minhoca' });

/** Joga o tutorial seguindo as instruções: segura até o vermelho, solta até o verde. */
function playTutorial(seed: number) {
  let t = start();
  const c = ctx(t, seed);
  const steps: TutorialStep[] = [t.step];
  const note = () => steps[steps.length - 1] !== t.step && steps.push(t.step);

  let f: FishingState = castNow({ phase: 'Idle' });
  t = onFishing(t, f);
  note();
  let holding = false;
  for (let i = 0; i < 4000 && !f.phase.startsWith('Result_'); i++) {
    c.rules = rules(t, 'desafio');
    if (f.phase === 'Bite') {
      f = press(f, c);
    } else {
      if (f.phase === 'Fight') holding = holding ? tensionBand(f.tension) !== 'vermelho' : tensionBand(f.tension) === 'verde';
      f = fishingTick(f, 0.05, { holding }, c);
    }
    t = onFishing(t, f);
    note();
  }
  return { t, f, steps };
}

describe('início', () => {
  it('TUTO-01: perfil sem tutorial começa no passo de arremessar, sem aviso', () => {
    expect(start()).toEqual({ step: 'cast', idleS: 0, nudge: false });
  });
});

describe('passos', () => {
  it('TUTO-03: os passos seguem a pesca na ordem arremessar, esperar, fisgar, segurar, soltar e fim', () => {
    for (const seed of [1, 2, 3]) {
      expect(playTutorial(seed).steps).toEqual(['cast', 'wait', 'hook', 'reel', 'release', 'done']);
    }
  });

  it('TUTO-03: se a isca cai onde nenhum peixe morde, o passo volta para arremessar', () => {
    let t = onFishing(start(), castNow({ phase: 'Idle' }));
    expect(t.step).toBe('wait');
    t = onFishing(t, { phase: 'Result_Nothing' });
    expect(t.step).toBe('cast');
    t = onFishing(t, { phase: 'Idle' });
    expect(t.step).toBe('cast');
  });
});

describe('regras afrouxadas', () => {
  function untilBite(seed: number): { f: FishingState; seconds: number } {
    const t = start();
    const c = ctx(t, seed);
    let f = castNow({ phase: 'Idle' });
    let seconds = 0;
    while (f.phase !== 'Bite' && seconds < 60) {
      f = fishingTick(f, 0.05, { holding: false }, c);
      seconds += 0.05;
    }
    return { f, seconds };
  }

  it('TUTO-04: com as regras do tutorial, a mordida vem em até 5 s do arremesso (200 sementes)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { f, seconds } = untilBite(seed);
      expect(f.phase).toBe('Bite');
      expect(seconds).toBeLessThanOrEqual(5 + 1e-9);
    }
  });

  it('TUTO-05: o peixe continua mordendo sem toque, sem escapar', () => {
    const c = ctx(start(), 9);
    let { f } = untilBite(9);
    for (let i = 0; i < 1200; i++) f = fishingTick(f, 0.05, { holding: false }, c); // 60 s parado
    expect(f.phase).toBe('Bite');
  });

  it('TUTO-06: segurando o tempo todo com um peixe forte, a tensão para em 99 e a linha não arrebenta', () => {
    const t = start();
    const c = ctx(t, 4, 10);
    let { f } = untilBite(4);
    f = press(f, c);
    let maxTension = 0;
    for (let i = 0; i < 4000 && f.phase === 'Fight'; i++) {
      f = fishingTick(f, 0.05, { holding: true }, c);
      if (f.phase === 'Fight') maxTension = Math.max(maxTension, f.tension);
    }
    expect(maxTension).toBe(99);
    expect(f.phase).toBe('Result_Caught');
  });

  it('TUTO-04 a TUTO-06: as regras afrouxadas valem só enquanto o tutorial está ativo', () => {
    const done = playTutorial(1).t;
    expect(done.step).toBe('done');
    expect(rules(done, 'desafio')).toEqual(rulesFor('desafio'));
    expect(rules(done, 'tranquilo')).toEqual(rulesFor('tranquilo'));
  });
});

describe('aviso de parado', () => {
  it('TUTO-07: 10 s sem toque num passo marca nudge; tocar limpa', () => {
    let t = start();
    for (let i = 0; i < 99; i++) t = tick(t, 0.1, false);
    expect(t.nudge).toBe(false); // 9,9 s
    t = tick(t, 0.1, false);
    expect(t.nudge).toBe(true); // 10 s

    t = tick(t, 0.1, true);
    expect(t.nudge).toBe(false);
    t = tick(t, 5, false);
    expect(t.nudge).toBe(false); // o toque zerou a contagem
  });

  it('TUTO-07: um passo novo começa a contagem do zero', () => {
    let t = start();
    t = tick(t, 9, false);
    t = onFishing(t, castNow({ phase: 'Idle' })); // passo "esperar"
    t = tick(t, 9, false);
    expect(t.nudge).toBe(false);
    t = tick(t, 1, false);
    expect(t.nudge).toBe(true);
  });
});

describe('fim', () => {
  it('TUTO-08: peixe pego encerra o tutorial e o Caught dele conta 1 de 3 no objetivo', () => {
    const { t, f } = playTutorial(2);
    expect(t.step).toBe('done');
    if (f.phase !== 'Result_Caught') throw new Error(`esperava Result_Caught, veio ${f.phase}`);

    const ep: Episode = {
      id: 1,
      locations: [],
      species: [],
      rods: [],
      baits: [],
      chapter: {
        title: 'Tirando a Ferrugem',
        openingScene: 'abertura',
        objectives: [{ id: 'pegar-3', text: 'Pegar 3 peixes', done: (e) => e.type === 'Caught', count: 3, sceneOnDone: 'cena-3' }],
        closingScene: 'fim',
      },
      tournament: { id: 'guanambicup', name: 'GuanambiCup', casts: 8, countBest: 3, rivals: [], trophy: 't', message: 'm' },
      letter: { id: 'm', from: 'Família', text: '' },
    };
    const profile = {
      story: { episodes: {}, scenesSeen: ['abertura'], pendingScene: null },
    } as unknown as Profile;
    const event: GameEvent = { type: 'Caught', species: f.species.id, kg: f.kg };
    const out = onEvent(profile, event, ep);
    expect(currentObjective(out.progress, ep)?.id).toBe('pegar-3');
    expect(out.progress.episodes[1]?.progress).toBe(1);
  });

  it('TUTO-08: depois do fim, o tutorial não volta atrás nem avisa', () => {
    const { t } = playTutorial(3);
    expect(onFishing(t, { phase: 'Idle' }).step).toBe('done');
    expect(tick(t, 30, false).nudge).toBe(false);
  });
});
