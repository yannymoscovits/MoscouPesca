// Jogador típico simulado (design.md, "Domain: typical player simulation"): joga um episódio do
// primeiro arremesso até vencer o campeonato, com as funções reais do domínio, para medir a
// progressão (PROG-01, PROG-04, PROG-05). Usado só por testes.
//
// Cada arremesso passa por pesca.ts (SIMB-01) com a política da SIMB-02: o melhor ponto liberado,
// a seta travada no meio, a força com até 20% de erro, a isca recolhida direto, PUXAR quando um
// peixe segue, a fisgada certa em 90% das vezes e a briga pela holdPolicy, vendo o peixe 0,3 s
// atrasado. Ele compra a melhor vara que o saldo permite e entra no campeonato assim que ele libera.
// O tempo conta mira, força, voo, isca, briga e ficha do peixe; ler falas e cenas fica de fora.

import type {
  BaitId,
  Difficulty,
  Episode,
  GameEvent,
  GoalDef,
  Location,
  Profile,
  Rod,
  Species,
  SpeciesId,
  Zone,
} from '../../content/types';
import { record } from '../album';
import { aimAngleDeg } from '../castAim';
import { pressBar, type CatchBar } from '../catchBar';
import { afterCast, fishAt, reachMOf, startSchool, stepSchool, type School, type SchoolFish } from '../school';
import { onCatch } from '../medals';
import {
  press,
  rulesFor,
  startPesca,
  tick,
  type PescaButton,
  type PescaContext,
  type PescaRules,
  type PescaState,
} from '../pesca';
import { createRng, type Rng } from '../rng';
import { AIM_HALF_ARC_DEG, CAST_MIN_SHARE } from '../tuning';
import { buy, canBuy, equip, type Item } from '../shop';
import { spotsFor } from '../spots';
import { currentObjective, isTournamentUnlocked, onEvent } from '../story';
import { applyVictory, recordCast, standings, start as startTournament } from '../tournament';
import { isUnlocked, onChampionshipWon, shopItems, travel } from '../world';

/** Segundos para ler a ficha do peixe. */
export const CARD_S = 3;
/** Atraso do jogador para reagir ao que vê: o peixe na barra (SIMB-02), o peixe seguindo e o ataque. */
export const REACTION_S = 0.3;
/** Ele quer a força cheia e erra para menos até isto (SIMB-02). */
export const POWER_ERROR = 0.2;
/** Chance de acertar a fisgada (SIMB-02). */
export const HOOK_CHANCE = 0.9;
/** Com um peixe seguindo, um PUXAR a cada tanto; a spec não dá o ritmo (padrão para a calibragem). */
export const TWITCH_EVERY_S = 1;
/** Passo da simulação (design.md da pesca-bass); a física ainda se divide em passos de 1/30 s. */
const DT = 0.1;
/** Desiste do episódio depois disso: o campeonato está difícil demais para o jogador típico. */
const MAX_MINUTES = 600;
/** Um arremesso mais longo que isto é defeito da simulação. */
const MAX_CAST_S = 300;
/** Folga para comparar tempos somados em ponto flutuante. */
const EPS = 1e-9;

export type AchievementKind = 'objetivo' | 'item' | 'especie' | 'recorde' | 'medalha' | 'meta';

/** Conquista da PROG-04, no minuto de jogo em que aconteceu. */
export interface Achievement {
  atMinute: number;
  kind: AchievementKind;
  id: string; // objetivo, item, espécie, "espécie:medalha" ou a meta ("espécie:contagem")
}

/** Como um arremesso termina: peixe pego, peixe fugido ou nada dessa vez. */
export type PescaResult = Extract<PescaState, { phase: `Result_${string}` }>;

export interface SimCast {
  seconds: number; // mira, força, voo, isca, briga e, com peixe, a ficha
  outcome: PescaResult['phase'];
  tournament: boolean;
  species?: SpeciesId;
  kg?: number;
  value?: number;
}

export interface SimOptions {
  difficulty?: Difficulty; // padrão: Tranquilo, o jogador conservador do design
  earlier?: Episode[]; // episódios anteriores, cujas varas e iscas o perfil já pode ter
  goals?: GoalDef; // metas de quantidade (src/content/goals.ts); sem elas, nenhuma meta conta
}

const NO_GOALS: GoalDef = { counts: [], reward: () => 0 };

