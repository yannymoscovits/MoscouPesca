import { describe, expect, it } from 'vitest';
import { record } from '../domain/album';
import { newProfile } from '../domain/profile';
import { buy } from '../domain/shop';
import { currentObjective, isTournamentUnlocked, onEvent } from '../domain/story';
import { characters, speakersOf } from './characters';
import { ep2 } from './episodes/ep2';
import { episodes } from './index';
import type { GameEvent, Profile, SceneId } from './types';

const speciesAt = (locationId: string) =>
  new Set(ep2.locations.find((l) => l.id === locationId)!.zones.flatMap((z) => z.species));
const names = (ids: Set<string>) =>
  ep2.species
    .filter((sp) => ids.has(sp.id))
    .map((sp) => sp.name)
    .sort();

describe('Episódio 2: locais e espécies', () => {
  it('EPI-01: index.ts lista o Jacuípe como 2º episódio', () => {
    expect(episodes[0].id).toBe(1);
    expect(episodes[1]).toBe(ep2);
    expect(ep2.id).toBe(2);
  });

  it('EPI-08, PONTO-08: o Jacuípe é um local só, com os pontos Rio Jacuípe, Rio Sonrisal e a Ponte da Cetrel, que pede Camarão', () => {
    expect(ep2.locations.map((l) => ({ id: l.id, name: l.name }))).toEqual([{ id: 'rio-jacuipe', name: 'Rio Jacuípe' }]);
    expect(ep2.locations[0].zones.map((z) => z.name)).toEqual(['Rio Jacuípe', 'Rio Sonrisal', 'Ponte da Cetrel']);
    expect(ep2.locations[0].zones[2].requiresBait).toBe('camarao');
  });

  it('EPI-06: as 10 espécies do Jacuípe, sem repetir, e o Camurupim é a única rara (na Ponte)', () => {
    expect(names(speciesAt('rio-jacuipe'))).toEqual([
      'Baiacu',
      'Camurupim',
      'Carapeba',
      'Pescada-amarela',
      'Robalo-flecha',
      'Robalo-peva',
      'Tainha',
      'Tilápia',
      'Traíra',
      'Vermelho',
    ]);
    expect(ep2.species).toHaveLength(10);
    expect(ep2.species.filter((sp) => sp.rare).map((sp) => sp.name)).toEqual(['Camurupim']);
  });

  it('EQUIP-01, EQUIP-02: as varas novas são a de Grafite e a Maré Alta, e a isca nova é a de Camarão', () => {
    expect(ep2.rods.map((r) => r.name)).toEqual(['Vara de Grafite', 'Vara Maré Alta']);
    expect(ep2.baits.map((b) => b.name)).toEqual(['Isca de Camarão']);
  });
});

describe('Episódio 2: elenco', () => {
  it('HUMOR-01: Ninha, Tininho, Denise, Didi, Capenga e o Edvaldo de cabelo preto existem com nome e apelido', () => {
    const byId = (id: string) => characters.find((c) => c.id === id);
    expect(byId('ninha')).toMatchObject({ name: 'Ninha', epithet: 'Parceria Oficial de Pescaria do Pai' });
    expect(byId('tininho')).toMatchObject({ name: 'Tininho', epithet: 'O Anfitrião que Pensa em Tudo' });
    expect(byId('denise')).toMatchObject({ name: 'Denise', epithet: 'A Delegada da Farra' });
    expect(byId('didi')).toMatchObject({ name: 'Didi', epithet: 'O Doutor da Família' });
    expect(byId('capenga')).toMatchObject({ name: 'Capenga', epithet: 'O Homem que Conversa com a Maré' });
    expect(byId('edvaldo-jovem')).toMatchObject({ name: 'Edvaldo' });
  });

  it('Tininho, Denise, Didi e o Edvaldo de cabelo preto só aparecem no Episódio 2, o do passado', () => {
    const past = ['tininho', 'denise', 'didi', 'edvaldo-jovem'];
    for (const ep of episodes.filter((e) => e.id !== 2)) {
      const speakers = [...ep.scenes.flatMap((s) => s.lines), ...ep.tournament.rivals.map((r) => r.taunt)].flatMap(
        speakersOf,
      );
      for (const id of past) expect(speakers, `Episódio ${ep.id}`).not.toContain(id);
    }
  });

  // A família aprovou a fala do Didi sobre os médicos e o remédio: ela entra na vitória, como no roteiro.
  it('a fala do Didi "Vai, Junior. Obedece os médicos…" está no final do episódio, na vitória', () => {
    const victory = ep2.scenes.find((s) => s.id === ep2.chapter.closingScene)!;
    expect(victory.lines).toContainEqual({
      speaker: 'didi',
      expression: 'normal',
      text: 'Vai, Junior. Obedece os médicos e toma o remédio direitinho, que eu tô de olho.',
    });
  });
});

