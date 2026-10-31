import { describe, expect, it } from 'vitest';
import { record } from '../domain/album';
import { cast, maxCastDistance, rulesFor, tick, type FishingState } from '../domain/fishing';
import { newProfile } from '../domain/profile';
import { createRng } from '../domain/rng';
import { ROD_TIP } from '../domain/sim/typicalPlayer';
import { buy } from '../domain/shop';
import { currentObjective, isTournamentUnlocked, onEvent } from '../domain/story';
import { characters, speakersOf } from './characters';
import { ep5 } from './episodes/ep5';
import { episodes } from './index';
import type { GameEvent, Point, Profile, SceneId, Zone } from './types';

const lines = (id: SceneId) => ep5.scenes.find((s) => s.id === id)!.lines;
const allLines = () => [...ep5.scenes.flatMap((s) => s.lines), ...ep5.tournament.rivals.map((r) => r.taunt)];

describe('Episódio 5: local e espécies', () => {
  it('EPI-01: index.ts lista os 5 episódios em ordem, com o Alto-mar da Bahia como 5º', () => {
    expect(episodes.map((ep) => ep.id)).toEqual([1, 2, 3, 4, 5]);
    expect(episodes[4]).toBe(ep5);
    expect(ep5.locations.map((l) => ({ id: l.id, name: l.name }))).toEqual([
      { id: 'alto-mar-da-bahia', name: 'Alto-mar da Bahia' },
    ]);
  });

  it('EPI-06: as 5 espécies do alto-mar, com o Marlim-azul como a única rara', () => {
    expect(ep5.species.map((sp) => sp.name).sort()).toEqual(
      ['Dourado-do-mar', 'Cavala', 'Atum', 'Olho-de-boi', 'Marlim-azul'].sort(),
    );
    expect(ep5.species.filter((sp) => sp.rare).map((sp) => sp.name)).toEqual(['Marlim-azul']);
  });

  it('EQUIP-01, EQUIP-02: as varas novas são a Vara Oceano e a Vara Lendária, com 1 isca nova', () => {
    expect(ep5.rods.map((r) => r.name)).toEqual(['Vara Oceano', 'Vara Lendária']);
    expect(ep5.baits).toHaveLength(1);
  });
});

describe('Episódio 5: o chefão depende da isca nova e da força, não do alcance', () => {
  const rare = ep5.species.find((sp) => sp.rare)!;
  const newBait = ep5.baits[0].id;
  const earlier = episodes.filter((ep) => ep.id < ep5.id);
  const location = ep5.locations[0];
  const rareZones = location.zones.filter((z) => z.species.includes(rare.id));

  /** Ponto da zona mais perto do barco: para as faixas da cena, o meio da borda de baixo, 5 px para dentro. */
  const nearestPoint = (zone: Zone): Point => ({
    x: zone.polygon.reduce((s, p) => s + p.x, 0) / zone.polygon.length,
    y: Math.max(...zone.polygon.map((p) => p.y)) - 5,
  });

  /** Espécie que morde quando a isca cai no ponto, ou null se nenhuma aceita a isca. */
  function biter(at: Point, bait: string, seed: number): string | null {
    const ctx = { rng: createRng(seed), rules: rulesFor('tranquilo'), zones: location.zones, species: ep5.species };
    let s: FishingState = cast({ phase: 'Idle' }, at, { origin: ROD_TIP, rod: ep5.rods[0], bait });
    while (s.phase === 'Flying') s = tick(s, 0.1, { holding: false }, ctx);
    if (s.phase !== 'Waiting') throw new Error(`esperava Waiting, veio ${s.phase}`);
    return s.bite?.species.id ?? null;
  }

  it('o alcance não limita: a melhor vara dos episódios 1 a 4 já chega à zona do Marlim-azul', () => {
    const bestReach = Math.max(...earlier.flatMap((ep) => ep.rods.map((r) => r.reach)));
    expect(rareZones.length).toBeGreaterThan(0);
    for (const zone of rareZones) {
      const at = nearestPoint(zone);
      expect(Math.hypot(at.x - ROD_TIP.x, at.y - ROD_TIP.y), zone.id).toBeLessThanOrEqual(maxCastDistance(bestReach));
    }
  });

  it('EQUIP-02: o Marlim-azul só aceita a isca nova do Episódio 5', () => {
    expect(rare.baits).toEqual([newBait]);
    expect(earlier.flatMap((ep) => ep.baits.map((b) => b.id))).not.toContain(newBait);
  });

  it('sem a isca nova o Marlim-azul não morde em 200 arremessos na zona dele; com ela, morde', () => {
    const oldBaits = earlier.flatMap((ep) => ep.baits.map((b) => b.id));
    for (const zone of rareZones) {
      const at = nearestPoint(zone);
      for (const bait of oldBaits) {
        for (let seed = 1; seed <= 200; seed++) expect(biter(at, bait, seed), `${zone.id} ${bait}`).not.toBe(rare.id);
      }
      const bites = Array.from({ length: 200 }, (_, i) => biter(at, newBait, i + 1));
      expect(bites, zone.id).toContain(rare.id);
    }
  });

  it('a Vara Lendária, a mais forte do jogo, é comprada antes do objetivo do Marlim-azul', () => {
    const lendaria = ep5.rods.find((r) => r.id === 'lendaria')!;
    const earlierForce = Math.max(...earlier.flatMap((ep) => ep.rods.map((r) => r.force)));
    expect(lendaria.force).toBeGreaterThan(earlierForce);
    expect(lendaria.force).toBe(Math.max(...ep5.rods.map((r) => r.force)));
    const ids = ep5.chapter.objectives.map((o) => o.id);
    expect(ids.indexOf('comprar-lendaria')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('comprar-lendaria')).toBeLessThan(ids.indexOf('pegar-marlim'));
  });
});

