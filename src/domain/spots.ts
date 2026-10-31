// O que o pesqueiro mostra de cada ponto do local (design.md da pesca-bass, "spots").
// Os pontos são as zonas do local; o álbum diz quais espécies já têm nome.

import type { Location, Rod, Species, SpeciesId, Zone } from '../content/types';
import type { Album } from './album';

export interface SpotView {
  id: string; // Zone.id
  name: string;
  zone: Zone;
  locked: boolean; // vara curta demais para o ponto (PONTO-03)
  minReach: number;
  lockText: string | null; // "Precisa de vara com alcance N" quando bloqueado
  species: { id: SpeciesId; name: string }[]; // nome, ou "???" se ainda não foi pescada
}

/** PONTO-01 a PONTO-03: nome, cadeado, alcance pedido e espécies de cada ponto. */
export function spotsFor(loc: Location, rod: Rod, species: Species[], album: Album): SpotView[] {
  return loc.zones.map((zone) => {
    const locked = rod.reach < zone.minReach;
    return {
      id: zone.id,
      name: zone.name,
      zone,
      locked,
      minReach: zone.minReach,
      lockText: locked ? `Precisa de vara com alcance ${zone.minReach}` : null,
      species: zone.species.map((id) => ({
        id,
        name: album[id] ? (species.find((sp) => sp.id === id)?.name ?? '???') : '???',
      })),
    };
  });
}
