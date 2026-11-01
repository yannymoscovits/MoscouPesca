// Barra de captura da briga, no estilo Stardew (design.md da pesca-bass, "catchBar").
// A física vem do código de conceito do usuário, convertida de quadros para segundos.
// Alturas em barras: 0 é o fundo e 1 o topo. Um `dt` maior que BAR_MAX_STEP_S vira passos
// iguais e menores, para a briga andar igual em qualquer celular e na simulação.

import type { Difficulty, FightStyle, Rod, Species } from '../content/types';
import type { Rng } from './rng';
import {
  BAR_BOUNCE,
  BAR_BRAKE_SCALE,
  BAR_GRAVITY,
  BAR_HOLD_ACCEL,
  BAR_PRESS_KICK,
  BAR_MAX_SPEED,
  BAR_MAX_STEP_S,
  BAR_ZONE_BASE,
  BAR_ZONE_PER_FORCE,
  CALM_JUMP,
  CALM_MAX_POWER,
  EPISODE_FISH_FILL_STEP,
  EPISODE_FISH_SPEED_STEP,
  FISH_APPROACH_PER_S,
  FISH_RETARGET_S,
  FISH_SPEED_BASE,
  FISH_SPEED_PER_POWER,
  LEAP_JUMP,
  METER_DRAIN_PER_S,
  METER_FILL_LOSS_PER_STAMINA,
  METER_FILL_PER_S,
  METER_START,
  SALTADOR_REST,
  SINKER_DIVE,
  WEIGHT_FIGHT_EXP,
  WEIGHT_FIGHT_MAX,
  WEIGHT_REF_KG,
  TENSION_FALL_PER_S,
  TENSION_RISE_PER_S,
  TRANQUILO_TENSION_SCALE,
  SINKER_SURGE_CHANCE,
  SINKER_TOP,
  MOVE_BASE,
  MOVE_PER_POWER,
  TRANQUILO_FISH_SPEED_SCALE,
  TRANQUILO_METER_FLOOR,
  TRANQUILO_RETARGET_SCALE,
  TRANQUILO_ZONE_SCALE,
} from './tuning';

/** Regras da barra por dificuldade; o tutorial passa as do Tranquilo com o jeito calmo. */
export interface BarRules {
  zoneScale: number; // × altura da faixa
  fishSpeedScale: number; // × velocidade do peixe
  retargetScale: number; // × tempo entre destinos
  drainPerS: number; // medidor perdido por segundo com o peixe fora da faixa
  meterFloor: number; // o medidor não desce disso
  tensionScale: number; // BRIGA-20: x velocidade da tensão da linha (0 = a linha nunca arrebenta)
  style?: FightStyle; // jeito para qualquer peixe, no lugar do da espécie (TUTOB-04)
}

export interface CatchBar {
  style: FightStyle;
  zoneY: number; // base da faixa verde
  zoneV: number; // velocidade da faixa; positiva para cima
  zoneH: number; // altura da faixa
  fishY: number; // centro do peixe
  fishTarget: number;
  retargetInS: number; // tempo até o próximo destino
  meter: number; // medidor de captura, de 0 a 1
  species: Species;
  force: number; // Força da vara
  kg: number; // peso do peixe fisgado, sorteado no começo da briga (PESCA-16, BRIGA-16)
  speedScale: number; // × velocidade do peixe pelo episódio e pelo peso (BRIGA-15, BRIGA-16)
  fillScale: number; // × enchimento do medidor pelo episódio e pelo peso
  tension: number; // BRIGA-20: tensão da linha, de 0 a 1 (1 = arrebentou)
}

/** BRIGA-09, BRIGA-12: o Tranquilo tem faixa maior, peixe mais lento e medidor que não zera. */
export function barRulesFor(d: Difficulty): BarRules {
  if (d === 'tranquilo') {
    return {
      zoneScale: TRANQUILO_ZONE_SCALE,
      fishSpeedScale: TRANQUILO_FISH_SPEED_SCALE,
      retargetScale: TRANQUILO_RETARGET_SCALE,
      drainPerS: METER_DRAIN_PER_S.tranquilo,
      meterFloor: TRANQUILO_METER_FLOOR,
      tensionScale: TRANQUILO_TENSION_SCALE,
    };
  }
  return { zoneScale: 1, fishSpeedScale: 1, retargetScale: 1, drainPerS: METER_DRAIN_PER_S.desafio, meterFloor: 0, tensionScale: 1 };
}

/** BRIGA-06: o jeito da espécie, ou calmo até força 4 e saltador da força 5 em diante. */
export function fightStyleOf(sp: Species): FightStyle {
  return sp.fightStyle ?? (sp.power <= CALM_MAX_POWER ? 'calmo' : 'saltador');
}

/** BRIGA-18: quanto o peixe se mexe, pela força dele (no tutorial, o normal). */
function moveOf(sp: Species, rules: BarRules): number {
  return rules.style ? 1 : MOVE_BASE + MOVE_PER_POWER * sp.power;
}

