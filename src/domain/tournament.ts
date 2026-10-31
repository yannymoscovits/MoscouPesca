// Torneio: 8 arremessos, soma dos 3 mais pesados, classificação e vitória (design.md, "Domain: tournament").
// As mesmas regras valem para os 5 campeonatos; só os dados mudam.

import type { CharacterId, Profile, TournamentDef, TournamentRun } from '../content/types';
import type { PescaState } from './pesca';

/** Quantos peixes contam na pontuação (TournamentDef.countBest). */
const COUNT_BEST = 3;

export type Standing = { isPlayer: true; kg: number } | { isPlayer: false; character: CharacterId; kg: number };

export function start(def: TournamentDef): TournamentRun {
  return { id: def.id, castsLeft: def.casts, catches: [] };
}

/**
 * Registra o fim de um arremesso. Recebe qualquer estado da pesca: só os resultados gastam
 * arremesso, então uma briga interrompida (app fechado) não gasta nada (SAVE-06).
 */
export function recordCast(run: TournamentRun, result: PescaState): TournamentRun {
  if (run.castsLeft <= 0 || !result.phase.startsWith('Result_')) return run;
  const catches =
    result.phase === 'Result_Caught' ? [...run.catches, { species: result.species.id, kg: result.kg }] : run.catches;
  return { ...run, castsLeft: run.castsLeft - 1, catches };
}

/** CAMP-04: soma dos 3 mais pesados, em kg com 2 casas. */
export function score(run: TournamentRun): number {
  const best = run.catches
    .map((c) => c.kg)
    .sort((a, b) => b - a)
    .slice(0, COUNT_BEST);
  return Math.round(best.reduce((sum, kg) => sum + kg, 0) * 100) / 100;
}

/** CAMP-05: jogador e rivais do maior para o menor; no empate, o jogador fica à frente. */
export function standings(run: TournamentRun, def: TournamentDef): Standing[] {
  const player: Standing = { isPlayer: true, kg: score(run) };
  const rivals: Standing[] = def.rivals.map((r) => ({ isPlayer: false, character: r.character, kg: r.kg }));
  // sort é estável: o jogador vem primeiro na lista e continua à frente dos rivais empatados.
  return [player, ...rivals].sort((a, b) => b.kg - a.kg);
}

/** CAMP-06 a CAMP-08: troféu e carta do campeonato, uma vez só. */
export function applyVictory(p: Profile, def: TournamentDef): Profile {
  return {
    ...p,
    trophies: p.trophies.includes(def.trophy) ? p.trophies : [...p.trophies, def.trophy],
    messagesUnlocked: p.messagesUnlocked.includes(def.message) ? p.messagesUnlocked : [...p.messagesUnlocked, def.message],
  };
}
