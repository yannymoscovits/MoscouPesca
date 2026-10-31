// Cenário de cada local (spec, "Layout da tela de pesca" e "Visual da pescaria"): o fundo do mar da
// tela inicial fica atrás da pesca e, enquanto a arte do PixelLab não chega, cada local põe por cima um
// véu com a cor e o tom dele, a textura da água na paleta dele e o lugar de onde o Adilson pesca.
// A chave é o id do local (Location.id); local desconhecido usa o cenário padrão.

import type { LocationId } from '../content/types';

/** De onde o Adilson pesca. */
export type StandKind = 'pier' | 'barranco' | 'ponte' | 'pedras' | 'barragem' | 'barco';

export interface Scenery {
  /** Véu translúcido por cima do fundo do mar: a cor da água do local. */
  tint: string;
  /** Textura animada da água: brilhos (`light`) e ondinhas (`wave`). */
  water: { light: string; wave: string };
  stand: StandKind;
}

const SCENERY: Record<LocationId, Scenery> = {
  // Represa: o azul do mockup, um pouco mais claro.
  'poco-do-magro': { tint: 'rgba(70, 170, 235, 0.18)', water: { light: '#bfe9ff', wave: '#7cc4ff' }, stand: 'pier' },
  // Rio de água escura, verde-oliva.
  'rio-jacuipe': { tint: 'rgba(120, 112, 30, 0.34)', water: { light: '#e3e6a8', wave: '#a3ad5e' }, stand: 'barranco' },
  // Estuário salgado: verde-azulado.
  'ponte-da-cetrel': { tint: 'rgba(10, 170, 140, 0.34)', water: { light: '#b8f2e2', wave: '#5fcfb4' }, stand: 'ponte' },
  // Mar da ilha: turquesa.
  'vera-cruz': { tint: 'rgba(40, 220, 200, 0.28)', water: { light: '#dafff8', wave: '#7fe8dc' }, stand: 'pedras' },
  // Açude no pé das eólicas: azul-acinzentado.
  'parque-dos-ventos': { tint: 'rgba(150, 165, 190, 0.30)', water: { light: '#eef3fb', wave: '#a9bcd6' }, stand: 'barragem' },
  // Mar aberto: azul-marinho fundo.
  'alto-mar-da-bahia': { tint: 'rgba(0, 8, 60, 0.38)', water: { light: '#a9c8ff', wave: '#4f7fd6' }, stand: 'barco' },
};

/** Local sem cenário cadastrado: o fundo do mar sem véu, a água clara e o píer. */
export const DEFAULT_SCENERY: Scenery = { tint: 'rgba(0, 0, 0, 0)', water: { light: '#cfe8f5', wave: '#7cb6dd' }, stand: 'pier' };

export function sceneryOf(place: LocationId | undefined): Scenery {
  return (place && SCENERY[place]) || DEFAULT_SCENERY;
}
