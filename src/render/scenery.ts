// Cenário provisório de cada local (spec, "Layout da tela de pesca"): o fundo do mar da tela inicial
// fica atrás da pesca e, enquanto a arte do PixelLab não chega, cada local põe por cima um véu com a
// cor e o tom dele. A chave é o id do local (Location.id); local desconhecido usa o cenário padrão.

import type { LocationId } from '../content/types';

export interface Scenery {
  /** Véu translúcido por cima do fundo do mar: a cor da água do local. */
  tint: string;
}

const SCENERY: Record<LocationId, Scenery> = {
  'poco-do-magro': { tint: 'rgba(70, 170, 235, 0.18)' }, // represa: o azul do mockup, um pouco mais claro
  'rio-jacuipe': { tint: 'rgba(120, 112, 30, 0.34)' }, // rio de água escura, verde-oliva
  'ponte-da-cetrel': { tint: 'rgba(10, 170, 140, 0.34)' }, // estuário salgado: verde-azulado
  'vera-cruz': { tint: 'rgba(40, 220, 200, 0.28)' }, // mar da ilha: turquesa
  'parque-dos-ventos': { tint: 'rgba(150, 165, 190, 0.30)' }, // açude das eólicas: azul-acinzentado
  'alto-mar-da-bahia': { tint: 'rgba(0, 8, 60, 0.38)' }, // mar aberto: azul-marinho fundo
};

/** Local sem cenário cadastrado: o fundo do mar sem véu. */
export const DEFAULT_SCENERY: Scenery = { tint: 'rgba(0, 0, 0, 0)' };

export function sceneryOf(place: LocationId | undefined): Scenery {
  return (place && SCENERY[place]) || DEFAULT_SCENERY;
}
