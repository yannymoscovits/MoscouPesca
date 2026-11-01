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
  | 'briga' // segurar e soltar SEGURAR para manter o peixe na faixa até o medidor encher
  | 'done';

/** Os passos em ordem: a lição de cada um aparece numa vez só e a contagem "Passo N de 7" vem daqui. */
export const TUTORIAL_STEPS: TutorialPescaStep[] = ['ponto', 'direcao', 'forca', 'recolher', 'atrair', 'fisgar', 'briga'];

export interface TutorialPescaState {
  step: TutorialPescaStep;
  idleS: number; // segundos sem toque no passo atual
  nudge: boolean; // repetir a instrução e piscar a seta (TUTO-07 da v1)
  reading: boolean; // TUTOB-05: a dica acabou de mudar e o jogo espera a pessoa ler
  praiseS: number; // TUTOB-06: segundos de "Isso!" antes da lição seguinte aparecer
}

/** Sem toque por este tempo num passo, a instrução se repete (TUTO-07 da v1). */
export const NUDGE_AFTER_S = 10;
/** TUTOB-02: um peixe que aceita a isca segue em até 3 s. */
export const TUTORIAL_FOLLOW_S = 3;
/** TUTOB-06: quanto tempo o "Isso!" fica na tela depois de um passo cumprido. */
export const PRAISE_S = 1.4;
/** TUTOB-07: no tutorial, a seta da mira e a barra de força andam mais devagar. */
export const TUTORIAL_SWEEP_SCALE = 1.6;

const EPS = 1e-9;

export function start(): TutorialPescaState {
  return { step: 'ponto', idleS: 0, nudge: false, reading: true, praiseS: 0 };
}

/** TUTOB-06: o "Isso!" corre mesmo com o jogo parado esperando a leitura. */
export function tickPraise(t: TutorialPescaState, dt: number): TutorialPescaState {
  return t.praiseS > 0 ? { ...t, praiseS: Math.max(0, t.praiseS - dt) } : t;
}

/** TUTOB-05: a pessoa leu a lição e tocou em "Entendi": o jogo volta a andar. */
export function read(t: TutorialPescaState): TutorialPescaState {
  return t.reading ? { ...t, reading: false } : t;
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
    case 'Fight':
      return 'briga';
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
  if (step === t.step) return t;
  // Andou para a frente: "Isso!" antes da lição nova. Voltou (nada dessa vez): direto à lição de mirar.
  const forward = TUTORIAL_STEPS.indexOf(step) > TUTORIAL_STEPS.indexOf(t.step) || step === 'done';
  return { step, idleS: 0, nudge: false, reading: step !== 'done', praiseS: forward && t.step !== 'ponto' ? PRAISE_S : 0 };
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
  const base = rulesFor(d);
  const tranquiloBar = barRulesFor('tranquilo');
  return {
    ...base,
    sweepS: base.sweepS * TUTORIAL_SWEEP_SCALE, // TUTOB-07
    hookWindowS: null,
    followWithinS: TUTORIAL_FOLLOW_S,
    // TUTOB-07: faixa maior e peixe mais lento que no Tranquilo, para aprender sem aperto.
    bar: { ...tranquiloBar, style: 'calmo', zoneScale: tranquiloBar.zoneScale * 1.3, fishSpeedScale: tranquiloBar.fishSpeedScale * 0.6, tensionScale: 0 },
  };
}
