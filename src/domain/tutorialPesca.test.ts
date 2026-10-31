import { describe, expect, it } from 'vitest';
import { ep1 } from '../content/episodes/ep1';
import { barRulesFor, startBar } from './catchBar';
import { press, rulesFor, startPesca, tick as pescaTick, type PescaContext, type PescaState } from './pesca';
import { createRng } from './rng';
import { onPesca, rules, start, tick, type TutorialPescaState, type TutorialPescaStep } from './tutorialPesca';

const RASO = ep1.locations[0].zones[0];
const BAMBU = ep1.rods.find((r) => r.id === 'bambu')!;
const DT = 1 / 60;

function ctx(t: TutorialPescaState, seed: number): PescaContext {
  return { rod: BAMBU, bait: 'minhoca', rng: createRng(seed), rules: rules(t, 'tranquilo'), spot: RASO, species: ep1.species };
}

/** Joga o primeiro peixe seguindo só o passo da Jane, como o Adilson faria. */
function playTutorial(seed: number) {
  let t = start();
  const c = ctx(t, seed);
  const steps: TutorialPescaStep[] = [t.step];
  let s: PescaState = startPesca();
  const update = (spotChosen = true) => {
    t = onPesca(t, s, spotChosen);
    c.rules = rules(t, 'tranquilo');
    if (steps[steps.length - 1] !== t.step) steps.push(t.step);
  };

  update(true); // escolheu o ponto
  s = press(s, 'arremessar', c); // trava a direção
  update();
  for (let i = 0; i < 120; i++) s = pescaTick(s, DT, { holding: false }, c); // força cheia (meio ciclo de 4 s)
  s = press(s, 'arremessar', c);
  update();
  let sinceTwitch = 0;
  for (let i = 0; i < 20000 && !s.phase.startsWith('Result_'); i++) {
    let holding = false;
    if (t.step === 'atrair' && (sinceTwitch += DT) >= 0.5) {
      s = press(s, 'puxar', c);
      sinceTwitch = 0;
    } else if (t.step === 'fisgar') {
      s = press(s, 'puxar', c);
    } else if (t.step === 'recolher' || t.step === 'subir') {
      holding = true;
    } else if (t.step === 'manter' && s.phase === 'Fight') {
      holding = s.bar.fishY > s.bar.zoneY + s.bar.zoneH / 2;
    }
    update();
    s = pescaTick(s, DT, { holding }, c);
    update();
  }
  return { t, s, steps };
}

describe('início', () => {
  it('TUTOB-01: o tutorial começa no passo de escolher o ponto, sem aviso', () => {
    expect(start()).toEqual({ step: 'ponto', idleS: 0, nudge: false });
  });
});