// SPEC_DEVIATION: o design devolve só minutos, conquistas e tentativas e não tem opções.
// Reason: `casts` permite conferir que o tempo total é a soma dos arremessos; `won` separa a vitória
// de quem esbarrou em MAX_MINUTES; `profile` encadeia um episódio no seguinte; `earlier` dá as varas
// dos episódios anteriores; `difficulty` escolhe Tranquilo ou Desafio; `goals` traz as metas do conteúdo.
export interface SimResult {
  minutes: number;
  achievements: Achievement[];
  tournamentAttempts: number;
  won: boolean;
  casts: SimCast[];
  profile: Profile;
}

/** Ponto liberado e isca; `takers` são as espécies do ponto que aceitam a isca. */
interface Plan {
  location: Location;
  zone: Zone;
  bait: BaitId;
  takers: Species[];
}

const quality = (r: Rod) => r.reach * 100 + r.force; // o alcance abre zonas; a força encurta a briga
const avgKg = (sp: Species) => (sp.kg.min + sp.kg.max) / 2;
/** Evento neutro: um objetivo que já se cumpre com ele não depende do jogador. */
const PROBE: GameEvent = { type: 'GameStarted' };

/** Fração do sorteio da zona que cai nas espécies do conjunto. */
function share(plan: Plan, ids: Set<SpeciesId>): number {
  const total = plan.takers.reduce((s, sp) => s + sp.rarity, 0);
  return plan.takers.filter((sp) => ids.has(sp.id)).reduce((s, sp) => s + sp.rarity, 0) / total;
}

/** Média ponderada pelo sorteio da zona. */
function expected(plan: Plan, f: (sp: Species) => number): number {
  const total = plan.takers.reduce((s, sp) => s + sp.rarity, 0);
  return plan.takers.reduce((s, sp) => s + sp.rarity * f(sp), 0) / total;
}

/** O melhor plano pela ordem das notas: a primeira decide, as outras desempatam. */
function best(plans: Plan[], scores: (plan: Plan) => number[]): Plan {
  let top = plans[0];
  let topScores = scores(top);
  for (const plan of plans.slice(1)) {
    const s = scores(plan);
    const i = s.findIndex((v, k) => v !== topScores[k]);
    if (i >= 0 && s[i] > topScores[i]) [top, topScores] = [plan, s];
  }
  return top;
}

/** O que o jogador faz num passo: segurar (RECOLHER na água, SEGURAR na briga) e tocar um botão. */
export interface PlayerInput {
  holding: boolean;
  button: PescaButton | null;
}

/** SIMB-02, briga: segura com o peixe visto acima do centro da faixa e solta com ele abaixo. */
export function holdPolicy(b: CatchBar, delayedFishY: number): boolean {
  return delayedFishY > b.zoneY + b.zoneH / 2;
}

/** O que o jogador vê de cima: as sombras do cardume, o alcance da vara e a isca que ele usa. */
export interface Sight {
  school: School;
  reachM: number;
  bait: BaitId;
}

/** O que o jogador vê no estado do jogo: o cardume do ponto escolhido e a isca equipada; null no pesqueiro. */
export function sightOf(g: { school: School | null; profile: { baits: { equipped: BaitId } } }): Sight | null {
  return g.school && { school: g.school, reachM: g.school.reachM, bait: g.profile.baits.equipped };
}

/** A sombra em que ele mira: a mais perto do meio, entre as que aceitam a isca se houver; null se nenhuma dá. */
function targetIn(sight: Sight): SchoolFish | null {
  const reachable = sight.school.fish.filter((f) => {
    const p = fishAt(f, sight.school.tS);
    const d = Math.hypot(p.xM, p.yM);
    const angle = (Math.atan2(p.xM, p.yM) * 180) / Math.PI;
    return Math.abs(angle) < AIM_HALF_ARC_DEG && d >= CAST_MIN_SHARE * sight.reachM && d <= sight.reachM;
  });
  const takers = reachable.filter((f) => f.species.baits.includes(sight.bait));
  const pool = takers.length > 0 ? takers : reachable;
  const off = (f: SchoolFish) => Math.abs(fishAt(f, sight.school.tS).xM);
  return pool.reduce<SchoolFish | null>((a, b) => (a && off(a) <= off(b) ? a : b), null);
}

/**
 * SIMB-02: o jogador típico de um arremesso. Chamado a cada passo, antes do `tick`, com o estado da
 * pesca e o `dt` que vai passar; guarda a força que quer, o peixe que viu e o sorteio da fisgada.
 * Joga com um dedo só (BOTAO-04): com um peixe seguindo, solta RECOLHER para tocar PUXAR.
 * Com `sight` (o cardume do ponto), mira na sombra escolhida e dosa a força pela distância dela;
 * sem ele, trava a seta no meio e quer a barra cheia.
 */
