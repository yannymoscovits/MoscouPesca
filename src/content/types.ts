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
  polygon: Point[];
  species: SpeciesId[];
}

export type Expression = 'normal' | 'rindo' | 'bravo' | 'chocado';

export interface Character {
  id: CharacterId;
  name: string;
  epithet: string; // apelido do cartão, ex.: "O Rei do Bongô"
  portraits: Record<Expression, string>;
}

export interface DialogLine {
  speaker: CharacterId;
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
  done: (e: GameEvent, p: Profile) => boolean;
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
    episodes: Partial<Record<EpisodeId, { objectiveIndex: number; won: boolean }>>;
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
  seenVersion: string;
}
