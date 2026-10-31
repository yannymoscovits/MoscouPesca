import { describe, expect, it } from 'vitest';
import type { Profile, Species, TournamentDef } from '../content/types';
import type { FishingState } from './fishing';
import { applyVictory, recordCast, score, standings, start } from './tournament';

const DEF: TournamentDef = {
  id: 'guanambicup',
  name: 'GuanambiCup',
  casts: 8,
  countBest: 3,
  rivals: [
    { character: 'ricardo', kg: 5, taunt: { speaker: 'ricardo', text: 'Bongô!' } },
    { character: 'bem', kg: 7.5, taunt: { speaker: 'bem', text: 'Cerveja!' } },
    { character: 'kris', kg: 3.2, taunt: { speaker: 'kris', text: 'Prendrive!' } },
  ],
  trophy: 'trofeu-guanambicup',
  message: 'carta-guanambicup',
};

function species(id: string): Species {
  return {
    id,
    name: id,
    sprite: '',
    kg: { min: 0.1, max: 10 },
    pricePerKg: 10,
    power: 3,
    stamina: 3,
    baits: ['minhoca'],
    rarity: 1,
    description: '',
    rare: false,
  };
}

const caught = (id: string, kg: number): FishingState => ({
  phase: 'Result_Caught',
  species: species(id),
  kg,
  value: Math.round(kg * 10),
});

function profile(): Profile {
  return {
    version: 1,
    money: 120,
    rods: { owned: ['bambu'], equipped: 'bambu' },
    baits: { owned: ['minhoca'], equipped: 'minhoca' },
    settings: { difficulty: 'tranquilo', vibration: true },
    story: { episodes: {}, scenesSeen: [], pendingScene: null },
    unlockedEpisodes: [1],
    currentLocation: 'poco-do-magro',
    tutorialDone: true,
    charactersIntroduced: [],
    tournament: null,
    trophies: [],
    messagesUnlocked: [],
    album: {},
    medals: {},
    catchCounts: {},
    goalsDone: [],
    seenVersion: '',
  };
}

const FIVE_FISH: [string, number][] = [
  ['tilapia', 1.2],
  ['traira', 3.4],
  ['lambari', 0.5],
  ['tucunare', 2.25],
  ['piau', 0.8],
];

describe('pontuação', () => {
  it('CAMP-04: soma os 3 peixes mais pesados (5 peixes de teste)', () => {
    let run = start(DEF);
    for (const [id, kg] of FIVE_FISH) run = recordCast(run, caught(id, kg));
    expect(score(run)).toBe(6.85); // 3,40 + 2,25 + 1,20
  });

  it('CAMP-04: a soma sai exata em kg com 2 casas (1,10 + 2,20 + 0,40 = 3,70)', () => {
    let run = start(DEF);
    for (const kg of [1.1, 2.2, 0.4]) run = recordCast(run, caught('tilapia', kg));
    expect(score(run)).toBe(3.7);
  });

  it('CAMP-04: com menos de 3 peixes, soma os que tiver; sem peixe, zero', () => {
    expect(score(start(DEF))).toBe(0);
    expect(score(recordCast(start(DEF), caught('tilapia', 1.5)))).toBe(1.5);
  });
});

