// Números da briga (design.md, "Física da briga"), por segundo.
// O teste de balanceamento (balance.test.ts) confere que eles dão brigas de 8 a 40 s.

/** Tensão ganha segurando: × força do peixe ÷ força da vara. */
export const TENSION_GAIN = 10;
/** Tensão perdida soltando. */
export const TENSION_RELIEF = 40;
/** Linha recolhida segurando. */
export const REEL_SPEED = 10;
/** Linha puxada pelo peixe soltando: × força do peixe × fôlego (de 1 a 0). */
export const FISH_PULL = 1.2;
/** Distância do peixe quando a briga começa. */
export const FIGHT_START_DISTANCE = 100;
/** O fôlego acaba em FATIGUE_BASE_S + FATIGUE_S_PER_STAMINA × fôlego da espécie. */
export const FATIGUE_BASE_S = 5;
export const FATIGUE_S_PER_STAMINA = 1;
