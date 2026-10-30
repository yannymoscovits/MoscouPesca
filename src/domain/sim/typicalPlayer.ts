// Jogador típico simulado (design.md, "Domain: typical player simulation"): joga um episódio do
// primeiro arremesso até vencer o campeonato, com as funções reais do domínio, para medir a
// progressão (PROG-01, PROG-04, PROG-05). Usado só por testes.
//
// O jogador arremessa nas zonas da isca equipada, segura a linha até o amarelo e solta no
// vermelho, compra a melhor vara que o saldo permite e entra no campeonato assim que ele libera.
// O tempo conta voo, espera, briga e ficha do peixe; o tempo de ler falas e cenas fica de fora.

import type {
  BaitId,
  Difficulty,
  Episode,
  GameEvent,
  Location,
  Point,
  Profile,
  Rod,
  Species,
  SpeciesId,
} from '../../content/types';
import { record } from '../album';
import { cast, maxCastDistance, press, rulesFor, tensionBand, tick, type FishingState, type TensionBand } from '../fishing';
import { createRng } from '../rng';
import { buy, canBuy, equip, type Item } from '../shop';
import { currentObjective, isTournamentUnlocked, onEvent } from '../story';
import { applyVictory, recordCast, standings, start as startTournament } from '../tournament';
import { isUnlocked, onChampionshipWon, shopItems, travel } from '../world';

/** Ponta da vara na cena lógica de 180 × 400 px (spec, "Tamanho da cena"). */
export const ROD_TIP: Point = { x: 90, y: 370 };
/** Segundos para ler a ficha do peixe. */
export const CARD_S = 3;
/** Tempo de reação do jogador, sorteado a cada arremesso (o mesmo do balanceamento da briga). */
const REACTION_S = { min: 0.2, max: 0.5 };
/** O jogo desenha a 30 quadros por segundo. */
const DT = 1 / 30;
/** Desiste do episódio depois disso: o campeonato está difícil demais para o jogador típico. */
const MAX_MINUTES = 600;
const MAX_FIGHT_S = 120;

export type AchievementKind = 'objetivo' | 'item' | 'especie' | 'recorde';

/** Conquista da PROG-04, no minuto de jogo em que aconteceu. */
export interface Achievement {
  atMinute: number;
  kind: AchievementKind;
  id: string; // objetivo, item ou espécie
}

export interface SimCast {
  seconds: number; // voo, espera, briga e, com peixe, a ficha
  outcome: FishingState['phase'];
  tournament: boolean;
  species?: SpeciesId;
  kg?: number;
  value?: number;
}

export interface SimOptions {
  difficulty?: Difficulty; // padrão: Tranquilo, o jogador conservador do design
  earlier?: Episode[]; // episódios anteriores, cujas varas e iscas o perfil já pode ter
}

// SPEC_DEVIATION: o design devolve só minutos, conquistas e tentativas e não tem opções.
// Reason: `casts` permite conferir que o tempo total é a soma dos arremessos; `won` separa a vitória
// de quem esbarrou em MAX_MINUTES; `profile` encadeia um episódio no seguinte; `earlier` dá as varas
// dos episódios anteriores; `difficulty` escolhe Tranquilo ou Desafio.
export interface SimResult {
  minutes: number;
  achievements: Achievement[];
  tournamentAttempts: number;
  won: boolean;
  casts: SimCast[];
  profile: Profile;
}

/** Zona, isca e os pontos da zona ao alcance da vara; `takers` são as espécies que podem morder. */
interface Plan {
  location: Location;
  bait: BaitId;
  points: Point[];
  takers: Species[];
}

const quality = (r: Rod) => r.reach * 100 + r.force; // o alcance abre zonas; a força encurta a briga
const avgKg = (sp: Species) => (sp.kg.min + sp.kg.max) / 2;
/** Evento neutro: um objetivo que já se cumpre com ele não depende do jogador. */
const PROBE: GameEvent = { type: 'GameStarted' };

