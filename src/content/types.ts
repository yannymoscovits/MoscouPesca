// Tipos do conteúdo e do perfil salvo (design.md, "Data Models").
// O perfil guarda só IDs; nomes, textos e números vêm do conteúdo.

export type Difficulty = 'tranquilo' | 'desafio';

export type EpisodeId = 1 | 2 | 3 | 4 | 5;
export type LocationId = string;
export type SpeciesId = string;
export type RodId = string;
export type BaitId = string;
export type ItemId = RodId | BaitId;
export type CharacterId = string;
export type SceneId = string;
export type TournamentId = string;
export type TrophyId = string;
export type MessageId = string;

export interface Point {
  x: number;
  y: number;
}

// ---------- Conteúdo ----------

export interface Species {
  id: SpeciesId;
  name: string;
  sprite: string;
  kg: { min: number; max: number };
  pricePerKg: number;
  power: number; // força na briga
  stamina: number; // fôlego
  baits: BaitId[]; // iscas que aceita
  rarity: number; // peso no sorteio da zona
  description: string; // texto engraçado da ficha (HUMOR-03)
  rare: boolean; // espécie rara do local (PROG-03)
  valueLabel?: string; // texto da ficha no lugar do R$ (ex.: "inestimável" na Piranha Lavínia); o saldo recebe o valor normal
  medals: MedalLimits; // kg mínimos de cada medalha (MEDAL-01)
  fightStyle?: FightStyle; // jeito na barra de captura; sem campo, vale o padrão pela força (BRIGA-06)
}

/** Jeito do peixe na briga: destinos perto, longe ou na metade de baixo da barra (BRIGA-06). */
export type FightStyle = 'calmo' | 'saltador' | 'afundador';

export type MedalTier = 'bronze' | 'prata' | 'ouro';
export type MedalLimits = Record<MedalTier, number>;

/** Meta de quantidade cumprida: espécie e contagem, ex.: "tilapia:10" (medals.goalId). */
export type GoalId = string;

/** Metas de quantidade por espécie (MEDAL-04) e a recompensa em R$ de cada uma (MEDAL-05). */
export interface GoalDef {
  counts: number[]; // 10, 25 e 50
  reward: (episode: EpisodeId, count: number) => number;
}

// Força e alcance de 1 a 10.
export interface Rod {
  id: RodId;
  name: string;
  price: number;
  force: number;
  reach: number;
  episode: EpisodeId;
}

export interface Bait {
  id: BaitId;
  name: string;
  price: number;
  episode: EpisodeId;
}

export interface Zone {
  id: string;
  polygon: Point[]; // px lógicos da cena, os mesmos do arremesso (fishing.cast); (0, 0) no canto de cima à esquerda
  species: SpeciesId[];
  // SPEC_DEVIATION: `depthM` não existe no design.
  // Reason: o medidor de Profundidade da pescaria (T80) mostra a profundidade da zona onde a isca está.
  depthM: number; // profundidade da zona, em metros
  name: string; // nome do ponto no pesqueiro (PONTO-01)
  minReach: number; // alcance mínimo da vara para pescar no ponto (PONTO-03)
}

export type Expression = 'normal' | 'rindo' | 'bravo' | 'chocado';

export interface Character {
  id: CharacterId;
  name: string;
  epithet: string; // apelido do cartão, ex.: "O Rei do Bongô"
  portraits: Record<Expression, string>;
}

export interface DialogLine {
  speaker: CharacterId | CharacterId[] | null; // null = narração; lista = fala conjunta
  text: string;
  expression?: Expression; // padrão: 'normal'
}

export interface Scene {
  id: SceneId;
  lines: DialogLine[];
}

export type GameEvent =
  | { type: 'Caught'; species: SpeciesId; kg: number }
  | { type: 'Bought'; item: ItemId }
  | { type: 'TournamentWon'; id: TournamentId }
  | { type: 'GameStarted' };

export interface Objective {
  id: string;
  text: string;
  done: (e: GameEvent, p: Profile) => boolean; // p já com o efeito do evento (compra, álbum)
  // SPEC_DEVIATION: campo `count` não existe no design.
  // Reason: "pegar 3 peixes" precisa contar eventos e mostrar "1 de 3" (TUTO-08, T40).
  count?: number; // quantos eventos com `done` verdadeiro cumprem o objetivo; padrão 1
  sceneOnDone: SceneId;
}

export interface Chapter {
  title: string;
  openingScene: SceneId;
  objectives: Objective[];
  closingScene: SceneId;
}

export interface Location {
  id: LocationId;
  name: string;
  background: string;
  zones: Zone[];
}

export interface TournamentDef {
  id: TournamentId;
  name: string; // "GuanambiCup"
  casts: 8;
  countBest: 3;
  rivals: { character: CharacterId; kg: number; taunt: DialogLine }[];
  trophy: TrophyId;
  message: MessageId;
}

export interface Message {
  id: MessageId;
  from: string;
  text: string;
}

export interface Episode {
  id: EpisodeId;
  locations: Location[]; // 1 ou 2; o Episódio 2 tem Rio Jacuípe e Ponte da Cetrel (EPI-08)
  species: Species[];
  rods: Rod[];
  baits: Bait[];
  chapter: Chapter;
  tournament: TournamentDef;
  letter: Message;
}

// SPEC_DEVIATION: o design não diz onde ficam as cenas do roteiro nem a fala da derrota.
// Reason: o pacote do episódio precisa levar as cenas que o capítulo cita; um tipo que
// estende o Episode evita mudar o que o domínio já recebe.
export interface EpisodeContent extends Episode {
  scenes: Scene[]; // abertura, cenas dos objetivos, encerramento e derrota
  defeatScene: SceneId; // mostrada junto com "Tentar de novo" (CAMP-09)
}

// ---------- Perfil (o que é salvo) ----------

export interface TournamentRun {
  id: TournamentId;
  castsLeft: number; // começa em 8
  catches: { species: SpeciesId; kg: number }[];
}

export interface Profile {
  version: 1;
  money: number; // R$, inteiro >= 0
  rods: { owned: RodId[]; equipped: RodId };
  baits: { owned: BaitId[]; equipped: BaitId };
  settings: { difficulty: Difficulty | null; vibration: boolean }; // null = ainda não perguntado
  story: {
    // SPEC_DEVIATION: `progress` não existe no design.
    // Reason: guarda a contagem do objetivo atual ("1 de 3") entre as sessões.
    episodes: Partial<Record<EpisodeId, { objectiveIndex: number; progress: number; won: boolean }>>;
    scenesSeen: SceneId[];
    pendingScene: SceneId | null;
  };
  unlockedEpisodes: EpisodeId[]; // começa em [1] (EPI-02)
  currentLocation: LocationId; // último local de pesca (EPI-07)
  tutorialDone: boolean;
  charactersIntroduced: CharacterId[]; // cartões de apresentação já mostrados
  tournament: TournamentRun | null; // torneio em andamento
  trophies: TrophyId[];
  messagesUnlocked: MessageId[];
  album: Partial<Record<SpeciesId, { recordKg: number }>>;
  medals: Partial<Record<SpeciesId, MedalTier[]>>; // MEDAL-02
  catchCounts: Partial<Record<SpeciesId, number>>; // MEDAL-04
  goalsDone: GoalId[]; // MEDAL-05
  seenVersion: string;
}
