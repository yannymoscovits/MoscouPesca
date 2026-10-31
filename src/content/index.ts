// Junta os pacotes de conteúdo dos episódios, em ordem (EPI-01).

import { ep1 } from './episodes/ep1';
import { ep2 } from './episodes/ep2';
import { ep3 } from './episodes/ep3';
import { ep4 } from './episodes/ep4';
import { ep5 } from './episodes/ep5';
import type { EpisodeContent } from './types';

export const episodes: EpisodeContent[] = [ep1, ep2, ep3, ep4, ep5];

/** Falas da Jane no tutorial da primeira pescaria (Episódio 1). */
export { tutorial } from './episodes/ep1';