export function typicalPlayer(
  rng: Rng,
  rules: PescaRules,
): (s: PescaState, dt: number, sight?: Sight | null) => PlayerInput {
  const shortBy = rng.range(0, POWER_ERROR); // erra a força para menos, até 20%
  const idle: PlayerInput = { holding: false, button: null };
  let clock = 0;
  let followSeenS: number | null = null; // quando ele viu um peixe começar a seguir
  let twitchedS = -Infinity;
  let hooks: boolean | null = null; // sorteio da fisgada do ataque atual
  const seen: { atS: number; y: number }[] = []; // o peixe na barra a cada passo, para o atraso
  let target: number | null = null; // id da sombra em que ele mira
  let lastAim: number | null = null;

  /** Onde a sombra-alvo está agora; null se ela saiu do cardume. */
  const targetAt = (sight: Sight) => {
    const f = sight.school.fish.find((g) => g.id === target);
    return f ? fishAt(f, sight.school.tS) : null;
  };

  return (s, dt, sight = null) => {
    const now = clock;
    clock += dt;
    if (s.phase !== 'Lure') followSeenS = null;
    if (s.phase !== 'Strike') hooks = null;
    if (s.phase !== 'Fight') seen.length = 0;
    if (s.phase !== 'Aim') lastAim = null;
    if (s.phase !== 'Aim' && s.phase !== 'Power') target = null;
    switch (s.phase) {
      case 'Aim': {
        const aim = aimAngleDeg(s.sinceS, rules.sweepS);
        if (sight && (target === null || !targetAt(sight))) target = targetIn(sight)?.id ?? null;
        const p = sight && target !== null ? targetAt(sight) : null;
        if (!p) return { holding: false, button: aim >= 0 ? 'arremessar' : null }; // trava no meio
        const want = (Math.atan2(p.xM, p.yM) * 180) / Math.PI;
        const crossed = lastAim !== null && (lastAim - want) * (aim - want) <= 0;
        lastAim = aim;
        return { holding: false, button: crossed ? 'arremessar' : null }; // trava quando a seta passa pela sombra
      }
      case 'Power': {
        let wanted = 1 - shortBy; // a barra sobe de 0 a 1 em meio ciclo
        const p = sight && target !== null ? targetAt(sight) : null;
        if (sight && p) {
          const full = Math.hypot(p.xM, p.yM) / sight.reachM;
          wanted = Math.min(Math.max((full - CAST_MIN_SHARE) / (1 - CAST_MIN_SHARE), 0), 1) * (1 - shortBy);
        }
        return { holding: false, button: s.sinceS >= (wanted * rules.sweepS) / 2 - EPS ? 'arremessar' : null };
      }
      case 'Lure': {
        if (!s.water.fish.some((f) => f.mode === 'seguindo')) {
          followSeenS = null;
          return { holding: true, button: null }; // recolhe direto
        }
        followSeenS ??= now;
        if (now - followSeenS < REACTION_S - EPS || now - twitchedS < TWITCH_EVERY_S - EPS) return idle;
        twitchedS = now;
        return { holding: false, button: 'puxar' };
      }
      case 'Strike':
        hooks ??= rng.next() < HOOK_CHANCE;
        return { holding: false, button: hooks && s.sinceS >= REACTION_S - EPS ? 'puxar' : null };
      case 'Fight': {
        seen.push({ atS: now, y: s.bar.fishY });
        while (seen.length > 1 && seen[1].atS <= now - REACTION_S + EPS) seen.shift();
        return { holding: holdPolicy(s.bar, seen[0].y), button: null };
      }
      default:
        return idle;
    }
  };
}

const isResult = (s: PescaState): s is PescaResult => s.phase.startsWith('Result_');

