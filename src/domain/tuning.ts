// Números da pescaria (spec pesca-bass, Assumptions), em metros, barras e segundos.

/** Faixa de força e fôlego das espécies; o conteúdo fica dentro dela. */
export const FISH_POWER = { min: 1, max: 10 };
export const FISH_STAMINA = { min: 1, max: 10 };

// ---------- Pescaria nova: arremesso (spec pesca-bass, "Seta da mira" e "Barra de força") ----------

/** Metade do arco da seta: ela balança de -45° (esquerda) a 45° (direita). */
export const AIM_HALF_ARC_DEG = 45;
/** Parte do alcance máximo que o arremesso mais fraco já alcança (força 0). */
export const CAST_MIN_SHARE = 0.3;
/** Metros por px lógico do alcance da v1: a Vara de Bambu (108 px) chega a 10,8 m. */
export const M_PER_PX = 0.1;
/** Ida e volta da seta e ciclo da barra de força (ARREM-06). */
export const AIM_SWEEP_S = { desafio: 2, tranquilo: 4 };
/** Janela para fisgar depois do ataque (ISCA-10). */
export const HOOK_WINDOW_S = { desafio: 2, tranquilo: 4 };
/** Voo da isca até a água; mesmo tempo do arremesso da v1. */
export const CAST_FLIGHT_S = 0.8;

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
/** Tranco imediato para cima quando o dedo encosta em SEGURAR (barra/s): a briga responde na hora. */
export const BAR_PRESS_KICK = 0.5;
/** Multiplica a aceleração de segurar enquanto a faixa ainda cai: freia rápido no apertar. */
export const BAR_BRAKE_SCALE = 2.5;
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

// ---------- Pescaria nova: isca e peixes debaixo d'água (spec pesca-bass, "Movimento da isca") ----------
// Metros e segundos; `xM` é a distância até o Adilson e a profundidade cresce para baixo.

/** Maior passo da água; `dt` maior é dividido em passos iguais a este ou menores. */
export const WATER_MAX_STEP_S = 1 / 30;
/** RECOLHER: a isca vem para o Adilson e sobe. */
export const LURE_REEL_MPS = 1;
export const LURE_RISE_MPS = 0.2;
/** PUXAR: tranco para o Adilson e para cima. */
export const TWITCH_FORWARD_M = 0.6;
export const TWITCH_UP_M = 0.4;
/** Isca parada afunda até o fundo do ponto. */
export const LURE_SINK_MPS = 0.3;
/** Peixes por arremesso. */
export const SCHOOL_SIZE = { min: 3, max: 6 };
/** Distância da isca em que o peixe se interessa (segue ou recusa). */
export const INTEREST_RADIUS_M = 2;
/** Tempo do começo da perseguição até o ataque; cada PUXAR adianta 1 s, sem passar de 0,5 s. */
export const ATTACK_S = { min: 2, max: 5 };
export const TWITCH_HURRY_S = 1;
export const ATTACK_MIN_S = 0.5;
// Padrões sem número na spec, para a calibragem: nado, perseguição, fuga e onde os peixes nascem.
/** Velocidade do peixe nadando à toa, seguindo a isca e fugindo. */
export const FISH_CRUISE_MPS = 0.4;
export const FISH_FOLLOW_MPS = 2;
export const FISH_FLEE_MPS = 2.5;
/** Quem segue fica esta distância atrás da isca. */
export const FISH_FOLLOW_GAP_M = 0.4;
/** Os peixes nascem até esta distância (para os dois lados) do ponto onde a isca caiu... */
export const FISH_SPREAD_M = 4;
/** ...e nadando à toa dão a volta quando se afastam isto da isca. */
export const FISH_RANGE_M = 4;
/** Peixe nenhum chega mais perto do Adilson que isto. */
export const FISH_MIN_X_M = 0.5;
/** Faixa de profundidade em que os peixes nadam, acima do fundo; o teto deixa os pontos fundos jogáveis. */
export const FISH_SWIM_DEPTH_M = { min: 0.3, max: 6 };
export const FISH_BOTTOM_GAP_M = 0.2;
