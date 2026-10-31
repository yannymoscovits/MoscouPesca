// Tutorial da pescaria nova: os passos da Jane e as regras folgadas (design.md da pesca-bass,
// "tutorialPesca"). Só lê o estado da pesca: pesca.ts roda o mesmo, com as regras daqui.

import type { Difficulty } from '../content/types';
import { barRulesFor } from './catchBar';
import { rulesFor, type PescaRules, type PescaState } from './pesca';

/** TUTOB-01, na ordem da spec; 'done' depois do primeiro peixe. */
export type TutorialPescaStep =
  | 'ponto' // escolher o ponto
  | 'direcao' // travar a direção
  | 'forca' // travar a força
  | 'recolher' // segurar RECOLHER
  | 'atrair' // tocar PUXAR para atrair o peixe que segue
  | 'fisgar' // apertar PUXAR no "FISGAR!"
  | 'subir' // segurar SEGURAR para subir a faixa
  | 'descer' // soltar para a faixa descer
  | 'manter' // manter o peixe na faixa até o medidor encher
  | 'done';

export interface TutorialPescaState {
  step: TutorialPescaStep;
  idleS: number; // segundos sem toque no passo atual
  nudge: boolean; // repetir a instrução e piscar a seta (TUTO-07 da v1)
}

/** Sem toque por este tempo num passo, a instrução se repete (TUTO-07 da v1). */
export const NUDGE_AFTER_S = 10;
/** TUTOB-02: um peixe que aceita a isca segue em até 3 s. */
export const TUTORIAL_FOLLOW_S = 3;
/** A faixa subiu de verdade quando a base dela passa disto (o quique no fundo fica bem abaixo). */
export const TUTORIAL_RISE_Y = 0.1;

const EPS = 1e-9;
const FIGHT_STEPS: TutorialPescaStep[] = ['subir', 'descer', 'manter'];

export function start(): TutorialPescaState {
  return { step: 'ponto', idleS: 0, nudge: false };
}

function stepFor(current: TutorialPescaStep, s: PescaState, spotChosen: boolean): TutorialPescaStep {
  if (!spotChosen) return 'ponto';
  switch (s.phase) {
    case 'Aim':
      return 'direcao';
    case 'Power':
      return 'forca';
    case 'Flying':
      return 'recolher';
    case 'Lure':
      return s.water.fish.some((f) => f.mode === 'seguindo') ? 'atrair' : 'recolher';
    case 'Strike':
      return 'fisgar';
    case 'Fight': {
      if (!FIGHT_STEPS.includes(current)) return 'subir';
      if (current === 'subir') return s.bar.zoneY >= TUTORIAL_RISE_Y ? 'descer' : 'subir';
      if (current === 'descer') return s.bar.zoneV < 0 ? 'manter' : 'descer';
      return 'manter';
    }
    case 'Result_Caught':
      return 'done';
    default:
      return 'direcao'; // nada dessa vez: arremessa de novo do mesmo ponto
  }
}

/** TUTOB-01: o passo acompanha a escolha do ponto e o estado da pesca; peixe pego encerra. */
export function onPesca(t: TutorialPescaState, s: PescaState, spotChosen: boolean): TutorialPescaState {
  if (t.step === 'done') return t;
  const step = stepFor(t.step, s, spotChosen);
  return step === t.step ? t : { step, idleS: 0, nudge: false };
}

/** TUTO-07 da v1: conta o tempo sem toque no passo atual. */
export function tick(t: TutorialPescaState, dt: number, touched: boolean): TutorialPescaState {
  if (t.step === 'done') return t;
  if (touched) return { ...t, idleS: 0, nudge: false };
  const idleS = t.idleS + dt;
  return { ...t, idleS, nudge: idleS >= NUDGE_AFTER_S - EPS };
}

/** TUTOB-02 a TUTOB-04 enquanto o tutorial está ativo; depois, as regras da dificuldade. */
export function rules(t: TutorialPescaState, d: Difficulty): PescaRules {
  if (t.step === 'done') return rulesFor(d);
  return {
    ...rulesFor(d),
    hookWindowS: null,
    followWithinS: TUTORIAL_FOLLOW_S,
    bar: { ...barRulesFor('tranquilo'), style: 'calmo' },
  };
}
