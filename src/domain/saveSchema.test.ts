import { describe, expect, it } from 'vitest';
import type { Profile } from '../content/types';
import { newProfile } from './profile';
import { migrate, parseProfile, type Migration } from './saveSchema';

/** Perfil com todos os campos preenchidos, como no meio do Episódio 2. */
function playedProfile(): Profile {
  return {
    ...newProfile(),
    money: 340,
    rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' },
    baits: { owned: ['minhoca', 'carne'], equipped: 'carne' },
    settings: { difficulty: 'desafio', vibration: false },
    story: {
      episodes: { 1: { objectiveIndex: 7, progress: 0, won: true }, 2: { objectiveIndex: 1, progress: 2, won: false } },
      scenesSeen: ['ep1-abertura', 'ep2-abertura'],
      pendingScene: 'cena-loja',
    },
    unlockedEpisodes: [1, 2],
    currentLocation: 'ponte-da-cetrel',
    tutorialDone: true,
    charactersIntroduced: ['jane', 'lavinia'],
    tournament: { id: 'copa-jacuipe', castsLeft: 5, catches: [{ species: 'robalo', kg: 2.35 }] },
    trophies: ['trofeu-guanambicup'],
    messagesUnlocked: ['carta-guanambicup'],
    album: { tilapia: { recordKg: 1.5 }, lavinia: { recordKg: 0.8 } },
    seenVersion: '1.0.0',
  };
}

const roundTrip = (p: unknown) => parseProfile(JSON.stringify(p));

describe('salvamento ilegível', () => {
  it('SAVE-08: texto que não é JSON → null', () => {
    for (const text of ['', '{', 'perfil', '{"version":1,']) expect(parseProfile(text)).toBeNull();
  });

  it('SAVE-08: JSON que não é um perfil → null', () => {
    for (const text of ['null', '42', '"perfil"', '[]', '{}']) expect(parseProfile(text)).toBeNull();
  });

  it('SAVE-08: qualquer campo faltando → null', () => {
    const p = playedProfile() as unknown as Record<string, unknown>;
    for (const key of Object.keys(p)) {
      const { [key]: _gone, ...rest } = p;
      expect(roundTrip(rest), `sem ${key}`).toBeNull();
    }
  });

  it('SAVE-08: campo com tipo errado → null', () => {
    const wrong: [string, (p: any) => void][] = [
      ['money em texto', (p) => (p.money = '340')],
      ['money negativo', (p) => (p.money = -1)],
      ['money quebrado', (p) => (p.money = 10.5)],
      ['varas não lista', (p) => (p.rods.owned = 'bambu')],
      ['vara equipada número', (p) => (p.rods.equipped = 3)],
      ['iscas sem equipada', (p) => delete p.baits.equipped],
      ['dificuldade inventada', (p) => (p.settings.difficulty = 'facil')],
      ['vibração em texto', (p) => (p.settings.vibration = 'sim')],
      ['objetivo em texto', (p) => (p.story.episodes[1].objectiveIndex = '7')],
      ['progresso faltando', (p) => delete p.story.episodes[2].progress],
      ['episódio 9 na história', (p) => (p.story.episodes[9] = { objectiveIndex: 0, progress: 0, won: false })],
      ['cenas não lista', (p) => (p.story.scenesSeen = 'ep1-abertura')],
      ['cena pendente número', (p) => (p.story.pendingScene = 1)],
      ['episódio liberado inexistente', (p) => (p.unlockedEpisodes = [1, 7])],
      ['local número', (p) => (p.currentLocation = 2)],
      ['tutorial em texto', (p) => (p.tutorialDone = 'true')],
      ['personagens não lista', (p) => (p.charactersIntroduced = {})],
      ['arremessos em texto', (p) => (p.tournament.castsLeft = '5')],
      ['captura sem peso', (p) => delete p.tournament.catches[0].kg],
      ['troféus com número', (p) => (p.trophies = [1])],
      ['cartas não lista', (p) => (p.messagesUnlocked = 'carta')],
      ['recorde em texto', (p) => (p.album.tilapia.recordKg = '1.5')],
      ['versão vista número', (p) => (p.seenVersion = 1)],
      ['versão futura', (p) => (p.version = 2)],
    ];
    for (const [name, spoil] of wrong) {
      const p = structuredClone(playedProfile());
      spoil(p);
      expect(roundTrip(p), name).toBeNull();
    }
  });
});

