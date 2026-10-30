// Tutorial da primeira pescaria (design.md, "Domain: tutorial").
// Só lê o estado da pesca: as mesmas funções de fishing.ts rodam com regras mais folgadas.

import type { Difficulty } from '../content/types';
import { rulesFor, tensionBand, type FishingRules, type FishingState } from './fishing';

export type TutorialStep = 'cast' | 'wait' | 'hook' | 'reel' | 'release' | 'done';

export interface TutorialState {
  step: TutorialStep;
  idleS: number; // segundos sem toque no passo atual
  nudge: boolean; // repetir a instrução e piscar a seta (TUTO-07)
}

/** Sem toque por este tempo num passo, a instrução se repete (TUTO-07). */
export const NUDGE_AFTER_S = 10;

/** TUTO-04 a TUTO-06: mordida em até 5 s, peixe sem prazo para fisgar, tensão até 99. */
export const TUTORIAL_RULES: FishingRules = {
  biteS: { min: 2, max: 5 },
  giveUpS: 15,
  hookWindowS: null,
  maxTension: 99,
};

const EPS = 1e-9;

export function start(): TutorialState {
  return { step: 'cast', idleS: 0, nudge: false };
}

function stepFor(current: TutorialStep, f: FishingState): TutorialStep {
  switch (f.phase) {
    case 'Result_Caught':
      return 'done';
    case 'Flying':
    case 'Waiting':
      return 'wait';
    case 'Bite':
      return 'hook';
    case 'Fight':
      return current === 'release' || tensionBand(f.tension) === 'vermelho' ? 'release' : 'reel';
    default:
      return 'cast'; // Idle ou arremesso sem peixe: arremessa de novo
  }
}

/** TUTO-03, TUTO-08: o passo acompanha o estado da pesca; peixe pego encerra. */
export function onFishing(t: TutorialState, f: FishingState): TutorialState {
  if (t.step === 'done') return t;
  const step = stepFor(t.step, f);
  return step === t.step ? t : { step, idleS: 0, nudge: false };
}

/** TUTO-07: conta o tempo sem toque no passo atual. */
export function tick(t: TutorialState, dt: number, touched: boolean): TutorialState {
  if (t.step === 'done') return t;
  if (touched) return { ...t, idleS: 0, nudge: false };
  const idleS = t.idleS + dt;
  return { ...t, idleS, nudge: idleS >= NUDGE_AFTER_S - EPS };
}

// SPEC_DEVIATION: recebe também a dificuldade.
// Reason: depois do fim do tutorial, devolve as regras normais da dificuldade escolhida.
export function rules(t: TutorialState, d: Difficulty): FishingRules {
  return t.step === 'done' ? rulesFor(d) : TUTORIAL_RULES;
}
