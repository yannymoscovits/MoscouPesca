// Manual do peixe no álbum (ALBUM-05): onde ele vive, que isca ele morde, que vara dá conta dele e
// como ele briga. Tudo sai do conteúdo dos episódios, para o manual nunca mentir.

import type { Bait, Episode, FightStyle, Rod, Species } from '../content/types';
import { fightStyleOf } from './catchBar';
import { fishStars, fishValue } from './value';

export interface FishGuide {
  spots: { place: string; spot: string; minReach: number }[]; // locais e pontos onde a espécie vive
  baits: Bait[]; // iscas que ela morde
  rod: Rod | null; // a primeira vara que alcança o ponto mais fácil e aguenta a briga (ou a que ele exige)
  rodRequired: boolean; // PONTO-09: só morde com essa vara
  style: FightStyle;
  difficulty: number; // 1 a 5 estrelas, pela dificuldade da briga
  value: { min: number; max: number }; // R$ do mais leve ao mais pesado
}

/** Força mínima de vara recomendada: peixe forte pede vara mais forte (força do peixe menos 4). */
export const rodForceFor = (sp: Species) => Math.max(1, sp.power - 4);

export function fishGuide(sp: Species, all: Episode[]): FishGuide {
  const spots = all.flatMap((ep) =>
    ep.locations.flatMap((loc) =>
      loc.zones.filter((z) => z.species.includes(sp.id)).map((z) => ({ place: loc.name, spot: z.name, minReach: z.minReach })),
    ),
  );
  const easiest = Math.min(...spots.map((s) => s.minReach));
  const baits = all.flatMap((ep) => ep.baits).filter((b) => sp.baits.includes(b.id));
  const rods = all.flatMap((ep) => ep.rods);
  const rod = (sp.requiresRod ? rods.find((r) => r.id === sp.requiresRod) : rods.find((r) => r.reach >= easiest && r.force >= rodForceFor(sp))) ?? null;
  const value = { min: fishValue(sp, sp.kg.min), max: fishValue(sp, sp.kg.max) };
  return { spots, baits, rod, rodRequired: sp.requiresRod !== undefined, style: fightStyleOf(sp), difficulty: fishStars(sp), value };
}