describe('perfil v1', () => {
  it('perfil v1 válido sai igual', () => {
    expect(roundTrip(playedProfile())).toEqual(playedProfile());
    expect(roundTrip(newProfile())).toEqual(newProfile());
  });

  it('perfil v1 sem torneio e sem dificuldade escolhida também é válido', () => {
    const p = { ...playedProfile(), tournament: null, settings: { difficulty: null, vibration: true } };
    expect(roundTrip(p)).toEqual(p);
  });
});

describe('migração', () => {
  // Formato v0 fictício, só para testar a cadeia: nomes em português e progresso de um episódio só.
  const V0 = {
    version: 0,
    saldo: 340,
    varas: ['bambu', 'fibra'],
    vara: 'fibra',
    iscas: ['minhoca', 'carne'],
    isca: 'carne',
    objetivo: 3,
    trofeus: ['trofeu-guanambicup'],
    cartas: ['carta-guanambicup'],
  };
  const v0to1: Migration = (o: any) => ({
    ...newProfile(),
    money: o.saldo,
    rods: { owned: o.varas, equipped: o.vara },
    baits: { owned: o.iscas, equipped: o.isca },
    story: { episodes: { 1: { objectiveIndex: o.objetivo, progress: 0, won: false } }, scenesSeen: [], pendingScene: null },
    trophies: o.trofeus,
    messagesUnlocked: o.cartas,
  });

  it('SAVE-09: um salvamento v0 vira v1 mantendo saldo, itens, progresso, troféus e mensagens', () => {
    const p = parseProfile(JSON.stringify(V0), { 0: v0to1 });
    expect(p).not.toBeNull();
    expect(p!.version).toBe(1);
    expect(p!.money).toBe(340);
    expect(p!.rods).toEqual({ owned: ['bambu', 'fibra'], equipped: 'fibra' });
    expect(p!.baits).toEqual({ owned: ['minhoca', 'carne'], equipped: 'carne' });
    expect(p!.story.episodes[1]).toEqual({ objectiveIndex: 3, progress: 0, won: false });
    expect(p!.trophies).toEqual(['trofeu-guanambicup']);
    expect(p!.messagesUnlocked).toEqual(['carta-guanambicup']);
  });

  it('SAVE-09: a cadeia aplica um passo por versão até a atual', () => {
    const older = { version: -1, dinheiro: 340 };
    const toV0: Migration = (o: any) => ({ ...V0, version: 0, saldo: o.dinheiro });
    const p = migrate(older, { [-1]: toV0, 0: v0to1 });
    expect(p?.version).toBe(1);
    expect(p?.money).toBe(340);
    expect(p?.trophies).toEqual(['trofeu-guanambicup']);
  });

  it('SAVE-08: versão antiga sem passo de migração, ou passo que dá perfil inválido → null', () => {
    expect(parseProfile(JSON.stringify(V0))).toBeNull();
    expect(migrate(V0, { 0: (o) => ({ ...(o as object), version: 1 }) })).toBeNull();
  });

  it('SAVE-08: passo que não avança a versão → null, sem laço infinito', () => {
    expect(migrate(V0, { 0: (o) => o })).toBeNull();
  });
});

describe('medalhas, contagens e metas no perfil (MEDAL-07)', () => {
  const withMedals = (): Profile => ({
    ...playedProfile(),
    medals: { tilapia: ['bronze', 'prata'], traira: ['bronze'] },
    catchCounts: { tilapia: 12, traira: 3 },
    goalsDone: ['tilapia:10'],
  });

  it('MEDAL-07: medalhas, contagens e metas cumpridas saem iguais do salvamento', () => {
    expect(roundTrip(withMedals())).toEqual(withMedals());
  });

  it('MEDAL-07: medalha inventada, contagem quebrada ou metas fora de lista → null', () => {
    const wrong: [string, (p: any) => void][] = [
      ['medalha inventada', (p) => (p.medals.tilapia = ['diamante'])],
      ['medalhas não lista', (p) => (p.medals.tilapia = 'bronze')],
      ['contagem em texto', (p) => (p.catchCounts.tilapia = '12')],
      ['contagem negativa', (p) => (p.catchCounts.tilapia = -1)],
      ['contagem quebrada', (p) => (p.catchCounts.tilapia = 1.5)],
      ['metas não lista', (p) => (p.goalsDone = 'tilapia:10')],
      ['meta número', (p) => (p.goalsDone = [10])],
    ];
    for (const [name, spoil] of wrong) {
      const p = structuredClone(withMedals());
      spoil(p);
      expect(roundTrip(p), name).toBeNull();
    }
  });
});
