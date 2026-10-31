import { describe, expect, it } from 'vitest';
import type { Bait, Point, Profile, Rod, Species, Zone } from '../content/types';
import { cast, press, rulesFor, tick, type FishingState, type TickContext } from './fishing';
import { createRng } from './rng';
import { buy, canBuy, equip, type Item } from './shop';

const BAMBU: Rod = { id: 'bambu', name: 'Vara de Bambu', price: 0, force: 1, reach: 2, episode: 1 };
const FIBRA: Rod = { id: 'fibra', name: 'Vara de Fibra', price: 150, force: 3, reach: 5, episode: 1 };
const CARBONO: Rod = { id: 'carbono', name: 'Vara de Carbono', price: 400, force: 6, reach: 7, episode: 1 };
const MINHOCA: Bait = { id: 'minhoca', name: 'Minhoca', price: 0, episode: 1 };
const CARNE: Bait = { id: 'carne', name: 'Isca de Carne', price: 60, episode: 1 };
const ITEMS: Item[] = [FIBRA, CARBONO, CARNE];

function profile(money: number): Profile {
  return {
    version: 1,
    money,
    rods: { owned: ['bambu'], equipped: 'bambu' },
    baits: { owned: ['minhoca'], equipped: 'minhoca' },
    settings: { difficulty: 'tranquilo', vibration: true },
    story: { episodes: {}, scenesSeen: [], pendingScene: null },
    unlockedEpisodes: [1],
    currentLocation: 'poco-do-magro',
    tutorialDone: true,
    charactersIntroduced: [],
    tournament: null,
    trophies: [],
    messagesUnlocked: [],
    album: {},
    medals: {},
    catchCounts: {},
    goalsDone: [],
    seenVersion: '',
  };
}

const RODS = [BAMBU, FIBRA, CARBONO];
const rodOf = (p: Profile) => RODS.find((r) => r.id === p.rods.equipped)!;

describe('compra', () => {
  it('EQUIP-03: com saldo, desconta o preço uma vez e marca como possuído; comprar de novo não muda nada', () => {
    const p = buy(profile(400), FIBRA);
    expect(p.money).toBe(250);
    expect(p.rods.owned).toEqual(['bambu', 'fibra']);

    const again = buy(p, FIBRA); // o saldo pagaria de novo, mas o item já é dele
    expect(again).toEqual(p);
    expect(again.money).toBe(250);
  });

  it('EQUIP-03: isca comprada entra nas iscas possuídas e desconta o preço', () => {
    const p = buy(profile(100), CARNE);
    expect(p.money).toBe(40);
    expect(p.baits.owned).toEqual(['minhoca', 'carne']);
    expect(p.rods.owned).toEqual(['bambu']);
  });

  it('EQUIP-04: saldo menor que o preço → não pode comprar e informa exatamente quanto falta', () => {
    expect(canBuy(profile(120), FIBRA)).toEqual({ ok: false, missing: 30 });
    expect(canBuy(profile(0), CARBONO)).toEqual({ ok: false, missing: 400 });
    expect(canBuy(profile(150), FIBRA)).toEqual({ ok: true });
  });

  it('EQUIP-04/EQUIP-06: comprar sem saldo devolve o perfil igual', () => {
    const p = profile(149);
    expect(buy(p, FIBRA)).toEqual(p);
  });

  it('EQUIP-06: nenhuma sequência de compras deixa o saldo negativo, e cada compra desconta só o seu preço', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      const start = Math.floor(rng.range(0, 700));
      let p = profile(start);
      for (let i = 0; i < 20; i++) {
        p = buy(p, rng.pick(ITEMS.map((item) => ({ item, weight: 1 }))));
        expect(p.money).toBeGreaterThanOrEqual(0);
      }
      const spent = ITEMS.filter((it) => p.rods.owned.includes(it.id) || p.baits.owned.includes(it.id)).reduce(
        (sum, it) => sum + it.price,
        0,
      );
      expect(p.money).toBe(start - spent);
    }
  });
});

describe('equipar', () => {
  it('EQUIP-05: equipar item não possuído deixa o perfil igual', () => {
    const p = profile(0);
    expect(equip(p, 'fibra')).toEqual(p);
    expect(equip(p, 'carne')).toEqual(p);
  });

  it('EQUIP-05: equipar vara ou isca possuída passa a ser o equipado', () => {
    const p = buy(buy(profile(500), FIBRA), CARNE);
    const withRod = equip(p, 'fibra');
    expect(withRod.rods.equipped).toBe('fibra');
    expect(withRod.baits.equipped).toBe('minhoca');

    const withBait = equip(withRod, 'carne');
    expect(withBait.baits.equipped).toBe('carne');
    expect(withBait.rods.equipped).toBe('fibra');
  });

  it('EQUIP-05: a vara equipada vale a partir do próximo arremesso; o arremesso em curso segue com a anterior', () => {
    const origin: Point = { x: 0, y: 0 };
    let p = buy(profile(500), FIBRA);
    const inFlight = cast({ phase: 'Idle' }, { x: 0, y: -10 }, { origin, rod: rodOf(p), bait: p.baits.equipped });

    p = equip(p, 'fibra');
    if (inFlight.phase !== 'Flying') throw new Error('esperava Flying');
    expect(inFlight.gear.rod.id).toBe('bambu');

    const next = cast({ phase: 'Idle' }, { x: 0, y: -10 }, { origin, rod: rodOf(p), bait: p.baits.equipped });
    if (next.phase !== 'Flying') throw new Error('esperava Flying');
    expect(next.gear.rod.id).toBe('fibra');
  });
});

describe('isca de uso ilimitado', () => {
  it('EQUIP-08: usar uma isca em 100 arremessos não a remove do perfil', () => {
    const tilapia: Species = {
      id: 'tilapia',
      name: 'Tilápia',
      sprite: '',
      kg: { min: 0.5, max: 2 },
      pricePerKg: 10,
      power: 2,
      stamina: 2,
      baits: ['carne'],
      rarity: 1,
      description: '',
      rare: false,
      medals: { bronze: 1.25, prata: 1.6, ouro: 1.85 },
    };
    const zone: Zone = { id: 'z', polygon: [{ x: -50, y: -50 }, { x: 50, y: -50 }, { x: 50, y: 50 }, { x: -50, y: 50 }], species: ['tilapia'], depthM: 1 };
    let p = equip(buy(profile(100), CARNE), 'carne');
    const ctx: TickContext = { rng: createRng(7), rules: rulesFor('tranquilo'), zones: [zone], species: [tilapia] };

    let caught = 0;
    for (let i = 0; i < 100; i++) {
      let s: FishingState = cast({ phase: 'Idle' }, { x: 0, y: -10 }, { origin: { x: 0, y: 0 }, rod: rodOf(p), bait: p.baits.equipped });
      for (let t = 0; t < 2000 && !s.phase.startsWith('Result_'); t++) {
        s = s.phase === 'Bite' ? press(s, ctx) : tick(s, 0.1, { holding: true }, ctx);
      }
      if (s.phase === 'Result_Caught') caught++;
    }

    expect(caught).toBe(100);
    expect(p.baits.owned).toContain('carne');
    expect(p.baits.equipped).toBe('carne');
    p = buy(p, FIBRA);
    expect(p.baits.owned).toEqual(['minhoca', 'carne']);
  });
});