/**
 * Próximo destino do peixe: perto (calmo), longe (saltador) ou o afundador, que mergulha para o fundo
 * e de vez em quando arranca para cima. A distância cresce com o quanto o peixe se mexe (BRIGA-18).
 */
function nextTarget(style: FightStyle, fishY: number, rng: Rng, move: number): number {
  if (style === 'afundador') {
    // Mergulho logo acima da faixa parada no fundo: sem segurar de leve, o peixe sai dela (BRIGA-18).
    if (rng.next() >= SINKER_SURGE_CHANCE) return rng.range(SINKER_DIVE.min, SINKER_DIVE.max);
    return Math.min(1, rng.range(SINKER_TOP, SINKER_TOP + 0.25 * move)); // arrancada: mais alta quanto mais forte
  }
  const jump = style === 'saltador' ? LEAP_JUMP : CALM_JUMP;
  // O saltador já pula longe: nele, o mexer a mais vem só das trocas mais frequentes.
  const d = Math.min(0.95, rng.range(jump.min, jump.max) * (style === 'saltador' ? 1 : move));
  const dir = rng.next() < 0.5 ? -1 : 1;
  let target = fishY + dir * d;
  if (target < 0 || target > 1) target = fishY - dir * d; // não cabe na barra: vai para o outro lado
  return Math.min(Math.max(target, 0), 1);
}

/** Tempo até o próximo destino: peixe que se mexe mais troca de destino mais vezes (BRIGA-18). */
function retargetS(rules: BarRules, rng: Rng, sp: Species): number {
  // O saltador pula longe, mas fica parado mais tempo entre os pulos: dá tempo de segurar ele na faixa.
  const often = (1 / moveOf(sp, rules)) * (fightStyleOf(sp) === 'saltador' && !rules.style ? SALTADOR_REST : 1);
  return rng.range(FISH_RETARGET_S.min, FISH_RETARGET_S.max) * often * rules.retargetScale * (rules.style ? 1 : sp.fightTuning?.retargetScale ?? 1);
}

/** BRIGA-19: o peso de um peixe de tamanho `size` (0 a 1) na faixa da espécie, com 2 casas. */
export function kgOfSize(sp: Species, size: number): number {
  return Math.round((sp.kg.min + (sp.kg.max - sp.kg.min) * Math.min(Math.max(size, 0), 1)) * 100) / 100;
}

/** PESCA-16: peso sorteado na faixa da espécie, com 2 casas. */
export function drawKg(sp: Species, rng: Rng): number {
  const drawn = Math.round(rng.range(sp.kg.min, sp.kg.max) * 100) / 100;
  return Math.min(Math.max(drawn, sp.kg.min), sp.kg.max);
}

/**
 * BRIGA-15, BRIGA-21: quanto o peixe pesa na briga. Episódios mais adiante e peixes mais pesados (em kg,
 * comparados com o típico do episódio) nadam mais rápido e enchem o medidor mais devagar; o tutorial não muda nada.
 */
export function fightScales(sp: Species, kg: number, rules: BarRules): { speedScale: number; fillScale: number } {
  if (rules.style) return { speedScale: 1, fillScale: 1 };
  const tier = (sp.episode ?? 1) - 1;
  // BRIGA-21: o peso de verdade comparado com o típico do episódio; mais pesado, mais difícil.
  const weight = Math.min(WEIGHT_FIGHT_MAX, ((1 + kg) / (1 + WEIGHT_REF_KG[sp.episode ?? 1])) ** WEIGHT_FIGHT_EXP);
  return {
    speedScale: (1 + EPISODE_FISH_SPEED_STEP * tier) * weight,
    fillScale: (1 - EPISODE_FISH_FILL_STEP * tier) / Math.sqrt(weight), // o peso pesa menos no medidor que na velocidade
  };
}

/** BRIGA-01, BRIGA-07: faixa parada no fundo, peixe no meio dela e medidor em 30%; o peso já sorteado. */
export function startBar(sp: Species, rod: Rod, rules: BarRules, rng: Rng, size?: number): CatchBar {
  const style = rules.style ?? fightStyleOf(sp);
  const kg = size === undefined ? drawKg(sp, rng) : kgOfSize(sp, size); // BRIGA-19: o peixe que você viu
  const zoneH = (BAR_ZONE_BASE + BAR_ZONE_PER_FORCE * rod.force) * rules.zoneScale * (rules.style ? 1 : sp.fightTuning?.zoneScale ?? 1);
  const fishY = zoneH / 2;
  return {
    style,
    zoneY: 0,
    zoneV: 0,
    zoneH,
    fishY,
    fishTarget: nextTarget(style, fishY, rng, moveOf(sp, rules)),
    retargetInS: retargetS(rules, rng, sp),
    meter: METER_START,
    species: sp,
    force: rod.force,
    kg,
    ...fightScales(sp, kg, rules),
    tension: 0,
  };
}

