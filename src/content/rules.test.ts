// Regras de conteúdo que valem para todos os episódios registrados em index.ts.
import { describe, expect, it } from 'vitest';
import { newProfile, START_BAIT, START_ROD } from '../domain/profile';
import { FISH_POWER, FISH_STAMINA } from '../domain/tuning';
import { characters, speakersOf } from './characters';
import { goals } from './goals';
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
    expect(hasWord('XÔ! Vim descansar', 'Xô')).toBe(true);
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

  it('HUMOR-09: nenhuma fala da Lu ou da Geane contém "Adilson", e cada uma chama ele de "Xô" em pelo menos uma fala', () => {
    const lines = episodes.flatMap(allLines);
    for (const sister of ['lu', 'geane']) {
      const hers = lines.filter((l) => speakersOf(l).includes(sister));
      for (const l of hers) expect(hasWord(l.text, 'Adilson'), l.text).toBe(false);
      expect(hers.filter((l) => hasWord(l.text, 'Xô')).length, sister).toBeGreaterThanOrEqual(1);
    }
  });

  it('nenhum texto põe "Tio" ou "Tia" antes do nome de um personagem', () => {
    const firstNames = characters.map((c) => c.name.split(' ')[0]).join('|');
    const tioName = new RegExp(`(?<!\\p{L})[Tt]i[oa]\\s+(?:${firstNames})(?!\\p{L})`, 'u');
    const texts = [
      ...characters.flatMap((c) => [c.name, c.epithet]),
      ...episodes.flatMap((ep) => [...allLines(ep).map((l) => l.text), ep.letter.text]),
    ];
    for (const text of texts) expect(tioName.test(text), text).toBe(false);
    expect(tioName.test('Bora, tia Lu!')).toBe(true);
  });
});

describe('medalhas e metas', () => {
  it('MEDAL-04, MEDAL-05: metas de 10, 25 e 50 capturas, com recompensa inteira, maior que zero e crescente por episódio', () => {
    expect(goals.counts).toEqual([10, 25, 50]);
    for (const count of goals.counts) {
      const rewards = episodes.map((ep) => goals.reward(ep.id, count));
      for (const [i, r] of rewards.entries()) {
        expect(r, `meta de ${count}, Ep. ${i + 1}`).toBeGreaterThan(0);
        expect(Number.isInteger(r), `meta de ${count}, Ep. ${i + 1}: R$ inteiro`).toBe(true);
        if (i > 0) expect(r, `meta de ${count}, Ep. ${i + 1} > Ep. ${i}`).toBeGreaterThan(rewards[i - 1]);
      }
    }
  });
});

describe('jeito dos peixes na briga', () => {
  it('BRIGA-06: traíras e robalo-flecha saltam; tambaqui, pirarucu e garoupa afundam; o Marlim-azul salta', () => {
    const all = episodes.flatMap((ep) => ep.species);
    const styleOf = (id: SpeciesId) => all.find((sp) => sp.id === id)?.fightStyle;
    expect({
      traira: styleOf('traira'),
      'traira-jacuipe': styleOf('traira-jacuipe'),
      'robalo-flecha': styleOf('robalo-flecha'),
      tambaqui: styleOf('tambaqui'),
      'pirarucu-lendario': styleOf('pirarucu-lendario'),
      garoupa: styleOf('garoupa'),
      'marlim-azul': styleOf('marlim-azul'),
    }).toEqual({
      traira: 'saltador',
      'traira-jacuipe': 'saltador',
      'robalo-flecha': 'saltador',
      tambaqui: 'afundador',
      'pirarucu-lendario': 'afundador',
      garoupa: 'afundador',
      'marlim-azul': 'saltador',
    });
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

  it('MEDAL-01: toda espécie tem bronze < prata < ouro, todos dentro da faixa de peso dela', () => {
    for (const sp of ep.species) {
      const { bronze, prata, ouro } = sp.medals;
      expect(bronze, `${sp.id}: bronze na faixa`).toBeGreaterThanOrEqual(sp.kg.min);
      expect(ouro, `${sp.id}: ouro na faixa`).toBeLessThanOrEqual(sp.kg.max);
      if (sp.kg.max > sp.kg.min) {
        expect(bronze, `${sp.id}: bronze < prata`).toBeLessThan(prata);
        expect(prata, `${sp.id}: prata < ouro`).toBeLessThan(ouro);
      } else {
        // Peso fixo (a Piranha Lavínia, "0,80 kg" no roteiro): as três vêm juntas, no peso dela.
        expect([bronze, prata, ouro], sp.id).toEqual([sp.kg.min, sp.kg.min, sp.kg.min]);
      }
    }
  });

  it('T80: toda zona tem profundidade (depthM) maior que zero, para o medidor de Profundidade', () => {
    for (const zone of zones()) expect(zone.depthM, zone.id).toBeGreaterThan(0);
  });

  it('PONTO-01, PONTO-03: todo local tem 3 pontos com nome próprio; alcance mínimo de 0 a 10, raso 0, meio 3 e fundo 5', () => {
    for (const loc of ep.locations) {
      expect(loc.zones, loc.id).toHaveLength(3);
      for (const zone of loc.zones) {
        expect(zone.name.trim(), zone.id).not.toBe('');
        expect(zone.minReach, zone.id).toBeGreaterThanOrEqual(0);
        expect(zone.minReach, zone.id).toBeLessThanOrEqual(10);
      }
      expect(new Set(loc.zones.map((z) => z.name)).size, loc.id).toBe(3);
      const shallowFirst = [...loc.zones].sort((a, b) => a.depthM - b.depthM);
      expect(shallowFirst.map((z) => z.minReach), loc.id).toEqual([0, 3, 5]);
    }
  });

  it('BRIGA-06: todo jeito de peixe (fightStyle) é calmo, saltador ou afundador', () => {
    for (const sp of ep.species) {
      if (sp.fightStyle !== undefined) expect(['calmo', 'saltador', 'afundador'], sp.id).toContain(sp.fightStyle);
    }
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

  it('toda fala tem texto e aponta para personagens de characters.ts; fala conjunta tem 2 ou mais personagens diferentes', () => {
    const ids = new Set(characters.map((c) => c.id));
    for (const line of allLines(ep)) {
      expect(line.text.trim()).not.toBe('');
      for (const id of speakersOf(line)) expect(ids.has(id), id).toBe(true);
      if (Array.isArray(line.speaker)) {
        expect(new Set(line.speaker).size, line.text).toBe(line.speaker.length);
        expect(line.speaker.length, line.text).toBeGreaterThanOrEqual(2);
      }
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
    const hers = allLines(ep).filter((l) => speakersOf(l).includes('lavinia'));
    for (const l of hers) {
      expect(hasWord(l.text, 'Adilson'), l.text).toBe(false);
      expect(hasWord(l.text, 'pai'), l.text).toBe(false);
    }
  });

  it('HUMOR-07, HUMOR-08: alguma cena tem fala da Lavínia chamando ele de "Adilsinho"', () => {
    const teasing = ep.scenes.filter((s) =>
      s.lines.some((l) => speakersOf(l).includes('lavinia') && hasWord(l.text, 'Adilsinho')),
    );
    expect(teasing.length).toBeGreaterThanOrEqual(1);
  });
});
