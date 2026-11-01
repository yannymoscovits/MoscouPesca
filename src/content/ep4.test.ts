import { describe, expect, it } from 'vitest';
import { record } from '../domain/album';
import { spawnWater, stepWater } from '../domain/lure';
import { newProfile } from '../domain/profile';
import { createRng } from '../domain/rng';
import { spotsFor } from '../domain/spots';
import { buy } from '../domain/shop';
import { currentObjective, isTournamentUnlocked, onEvent } from '../domain/story';
import { characters } from './characters';
import { ep4 } from './episodes/ep4';
import { episodes } from './index';
import type { GameEvent, Profile, SceneId, Zone } from './types';

describe('Episódio 4: local e espécies', () => {
  it('EPI-01: index.ts lista o Parque dos Ventos como 4º episódio, depois dos episódios 1 a 3', () => {
    expect(episodes.slice(0, 4).map((ep) => ep.id)).toEqual([1, 2, 3, 4]);
    expect(episodes[3]).toBe(ep4);
    expect(ep4.locations.map((l) => ({ id: l.id, name: l.name }))).toEqual([
      { id: 'parque-dos-ventos', name: 'Parque dos Ventos' },
    ]);
  });

  it('EPI-06: as 6 espécies fantasiosas do parque, com o Dourado-dos-Ventos como a única rara', () => {
    expect(ep4.species.map((sp) => sp.name).sort()).toEqual(
      ['Peixe-voador', 'Lambari-rajada', 'Tilápia-hélice', 'Traíra-pipa', 'Pacu-planador', 'Dourado-dos-Ventos'].sort(),
    );
    expect(ep4.species.filter((sp) => sp.rare).map((sp) => sp.name)).toEqual(['Dourado-dos-Ventos']);
  });

  it('EQUIP-01, EQUIP-02: as varas novas são a Vara Hélice e a Vara Torre, com 1 isca nova', () => {
    expect(ep4.rods.map((r) => r.name)).toEqual(['Vara Hélice', 'Vara Torre']);
    expect(ep4.baits).toHaveLength(1);
  });
});

describe('Episódio 4: a rara depende da isca nova e da força, não do alcance', () => {
  const rare = ep4.species.find((sp) => sp.rare)!;
  const newBait = ep4.baits[0].id;
  const earlier = episodes.filter((ep) => ep.id < ep4.id);
  const location = ep4.locations[0];
  const rareZones = location.zones.filter((z) => z.species.includes(rare.id));

  /**
   * Espécie que ataca a isca num arremesso de 8 m no ponto, recolhendo direto (pesca-bass ISCA-05 a
   * ISCA-07), ou null se a isca chega ao Adilson sem ataque.
   */
  function striker(zone: Zone, bait: string, seed: number): string | null {
    const rng = createRng(seed);
    let water = spawnWater(zone, ep4.species, 8, rng, null, bait);
    for (let t = 0; t < 30 && water.lure.xM > 0; t += 0.1) {
      const step = stepWater(water, 0.1, true, bait, rng, 'torre'); // com a vara que o lendário pede (PONTO-09)
      if (step.strike) return step.strike.species.id;
      water = step.water;
    }
    return null;
  }

  it('PONTO-10: o ponto do Dourado-dos-Ventos abre com a Vara Hélice e a Isca Cata-vento, não pelo alcance', () => {
    const best = earlier.flatMap((ep) => ep.rods).reduce((a, b) => (b.reach > a.reach ? b : a));
    expect(rareZones.length).toBeGreaterThan(0);
    const owned = earlier.flatMap((ep) => ep.rods.map((r) => r.id));
    const closed = spotsFor(location, best, ep4.species, {}, [], undefined, owned).filter((s) => !s.locked).map((s) => s.id);
    for (const zone of rareZones) expect(closed, zone.id).not.toContain(zone.id);
    const open = spotsFor(location, best, ep4.species, {}, ['cata-vento'], undefined, [...owned, 'helice']).filter((s) => !s.locked).map((s) => s.id);
    for (const zone of rareZones) expect(open, zone.id).toContain(zone.id);
  });

  it('EQUIP-02: o Dourado-dos-Ventos só aceita a isca nova do Episódio 4', () => {
    expect(rare.baits).toEqual([newBait]);
    expect(earlier.flatMap((ep) => ep.baits.map((b) => b.id))).not.toContain(newBait);
  });

  it('sem a isca nova o Dourado-dos-Ventos não ataca em 200 arremessos na zona dele; com ela, ataca', () => {
    const oldBaits = earlier.flatMap((ep) => ep.baits.map((b) => b.id));
    for (const zone of rareZones) {
      for (const bait of oldBaits) {
        for (let seed = 1; seed <= 200; seed++) expect(striker(zone, bait, seed), `${zone.id} ${bait}`).not.toBe(rare.id);
      }
      const strikes = Array.from({ length: 200 }, (_, i) => striker(zone, newBait, i + 1));
      expect(strikes, zone.id).toContain(rare.id);
    }
  });


  it('a Vara Torre, a mais forte até aqui, é comprada antes do objetivo do Dourado-dos-Ventos', () => {
    const torre = ep4.rods.find((r) => r.id === 'torre')!;
    const earlierForce = Math.max(...earlier.flatMap((ep) => ep.rods.map((r) => r.force)));
    expect(torre.force).toBeGreaterThan(earlierForce);
    expect(torre.force).toBe(Math.max(...ep4.rods.map((r) => r.force)));
    const ids = ep4.chapter.objectives.map((o) => o.id);
    expect(ids.indexOf('comprar-torre')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('comprar-torre')).toBeLessThan(ids.indexOf('pegar-dourado'));
  });
});