/** BRIGA-02: o tranco no momento em que o dedo encosta; sem ele a faixa caindo demora a virar. */
export function pressBar(b: CatchBar): CatchBar {
  return { ...b, zoneV: Math.min(b.zoneV + BAR_PRESS_KICK, BAR_MAX_SPEED) };
}

/** O centro do peixe entre a base e o topo da faixa, bordas incluídas. */
export function fishInside(b: CatchBar): boolean {
  return b.fishY >= b.zoneY && b.fishY <= b.zoneY + b.zoneH;
}

/** BRIGA-10, BRIGA-11: medidor cheio pega o peixe; vazio (só possível no Desafio) deixa fugir. */
export function barOutcome(b: CatchBar, rules: BarRules): 'pegou' | 'fugiu' | 'arrebentou' | null {
  if (b.tension >= 1) return 'arrebentou'; // BRIGA-20
  if (b.meter >= 1) return 'pegou';
  if (b.meter <= 0 && rules.meterFloor <= 0) return 'fugiu';
  return null;
}

/**
 * BRIGA-20: quanto o peixe estica a linha. Força 1 estica 68% e força 10 140% (como o quanto ele se
 * mexe); o mais pesado da espécie, 120%, e o mais leve, 80%; vara de força 1 aguenta 76% e de força 10, 130%.
 */
function strain(b: CatchBar): number {
  const size = b.species.kg.max > b.species.kg.min ? (b.kg - b.species.kg.min) / (b.species.kg.max - b.species.kg.min) : 0.5;
  const rod = 0.7 + 0.06 * b.force;
  return ((MOVE_BASE + MOVE_PER_POWER * b.species.power) * (0.8 + 0.4 * size)) / rod;
}

/** Um passo de no máximo BAR_MAX_STEP_S. */
function substep(b: CatchBar, h: number, holding: boolean, rules: BarRules, rng: Rng): CatchBar {
  // Faixa: aceleração constante no passo, então a posição usa a média das velocidades (BRIGA-02, 03).
  const up = holding ? BAR_HOLD_ACCEL * (b.zoneV < 0 ? BAR_BRAKE_SCALE : 1) : 0; // freio no apertar
  const accel = up - BAR_GRAVITY;
  let zoneV = Math.min(Math.max(b.zoneV + accel * h, -BAR_MAX_SPEED), BAR_MAX_SPEED);
  let zoneY = b.zoneY + ((b.zoneV + zoneV) / 2) * h;
  const top = 1 - b.zoneH;
  if (zoneY >= top) {
    zoneY = top; // BRIGA-05; parada no topo, ao soltar cai do repouso (BRIGA-14)
    zoneV = 0;
  } else if (zoneY <= 0) {
    zoneY = 0; // BRIGA-04
    if (zoneV < 0) zoneV = -zoneV * BAR_BOUNCE;
  }

  // Peixe: desliza até o destino e sorteia outro quando o tempo acaba (BRIGA-06, BRIGA-12).
  const speed = FISH_APPROACH_PER_S * (FISH_SPEED_BASE + FISH_SPEED_PER_POWER * b.species.power) * rules.fishSpeedScale * b.speedScale;
  const fishY = b.fishTarget + (b.fishY - b.fishTarget) * Math.exp(-speed * h);
  let { fishTarget } = b;
  let retargetInS = b.retargetInS - h;
  while (retargetInS <= 0) {
    fishTarget = nextTarget(b.style, fishY, rng, moveOf(b.species, rules));
    retargetInS += retargetS(rules, rng, b.species);
  }

  // Medidor (BRIGA-08, BRIGA-09, BRIGA-12).
  const moved = { ...b, zoneY, zoneV, fishY, fishTarget, retargetInS };
  const perS = fishInside(moved)
    ? (METER_FILL_PER_S - METER_FILL_LOSS_PER_STAMINA * b.species.stamina) * (rules.style ? 1 : b.species.fightTuning?.fillScale ?? 1) * b.fillScale
    : -rules.drainPerS;
  // BRIGA-20: peixe fora da faixa verde estica a linha; dentro dela, a linha alivia.
  const against = !fishInside(moved);
  const tension = against
    ? b.tension + TENSION_RISE_PER_S * strain(b) * rules.tensionScale * h
    : Math.max(0, b.tension - TENSION_FALL_PER_S * h);
  return { ...moved, meter: Math.min(Math.max(b.meter + perS * h, rules.meterFloor), 1), tension: Math.min(tension, 1) };
}

/** Avança a briga `dt` segundos; para no passo em que o medidor enche ou zera. */
export function stepBar(b: CatchBar, dt: number, holding: boolean, rules: BarRules, rng: Rng): CatchBar {
  if (dt <= 0) return b;
  const n = Math.ceil(dt / BAR_MAX_STEP_S - 1e-9);
  for (let i = 0; i < n && barOutcome(b, rules) === null; i++) b = substep(b, dt / n, holding, rules, rng);
  return b;
}
