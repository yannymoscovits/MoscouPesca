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
/** Faixa verde: 17% da barra + 1,5% por ponto de força da vara (Bambu 18,5%, força 10 32%; o Tranquilo aumenta). */
export const BAR_ZONE_BASE = 0.17;
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
export const METER_FILL_PER_S = 0.18;
export const METER_FILL_LOSS_PER_STAMINA = 0.005;
export const METER_DRAIN_PER_S = { desafio: 0.07, tranquilo: 0.03 };
/** Tranquilo: medidor mínimo, faixa 15% mais alta, peixe 40% mais lento, destinos 50% mais espaçados. */
export const TRANQUILO_METER_FLOOR = 0.1;
export const TRANQUILO_ZONE_SCALE = 1.15;
/** BRIGA-15: cada episódio depois do 1º deixa o peixe 5% mais rápido e o medidor 3% mais lento de encher. */
export const EPISODE_FISH_SPEED_STEP = 0.05;
export const EPISODE_FISH_FILL_STEP = 0.03;
/** BRIGA-16: o mais pesado da faixa briga 10% mais forte que o médio, e o mais leve 10% mais fraco. */
export const SIZE_FIGHT_SPREAD = 0.2;
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
/**
 * ISCA-03: o tranco do PUXAR sobe a isca 10% da altura da água na tela, igual em todo cenário: num ponto
 * de 1,5 m são 15 cm; num de 10 m, 1 m; nos mais fundos, 1,25 m (a vista comprime o fundo).
 */
export const TWITCH_UP_SHARE = 0.1;
/** A vista debaixo d'água estica a água até 10 m em 80% da altura; abaixo disso, o resto cabe em 20%. */
export const VIEW_LINEAR_DEPTH_M = 10;
export const VIEW_DEEP_SHARE = 0.2;
/**
 * ISCA-13: a isca afunda 30% da água da tela por segundo e sobe 7% ao recolher, em todo ponto. Num fundo
 * de 3 m dá os antigos 0,9 m/s e 0,2 m/s; num de 1 m, só 0,3 m/s e 7 cm/s, sem a isca disparar na tela rasa.
 */
export const LURE_SINK_SHARE_PER_S = 0.3;
export const LURE_RISE_SHARE_PER_S = 0.07;
/** Isca parada afunda até o fundo do ponto. */
export const LURE_SINK_MPS = 0.9;
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

/** Cardume de cada ponto (pedido do usuário): poucos peixes, visíveis como sombras na mira. */
export const SCHOOL_MAX = 6;
/** Abaixo do máximo, chega um peixe novo a cada tanto (s): o ponto nunca esvazia de vez. */
export const SCHOOL_REFILL_S = 12;
/** Os peixes ficam no cone da mira, entre 35% e 95% do alcance da vara. */
export const SCHOOL_HALF_ARC_DEG = 38;
export const SCHOOL_NEAR_SHARE = 0.35;
export const SCHOOL_FAR_SHARE = 0.95;
/**
 * Faixas de distância (fração do alcance) por onde o cardume se espalha, um peixe por vez em cada:
 * sempre há peixe perto, no meio e longe, e de um lado e do outro (pedido do usuário).
 */
export const SCHOOL_BANDS = [
  { min: 0.35, max: 0.55 },
  { min: 0.55, max: 0.75 },
  { min: 0.75, max: 0.95 },
];
/** Vaivém de cada peixe: meia distância (m) e velocidade (rad/s; uma volta em 12 a 25 s). */
export const SCHOOL_SWAY_M = { min: 0.8, max: 2 };
export const SCHOOL_SWAY_RAD_S = { min: 0.25, max: 0.5 };
/** Raio (m) em volta de onde a isca cai: os peixes do cardume nele entram na água. */
export const SCHOOL_NOTICE_RADIUS_M = 4;

/**
 * BRIGA-18: a dificuldade vem do quanto o peixe se mexe na barra. Força 1 mexe 68% do normal, força 5
 * 100% e força 10 140%: pulos maiores e trocas de destino mais frequentes.
 */
export const MOVE_BASE = 0.6;
export const MOVE_PER_POWER = 0.08;
/** BRIGA-18: o afundador mergulha (logo acima da faixa parada no fundo) e, em 1 de cada 4 trocas, arranca para cima. */
export const SINKER_DIVE = { min: 0.22, max: 0.45 };
export const SINKER_SURGE_CHANCE = 0.25;

/**
 * PONTO-07: a chance de o peixe que aceita a isca se interessar por ela ao notar, pela raridade da
 * espécie (o peso no sorteio): raro desconfia mais. Raridade 1, 50%; 2, 65%; 3, 80%; 4 ou mais, 95%.
 */
export const INTEREST_BASE = 0.35;
export const INTEREST_PER_RARITY = 0.15;
export const INTEREST_MAX = 0.95;

/** PESCA-17: sem nada mais para comprar no capítulo, a carteira guarda até isto ("Carteira cheia!"). */
export const WALLET_SPARE = 200;

/**
 * BRIGA-20: tensão da linha. Sobe com o peixe fora da faixa verde, mais rápido com peixe forte e grande
 * e mais devagar com vara forte; com o peixe dentro da faixa, cai. Em 1, arrebenta.
 */
export const TENSION_RISE_PER_S = 0.22;
export const TENSION_FALL_PER_S = 0.8;
/** Daqui para cima a barra da linha fica vermelha e o celular dá um aviso. */
export const TENSION_WARN = 0.75;
/** No Tranquilo a linha estica na metade da velocidade (mas arrebenta). */
export const TRANQUILO_TENSION_SCALE = 0.5;

/**
 * BRIGA-21: o peixe mais pesado é sempre mais difícil, pelo peso de verdade (não só dentro da espécie).
 * Comparado com o peso típico do episódio, ele nada mais rápido e o medidor enche mais devagar:
 * fator = ((1 + kg) / (1 + típico)) ^ 0,2. No Ep. 1, um tambaqui de 12 kg briga 34% mais que uma traíra de 2 kg.
 */
export const WEIGHT_REF_KG = { 1: 2, 2: 2.3, 3: 2.3, 4: 1.8, 5: 13 } as const;
export const WEIGHT_FIGHT_EXP = 0.2;
/** BRIGA-21: o fator do peso para aqui (o lendário de 90 kg briga como um peixe de ~25 kg no Ep. 1). */
export const WEIGHT_FIGHT_MAX = 1.7;

/** BRIGA-18: o saltador descansa 60% mais entre um pulo e outro, para dar tempo de trazer a faixa até ele. */
export const SALTADOR_REST = 1.6;

/** PONTO-07: o peixe que não se interessou chega perto da isca e olha por este tempo antes de ir embora. */
export const IGNORE_LOOK_S = 1.5;
/** PONTO-07: depois disto ele volta a reparar na isca, no mesmo arremesso (dá para insistir com o PUXAR). */
export const IGNORE_RETRY_S = 3;
/** PONTO-07: cada vez que o peixe desconfia, a chance de se interessar na próxima sobe isto (insistir funciona). */
export const INTEREST_PER_TRY = 0.2;