describe('Episódio 4: elenco', () => {
  it('HUMOR-01: Márcio e Sr. Higashi existem com nome e apelido do cartão', () => {
    const byId = (id: string) => characters.find((c) => c.id === id);
    expect(byId('marcio')).toMatchObject({ name: 'Márcio', epithet: 'Funcionário 01 (e Faz-Tudo)' });
    expect(byId('higashi')).toMatchObject({ name: 'Sr. Higashi', epithet: 'O Homem do GPS' });
  });
});

/** Aplica o efeito do evento (compra, álbum) e depois a história, como o controller fará. */
function play(p: Profile, e: GameEvent): { p: Profile; scene?: SceneId } {
  let next = p;
  if (e.type === 'Caught') next = { ...p, album: record(p.album, e.species, e.kg).album };
  if (e.type === 'Bought') {
    const item = [...ep4.rods, ...ep4.baits].find((i) => i.id === e.item)!;
    next = buy(p, item);
  }
  const out = onEvent(next, e, ep4);
  return { p: { ...next, story: out.progress }, scene: out.sceneToShow };
}

function playAll(p: Profile, events: GameEvent[]): { p: Profile; scenes: SceneId[] } {
  const scenes: SceneId[] = [];
  for (const e of events) {
    const out = play(p, e);
    p = out.p;
    if (out.scene) scenes.push(out.scene);
  }
  return { p, scenes };
}

const fish = (species: string, kg = 1): GameEvent => ({ type: 'Caught', species, kg });
const bought = (item: string): GameEvent => ({ type: 'Bought', item });
const rich = (): Profile => ({ ...newProfile(), money: 1_000_000 });
const times = (n: number, e: GameEvent) => Array.from({ length: n }, () => e);

describe('Episódio 4: roteiro', () => {
  it('HIST-06, PROG-02: os 7 objetivos de "Pescaria nos Ventos" seguem a ordem do roteiro', () => {
    expect(ep4.chapter.title).toBe('Pescaria nos Ventos');
    expect(ep4.chapter.objectives.map((o) => o.text)).toEqual([
      'Pegar 5 peixes voadores',
      'Comprar a Vara Hélice',
      'Pegar um Pacu-planador',
      'Tirar 3 Lambaris-rajada da torre',
      'Comprar a Vara Torre',
      'Pegar o Dourado-dos-Ventos — no Pé das torres',
      'Registrar no álbum todas as espécies do Parque dos Ventos',
    ]);
  });

  it('HIST-05: jogando na ordem do roteiro, cada objetivo mostra a sua cena e o último libera a Copa dos Ventos', () => {
    const { p, scenes } = playAll(rich(), [
      { type: 'GameStarted' },
      ...times(5, fish('peixe-voador')),
      bought('helice'),
      bought('cata-vento'),
      fish('pacu-planador', 8),
      ...times(3, fish('lambari-rajada', 0.3)),
      bought('torre'),
      fish('dourado-dos-ventos', 30),
      ...['tilapia-helice', 'traira-pipa'].map((id) => fish(id)),
    ]);
    expect(scenes).toEqual([
      'ep4-abertura',
      'ep4-filial',
      'ep4-gps',
      'ep4-piranha-pipa',
      'ep4-vara-torre',
      'ep4-lenda',
      'ep4-dourado',
      'ep4-album',
    ]);
    expect(currentObjective(p.story, ep4)).toBeNull();
    expect(isTournamentUnlocked(p.story, ep4)).toBe(true);
  });

  it('HIST-05: os "peixes voadores" são os do parque; peixe de outro episódio não conta', () => {
    const { p } = playAll(rich(), [fish('xareu'), fish('tilapia'), ...times(4, fish('tilapia-helice'))]);
    expect(currentObjective(p.story, ep4)?.text).toBe('Pegar 5 peixes voadores');
    expect(p.story.episodes[4]?.progress).toBe(4);
  });

  it('HUMOR-08: depois do Pacu-planador, a Lavínia aparece voando como piranha-pipa para pirraçar o Adilsinho', () => {
    const pacu = ep4.chapter.objectives.find((o) => o.id === 'pegar-pacu')!;
    const scene = ep4.scenes.find((s) => s.id === pacu.sceneOnDone)!;
    expect(scene.lines[0]).toMatchObject({ speaker: 'lavinia', text: 'Adilsinho! Olha eu voando! Virei piranha-pipa.' });
  });
});

// Montado em partes para o check:content não acusar este arquivo de teste.
const PENDING = '{{' + 'PENDENTE}}';

describe('Episódio 4: Copa dos Ventos e carta do Márcio', () => {
  it('CAMP-02, HUMOR-04: a Copa dos Ventos tem como rivais Márcio, Sr. Higashi e Edvaldo', () => {
    expect(ep4.tournament.name).toBe('Copa dos Ventos');
    expect(ep4.tournament.rivals.map((r) => r.character)).toEqual(['marcio', 'higashi', 'edvaldo']);
  });

  it('CAMP-06, HIST-07: a carta do Márcio existe, começa com "Chefe," e não tem texto pendente', () => {
    expect(ep4.letter.id).toBe(ep4.tournament.message);
    expect(ep4.letter.from).toBe('Márcio');
    expect(ep4.letter.text).toMatch(/^Chefe,/);
    expect(ep4.letter.text).toContain('Do seu funcionário 01 e amigo,\nMárcio');
    expect(ep4.letter.text).toContain('P.S. do Sr. Higashi: botei um GPS nesta carta.');
    expect(ep4.letter.text).not.toContain(PENDING);
  });
});
