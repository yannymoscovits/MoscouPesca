// Jogador típico simulado (design.md, "Domain: typical player simulation"): o instrumento que mede
// a progressão (PROG-01, PROG-04, PROG-05). Os episódios aqui são de teste, pequenos e previsíveis.
import { describe, expect, it } from 'vitest';
import type { Episode, Rod } from '../../content/types';
import { rulesFor } from '../fishing';
import { newProfile } from '../profile';
import { FIGHT_START_DISTANCE, REEL_SPEED } from '../tuning';
import { CARD_S, simulateEpisode, type Achievement } from './typicalPlayer';

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
        medals: { bronze: 2, prata: 2.5, ouro: 2.8 },
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
    // Cada arremesso com peixe inclui a espera (mordida a partir de 3 s), a briga (recolher a linha
    // toda leva pelo menos distância ÷ velocidade) e a ficha.
    const minimum = rulesFor('tranquilo').biteS.min + FIGHT_START_DISTANCE / REEL_SPEED + CARD_S;
    for (const c of r.casts) expect(c.seconds).toBeGreaterThanOrEqual(minimum);
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
});
