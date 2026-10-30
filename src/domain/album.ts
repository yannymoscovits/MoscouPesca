// Álbum: espécies pegas e recorde de peso de cada uma (design.md, "Domain: album").

import type { Profile, SpeciesId } from '../content/types';

export type Album = Profile['album'];

/** ALBUM-01: a primeira captura registra a espécie; ALBUM-02: só peixe mais pesado vira recorde. */
export function record(a: Album, species: SpeciesId, kg: number): { album: Album; isNewRecord: boolean } {
  const current = a[species];
  if (current && kg <= current.recordKg) return { album: a, isNewRecord: false };
  return { album: { ...a, [species]: { recordKg: kg } }, isNewRecord: true };
}