describe('Episódio 5: elenco', () => {
  it('HUMOR-01: a Ninha adulta, a Ângela e o Ruan (o Cervero) existem com nome e apelido do cartão', () => {
    const byId = (id: string) => characters.find((c) => c.id === id);
    expect(byId('ninha-adulta')).toMatchObject({ name: 'Ninha', epithet: 'A Nerd de TI que Programou Este Jogo' });
    expect(byId('angela')).toMatchObject({ name: 'Ângela', epithet: 'Mais Alta que a Ninha (e Adora Lembrar Disso)' });
    expect(byId('ruan')).toMatchObject({ name: 'Ruan', epithet: 'Mais Conhecido como Cervero' });
  });

  it('todo mundo está no barco: o elenco do roteiro fala no episódio, com o Márcio de capitão', () => {
    const speakers = new Set(allLines().flatMap(speakersOf));
    // "Elenco" do roteiro: Jane, Ninha (adulta), Ângela, Lavínia, Cervero, Edvaldo, Ricardo, Bem, Kris,
    // Lu, Geane, Louise, Lucca, Márcio, Sr. Higashi e Capenga, além do Adilson.
    const crew = ['adilson', 'jane', 'ninha-adulta', 'angela', 'lavinia', 'ruan', 'edvaldo', 'ricardo', 'bem'];
    for (const id of [...crew, 'kris', 'lu', 'geane', 'louise', 'lucca', 'marcio', 'higashi', 'capenga']) {
      expect(speakers.has(id), id).toBe(true);
    }
    expect(lines(ep5.chapter.openingScene)).toContainEqual({
      speaker: 'marcio',
      expression: 'rindo',
      text: 'Chefe, hoje o funcionário 01 é capitão. Todo mundo a bordo!',
    });
  });

  it('o Cervero aparece no mar ao lado da Lavínia, na cena em que ela pirraça o Adilsinho', () => {
    const scene = ep5.scenes.find((s) => s.lines.some((l) => l.speaker === 'lavinia' && /meu namorado/.test(l.text)))!;
    expect(scene.lines.map((l) => l.speaker)).toContain('ruan');
  });

  it('Didi, Denise e Tininho não falam no Episódio 5: só são lembrados por quem está no barco', () => {
    const speakers = allLines().flatMap(speakersOf);
    for (const id of ['didi', 'denise', 'tininho']) expect(speakers, id).not.toContain(id);
    const memories = lines(ep5.chapter.closingScene).filter((l) => l.speaker !== null);
    expect(memories.find((l) => /vô Didi/.test(l.text))?.speaker).toBe('ninha-adulta');
    expect(memories.find((l) => /JUNIORRRR/.test(l.text))?.speaker).toBe('adilson'); // a mãe, Denise
    expect(memories.find((l) => /Tininho/.test(l.text))?.speaker).toBe('jane');
  });
});

