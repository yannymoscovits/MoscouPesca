// Junta os pacotes de conteúdo dos episódios, em ordem (EPI-01).

import { ep1 } from './episodes/ep1';
import { ep2 } from './episodes/ep2';
import type { EpisodeContent } from './types';

export const episodes: EpisodeContent[] = [ep1, ep2];

/** Falas da Jane no tutorial da primeira pescaria (Episódio 1). */
export { tutorial } from './episodes/ep1';
