// O que o pesqueiro mostra de cada ponto do local (design.md da pesca-bass, "spots").
// Os pontos são as zonas do local; o álbum diz quais espécies já têm nome.

import type { BaitId, Location, Rod, RodId, Species, SpeciesId, Zone } from '../content/types';
import type { Album } from './album';

export interface SpotView {
  id: string; // Zone.id
  name: string;
  zone: Zone;
  locked: boolean; // vara curta demais (PONTO-03) ou falta a isca (PONTO-08) ou a vara do ponto (PONTO-10)
  minReach: number;
  lockText: string | null; // "Precisa de vara com alcance N" ou "Precisa da Vara de Grafite e da Isca de Camarão"
  species: { id: SpeciesId; name: string; caught: boolean }[];
}

/**
 * PONTO-01 a PONTO-03, PONTO-08, PONTO-10: nome, cadeado, alcance pedido e espécies de cada ponto. O ponto
 * que pede vara e isca (a Ponte da Cetrel pede a Vara de Grafite e o Camarão) fica fechado até as duas
 * serem compradas.
 */
export function spotsFor(
  loc: Location,
  rod: Rod,
  species: Species[],
  album: Album,
  baitsOwned: BaitId[] = [],
  baitName: (id: BaitId) => string = (id) => id,
  rodsOwned: RodId[] = [],
  rodName: (id: RodId) => string = (id) => id,
): SpotView[] {
  return loc.zones.map((zone) => {
    const shortRod = rod.reach < zone.minReach;
    const noRod = zone.requiresRod !== undefined && !rodsOwned.includes(zone.requiresRod);
    const noBait = zone.requiresBait !== undefined && !baitsOwned.includes(zone.requiresBait);
    const locked = shortRod || noRod || noBait;
    const needs = [noRod && rodName(zone.requiresRod!), noBait && baitName(zone.requiresBait!)].filter((n): n is string => !!n);
    return {
      id: zone.id,
      name: zone.name,
      zone,
      locked,
      minReach: zone.minReach,
      lockText: shortRod ? `Precisa de vara com alcance ${zone.minReach}` : needs.length ? `Precisa da ${needs.join(' e da ')}` : null,
      species: zone.species.map((id) => ({
        id,
        caught: album[id] !== undefined,
        name: album[id] || id === 'piranha-lavinia' ? (species.find((sp) => sp.id === id)?.name ?? '???') : '???',
      })),
    };
  });
}
