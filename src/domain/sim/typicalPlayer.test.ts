// Jogador típico simulado (design.md, "Domain: typical player simulation"): o instrumento que mede
// a progressão (PROG-01, PROG-04, PROG-05). Os episódios aqui são de teste, pequenos e previsíveis.
import { describe, expect, it } from 'vitest';
import type { Episode, GoalDef, Rod } from '../../content/types';
import { goalId } from '../medals';
import { newProfile } from '../profile';
import { CAST_FLIGHT_S, METER_FILL_LOSS_PER_STAMINA, METER_FILL_PER_S, METER_START } from '../tuning';
import { powerAt } from '../castAim';
import { barRulesFor, startBar } from '../catchBar';
import { spawnWater } from '../lure';
import { rulesFor as pescaRulesFor, type PescaState } from '../pesca';
import { createRng } from '../rng';
import { CARD_S, holdPolicy, REACTION_S, simulateEpisode, typicalPlayer, type Achievement } from './typicalPlayer';

const BAMBU: Rod = { id: 'bambu', name: 'Vara de Bambu', price: 0, force: 1, reach: 2, episode: 1 };
const VARA_BOA: Rod = { id: 'vara-boa', name: 'Vara Boa', price: 5, force: 2, reach: 3, episode: 1 };

/** Um lago com um peixe só, um objetivo "pegar 3 peixes" e um campeonato trivial (rivais com 0,1 kg). */
function testEpisode(rods: Rod[] = [BAMBU]): Episode {
  return {
    id: 1,
    locations: [
      {
        id: 'poco-do-magro',
        name: 'Lago',
        background: '',
        zones: [
          {
            id: 'raso',
            polygon: [
              { x: 0, y: 250 },
              { x: 180, y: 250 },
              { x: 180, y: 360 },
              { x: 0, y: 360 },
            ],
            species: ['peixe'],
            depthM: 1,
            name: 'Raso',
            minReach: 0,
          },
        ],
      },
    ],
    species: [
      {
        id: 'peixe',
        name: 'Peixe',
        sprite: '',
        kg: { min: 1, max: 3 },
        pricePerKg: 10,
        power: 3,
        stamina: 3,
        baits: ['minhoca'],
        rarity: 1,
        description: 'Peixe de teste.',
        rare: false,
        medals: { bronze: 4, prata: 5, ouro: 6 }, // acima da faixa: sem medalhas (o teste de medalhas troca os limites)
      },
    ],
    rods,
    baits: [{ id: 'minhoca', name: 'Minhoca', price: 0, episode: 1 }],
    chapter: {
      title: 'Teste',
      openingScene: 'abertura',
      objectives: [
        { id: 'pegar-3', text: 'Pegar 3 peixes', done: (e) => e.type === 'Caught', count: 3, sceneOnDone: 'cena-3' },
      ],
      closingScene: 'vitoria',
    },
    tournament: {
      id: 'copa-teste',
      name: 'Copa Teste',
      casts: 8,
      countBest: 3,
      rivals: [{ character: 'ricardo', kg: 0.1, taunt: { speaker: 'ricardo', text: 'Bora!' } }],
      trophy: 'trofeu-teste',
      message: 'carta-teste',
    },
    letter: { id: 'carta-teste', from: 'Família', text: 'Parabéns' },
  };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('jogador típico simulado', () => {
  it('a mesma semente dá o mesmo resultado, e outra semente dá outro', () => {
    const a = simulateEpisode(testEpisode(), newProfile(), 42);
    const b = simulateEpisode(testEpisode(), newProfile(), 42);
    expect(b).toEqual(a);
    expect(simulateEpisode(testEpisode(), newProfile(), 43).minutes).not.toBe(a.minutes);
  });

  it('com 1 objetivo "pegar 3 peixes" e campeonato trivial: 3 capturas, 1 tentativa e tempo total igual à soma dos arremessos', () => {
    const r = simulateEpisode(testEpisode(), newProfile(), 1);

    const free = r.casts.filter((c) => !c.tournament);
    expect(free.map((c) => c.outcome)).toEqual(['Result_Caught', 'Result_Caught', 'Result_Caught']);
    expect(r.casts.filter((c) => c.tournament)).toHaveLength(8);
    expect(r.tournamentAttempts).toBe(1);
    expect(r.won).toBe(true);
    expect(r.profile.trophies).toEqual(['trofeu-teste']);

    expect(r.minutes * 60).toBeCloseTo(sum(r.casts.map((c) => c.seconds)), 6);
    // Todo arremesso inclui o voo da isca; o que pega peixe inclui também a briga (encher o medidor
    // de 30% a 100% com o peixe sempre na faixa, stamina 3, leva pelo menos esse tempo) e a ficha.
    const fight = (1 - METER_START) / (METER_FILL_PER_S - METER_FILL_LOSS_PER_STAMINA * 3);
    for (const c of r.casts) {
      expect(c.seconds).toBeGreaterThanOrEqual(CAST_FLIGHT_S + (c.outcome === 'Result_Caught' ? fight + CARD_S : 0));
    }
  });

  it('a linha do tempo registra objetivo cumprido, item ao alcance do saldo, espécie nova e recorde, com o minuto de cada um', () => {
    const r = simulateEpisode(testEpisode([BAMBU, VARA_BOA]), newProfile(), 1);

    // Linha do tempo esperada, refeita a partir dos arremessos simulados (PROG-04).
    const expected: Achievement[] = [];
    let seconds = 0;
    let money = 0;
    let record: number | undefined;
    let freeCatches = 0;
    let itemReached = false;
    for (const c of r.casts) {
      seconds += c.seconds;
      if (c.outcome !== 'Result_Caught') continue;
      const atMinute = seconds / 60;
      if (record === undefined) expected.push({ atMinute, kind: 'especie', id: 'peixe' });
      else if (c.kg! > record) expected.push({ atMinute, kind: 'recorde', id: 'peixe' });
      record = Math.max(record ?? 0, c.kg!);
      if (!c.tournament && ++freeCatches === 3) expected.push({ atMinute, kind: 'objetivo', id: 'pegar-3' });
      money += c.value!;
      if (!itemReached && money >= VARA_BOA.price) {
        itemReached = true;
        expected.push({ atMinute, kind: 'item', id: 'vara-boa' });
      }
    }

    const normalize = (xs: Achievement[]) =>
      xs
        .map((a) => ({ ...a, atMinute: Math.round(a.atMinute * 1e6) / 1e6 }))
        .sort((x, y) => x.atMinute - y.atMinute || x.kind.localeCompare(y.kind));
    expect(normalize(r.achievements)).toEqual(normalize(expected));
    expect(new Set(r.achievements.map((a) => a.kind))).toEqual(new Set(['objetivo', 'item', 'especie', 'recorde']));
  });

  it('T86, PROG-04: medalhas e metas entram na linha do tempo no minuto da captura que as conquista, com a recompensa no saldo', () => {
    const base = testEpisode();
    const limits = { bronze: 1.5, prata: 2, ouro: 2.5 };
    const ep: Episode = { ...base, species: [{ ...base.species[0], medals: limits }] };
    const goals: GoalDef = { counts: [2, 5, 9], reward: (_ep, count) => count * 10 };
    const r = simulateEpisode(ep, newProfile(), 3, { goals });

    // Linha do tempo esperada, refeita a partir dos arremessos: cada medalha na primeira captura que
    // alcança o limite dela e cada meta na captura que completa a contagem.
    const expected: Achievement[] = [];
    const owned = new Set<string>();
    let seconds = 0;
    let caught = 0;
    let money = 0;
    for (const c of r.casts) {
      seconds += c.seconds;
      if (c.outcome !== 'Result_Caught') continue;
      const atMinute = seconds / 60;
      for (const tier of ['bronze', 'prata', 'ouro'] as const) {
        if (c.kg! >= limits[tier] && !owned.has(tier)) {
          owned.add(tier);
          expected.push({ atMinute, kind: 'medalha', id: `peixe:${tier}` });
        }
      }
      caught++;
      for (const count of goals.counts) {
        if (caught === count) {
          expected.push({ atMinute, kind: 'meta', id: goalId('peixe', count) });
          money += count * 10;
        }
      }
      money += c.value!;
    }

    const normalize = (xs: Achievement[]) =>
      xs
        .map((a) => ({ ...a, atMinute: Math.round(a.atMinute * 1e6) / 1e6 }))
        .sort((x, y) => x.atMinute - y.atMinute || x.kind.localeCompare(y.kind) || x.id.localeCompare(y.id));
    const awards = r.achievements.filter((a) => a.kind === 'medalha' || a.kind === 'meta');
    expect(normalize(awards)).toEqual(normalize(expected));
    expect(new Set(awards.map((a) => a.kind))).toEqual(new Set(['medalha', 'meta']));
    expect(r.profile.money).toBe(money); // só a Vara de Bambu: nenhuma compra
    expect(r.profile.goalsDone).toEqual(goals.counts.map((c) => goalId('peixe', c)));

    // Mesma semente, mesmo resultado.
    expect(simulateEpisode(ep, newProfile(), 3, { goals })).toEqual(r);
  });
});

// ---------- Pescaria nova (pesca-bass, SIMB-01 e SIMB-02) ----------

/** Um quadro do jogo a 30 quadros por segundo. */
const FRAME = 1 / 30;
const GEAR = { rod: BAMBU, bait: 'minhoca' };
const ZONE = testEpisode().locations[0].zones[0];
const PEIXE = testEpisode().species[0];

/** Isca na água a 8 m com os peixes do ponto; os `followers` primeiros seguem a isca. */
function lureState(followers: number): Extract<PescaState, { phase: 'Lure' }> {
  const w = spawnWater(ZONE, [PEIXE], 8, createRng(5), null, 'minhoca');
  const fish = w.fish.map((f, i) => (i < followers ? { ...f, mode: 'seguindo' as const, attackInS: 4 } : f));
  return { phase: 'Lure', gear: GEAR, water: { ...w, fish }, notice: null };
}

/** Raso com um peixe barato e um Fundão (alcance 5) com um peixe valioso, os dois na minhoca. */
function twoSpotEpisode(rods: Rod[]): Episode {
  const base = testEpisode(rods);
  const raso = base.locations[0].zones[0];
  const fundo = { ...raso, id: 'fundo', name: 'Fundão', minReach: 5, depthM: 4, species: ['dourado'] };
  const dourado = { ...base.species[0], id: 'dourado', name: 'Dourado', kg: { min: 4, max: 6 }, pricePerKg: 30 };
  return {
    ...base,
    locations: [{ ...base.locations[0], zones: [raso, fundo] }],
    species: [...base.species, dourado],
  };
}

describe('jogador típico com a pescaria nova', () => {
  it('SIMB-01: joga o Desafio pela pescaria nova; mesma semente, mesma linha do tempo, e outra semente, outra', () => {
    const a = simulateEpisode(testEpisode(), newProfile(), 42, { difficulty: 'desafio' });
    expect(simulateEpisode(testEpisode(), newProfile(), 42, { difficulty: 'desafio' })).toEqual(a);
    expect(simulateEpisode(testEpisode(), newProfile(), 43, { difficulty: 'desafio' }).achievements).not.toEqual(
      a.achievements,
    );
    expect(a.won).toBe(true);
    for (const c of a.casts) expect(['Result_Caught', 'Result_Escaped', 'Result_Nothing']).toContain(c.outcome);
  });

  it('SIMB-01, BRIGA-12: no Tranquilo nenhum peixe fisgado escapa', () => {
    for (const seed of [1, 2, 3]) {
      const r = simulateEpisode(testEpisode(), newProfile(), seed);
      expect(r.casts.map((c) => c.outcome)).not.toContain('Result_Escaped');
    }
  });

  it('SIMB-02: pesca no melhor ponto liberado; o ponto com cadeado fica de fora', () => {
    const LONGA: Rod = { id: 'longa', name: 'Vara Longa', price: 0, force: 3, reach: 5, episode: 1 };
    const caughtIn = (r: ReturnType<typeof simulateEpisode>) => new Set(r.casts.map((c) => c.species).filter(Boolean));

    // Bambu (alcance 2): o Fundão pede alcance 5 e fica com cadeado.
    const short = simulateEpisode(twoSpotEpisode([BAMBU]), newProfile(), 1);
    expect(caughtIn(short)).toEqual(new Set(['peixe']));

    // Vara Longa (alcance 5): o Fundão rende mais e o campeonato vai atrás do mais pesado.
    const owned = { ...newProfile(), rods: { owned: ['bambu', 'longa'], equipped: 'longa' } };
    const long = simulateEpisode(twoSpotEpisode([BAMBU, LONGA]), owned, 1);
    expect(caughtIn(long).has('dourado')).toBe(true);
    expect(long.casts.filter((c) => c.tournament && c.species).every((c) => c.species === 'dourado')).toBe(true);
  });

  it('SIMB-02: trava a força querendo a barra cheia e erra para menos, até 20%', () => {
    const rules = pescaRulesFor('desafio');
    const powers: number[] = [];
    for (let seed = 1; seed <= 200; seed++) {
      const player = typicalPlayer(createRng(seed), rules);
      let s: PescaState = { phase: 'Power', angleDeg: 0, sinceS: 0 };
      while (player(s, FRAME).button !== 'arremessar') s = { ...s, sinceS: s.sinceS + FRAME };
      powers.push(powerAt(s.sinceS, rules.sweepS));
    }
    expect(Math.min(...powers)).toBeGreaterThanOrEqual(0.8);
    expect(Math.max(...powers)).toBeLessThanOrEqual(1);
    expect(Math.min(...powers)).toBeLessThan(0.85); // o erro chega perto dos 20%
  });

  it('SIMB-02: recolhe direto e, quando um peixe segue a isca, toca PUXAR (um dedo só: sem RECOLHER)', () => {
    const player = typicalPlayer(createRng(1), pescaRulesFor('tranquilo'));
    const alone = lureState(0);
    for (let i = 0; i < 30; i++) expect(player(alone, FRAME)).toEqual({ holding: true, button: null });

    const followed = lureState(1);
    const inputs = Array.from({ length: 60 }, () => player(followed, FRAME)); // 2 s com o peixe seguindo
    expect(inputs.some((i) => i.holding)).toBe(false);
    expect(inputs.filter((i) => i.button === 'puxar').length).toBeGreaterThanOrEqual(1);
    expect(inputs.every((i) => i.button === null || i.button === 'puxar')).toBe(true);
  });

  it('SIMB-02: acerta a fisgada em 90% das vezes, dentro da janela', () => {
    const rules = pescaRulesFor('desafio'); // janela de 2 s
    const { water } = lureState(1);
    const rng = createRng(7);
    const N = 2000;
    let hooked = 0;
    for (let n = 0; n < N; n++) {
      const player = typicalPlayer(rng, rules);
      for (let i = 0; i * FRAME < rules.hookWindowS!; i++) {
        const s: PescaState = { phase: 'Strike', gear: GEAR, water, fishId: 1, sinceS: i * FRAME };
        if (player(s, FRAME).button === 'puxar') {
          hooked++;
          break;
        }
      }
    }
    expect(hooked / N).toBeGreaterThan(0.88);
    expect(hooked / N).toBeLessThan(0.92);
  });

  it('SIMB-02: na briga segura com o peixe acima do centro da faixa e solta com ele abaixo', () => {
    const bar = { ...startBar(PEIXE, BAMBU, barRulesFor('desafio'), createRng(1)), zoneY: 0.2, zoneH: 0.2 }; // centro em 0,3
    expect(holdPolicy(bar, 0.35)).toBe(true);
    expect(holdPolicy(bar, 0.25)).toBe(false);
  });

  it('SIMB-02: na briga reage ao peixe com 0,3 s de atraso', () => {
    const player = typicalPlayer(createRng(1), pescaRulesFor('desafio'));
    const { water } = lureState(1);
    const bar = { ...startBar(PEIXE, BAMBU, barRulesFor('desafio'), createRng(1)), zoneY: 0, zoneH: 0.2 }; // centro em 0,1
    const fight = (fishY: number): PescaState => ({ phase: 'Fight', gear: GEAR, water, fishId: 1, bar: { ...bar, fishY } });

    // O peixe passa para acima do centro no quadro 30 (1 s) e fica lá.
    let firstHold: number | null = null;
    for (let i = 0; i < 60; i++) {
      const holding = player(fight(i < 30 ? 0.05 : 0.5), FRAME).holding;
      if (holding && firstHold === null) firstHold = i * FRAME;
    }
    expect(firstHold).toBeCloseTo(1.3, 6);
    expect(REACTION_S).toBe(0.3);
  });
});