/** Aplica o efeito do evento (compra, álbum) e depois a história, como o controller fará. */
function play(p: Profile, e: GameEvent): { p: Profile; scene?: SceneId; notice?: string } {
  let next = p;
  if (e.type === 'Caught') next = { ...p, album: record(p.album, e.species, e.kg).album };
  if (e.type === 'Bought') {
    const item = [...ep5.rods, ...ep5.baits].find((i) => i.id === e.item)!;
    next = buy(p, item);
  }
  const out = onEvent(next, e, ep5);
  return { p: { ...next, story: out.progress }, scene: out.sceneToShow, notice: out.notice };
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

describe('Episódio 5: roteiro', () => {
  it('HIST-06, PROG-02: os 7 objetivos de "A Grande Final" seguem a ordem do roteiro', () => {
    expect(ep5.chapter.title).toBe('A Grande Final');
    expect(ep5.chapter.objectives.map((o) => o.text)).toEqual([
      'Pegar 5 peixes de alto-mar',
      'Comprar a Vara Oceano',
      'Pegar uma Cavala para o almoço',
      'Pegar um Atum',
      'Comprar a Vara Lendária',
      'Pegar o Marlim-azul',
      'Registrar no álbum todas as espécies do alto-mar',
    ]);
  });

  it('HIST-05: jogando na ordem do roteiro, cada objetivo mostra a sua cena e o último libera a Copa Adilson Moscovits', () => {
    const { p, scenes } = playAll(rich(), [
      { type: 'GameStarted' },
      ...times(5, fish('dourado-do-mar', 5)),
      bought('oceano'),
      fish('cavala', 4),
      bought('corrico'),
      fish('atum', 40),
      bought('lendaria'),
      fish('marlim-azul', 180),
      fish('olho-de-boi', 12),
    ]);
    expect(scenes).toEqual([
      'ep5-abertura',
      'ep5-filial',
      'ep5-almoco',
      'ep5-piranha',
      'ep5-irmas',
      'ep5-chefao',
      'ep5-marlim-solto',
      'ep5-album',
    ]);
    expect(currentObjective(p.story, ep5)).toBeNull();
    expect(isTournamentUnlocked(p.story, ep5)).toBe(true);
  });

  it('depois de pegar o Marlim-azul, o Adilson solta ele de volta pro mar', () => {
    const marlim = ep5.chapter.objectives.find((o) => o.id === 'pegar-marlim')!;
    expect(lines(marlim.sceneOnDone).map((l) => [l.speaker, l.text])).toEqual([
      ['adilson', 'Peguei! Vocês viram? Peguei!'],
      [null, 'O Adilson solta o marlim de volta pro mar.'],
      ['jane', 'Soltou?!'],
      ['adilson', 'Quem luta assim merece continuar nadando.'],
    ]);
  });

  it('HIST-10: vencer a Copa Adilson Moscovits mostra o encerramento final, com a frase de cada um, e o aviso final', () => {
    const ready = playAll(rich(), [
      { type: 'GameStarted' },
      ...times(5, fish('cavala')),
      bought('oceano'),
      fish('cavala'),
      fish('atum'),
      bought('lendaria'),
      fish('marlim-azul'),
      ...['dourado-do-mar', 'olho-de-boi'].map((id) => fish(id)),
    ]).p;
    const won = play(ready, { type: 'TournamentWon', id: ep5.tournament.id });
    expect(won.scene).toBe(ep5.chapter.closingScene);
    expect(won.notice).toBe('A pescaria continua: todos os lugares seguem abertos');

    const closing = lines(ep5.chapter.closingScene);
    expect(closing.slice(0, 2)).toEqual([
      { speaker: null, text: 'O sol se pondo no alto-mar. Todo mundo em volta do Adilson.' },
      { speaker: null, text: 'Uma brisa com cheiro de Jacuípe passa pelo barco.' },
    ]);
    // A frase de cada um, na ordem do roteiro (cena 10); o Adilson fecha.
    expect(closing.slice(2).flatMap(speakersOf)).toEqual([
      'ninha-adulta',
      'adilson',
      'jane',
      'jane',
      'ninha-adulta',
      'angela',
      'lavinia',
      'ruan',
      'lu',
      'geane',
      'louise',
      'lucca',
      'edvaldo',
      'ricardo',
      'bem',
      'kris',
      'marcio',
      'higashi',
      'adilson',
    ]);
    expect(closing.at(-1)).toMatchObject({ speaker: 'adilson', text: 'Vocês são a melhor pescaria da minha vida.' });
  });
});

// Montado em partes para o check:content não acusar este arquivo de teste.
const PENDING = '{{' + 'PENDENTE}}';

describe('Episódio 5: Copa Adilson Moscovits e carta de todo mundo', () => {
  it('CAMP-02, HUMOR-04: a Copa Adilson Moscovits tem como rivais Jane, Lavínia e a Ninha adulta', () => {
    expect(ep5.tournament.name).toBe('Copa Adilson Moscovits');
    expect(ep5.tournament.rivals.map((r) => r.character)).toEqual(['jane', 'lavinia', 'ninha-adulta']);
  });

  it('CAMP-06, HIST-07: a carta de todo mundo existe, assinada pela família, e não tem texto pendente', () => {
    expect(ep5.letter.id).toBe(ep5.tournament.message);
    expect(ep5.letter.from).toBe('Sua família');
    expect(ep5.letter.text).toMatch(/^Adilson, pai, Xô, Junior, chefe, Adilsinho, pegador…/);
    expect(ep5.letter.text).toContain('O Márcio, segurando as pontas. E o Sr. Higashi, de GPS ligado no seu caminho de volta.');
    expect(ep5.letter.text).toContain('Com todo o amor do mundo,\nSua família');
    expect(ep5.letter.text).not.toContain(PENDING);
  });
});
