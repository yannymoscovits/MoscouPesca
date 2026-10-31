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

// ---------- Pescaria nova: barra de captura (spec pesca-bass, "Física da briga") ----------
// Alturas em barras (0 = fundo, 1 = topo), tempos em segundos.

/** Maior passo da física; `dt` maior é dividido em passos iguais a este ou menores. */
export const BAR_MAX_STEP_S = 1 / 30;
/** Gravidade da faixa verde, em barra/s². */
export const BAR_GRAVITY = 1.4;
/** Empurrão para cima enquanto SEGURAR está apertado, em barra/s² (contra a gravidade). */
export const BAR_HOLD_ACCEL = 2.8;
/** Velocidade máxima da faixa, para cima e para baixo, em barra/s. */
export const BAR_MAX_SPEED = 1.2;
/** Parte da velocidade que a faixa devolve ao quicar no fundo. */
export const BAR_BOUNCE = 0.6;
/** Altura da faixa: base + por ponto de Força da vara. */
export const BAR_ZONE_BASE = 0.18;
export const BAR_ZONE_PER_FORCE = 0.015;
/** Tempo entre dois destinos do peixe. */
export const FISH_RETARGET_S = { min: 0.5, max: 1.5 };
/**
 * Aproximação exponencial do peixe até o destino: 6/s × (0,5 + força/10), ou seja, 6/s na força 5.
 * A spec diz só "mais rápido quanto maior a força"; o fator por força é padrão para a calibragem.
 */
export const FISH_APPROACH_PER_S = 6;
export const FISH_SPEED_BASE = 0.5;
export const FISH_SPEED_PER_POWER = 0.1;
/** Distância de cada novo destino, por jeito: o calmo vai perto, o saltador vai longe (padrões). */
export const CALM_JUMP = { min: 0, max: 0.25 };
export const LEAP_JUMP = { min: 0.35, max: 0.7 };
/** O afundador sorteia destinos só da metade de baixo. */
export const SINKER_TOP = 0.5;
/** Até a força 4 o peixe sem `fightStyle` é calmo; da 5 em diante, saltador. */
export const CALM_MAX_POWER = 4;
/** Medidor de captura (0 a 1). */
export const METER_START = 0.3;
export const METER_FILL_PER_S = 0.15;
export const METER_FILL_LOSS_PER_STAMINA = 0.007;
export const METER_DRAIN_PER_S = { desafio: 0.12, tranquilo: 0.06 };
/** Tranquilo: medidor mínimo, faixa 40% mais alta, peixe 40% mais lento, destinos 50% mais espaçados. */
export const TRANQUILO_METER_FLOOR = 0.1;
export const TRANQUILO_ZONE_SCALE = 1.4;
export const TRANQUILO_FISH_SPEED_SCALE = 0.6;
export const TRANQUILO_RETARGET_SCALE = 1.5;
