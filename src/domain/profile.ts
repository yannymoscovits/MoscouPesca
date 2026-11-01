// Perfil inicial e ajustes do jogador (design.md, "Data Models").
// Os IDs iniciais são a referência para o conteúdo do Episódio 1.

import type { BaitId, CharacterId, Difficulty, LocationId, Profile, RodId } from '../content/types';

export const START_ROD: RodId = 'bambu';
export const START_BAIT: BaitId = 'minhoca';
/** Barragem do Poço do Magro, local do Episódio 1. */
export const START_LOCATION: LocationId = 'poco-do-magro';

export function newProfile(): Profile {
  return {
    version: 2,
    money: 0,
    rods: { owned: [START_ROD], equipped: START_ROD },
    baits: { owned: [START_BAIT], equipped: START_BAIT },
    settings: { difficulty: null, vibration: true }, // ACES-01: perguntada na primeira abertura; ACES-04: ligada
    story: { episodes: {}, scenesSeen: [], pendingScene: null },
    unlockedEpisodes: [1], // EPI-02
    currentLocation: START_LOCATION,
    tutorialDone: false,
    charactersIntroduced: [],
    tournament: null,
    trophies: [],
    messagesUnlocked: [],
    album: {},
    medals: {}, // MEDAL-07
    catchCounts: {},
    goalsDone: [],
    seenVersion: '',
  };
}

/** ACES-02 */
export function setDifficulty(p: Profile, difficulty: Difficulty): Profile {
  return { ...p, settings: { ...p.settings, difficulty } };
}

/** ACES-04 */
export function setVibration(p: Profile, vibration: boolean): Profile {
  return { ...p, settings: { ...p.settings, vibration } };
}

/** TUTO-09: "Rever tutorial" na tela Ajustes. */
export function resetTutorial(p: Profile): Profile {
  return { ...p, tutorialDone: false };
}

/** HUMOR-01: o cartão de apresentação aparece só na primeira vez. */
export function introduceCharacter(p: Profile, id: CharacterId): Profile {
  if (p.charactersIntroduced.includes(id)) return p;
  return { ...p, charactersIntroduced: [...p.charactersIntroduced, id] };
}