describe('arremessos', () => {
  it('Formato do torneio: começa com 8 arremessos e nenhum peixe', () => {
    expect(start(DEF)).toEqual({ id: 'guanambicup', castsLeft: 8, catches: [] });
  });

  it('SAVE-06: só um resultado gasta arremesso; estados antes do resultado (briga interrompida) não gastam', () => {
    const run = start(DEF);
    const fight: FishingState = {
      phase: 'Fight',
      gear: { rod: { id: 'bambu', name: 'Bambu', price: 0, force: 1, reach: 2, episode: 1 }, bait: 'minhoca' },
      at: { x: 0, y: 0 },
      species: species('tilapia'),
      maxTension: 99,
      tension: 40,
      distance: 30,
      atMaxS: 0,
      fightS: 5,
    };
    for (const s of [fight, { phase: 'Idle' } as FishingState]) {
      expect(recordCast(run, s)).toEqual({ id: 'guanambicup', castsLeft: 8, catches: [] });
    }

    const afterCatch = recordCast(run, caught('tilapia', 1.2));
    expect(afterCatch.castsLeft).toBe(7);
    expect(afterCatch.catches).toEqual([{ species: 'tilapia', kg: 1.2 }]);
  });

  it('Formato do torneio: arremesso sem peixe (escapou, arrebentou, nada) gasta o arremesso e não soma peso', () => {
    let run = start(DEF);
    for (const phase of ['Result_Escaped', 'Result_Broken', 'Result_Nothing'] as const) {
      run = recordCast(run, { phase });
    }
    expect(run.castsLeft).toBe(5);
    expect(run.catches).toEqual([]);
  });

  it('Formato do torneio: depois do 8º arremesso, nenhum resultado conta', () => {
    let run = start(DEF);
    for (let i = 0; i < 8; i++) run = recordCast(run, caught('tilapia', 1));
    const extra = recordCast(run, caught('traira', 9));
    expect(extra.castsLeft).toBe(0);
    expect(extra.catches).toHaveLength(8);
    expect(score(extra)).toBe(3);
  });
});

describe('classificação', () => {
  it('CAMP-05: depois do 8º arremesso, ordena o jogador e os 3 rivais pela pontuação', () => {
    let run = start(DEF);
    for (const [id, kg] of FIVE_FISH) run = recordCast(run, caught(id, kg));
    for (let i = 0; i < 3; i++) run = recordCast(run, { phase: 'Result_Escaped' });
    expect(run.castsLeft).toBe(0);

    expect(standings(run, DEF)).toEqual([
      { isPlayer: false, character: 'bem', kg: 7.5 },
      { isPlayer: true, kg: 6.85 },
      { isPlayer: false, character: 'ricardo', kg: 5 },
      { isPlayer: false, character: 'kris', kg: 3.2 },
    ]);
  });

  it('CAMP-05 (empate, gap da spec): empatado com um rival, o jogador fica à frente', () => {
    let run = start(DEF);
    for (const kg of [4, 3.5]) run = recordCast(run, caught('traira', kg));
    expect(standings(run, DEF)[0]).toEqual({ isPlayer: true, kg: 7.5 });
    expect(standings(run, DEF)[1]).toEqual({ isPlayer: false, character: 'bem', kg: 7.5 });
  });
});

describe('vitória e derrota', () => {
  it('CAMP-06, CAMP-07: a primeira vitória adiciona o troféu e desbloqueia a carta do campeonato', () => {
    const p = applyVictory(profile(), DEF);
    expect(p.trophies).toEqual(['trofeu-guanambicup']);
    expect(p.messagesUnlocked).toEqual(['carta-guanambicup']);
  });

  it('CAMP-08: vencer de novo mantém um único troféu e uma única carta', () => {
    const twice = applyVictory(applyVictory(profile(), DEF), DEF);
    expect(twice.trophies).toEqual(['trofeu-guanambicup']);
    expect(twice.messagesUnlocked).toEqual(['carta-guanambicup']);
  });

  it('CAMP-09: depois de uma derrota, start de novo zera a rodada, sem custo e quantas vezes quiser', () => {
    let lost = start(DEF);
    for (let i = 0; i < 8; i++) lost = recordCast(lost, caught('lambari', 0.3));
    expect(standings(lost, DEF)[0].isPlayer).toBe(false);

    // start não recebe o perfil: recomeçar não mexe no saldo.
    for (let attempt = 0; attempt < 20; attempt++) {
      expect(start(DEF)).toEqual({ id: 'guanambicup', castsLeft: 8, catches: [] });
    }
  });
});
