// Medalhas por peso e metas de quantidade por espécie (design.md, "Domain: medals").
// Bronze, prata e ouro vêm dos limites da espécie (MEDAL-01); as metas, do GoalDef do conteúdo (MEDAL-04).

import type { GoalDef, GoalId, MedalTier, Profile, Species, SpeciesId } from '../content/types';

export const TIERS: MedalTier[] = ['bronze', 'prata', 'ouro'];

/** Meta de `count` capturas da espécie, como fica em `Profile.goalsDone`. */
export const goalId = (species: SpeciesId, count: number): GoalId => `${species}:${count}`;

export interface CatchOutcome {
  profile: Profile; // com medalhas, contagem e metas; o saldo não muda (MEDAL-05)
  medals: MedalTier[]; // medalhas novas deste peixe, de bronze para ouro (MEDAL-02)
  goalsDone: GoalId[]; // metas cumpridas agora (MEDAL-05)
}

/**
 * Conta a captura: concede as medalhas que o peso alcança e o jogador ainda não tem (MEDAL-02, MEDAL-03)
 * e cumpre, uma vez só, as metas que a contagem alcança (MEDAL-05).
 */
export function onCatch(p: Profile, species: Species, kg: number, goals: GoalDef, countForGoals = true): CatchOutcome {
  const id = species.id;
  const owned = p.medals[id] ?? [];
  const medals = TIERS.filter((tier) => kg >= species.medals[tier] && !owned.includes(tier));

  const count = (p.catchCounts[id] ?? 0) + (countForGoals ? 1 : 0);
  const reached = countForGoals ? [...goals.counts].sort((a, b) => a - b).filter((c) => count >= c && !p.goalsDone.includes(goalId(id, c))) : [];
  const goalsDone = reached.map((c) => goalId(id, c));

  const profile: Profile = {
    ...p,
    medals: medals.length > 0 ? { ...p.medals, [id]: TIERS.filter((t) => owned.includes(t) || medals.includes(t)) } : p.medals,
    catchCounts: { ...p.catchCounts, [id]: count },
    goalsDone: goalsDone.length > 0 ? [...p.goalsDone, ...goalsDone] : p.goalsDone,
  };
  return { profile, medals, goalsDone };
}

/** MEDAL-06: medalhas da espécie, quantas já foram pegas e a próxima meta (null quando todas passaram). */
export function progress(p: Profile, species: SpeciesId, goals: GoalDef): { medals: MedalTier[]; count: number; next: number | null } {
  const count = p.catchCounts[species] ?? 0;
  const next = [...goals.counts].sort((a, b) => a - b).find((c) => c > count) ?? null;
  return { medals: p.medals[species] ?? [], count, next };
}
