// Números da briga (design.md, "Física da briga"), por segundo.
// O teste de balanceamento (balance.test.ts) confere que eles dão brigas de 8 a 40 s.

/** Tensão ganha segurando: × força do peixe ÷ força da vara. */
export const TENSION_GAIN = 20;
/** Tensão perdida soltando. */
export const TENSION_RELIEF = 80;
/** Linha recolhida segurando. */
export const REEL_SPEED = 10;
/** Linha puxada pelo peixe soltando: × força do peixe × fôlego (de 1 a 0). */
export const FISH_PULL = 1.2;
/** Distância do peixe quando a briga começa. */
export const FIGHT_START_DISTANCE = 100;
/** O fôlego acaba em FATIGUE_BASE_S + FATIGUE_S_PER_STAMINA × fôlego da espécie. */
export const FATIGUE_BASE_S = 5;
export const FATIGUE_S_PER_STAMINA = 1;

/** Faixa de força e fôlego das espécies que o balanceamento cobre; o conteúdo fica dentro dela. */
export const FISH_POWER = { min: 1, max: 10 };
export const FISH_STAMINA = { min: 1, max: 10 };

// ---------- Pescaria nova: arremesso (spec pesca-bass, "Seta da mira" e "Barra de força") ----------

/** Metade do arco da seta: ela balança de -45° (esquerda) a 45° (direita). */
export const AIM_HALF_ARC_DEG = 45;
/** Parte do alcance máximo que o arremesso mais fraco já alcança (força 0). */
export const CAST_MIN_SHARE = 0.3;
/** Metros por px lógico do alcance da v1: a Vara de Bambu (108 px) chega a 10,8 m. */
export const M_PER_PX = 0.1;
