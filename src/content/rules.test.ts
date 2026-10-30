// Regras de conteúdo que valem para todos os episódios registrados em index.ts.
import { describe, expect, it } from 'vitest';
import { newProfile } from '../domain/profile';
import { characters } from './characters';
import { episodes } from './index';
import type { DialogLine, EpisodeContent, GameEvent, Profile, SpeciesId } from './types';

/** Palavra inteira, sem diferenciar maiúsculas: "pai" não casa com "paixão". */
const hasWord = (text: string, word: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, 'iu').test(text);

const sceneLines = (ep: EpisodeContent): DialogLine[] => ep.scenes.flatMap((s) => s.lines);
const allLines = (ep: EpisodeContent): DialogLine[] => [
  ...sceneLines(ep),
  ...ep.tournament.rivals.map((r) => r.taunt),
];

const caught = (species: SpeciesId): GameEvent => ({ type: 'Caught', species, kg: 1 });
/** Perfil com o efeito da captura já aplicado: as espécies dadas estão no álbum. */
const withAlbum = (ids: SpeciesId[]): Profile => ({
  ...newProfile(),
  album: Object.fromEntries(ids.map((id) => [id, { recordKg: 1 }])),
});

describe('o verificador de palavra inteira', () => {
  it('"pai" não casa com "paixão" e "Adilson" não casa com "Adilsinho"', () => {
    expect(hasWord('Que paixão por pescaria!', 'pai')).toBe(false);
    expect(hasWord('Oi, PAI!', 'pai')).toBe(true);
    expect(hasWord('Ih, Adilsinho', 'Adilson')).toBe(false);
    expect(hasWord('Ih, Adilson', 'Adilson')).toBe(true);
  });
});

describe.each(episodes.map((ep) => [ep.id, ep] as const))('Episódio %i', (_id, ep) => {
  it('toda fala aponta para um personagem de characters.ts e tem texto', () => {
    const ids = new Set(characters.map((c) => c.id));
    for (const line of allLines(ep)) {
      expect(ids.has(line.speaker), line.speaker).toBe(true);
      expect(line.text.trim()).not.toBe('');
    }
  });

  it('toda cena citada pela abertura, pelos objetivos, pelo encerramento e pela derrota existe', () => {
    const sceneIds = ep.scenes.map((s) => s.id);
    expect(new Set(sceneIds).size).toBe(sceneIds.length);
    const cited = [
      ep.chapter.openingScene,
      ...ep.chapter.objectives.map((o) => o.sceneOnDone),
      ep.chapter.closingScene,
      ep.defeatScene,
    ];
    for (const id of cited) expect(sceneIds, id).toContain(id);
    for (const s of ep.scenes) expect(s.lines.length, s.id).toBeGreaterThan(0);
  });

  it('PROG-02: tem de 6 a 8 objetivos antes do campeonato', () => {
    expect(ep.chapter.objectives.length).toBeGreaterThanOrEqual(6);
    expect(ep.chapter.objectives.length).toBeLessThanOrEqual(8);
  });

  it('PROG-03: um objetivo se cumpre ao pegar a espécie rara, e só ela', () => {
    const rare = ep.species.filter((sp) => sp.rare);
    expect(rare).toHaveLength(1);
    const others = ep.species.filter((sp) => !sp.rare);
    const rareObjective = ep.chapter.objectives.find(
      (o) =>
        o.done(caught(rare[0].id), withAlbum([rare[0].id])) &&
        others.every((sp) => !o.done(caught(sp.id), withAlbum([sp.id]))),
    );
    expect(rareObjective).toBeDefined();
  });

  it('PROG-03: um objetivo se cumpre com o álbum completo, e não se cumpre faltando qualquer espécie', () => {
    const all = ep.species.map((sp) => sp.id);
    const albumObjective = ep.chapter.objectives.find(
      (o) =>
        o.done(caught(all[0]), withAlbum(all)) &&
        all.every((missing) => !o.done(caught(all[0]), withAlbum(all.filter((id) => id !== missing)))),
    );
    expect(albumObjective).toBeDefined();
  });

  it('HUMOR-07: nenhuma fala da Lavínia contém "Adilson" nem "pai"', () => {
    const hers = allLines(ep).filter((l) => l.speaker === 'lavinia');
    for (const l of hers) {
      expect(hasWord(l.text, 'Adilson'), l.text).toBe(false);
      expect(hasWord(l.text, 'pai'), l.text).toBe(false);
    }
  });

  it('HUMOR-07, HUMOR-08: alguma cena tem fala da Lavínia chamando ele de "Adilsinho"', () => {
    const teasing = ep.scenes.filter((s) =>
      s.lines.some((l) => l.speaker === 'lavinia' && hasWord(l.text, 'Adilsinho')),
    );
    expect(teasing.length).toBeGreaterThanOrEqual(1);
  });
});