/** Pontos dentro de uma zona convexa: o centro e passos do centro até os cantos e os meios das bordas. */
function innerPoints(polygon: Point[]): Point[] {
  const c = {
    x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length,
    y: polygon.reduce((s, p) => s + p.y, 0) / polygon.length,
  };
  const toward = (p: Point, k: number) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k });
  const mids = polygon.map((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  });
  return [c, ...[...polygon, ...mids].flatMap((p) => [toward(p, 0.5), toward(p, 0.9)])];
}

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

export function simulateEpisode(ep: Episode, start: Profile, seed: number, opts: SimOptions = {}): SimResult {
  if (!isUnlocked(start, ep.id)) throw new Error(`Episódio ${ep.id} bloqueado no perfil inicial`);
  const catalog = [...(opts.earlier ?? []), ep];
  const allRods = catalog.flatMap((e) => e.rods);
  const rng = createRng(seed);
  const rules = rulesFor(opts.difficulty ?? 'tranquilo');

  let p = start;
  let seconds = 0;
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

  /** Zonas ao alcance da vara equipada, com cada isca que tem alguma espécie para morder. */
  function plans(baits: BaitId[]): Plan[] {
    const reach = maxCastDistance(rodOf(p.rods.equipped).reach);
    const out: Plan[] = [];
    for (const location of ep.locations) {
      for (const zone of location.zones) {
        const points = innerPoints(zone.polygon).filter((pt) => Math.hypot(pt.x - ROD_TIP.x, pt.y - ROD_TIP.y) <= reach);
        if (points.length === 0) continue;
        for (const bait of baits) {
          const takers = ep.species.filter((sp) => zone.species.includes(sp.id) && sp.baits.includes(bait));
          if (takers.length > 0) out.push({ location, bait, points, takers });
        }
      }
    }
    if (out.length === 0) throw new Error(`Nenhuma zona ao alcance aceita as iscas no Episódio ${ep.id}`);
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

  /** Um arremesso completo; devolve o resultado e quanto tempo levou. */
  function fish(plan: Plan): { result: FishingState; seconds: number } {
    p = equip(travel(p, plan.location.id, catalog), plan.bait);
    const target = plan.points[Math.floor(rng.next() * plan.points.length)];
    const ctx = { rng, rules, zones: plan.location.zones, species: ep.species };
    const reaction = rng.range(REACTION_S.min, REACTION_S.max);
    let s: FishingState = cast({ phase: 'Idle' }, target, { origin: ROD_TIP, rod: rodOf(p.rods.equipped), bait: p.baits.equipped });
    let t = 0;
    const step = (holding: boolean) => {
      s = tick(s, DT, { holding }, ctx);
      t += DT;
    };

    while (s.phase === 'Flying' || s.phase === 'Waiting') step(false);
    while (s.phase === 'Bite' && s.sinceBite < reaction) step(false);
    if (s.phase === 'Bite') s = press(s, ctx);

    // Segura enquanto vê a barra verde ou amarela e solta quando vê vermelha, com o atraso da reação.
    const lag = Math.round(reaction / DT);
    const seen: TensionBand[] = [];
    let fightS = 0;
    while (s.phase === 'Fight') {
      if (fightS > MAX_FIGHT_S) throw new Error(`Briga sem fim com ${s.species.id}`);
      seen.push(tensionBand(s.tension));
      step((seen.length > lag ? seen[seen.length - 1 - lag] : 'verde') !== 'vermelho');
      fightS += DT;
    }
    if (s.phase === 'Result_Caught') t += CARD_S;
    return { result: s, seconds: t };
  }

  /** Soma o tempo do arremesso e aplica o peixe: R$ (PESCA-17), álbum e recorde, e a história. */
  function land(result: FishingState, castSeconds: number, tournament: boolean) {
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
