// Regras de conteúdo que valem para todos os episódios registrados em index.ts.
import { describe, expect, it } from 'vitest';
import { newProfile, START_BAIT, START_ROD } from '../domain/profile';
import { FISH_POWER, FISH_STAMINA } from '../domain/tuning';
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

describe('todos os episódios', () => {
  it('EPI-01: index.ts lista os episódios em ordem, a partir do 1', () => {
    expect(episodes.map((ep) => ep.id)).toEqual(episodes.map((_, i) => i + 1));
  });

  it('os IDs que o perfil guarda e os cenários são únicos entre os episódios', () => {
    const unique = (what: string, ids: string[]) => expect(ids.length - new Set(ids).size, what).toBe(0);
    unique('espécies', episodes.flatMap((ep) => ep.species.map((sp) => sp.id)));
    unique('varas', episodes.flatMap((ep) => ep.rods.map((r) => r.id)));
    unique('iscas', episodes.flatMap((ep) => ep.baits.map((b) => b.id)));
    unique('locais', episodes.flatMap((ep) => ep.locations.map((l) => l.id)));
    unique('cenários', episodes.flatMap((ep) => ep.locations.map((l) => l.background)));
    unique('cenas', episodes.flatMap((ep) => ep.scenes.map((s) => s.id)));
    unique('campeonatos', episodes.map((ep) => ep.tournament.id));
    unique('troféus', episodes.map((ep) => ep.tournament.trophy));
    unique('cartas', episodes.map((ep) => ep.letter.id));
  });

  it('EQUIP-02: cada isca atrai um conjunto não vazio e diferente de espécies', () => {
    const species = episodes.flatMap((ep) => ep.species);
    const baits = episodes.flatMap((ep) => ep.baits);
    const attracted = baits.map((b) =>
      species
        .filter((sp) => sp.baits.includes(b.id))
        .map((sp) => sp.id)
        .sort()
        .join(','),
    );
    for (const [i, set] of attracted.entries()) expect(set, baits[i].id).not.toBe('');
    expect(new Set(attracted).size).toBe(baits.length);
  });
});

describe.each(episodes.map((ep) => [ep.id, ep] as const))('Episódio %i', (_id, ep) => {
  const zones = () => ep.locations.flatMap((l) => l.zones);

  it('EPI-06, HUMOR-03: tem pelo menos 5 espécies próprias, com IDs únicos e descrição engraçada', () => {
    expect(ep.species.length).toBeGreaterThanOrEqual(5);
    expect(new Set(ep.species.map((sp) => sp.id)).size).toBe(ep.species.length);
    for (const sp of ep.species) expect(sp.description.trim(), sp.id).not.toBe('');
  });

  it('força e fôlego de toda espécie ficam dentro de FISH_POWER e FISH_STAMINA (1 a 10)', () => {
    for (const sp of ep.species) {
      expect(sp.power, sp.id).toBeGreaterThanOrEqual(FISH_POWER.min);
      expect(sp.power, sp.id).toBeLessThanOrEqual(FISH_POWER.max);
      expect(sp.stamina, sp.id).toBeGreaterThanOrEqual(FISH_STAMINA.min);
      expect(sp.stamina, sp.id).toBeLessThanOrEqual(FISH_STAMINA.max);
    }
  });

  it('toda espécie tem faixa de peso válida, preço por kg e peso no sorteio positivos', () => {
    for (const sp of ep.species) {
      expect(sp.kg.min, sp.id).toBeGreaterThan(0);
      expect(sp.kg.max, sp.id).toBeGreaterThanOrEqual(sp.kg.min);
      expect(sp.pricePerKg, sp.id).toBeGreaterThan(0);
      expect(sp.rarity, sp.id).toBeGreaterThan(0);
    }
  });

  it('EPI-06: todo local tem cenário e zonas; toda espécie das zonas existe e toda espécie aparece numa zona', () => {
    const ids = new Set(ep.species.map((sp) => sp.id));
    for (const loc of ep.locations) {
      expect(loc.name.trim(), loc.id).not.toBe('');
      expect(loc.background.trim(), loc.id).not.toBe('');
      expect(loc.zones.length, loc.id).toBeGreaterThan(0);
    }
    for (const zone of zones()) {
      expect(zone.polygon.length, zone.id).toBeGreaterThanOrEqual(3);
      expect(zone.species.length, zone.id).toBeGreaterThan(0);
      for (const id of zone.species) expect(ids.has(id), `${zone.id} → ${id}`).toBe(true);
    }
    const inZones = new Set(zones().flatMap((z) => z.species));
    for (const sp of ep.species) expect(inZones.has(sp.id), sp.id).toBe(true);
  });

  it('EQUIP-02: toda isca citada pelas espécies existe neste episódio ou num anterior', () => {
    const available = new Set(episodes.filter((e) => e.id <= ep.id).flatMap((e) => e.baits.map((b) => b.id)));
    for (const sp of ep.species) for (const b of sp.baits) expect(available.has(b), `${sp.id} → ${b}`).toBe(true);
  });

  it('EQUIP-01: traz 2 varas novas com preço, e toda vara do episódio tem força e alcance de 1 a 10', () => {
    const novas = ep.rods.filter((r) => r.id !== START_ROD);
    expect(novas).toHaveLength(2);
    for (const r of novas) expect(r.price, r.id).toBeGreaterThan(0);
    for (const r of ep.rods) {
      expect(r.episode, r.id).toBe(ep.id);
      for (const value of [r.force, r.reach]) {
        expect(value, r.id).toBeGreaterThanOrEqual(1);
        expect(value, r.id).toBeLessThanOrEqual(10);
      }
    }
  });

  it('EQUIP-02: traz pelo menos 1 isca nova com preço', () => {
    const novas = ep.baits.filter((b) => b.id !== START_BAIT);
    expect(novas.length).toBeGreaterThanOrEqual(1);
    for (const b of novas) expect(b.price, b.id).toBeGreaterThan(0);
    for (const b of ep.baits) expect(b.episode, b.id).toBe(ep.id);
  });

  it('CAMP-02, HUMOR-04: o campeonato tem nome, 8 arremessos, conta 3 e tem 3 rivais do elenco, cada um provocando com a própria fala', () => {
    const ids = new Set(characters.map((c) => c.id));
    expect(ep.tournament.name.trim()).not.toBe('');
    expect(ep.tournament).toMatchObject({ casts: 8, countBest: 3 });
    expect(ep.tournament.rivals).toHaveLength(3);
    expect(new Set(ep.tournament.rivals.map((r) => r.character)).size).toBe(3);
    for (const r of ep.tournament.rivals) {
      expect(ids.has(r.character), r.character).toBe(true);
      expect(r.kg, r.character).toBeGreaterThan(0);
      expect(r.taunt.speaker).toBe(r.character);
    }
  });

  it('EPI-06, CAMP-06, CAMP-07: o campeonato tem troféu e a carta da família, com remetente e texto', () => {
    expect(ep.tournament.trophy.trim()).not.toBe('');
    expect(ep.letter.id).toBe(ep.tournament.message);
    expect(ep.letter.from.trim()).not.toBe('');
    expect(ep.letter.text.trim()).not.toBe('');
  });

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