describe('Episódio 2: narração e fala conjunta do roteiro', () => {
  const lines = (id: string) => ep2.scenes.find((s) => s.id === id)!.lines;

  it('a abertura vai do presente ao passado com a narração "Jacuípe, muitos anos atrás."', () => {
    const opening = lines(ep2.chapter.openingScene);
    const i = opening.findIndex((l) => l.speaker === null && l.text === 'Jacuípe, muitos anos atrás.');
    expect(i).toBeGreaterThan(0);
    expect(opening[i - 1]).toMatchObject({ speaker: 'capenga', text: 'A maré de Jacuípe devolve tudo, seu Adilson. Até o tempo.' });
    expect(opening[i + 1]).toMatchObject({ speaker: 'tininho' });
  });

  it('a vitória segue o roteiro: Didi e Denise falam juntos e a narração "Presente." volta antes da Jane', () => {
    expect(lines(ep2.chapter.closingScene).map((l) => [l.speaker, l.text])).toEqual([
      ['didi', 'Esse é o meu filho!'],
      ['denise', 'JUNIORRRR, CAMPEÃO!'],
      ['didi', 'Vai, Junior. Obedece os médicos e toma o remédio direitinho, que eu tô de olho.'],
      [['didi', 'denise'], 'Amamos você meu filho, segura firme!'],
      ['ninha', 'Pai, a gente volta aqui de novo?'],
      ['adilson', 'Sempre que a maré deixar.'],
      [null, 'Presente.'],
      ['jane', 'Cochilou aqui na beira do rio, foi? Tava sorrindo dormindo.'],
    ]);
  });
});

/** Aplica o efeito do evento (compra, álbum) e depois a história, como o controller fará. */
function play(p: Profile, e: GameEvent): { p: Profile; scene?: SceneId } {
  let next = p;
  if (e.type === 'Caught') next = { ...p, album: record(p.album, e.species, e.kg).album };
  if (e.type === 'Bought') {
    const item = [...ep2.rods, ...ep2.baits].find((i) => i.id === e.item)!;
    next = buy(p, item);
  }
  const out = onEvent(next, e, ep2);
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
const rich = (): Profile => ({ ...newProfile(), money: 100_000 });
const times = (n: number, e: GameEvent) => Array.from({ length: n }, () => e);

describe('Episódio 2: roteiro', () => {
  it('HIST-06, PROG-02: os 7 objetivos de "A Maré do Tempo" seguem a ordem do roteiro', () => {
    expect(ep2.chapter.title).toBe('A Maré do Tempo');
    expect(ep2.chapter.objectives.map((o) => o.text)).toEqual([
      'Ensinar a Ninha a pescar: pegar 3 peixes no Rio Jacuípe',
      'Comprar a Vara de Grafite',
      'Pegar um Robalo-peva',
      'Pegar 3 peixes na Ponte da Cetrel',
      'Comprar a Vara Maré Alta',
      'Pegar o Camurupim — na Ponte da Cetrel',
      'Registrar no álbum todas as espécies de Jacuípe',
    ]);
  });

  it('HIST-05: jogando na ordem do roteiro, cada objetivo mostra a sua cena e o último libera a Copa Jacuípe', () => {
    const { p, scenes } = playAll(rich(), [
      { type: 'GameStarted' },
      ...times(5, fish('tilapia-jacuipe')),
      bought('grafite'),
      fish('robalo-peva'),
      bought('camarao'),
      ...times(3, fish('baiacu')),
      bought('mare-alta'),
      fish('camurupim', 40),
      ...['traira-jacuipe', 'tainha', 'carapeba', 'robalo-flecha', 'pescada-amarela', 'vermelho'].map((id) => fish(id)),
    ]);
    expect(scenes).toEqual([
      'ep2-abertura',
      'ep2-edvaldo',
      'ep2-rio',
      'ep2-ponte',
      'ep2-vara-mare',
      'ep2-salto',
      'ep2-prata-da-barra',
      'ep2-album',
    ]);
    expect(currentObjective(p.story, ep2)).toBeNull();
    expect(isTournamentUnlocked(p.story, ep2)).toBe(true);
  });

  it('HIST-05: peixe da Ponte não conta para os 3 do Rio, e peixe do Rio não conta para os 3 da Ponte', () => {
    const rio = playAll(rich(), [fish('baiacu'), ...times(2, fish('tainha'))]);
    expect(currentObjective(rio.p.story, ep2)?.text).toBe('Ensinar a Ninha a pescar: pegar 3 peixes no Rio Jacuípe');

    const ponte = playAll(rich(), [
      ...times(3, fish('tainha')),
      bought('grafite'),
      fish('robalo-peva'),
      ...times(2, fish('vermelho')),
      fish('carapeba'),
    ]);
    expect(currentObjective(ponte.p.story, ep2)?.text).toBe('Pegar 3 peixes na Ponte da Cetrel');
  });
});

// Montado em partes para o check:content não acusar este arquivo de teste.
const PENDING = '{{' + 'PENDENTE}}';

describe('Episódio 2: Copa Jacuípe e carta da Ninha', () => {
  it('CAMP-02, HUMOR-04: a Copa Jacuípe tem como rivais Tininho, Denise e Didi', () => {
    expect(ep2.tournament.name).toBe('Copa Jacuípe');
    expect(ep2.tournament.rivals.map((r) => r.character)).toEqual(['tininho', 'denise', 'didi']);
  });

  it('CAMP-06, HIST-07: a carta da Ninha existe, começa com "Pai," e não tem texto pendente', () => {
    expect(ep2.letter.id).toBe(ep2.tournament.message);
    expect(ep2.letter.from).toBe('Ninha');
    expect(ep2.letter.text).toMatch(/^Pai,/);
    expect(ep2.letter.text).toContain('Da sua parceira oficial de pescaria,\nNinha');
    expect(ep2.letter.text).not.toContain(PENDING);
  });
});
