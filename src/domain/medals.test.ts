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
  power: 2,
  stamina: 3,
  baits: ['minhoca'],
  rarity: 10,
  description: '',
  rare: false,
  medals: { bronze: 1, prata: 1.5, ouro: 2 },
};
const PIAU: Species = { ...TILAPIA, id: 'piau', medals: { bronze: 0.4, prata: 0.8, ouro: 1.1 } };

const GOALS: GoalDef = { counts: [10, 25, 50] };

/** Pega `n` peixes da espécie, um atrás do outro, com o peso dado. */
function catchMany(n: number, species = TILAPIA, kg = 0.6) {
  let p = newProfile();
  const results = [];
  for (let i = 0; i < n; i++) {
    const r = onCatch(p, species, kg, GOALS);
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
    const below = onCatch(newProfile(), TILAPIA, 0.99, GOALS);
    expect(below.medals).toEqual([]);
    expect(below.profile.medals.tilapia ?? []).toEqual([]);

    const bronze = onCatch(below.profile, TILAPIA, 1, GOALS);
    expect(bronze.medals).toEqual(['bronze']);
    expect(bronze.profile.medals.tilapia).toEqual(['bronze']);
  });

  it('MEDAL-02: um peixe que alcança prata e ouro de uma vez concede as duas, junto com o bronze que faltava', () => {
    const profile = onCatch(newProfile(), TILAPIA, 1.2, GOALS).profile; // já com o bronze
    const r = onCatch(profile, TILAPIA, 2.3, GOALS);
    expect(r.medals).toEqual(['prata', 'ouro']);
    expect(r.profile.medals.tilapia).toEqual(['bronze', 'prata', 'ouro']);

    const all = onCatch(newProfile(), TILAPIA, 2, GOALS);
    expect(all.medals).toEqual(['bronze', 'prata', 'ouro']);
  });

  it('MEDAL-03: medalha que já existe não é concedida de novo', () => {
    const first = onCatch(newProfile(), TILAPIA, 1.6, GOALS);
    expect(first.medals).toEqual(['bronze', 'prata']);
    const again = onCatch(first.profile, TILAPIA, 1.7, GOALS);
    expect(again.medals).toEqual([]);
    expect(again.profile.medals.tilapia).toEqual(['bronze', 'prata']);
  });

  it('MEDAL-01: as medalhas são de cada espécie: o ouro da tilápia não conta para o piau', () => {
    const p = onCatch(newProfile(), TILAPIA, 2.4, GOALS).profile;
    const r = onCatch(p, PIAU, 0.5, GOALS);
    expect(r.medals).toEqual(['bronze']);
    expect(r.profile.medals).toEqual({ tilapia: ['bronze', 'prata', 'ouro'], piau: ['bronze'] });
  });
});

describe('metas', () => {
  it('MEDAL-04: cada captura conta para a espécie pega', () => {
    const { profile } = catchMany(3);
    const p = onCatch(profile, PIAU, 0.3, GOALS).profile;
    expect(p.catchCounts).toEqual({ tilapia: 3, piau: 1 });
  });

  it('MEDAL-04, MEDAL-05: a 10ª, a 25ª e a 50ª captura cumprem as metas, cada uma uma vez só, sem mexer no saldo', () => {
    const { profile, results } = catchMany(60);
    const done = results.flatMap((r, i) => r.goalsDone.map((id) => ({ catchNo: i + 1, id })));
    expect(done).toEqual([
      { catchNo: 10, id: goalId('tilapia', 10) },
      { catchNo: 25, id: goalId('tilapia', 25) },
      { catchNo: 50, id: goalId('tilapia', 50) },
    ]);
    expect(profile.goalsDone).toEqual([goalId('tilapia', 10), goalId('tilapia', 25), goalId('tilapia', 50)]);
    expect(profile.money).toBe(0); // HIST-11: só os objetivos da história dão dinheiro
  });

  it('MEDAL-05: meta já cumprida não conta de novo, mesmo com a contagem passando dela outra vez', () => {
    const { profile } = catchMany(10);
    const replay = onCatch({ ...profile, catchCounts: { tilapia: 9 } }, TILAPIA, 0.6, GOALS);
    expect(replay.goalsDone).toEqual([]);
    expect(replay.profile.goalsDone).toEqual(profile.goalsDone);
  });
});

describe('progresso no álbum', () => {
  it('MEDAL-06: espécie nunca pega: sem medalhas, contagem 0 e próxima meta 10', () => {
    expect(progress(newProfile(), 'tilapia', GOALS)).toEqual({ medals: [], count: 0, next: 10 });
  });

  it('MEDAL-06: depois da 10ª captura, "10 de 25" com as medalhas conquistadas', () => {
    let { profile } = catchMany(9);
    profile = onCatch(profile, TILAPIA, 1.6, GOALS).profile;
    expect(progress(profile, 'tilapia', GOALS)).toEqual({ medals: ['bronze', 'prata'], count: 10, next: 25 });
  });

  it('MEDAL-06: com as 3 metas cumpridas, não há próxima meta', () => {
    const { profile } = catchMany(50);
    expect(progress(profile, 'tilapia', GOALS)).toEqual({ medals: [], count: 50, next: null });
  });
});