describe('passos', () => {
  it('TUTOB-01: os 9 passos vêm na ordem da spec e o peixe pego encerra o tutorial', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { t, s, steps } = playTutorial(seed);
      expect(steps, `semente ${seed}`).toEqual([
        'ponto', // escolher o ponto
        'direcao', // travar a direção
        'forca', // travar a força
        'recolher', // segurar RECOLHER
        'atrair', // tocar PUXAR para atrair
        'fisgar', // apertar PUXAR no "FISGAR!"
        'subir', // segurar SEGURAR para subir a faixa
        'descer', // soltar para a faixa descer
        'manter', // manter o peixe na faixa até o medidor encher
        'done',
      ]);
      expect(t.step).toBe('done');
      expect(s.phase).toBe('Result_Caught');
    }
  });

  it('TUTOB-01: arremesso sem peixe volta ao passo de travar a direção; sair do ponto volta a escolher o ponto', () => {
    let t: TutorialPescaState = { step: 'recolher', idleS: 0, nudge: false };
    t = onPesca(t, { phase: 'Result_Nothing' }, true);
    expect(t.step).toBe('direcao');
    t = onPesca(t, startPesca(), false);
    expect(t.step).toBe('ponto');
  });

  it('TUTOB-01: o passo de soltar só vem depois que a faixa subiu, e o de manter só depois que ela desceu', () => {
    const bar = startBar(ep1.species[0], BAMBU, barRulesFor('tranquilo'), createRng(1));
    const fight = (zoneY: number, zoneV: number): PescaState => ({
      phase: 'Fight',
      gear: { rod: BAMBU, bait: 'minhoca' },
      water: { spot: RASO, bottomM: 1.5, lure: { xM: 3, depthM: 1 }, fish: [], nextId: 1, followInS: null },
      fishId: 1,
      bar: { ...bar, zoneY, zoneV },
    });
    let t: TutorialPescaState = { step: 'fisgar', idleS: 0, nudge: false };
    t = onPesca(t, fight(0, 0.03), true); // quique no fundo, sem segurar
    expect(t.step).toBe('subir');
    t = onPesca(t, fight(0.05, 0.4), true);
    expect(t.step).toBe('subir');
    t = onPesca(t, fight(0.3, 0.8), true);
    expect(t.step).toBe('descer');
    t = onPesca(t, fight(1 - bar.zoneH, 0), true); // segurando no topo
    expect(t.step).toBe('descer');
    t = onPesca(t, fight(0.6, -0.2), true);
    expect(t.step).toBe('manter');
    t = onPesca(t, fight(0.2, 0.5), true);
    expect(t.step).toBe('manter');
  });
});

describe('regras do tutorial', () => {
  it('TUTOB-02, TUTOB-03, TUTOB-04: peixe segue em até 3 s, fisgada sem prazo, barra do Tranquilo com jeito calmo', () => {
    for (const d of ['desafio', 'tranquilo'] as const) {
      const r = rules(start(), d);
      expect(r.followWithinS).toBe(3);
      expect(r.hookWindowS).toBeNull();
      expect(r.bar).toEqual({ ...barRulesFor('tranquilo'), style: 'calmo' });
      expect(r.sweepS).toBe(rulesFor(d).sweepS);
    }
  });

  it('TUTOB-03: no tutorial, o peixe que atacou espera o PUXAR', () => {
    const t = start();
    const c = ctx(t, 3);
    let s: PescaState = {
      phase: 'Strike',
      gear: { rod: BAMBU, bait: 'minhoca' },
      water: { spot: RASO, bottomM: 1.5, lure: { xM: 3, depthM: 1 }, fish: [], nextId: 1, followInS: null },
      fishId: 1,
      sinceS: 0,
    };
    for (let i = 0; i < 60 * 60; i++) s = pescaTick(s, DT, { holding: false }, c);
    expect(s.phase).toBe('Strike');
  });

  it('as regras folgadas valem só enquanto o tutorial está ativo', () => {
    const done: TutorialPescaState = { step: 'done', idleS: 0, nudge: false };
    expect(rules(done, 'desafio')).toEqual(rulesFor('desafio'));
    expect(rules(done, 'tranquilo')).toEqual(rulesFor('tranquilo'));
    expect(onPesca(done, startPesca(), false)).toBe(done);
  });
});

describe('aviso de parado (TUTO-07 da v1)', () => {
  it('10 s sem toque num passo marca nudge; tocar limpa', () => {
    let t = start();
    for (let i = 0; i < 99; i++) t = tick(t, 0.1, false);
    expect(t.nudge).toBe(false); // 9,9 s
    t = tick(t, 0.1, false);
    expect(t.nudge).toBe(true); // 10 s
    t = tick(t, 0.1, true);
    expect(t.nudge).toBe(false);
    t = tick(t, 5, false);
    expect(t.nudge).toBe(false);
  });

  it('um passo novo começa a contagem do zero', () => {
    let t = tick(start(), 9, false);
    t = onPesca(t, startPesca(), true); // passo "travar a direção"
    t = tick(t, 9, false);
    expect(t.nudge).toBe(false);
    t = tick(t, 1, false);
    expect(t.nudge).toBe(true);
  });
});
