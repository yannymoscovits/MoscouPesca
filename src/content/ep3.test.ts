import { describe, expect, it } from 'vitest';
import { record } from '../domain/album';
import { newProfile } from '../domain/profile';
import { buy } from '../domain/shop';
import { currentObjective, isTournamentUnlocked, onEvent } from '../domain/story';
import { characters } from './characters';
import { ep3 } from './episodes/ep3';
import { episodes } from './index';
import type { GameEvent, Profile, SceneId } from './types';

describe('Episódio 3: local e espécies', () => {
  it('EPI-01: index.ts lista Vera Cruz, Ilha de Itaparica, como 3º episódio', () => {
    expect(episodes.slice(0, 3).map((ep) => ep.id)).toEqual([1, 2, 3]);
    expect(episodes[2]).toBe(ep3);
    expect(ep3.locations.map((l) => ({ id: l.id, name: l.name }))).toEqual([
      { id: 'vera-cruz', name: 'Vera Cruz, Ilha de Itaparica' },
    ]);
  });

  it('EPI-06: as 6 espécies de Vera Cruz, com a Garoupa como a única rara', () => {
    expect(ep3.species.map((sp) => sp.name).sort()).toEqual(
      ['Xaréu', 'Guaricema', 'Agulhinha', 'Cioba', 'Budião', 'Garoupa'].sort(),
    );
    expect(ep3.species.filter((sp) => sp.rare).map((sp) => sp.name)).toEqual(['Garoupa']);
  });

  it('EQUIP-01, EQUIP-02: as varas novas são a Vara Baía e a Vara Pedra Fina, com 1 isca nova', () => {
    expect(ep3.rods.map((r) => r.name)).toEqual(['Vara Baía', 'Vara Pedra Fina']);
    expect(ep3.baits).toHaveLength(1);
  });
});

describe('Episódio 3: elenco', () => {
  it('HUMOR-01: Lu, Geane, Louise e Lucca existem com nome e apelido', () => {
    const byId = (id: string) => characters.find((c) => c.id === id);
    expect(byId('lu')).toMatchObject({ name: 'Lu', epithet: 'Trabalha, Fuma e Ainda Acha Tempo de Pescar' });
    expect(byId('geane')).toMatchObject({ name: 'Geane', epithet: 'A Canceriana que Já Viu Disco Voador' });
    expect(byId('louise')).toMatchObject({ name: 'Louise', epithet: 'A Sobrinha Preferida (Ele Nega, Mas É)' });
    expect(byId('lucca')).toMatchObject({ name: 'Lucca', epithet: 'O Xodó do Xô' });
  });
});

/** Aplica o efeito do evento (compra, álbum) e depois a história, como o controller fará. */
function play(p: Profile, e: GameEvent): { p: Profile; scene?: SceneId } {
  let next = p;
  if (e.type === 'Caught') next = { ...p, album: record(p.album, e.species, e.kg).album };
  if (e.type === 'Bought') {
    const item = [...ep3.rods, ...ep3.baits].find((i) => i.id === e.item)!;
    next = buy(p, item);
  }
  const out = onEvent(next, e, ep3);
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

describe('Episódio 3: roteiro', () => {
  it('HIST-06, PROG-02: os 7 objetivos de "Pescaria em Paz (Só Que Não)" seguem a ordem do roteiro', () => {
    expect(ep3.chapter.title).toBe('Pescaria em Paz (Só Que Não)');
    expect(ep3.chapter.objectives.map((o) => o.text)).toEqual([
      'Pegar 5 peixes em paz',
      'Comprar a Vara Baía',
      'Pegar uma Guaricema para provar pra Geane que é só peixe',
      'Pegar um Xaréu para o Lucca ver',
      'Comprar a Vara Pedra Fina',
      'Pegar a Garoupa',
      'Registrar no álbum todas as espécies de Vera Cruz',
    ]);
  });

  it('HIST-06: a abertura começa na fila do ferry, com a Lavínia chegando antes dele', () => {
    const opening = ep3.scenes.find((s) => s.id === ep3.chapter.openingScene)!;
    expect(opening.lines[0]).toMatchObject({ speaker: 'adilson', text: 'Dessa vez vai ser só eu, o mar e o silêncio.' });
    expect(opening.lines[1]).toMatchObject({ speaker: 'lavinia', text: 'Adilsinho, eu fui nadando. Cheguei faz duas horas.' });
  });

  it('HIST-05: jogando na ordem do roteiro, cada objetivo mostra a sua cena e o último libera a Copa Itaparica', () => {
    const { p, scenes } = playAll(rich(), [
      { type: 'GameStarted' },
      ...times(5, fish('agulhinha')),
      bought('baia'),
      fish('guaricema'),
      fish('xareu', 8),
      bought('pedra-fina'),
      bought('lula'),
      fish('garoupa', 30),
      ...['cioba', 'budiao'].map((id) => fish(id)),
    ]);
    expect(scenes).toEqual([
      'ep3-abertura',
      'ep3-irmas',
      'ep3-espiao',
      'ep3-xodo',
      'ep3-xareu',
      'ep3-disco-voador',
      'ep3-garoupa',
      'ep3-album',
    ]);
    expect(currentObjective(p.story, ep3)).toBeNull();
    expect(isTournamentUnlocked(p.story, ep3)).toBe(true);
  });
});

describe('Episódio 3: Copa Itaparica', () => {
  it('CAMP-02, HUMOR-04: a Copa Itaparica tem como rivais Lu, Geane e Louise', () => {
    expect(ep3.tournament.name).toBe('Copa Itaparica');
    expect(ep3.tournament.rivals.map((r) => r.character)).toEqual(['lu', 'geane', 'louise']);
  });
});

describe('Episódio 3: narração e carta', () => {
  it('na vitória, a narração mostra Marcus e Julia aplaudindo na torcida', () => {
    const victory = ep3.scenes.find((s) => s.id === ep3.chapter.closingScene)!;
    expect(victory.lines).toContainEqual({ speaker: null, text: 'Marcus e Julia aplaudem na torcida.' });
  });

  // Montado em partes para o check:content não acusar este arquivo de teste.
  const PENDING = '{{' + 'PENDENTE}}';

  it('CAMP-06, HIST-07: a carta da Lu e da Geane existe, começa com "Xô," e não tem texto pendente', () => {
    expect(ep3.letter.id).toBe(ep3.tournament.message);
    expect(ep3.letter.from).toBe('Lu e Geane');
    expect(ep3.letter.text).toMatch(/^Xô,/);
    expect(ep3.letter.text).toContain('Com amor das suas irmãs,\nLu e Geane\n(e Louise, Lucca, Marcus e Julia)');
    expect(ep3.letter.text).toContain('P.S. da Geane: se aparecer uma luz estranha no céu hoje à noite');
    expect(ep3.letter.text).not.toContain(PENDING);
  });
});
