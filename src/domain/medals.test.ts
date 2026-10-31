// Medalhas por peso e metas de quantidade por espécie (design.md, "Domain: medals"; MEDAL-01 a MEDAL-07).
import { describe, expect, it } from 'vitest';
import type { GoalDef, Species } from '../content/types';
import { goalId, onCatch, progress } from './medals';
import { newProfile } from './profile';

/** Tilápia de teste: bronze a partir de 1 kg, prata de 1,5 kg e ouro de 2 kg. */
const TILAPIA: Species = {
  id: 'tilapia',
  name: 'Tilápia',
  sprite: '',
  kg: { min: 0.5, max: 2.5 },
  pricePerKg: 8,
  power: 2,
  stamina: 3,
  baits: ['minhoca'],
  rarity: 10,
  description: '',
  rare: false,
  medals: { bronze: 1, prata: 1.5, ouro: 2 },
};
const PIAU: Species = { ...TILAPIA, id: 'piau', medals: { bronze: 0.4, prata: 0.8, ouro: 1.1 } };

/** Metas de 10, 25 e 50; a recompensa diz o episódio e a meta (ex.: Ep. 2, 25 → 2025). */
const GOALS: GoalDef = { counts: [10, 25, 50], reward: (episode, count) => episode * 1000 + count };

/** Pega `n` peixes da espécie, um atrás do outro, com o peso dado. */
function catchMany(n: number, species = TILAPIA, kg = 0.6, episode: 1 | 2 = 1) {
  let p = newProfile();
  const results = [];
  for (let i = 0; i < n; i++) {
    const r = onCatch(p, species, kg, GOALS, episode);
    results.push(r);
    p = r.profile;
  }
  return { profile: p, results };
}

describe('medalhas', () => {
  it('MEDAL-07: o perfil novo começa sem medalhas, sem contagens e sem metas cumpridas', () => {
    const p = newProfile();
    expect(p.medals).toEqual({});
    expect(p.catchCounts).toEqual({});
    expect(p.goalsDone).toEqual([]);
  });

  it('MEDAL-02: peixe abaixo do bronze não dá medalha; o que alcança o bronze dá o bronze', () => {
    const below = onCatch(newProfile(), TILAPIA, 0.99, GOALS, 1);
    expect(below.medals).toEqual([]);
    expect(below.profile.medals.tilapia ?? []).toEqual([]);

    const bronze = onCatch(below.profile, TILAPIA, 1, GOALS, 1);
    expect(bronze.medals).toEqual(['bronze']);
    expect(bronze.profile.medals.tilapia).toEqual(['bronze']);
  });

  it('MEDAL-02: um peixe que alcança prata e ouro de uma vez concede as duas, junto com o bronze que faltava', () => {
    const profile = onCatch(newProfile(), TILAPIA, 1.2, GOALS, 1).profile; // já com o bronze
    const r = onCatch(profile, TILAPIA, 2.3, GOALS, 1);
    expect(r.medals).toEqual(['prata', 'ouro']);
    expect(r.profile.medals.tilapia).toEqual(['bronze', 'prata', 'ouro']);

    const all = onCatch(newProfile(), TILAPIA, 2, GOALS, 1);
    expect(all.medals).toEqual(['bronze', 'prata', 'ouro']);
  });

  it('MEDAL-03: medalha que já existe não é concedida de novo', () => {
    const first = onCatch(newProfile(), TILAPIA, 1.6, GOALS, 1);
    expect(first.medals).toEqual(['bronze', 'prata']);
    const again = onCatch(first.profile, TILAPIA, 1.7, GOALS, 1);
    expect(again.medals).toEqual([]);
    expect(again.profile.medals.tilapia).toEqual(['bronze', 'prata']);
  });

  it('MEDAL-01: as medalhas são de cada espécie: o ouro da tilápia não conta para o piau', () => {
    const p = onCatch(newProfile(), TILAPIA, 2.4, GOALS, 1).profile;
    const r = onCatch(p, PIAU, 0.5, GOALS, 1);
    expect(r.medals).toEqual(['bronze']);
    expect(r.profile.medals).toEqual({ tilapia: ['bronze', 'prata', 'ouro'], piau: ['bronze'] });
  });
});

describe('metas', () => {
  it('MEDAL-04: cada captura conta para a espécie pega', () => {
    const { profile } = catchMany(3);
    const p = onCatch(profile, PIAU, 0.3, GOALS, 1).profile;
    expect(p.catchCounts).toEqual({ tilapia: 3, piau: 1 });
  });

  it('MEDAL-04, MEDAL-05: a 10ª, a 25ª e a 50ª captura cumprem as metas, cada uma uma vez só, e somam a recompensa ao saldo', () => {
    const { profile, results } = catchMany(60, TILAPIA, 0.6, 2);
    const done = results.flatMap((r, i) => r.goalsDone.map((id) => ({ catchNo: i + 1, id, reward: r.reward })));
    expect(done).toEqual([
      { catchNo: 10, id: goalId('tilapia', 10), reward: 2010 },
      { catchNo: 25, id: goalId('tilapia', 25), reward: 2025 },
      { catchNo: 50, id: goalId('tilapia', 50), reward: 2050 },
    ]);
    for (const [i, r] of results.entries()) {
      if (![10, 25, 50].includes(i + 1)) expect(r.reward, `captura ${i + 1}`).toBe(0);
    }
    expect(profile.goalsDone).toEqual([goalId('tilapia', 10), goalId('tilapia', 25), goalId('tilapia', 50)]);
    expect(profile.money).toBe(2010 + 2025 + 2050); // o peixe em si entra no saldo pela ficha (PESCA-17)
  });

  it('MEDAL-05: a recompensa cresce com o episódio da espécie', () => {
    const ep1 = catchMany(10, TILAPIA, 0.6, 1).results[9];
    const ep2 = catchMany(10, TILAPIA, 0.6, 2).results[9];
    expect(ep1.reward).toBe(1010);
    expect(ep2.reward).toBe(2010);
  });

  it('MEDAL-05: meta já cumprida não paga de novo, mesmo com a contagem passando dela outra vez', () => {
    const { profile } = catchMany(10);
    const replay = onCatch({ ...profile, catchCounts: { tilapia: 9 } }, TILAPIA, 0.6, GOALS, 1);
    expect(replay.goalsDone).toEqual([]);
    expect(replay.reward).toBe(0);
    expect(replay.profile.money).toBe(profile.money);
  });
});

describe('progresso no álbum', () => {
  it('MEDAL-06: espécie nunca pega: sem medalhas, contagem 0 e próxima meta 10', () => {
    expect(progress(newProfile(), 'tilapia', GOALS)).toEqual({ medals: [], count: 0, next: 10 });
  });

  it('MEDAL-06: depois da 10ª captura, "10 de 25" com as medalhas conquistadas', () => {
    let { profile } = catchMany(9);
    profile = onCatch(profile, TILAPIA, 1.6, GOALS, 1).profile;
    expect(progress(profile, 'tilapia', GOALS)).toEqual({ medals: ['bronze', 'prata'], count: 10, next: 25 });
  });

  it('MEDAL-06: com as 3 metas cumpridas, não há próxima meta', () => {
    const { profile } = catchMany(50);
    expect(progress(profile, 'tilapia', GOALS)).toEqual({ medals: [], count: 50, next: null });
  });
});