export function simulateEpisode(ep: Episode, start: Profile, seed: number, opts: SimOptions = {}): SimResult {
  if (!isUnlocked(start, ep.id)) throw new Error(`Episódio ${ep.id} bloqueado no perfil inicial`);
  const catalog = [...(opts.earlier ?? []), ep];
  const allRods = catalog.flatMap((e) => e.rods);
  const rng = createRng(seed);
  const rules = rulesFor(opts.difficulty ?? 'tranquilo');
  const goals = opts.goals ?? NO_GOALS;

  let p = start;
  let seconds = 0;
  const schools = new Map<string, School>(); // o cardume de cada ponto em que ele já pescou
  const achievements: Achievement[] = [];
  const casts: SimCast[] = [];

  const note = (kind: AchievementKind, id: string) => achievements.push({ atMinute: seconds / 60, kind, id });
  const owns = (id: string) => p.rods.owned.includes(id) || p.baits.owned.includes(id);
  const shopList = (): Item[] => {
    const { rods, baits } = shopItems(p, catalog);
    return [...rods, ...baits];
  };
  const rodOf = (id: string): Rod => {
    const rod = allRods.find((r) => r.id === id);
    if (!rod) throw new Error(`Vara ${id} fora dos episódios simulados`);
    return rod;
  };
  const bestOwnedRod = () =>
    allRods.filter((r) => p.rods.owned.includes(r.id)).reduce((a, b) => (quality(b) > quality(a) ? b : a));

  // "Item ao alcance do saldo": a primeira vez que o saldo cobre o preço de um item que ele não tem.
  const reached = new Set(shopList().filter((i) => owns(i.id) || p.money >= i.price).map((i) => i.id));
  function noteItems() {
    for (const item of shopList()) {
      if (reached.has(item.id) || owns(item.id) || p.money < item.price) continue;
      reached.add(item.id);
      note('item', item.id);
    }
  }

  function story(e: GameEvent) {
    const before = currentObjective(p.story, ep);
    p = { ...p, story: onEvent(p, e, ep).progress };
    if (before && currentObjective(p.story, ep) !== before) note('objetivo', before.id);
  }

  function purchase(item: Item) {
    p = buy(p, item);
    story({ type: 'Bought', item: item.id });
  }

  /** Compra o item que o objetivo pede e a melhor vara que o saldo permite, e equipa a melhor vara. */
  function shop() {
    const objective = currentObjective(p.story, ep);
    const needed =
      objective && !objective.done(PROBE, p)
        ? shopList().find(
            (i) => !owns(i.id) && canBuy(p, i).ok && objective.done({ type: 'Bought', item: i.id }, buy(p, i)),
          )
        : undefined;
    if (needed) purchase(needed);
    const upgrade = shopItems(p, catalog)
      .rods.filter((r) => !owns(r.id) && canBuy(p, r).ok && quality(r) > quality(bestOwnedRod()))
      .reduce<Rod | undefined>((a, b) => (!a || quality(b) > quality(a) ? b : a), undefined);
    if (upgrade) purchase(upgrade);
    p = equip(p, bestOwnedRod().id);
  }

  /** Pontos liberados para a vara equipada (PONTO-03), com cada isca que tem alguma espécie para morder. */
  function plans(baits: BaitId[]): Plan[] {
    const rod = rodOf(p.rods.equipped);
    const out: Plan[] = [];
    for (const location of ep.locations) {
      for (const { zone, locked } of spotsFor(location, rod, ep.species, p.album)) {
        if (locked) continue;
        for (const bait of baits) {
          const takers = ep.species.filter((sp) => zone.species.includes(sp.id) && sp.baits.includes(bait));
          if (takers.length > 0) out.push({ location, zone, bait, takers });
        }
      }
    }
    if (out.length === 0) throw new Error(`Nenhum ponto liberado aceita as iscas no Episódio ${ep.id}`);
    return out;
  }

  /** Espécies que cumprem o objetivo atual se forem pegas agora. */
  function targets(): Set<SpeciesId> {
    const objective = currentObjective(p.story, ep);
    if (!objective || objective.done(PROBE, p)) return new Set();
    return new Set(
      ep.species
        .filter((sp) => objective.done({ type: 'Caught', species: sp.id, kg: sp.kg.max }, { ...p, album: record(p.album, sp.id, sp.kg.max).album }))
        .map((sp) => sp.id),
    );
  }

  /** Pesca livre: o objetivo primeiro, depois espécie nova, depois o que rende mais R$. */
  function planFree(): Plan {
    const buyable = shopList().filter((i) => !('reach' in i) && !owns(i.id) && canBuy(p, i).ok);
    const goal = targets();
    const fresh = new Set(ep.species.filter((sp) => p.album[sp.id] === undefined).map((sp) => sp.id));
    const plan = best(plans([...p.baits.owned, ...buyable.map((b) => b.id)]), (pl) => [
      share(pl, goal),
      share(pl, fresh),
      expected(pl, (sp) => avgKg(sp) * sp.pricePerKg),
    ]);
    const bait = buyable.find((b) => b.id === plan.bait);
    if (bait) purchase(bait);
    return plan;
  }

  /** Campeonato: o que pesa mais, com as iscas que ele já tem. */
  const planTournament = (): Plan => best(plans(p.baits.owned), (pl) => [expected(pl, avgKg)]);

  /** Um arremesso completo no ponto do plano (SIMB-01); devolve o resultado e quanto tempo levou. */
  function fish(plan: Plan): { result: PescaResult; seconds: number } {
    p = equip(travel(p, plan.location.id, catalog), plan.bait);
    const ctx: PescaContext = {
      rod: rodOf(p.rods.equipped),
      bait: p.baits.equipped,
      rng,
      rules,
      spot: plan.zone,
      species: ep.species,
    };
    const player = typicalPlayer(rng, rules);
    const key = `${plan.location.id}/${plan.zone.id}`;
    const reachM = reachMOf(ctx.rod.reach);
    let school = schools.get(key);
    if (!school || school.reachM !== reachM) school = startSchool(plan.zone, ep.species, reachM, rng);
    let s = startPesca();
    let t = 0;
    let holding = false;
    while (!isResult(s)) {
      if (t > MAX_CAST_S) throw new Error(`Arremesso sem fim no ponto ${plan.zone.id}`);
      const input = player(s, DT, { school, reachM, bait: ctx.bait });
      if (input.button) s = press(s, input.button, ctx);
      // Espelho do controller: encostar o dedo em SEGURAR dá o tranco na faixa (BRIGA-02).
      if (s.phase === 'Fight' && input.holding && !holding) s = { ...s, bar: pressBar(s.bar) };
      holding = input.holding;
      // Espelho do controller: o cardume nada, o arremesso vê o cardume já andado e o pego sai dele.
      school = stepSchool(school, DT, plan.zone, ep.species);
      const prev = s;
      s = tick(s, DT, { holding: input.holding }, { ...ctx, school });
      school = afterCast(school, prev, s);
      t += DT;
    }
    if (s.phase === 'Result_Caught') t += CARD_S;
    schools.set(key, stepSchool(school, s.phase === 'Result_Caught' ? CARD_S : 0, plan.zone, ep.species));
    return { result: s, seconds: t };
  }

  /** Soma o tempo do arremesso e aplica o peixe: R$ (PESCA-17), álbum e recorde, medalhas e metas, e a história. */
  function land(result: PescaResult, castSeconds: number, tournament: boolean) {
    seconds += castSeconds;
    if (result.phase !== 'Result_Caught') {
      casts.push({ seconds: castSeconds, outcome: result.phase, tournament });
      return;
    }
    const { species, kg, value } = result;
    casts.push({ seconds: castSeconds, outcome: result.phase, tournament, species: species.id, kg, value });
    const isNew = p.album[species.id] === undefined;
    const { album, isNewRecord } = record(p.album, species.id, kg);
    p = { ...p, money: p.money + value, album };
    if (isNew) note('especie', species.id);
    else if (isNewRecord) note('recorde', species.id);
    const won = onCatch(p, species, kg, goals, ep.id); // o mesmo do jogo (MEDAL-02 a MEDAL-05)
    p = won.profile;
    for (const tier of won.medals) note('medalha', `${species.id}:${tier}`);
    for (const id of won.goalsDone) note('meta', id);
    story({ type: 'Caught', species: species.id, kg });
    noteItems();
  }

  story({ type: 'GameStarted' });
  p = equip(p, bestOwnedRod().id);
  let attempts = 0;
  let won = false;
  while (!won && seconds / 60 < MAX_MINUTES) {
    shop();
    if (!isTournamentUnlocked(p.story, ep)) {
      const { result, seconds: s } = fish(planFree());
      land(result, s, false);
      continue;
    }
    attempts++;
    let run = startTournament(ep.tournament);
    while (run.castsLeft > 0) {
      const { result, seconds: s } = fish(planTournament());
      run = recordCast(run, result);
      land(result, s, true);
    }
    if (standings(run, ep.tournament)[0].isPlayer) {
      won = true;
      p = applyVictory(p, ep.tournament);
      story({ type: 'TournamentWon', id: ep.tournament.id });
      p = onChampionshipWon(p, ep.id);
    }
  }

  return { minutes: seconds / 60, achievements, tournamentAttempts: attempts, won, casts, profile: p };
}
