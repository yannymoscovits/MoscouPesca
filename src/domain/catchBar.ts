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
  FISH_APPROACH_PER_S,
  FISH_RETARGET_S,
  FISH_SPEED_BASE,
  FISH_SPEED_PER_POWER,
  LEAP_JUMP,
  METER_DRAIN_PER_S,
  METER_FILL_LOSS_PER_STAMINA,
  METER_FILL_PER_S,
  METER_START,
  SINKER_TOP,
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
    };
  }
  return { zoneScale: 1, fishSpeedScale: 1, retargetScale: 1, drainPerS: METER_DRAIN_PER_S.desafio, meterFloor: 0 };
}

/** BRIGA-06: o jeito da espécie, ou calmo até força 4 e saltador da força 5 em diante. */
export function fightStyleOf(sp: Species): FightStyle {
  return sp.fightStyle ?? (sp.power <= CALM_MAX_POWER ? 'calmo' : 'saltador');
}

/** Próximo destino do peixe: perto (calmo), longe (saltador) ou na metade de baixo (afundador). */
function nextTarget(style: FightStyle, fishY: number, rng: Rng): number {
  if (style === 'afundador') return rng.range(0, SINKER_TOP);
  const jump = style === 'saltador' ? LEAP_JUMP : CALM_JUMP;
  const d = rng.range(jump.min, jump.max);
  const dir = rng.next() < 0.5 ? -1 : 1;
  let target = fishY + dir * d;
  if (target < 0 || target > 1) target = fishY - dir * d; // não cabe na barra: vai para o outro lado
  return Math.min(Math.max(target, 0), 1);
}

function retargetS(rules: BarRules, rng: Rng): number {
  return rng.range(FISH_RETARGET_S.min, FISH_RETARGET_S.max) * rules.retargetScale;
}

/** BRIGA-01, BRIGA-07: faixa parada no fundo, peixe no meio dela e medidor em 30%. */
export function startBar(sp: Species, rod: Rod, rules: BarRules, rng: Rng): CatchBar {
  const style = rules.style ?? fightStyleOf(sp);
  const zoneH = (BAR_ZONE_BASE + BAR_ZONE_PER_FORCE * rod.force) * rules.zoneScale;
  const fishY = zoneH / 2;
  return {
    style,
    zoneY: 0,
    zoneV: 0,
    zoneH,
    fishY,
    fishTarget: nextTarget(style, fishY, rng),
    retargetInS: retargetS(rules, rng),
    meter: METER_START,
    species: sp,
    force: rod.force,
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
export function barOutcome(b: CatchBar, rules: BarRules): 'pegou' | 'fugiu' | null {
  if (b.meter >= 1) return 'pegou';
  if (b.meter <= 0 && rules.meterFloor <= 0) return 'fugiu';
  return null;
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
  const speed = FISH_APPROACH_PER_S * (FISH_SPEED_BASE + FISH_SPEED_PER_POWER * b.species.power) * rules.fishSpeedScale;
  const fishY = b.fishTarget + (b.fishY - b.fishTarget) * Math.exp(-speed * h);
  let { fishTarget } = b;
  let retargetInS = b.retargetInS - h;
  while (retargetInS <= 0) {
    fishTarget = nextTarget(b.style, fishY, rng);
    retargetInS += retargetS(rules, rng);
  }

  // Medidor (BRIGA-08, BRIGA-09, BRIGA-12).
  const moved = { ...b, zoneY, zoneV, fishY, fishTarget, retargetInS };
  const perS = fishInside(moved)
    ? METER_FILL_PER_S - METER_FILL_LOSS_PER_STAMINA * b.species.stamina
    : -rules.drainPerS;
  return { ...moved, meter: Math.min(Math.max(b.meter + perS * h, rules.meterFloor), 1) };
}

/** Avança a briga `dt` segundos; para no passo em que o medidor enche ou zera. */
export function stepBar(b: CatchBar, dt: number, holding: boolean, rules: BarRules, rng: Rng): CatchBar {
  if (dt <= 0) return b;
  const n = Math.ceil(dt / BAR_MAX_STEP_S - 1e-9);
  for (let i = 0; i < n && barOutcome(b, rules) === null; i++) b = substep(b, dt / n, holding, rules, rng);
  return b;
}
