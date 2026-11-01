// Validação e migração do perfil salvo (design.md, "SaveService"; parte pura).
// O I/O com o localStorage fica em src/platform/save.ts.

import type { Profile } from '../content/types';

export const CURRENT_VERSION = 2;

/** Converte um salvamento da versão N para a N + 1. */
export type Migration = (old: unknown) => unknown;

/**
 * v1 → v2 (HIST-18): o Episódio 2 ganhou "Comprar a Isca de Camarão" na posição 3, antes de "Pegar 3 peixes
 * na Ponte da Cetrel". Quem já estava da ponte em diante anda uma posição, para não voltar um objetivo.
 */
const ep2CamaraoObjective: Migration = (old) => {
  if (!isObj(old)) return old;
  const story = isObj(old.story) ? old.story : null;
  const episodes = story && isObj(story.episodes) ? story.episodes : null;
  const ep2 = episodes && isObj(episodes['2']) ? episodes['2'] : null;
  const moved = ep2 && isNum(ep2.objectiveIndex) && ep2.objectiveIndex >= 3 ? { ...ep2, objectiveIndex: ep2.objectiveIndex + 1 } : ep2;
  if (!story || !episodes || !moved || moved === ep2) return { ...old, version: 2 };
  return { ...old, version: 2, story: { ...story, episodes: { ...episodes, 2: moved } } };
};

/** Passos da cadeia, pela versão de origem. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = { 1: ep2CamaraoObjective };

type Obj = Record<string, unknown>;

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const isStrList = (x: unknown) => Array.isArray(x) && x.every(isStr);
const isEpisodeId = (x: unknown) => x === 1 || x === 2 || x === 3 || x === 4 || x === 5;
const isRecordOf = (x: unknown, keyOk: (k: string) => boolean, valueOk: (v: unknown) => boolean) =>
  isObj(x) && Object.entries(x).every(([k, v]) => keyOk(k) && valueOk(v));

const isLoadout = (x: unknown) => isObj(x) && isStrList(x.owned) && isStr(x.equipped);

const isSettings = (x: unknown) =>
  isObj(x) && (x.difficulty === null || x.difficulty === 'tranquilo' || x.difficulty === 'desafio') && isBool(x.vibration);

const isEpisodeStory = (x: unknown) => isObj(x) && isNum(x.objectiveIndex) && isNum(x.progress) && isBool(x.won);

const isStory = (x: unknown) =>
  isObj(x) &&
  isRecordOf(x.episodes, (k) => isEpisodeId(Number(k)), isEpisodeStory) &&
  isStrList(x.scenesSeen) &&
  (x.pendingScene === null || isStr(x.pendingScene));

const isCatch = (x: unknown) => isObj(x) && isStr(x.species) && isNum(x.kg);

const isTier = (x: unknown) => x === 'bronze' || x === 'prata' || x === 'ouro';
const isCount = (x: unknown) => Number.isInteger(x) && (x as number) >= 0;

const isTournament = (x: unknown) =>
  x === null || (isObj(x) && isStr(x.id) && isNum(x.castsLeft) && Array.isArray(x.catches) && x.catches.every(isCatch));

function isProfile(x: unknown): x is Profile {
  return (
    isObj(x) &&
    x.version === CURRENT_VERSION &&
    Number.isInteger(x.money) &&
    (x.money as number) >= 0 &&
    isLoadout(x.rods) &&
    isLoadout(x.baits) &&
    isSettings(x.settings) &&
    isStory(x.story) &&
    Array.isArray(x.unlockedEpisodes) &&
    x.unlockedEpisodes.every(isEpisodeId) &&
    isStr(x.currentLocation) &&
    isBool(x.tutorialDone) &&
    isStrList(x.charactersIntroduced) &&
    isTournament(x.tournament) &&
    isStrList(x.trophies) &&
    isStrList(x.messagesUnlocked) &&
    isRecordOf(x.album, () => true, (v) => isObj(v) && isNum(v.recordKg)) &&
    isRecordOf(x.medals, () => true, (v) => Array.isArray(v) && v.every(isTier)) && // MEDAL-07
    isRecordOf(x.catchCounts, () => true, isCount) &&
    isStrList(x.goalsDone) &&
    isStr(x.seenVersion)
  );
}

const MEDAL_FIELDS = ['medals', 'catchCounts', 'goalsDone'] as const;

/**
 * MEDAL-07: perfil salvo antes das medalhas não tem nenhum dos três campos; eles começam vazios.
 * Faltando só parte deles, o salvamento está estragado e continua ilegível (SAVE-08).
 */
function withMedalFields(x: unknown): unknown {
  if (!isObj(x) || MEDAL_FIELDS.some((k) => k in x)) return x;
  return { ...x, medals: {}, catchCounts: {}, goalsDone: [] };
}

/** SAVE-09: leva um salvamento antigo até a versão atual, passo a passo; null se não der para ler (SAVE-08). */
export function migrate(raw: unknown, steps: Readonly<Record<number, Migration>> = MIGRATIONS): Profile | null {
  let data = raw;
  while (isObj(data) && isNum(data.version) && data.version < CURRENT_VERSION) {
    const from = data.version;
    const step = steps[from];
    if (!step) return null;
    data = step(data);
    if (!isObj(data) || !isNum(data.version) || data.version <= from) return null; // cada passo avança a versão
  }
  data = withMedalFields(data);
  return isProfile(data) ? data : null;
}

/** Lê o texto de um slot: JSON inválido, campo faltando ou tipo errado → null (SAVE-08). */
export function parseProfile(text: string, steps: Readonly<Record<number, Migration>> = MIGRATIONS): Profile | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  return migrate(raw, steps);
}
