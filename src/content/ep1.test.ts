import { describe, expect, it } from 'vitest';
import { START_BAIT, START_LOCATION, START_ROD } from '../domain/profile';
import { FISH_POWER, FISH_STAMINA } from '../domain/tuning';
import { ep1 } from './episodes/ep1';
import { episodes } from './index';

const byName = (name: string) => ep1.species.find((sp) => sp.name === name);
const zoneSpecies = () => ep1.locations.flatMap((l) => l.zones.flatMap((z) => z.species));

describe('Episódio 1: local e espécies', () => {
  it('EPI-01: o Episódio 1 está registrado em index.ts e acontece na Barragem do Poço do Magro', () => {
    expect(episodes[0]).toBe(ep1);
    expect(ep1.id).toBe(1);
    expect(ep1.locations.map((l) => ({ id: l.id, name: l.name }))).toEqual([
      { id: START_LOCATION, name: 'Barragem do Poço do Magro' },
    ]);
  });

  it('EPI-06: as 8 espécies de Guanambi, com exatamente 1 rara: o Pirarucu Lendário', () => {
    expect(ep1.species.map((sp) => sp.name).sort()).toEqual(
      ['Tilápia', 'Traíra', 'Curimatã', 'Piau', 'Tambaqui', 'Tucunaré', 'Pirarucu Lendário', 'Piranha Lavínia'].sort(),
    );
    expect(new Set(ep1.species.map((sp) => sp.id)).size).toBe(ep1.species.length);
    expect(ep1.species.filter((sp) => sp.rare).map((sp) => sp.name)).toEqual(['Pirarucu Lendário']);
  });

  it('HUMOR-03: toda espécie tem descrição engraçada não vazia', () => {
    for (const sp of ep1.species) expect(sp.description.trim(), sp.id).not.toBe('');
  });

  it('força e fôlego de toda espécie ficam dentro de FISH_POWER e FISH_STAMINA (1 a 10)', () => {
    for (const sp of ep1.species) {
      expect(sp.power, sp.id).toBeGreaterThanOrEqual(FISH_POWER.min);
      expect(sp.power, sp.id).toBeLessThanOrEqual(FISH_POWER.max);
      expect(sp.stamina, sp.id).toBeGreaterThanOrEqual(FISH_STAMINA.min);
      expect(sp.stamina, sp.id).toBeLessThanOrEqual(FISH_STAMINA.max);
    }
  });

  it('toda espécie tem faixa de peso válida, preço por kg e peso no sorteio positivos', () => {
    for (const sp of ep1.species) {
      expect(sp.kg.min, sp.id).toBeGreaterThan(0);
      expect(sp.kg.max, sp.id).toBeGreaterThanOrEqual(sp.kg.min);
      expect(sp.pricePerKg, sp.id).toBeGreaterThan(0);
      expect(sp.rarity, sp.id).toBeGreaterThan(0);
    }
  });

  it('toda espécie citada nas zonas existe, e toda zona é um polígono com pelo menos 3 pontos', () => {
    const ids = new Set(ep1.species.map((sp) => sp.id));
    for (const id of zoneSpecies()) expect(ids.has(id), id).toBe(true);
    for (const zone of ep1.locations.flatMap((l) => l.zones)) {
      expect(zone.polygon.length, zone.id).toBeGreaterThanOrEqual(3);
      expect(zone.species.length, zone.id).toBeGreaterThan(0);
    }
  });

  it('EQUIP-02: a Piranha Lavínia só aceita a Isca de Carne', () => {
    expect(byName('Piranha Lavínia')?.baits).toEqual(['carne']);
  });
});

describe('Episódio 1: varas e iscas', () => {
  it('EQUIP-01: a Vara de Bambu do início custa 0 e há 2 varas novas, Fibra e Carbono, com força e alcance de 1 a 10', () => {
    const bambu = ep1.rods.find((r) => r.id === START_ROD);
    expect(bambu).toMatchObject({ name: 'Vara de Bambu', price: 0 });
    const novas = ep1.rods.filter((r) => r.id !== START_ROD);
    expect(novas.map((r) => r.name)).toEqual(['Vara de Fibra', 'Vara de Carbono']);
    for (const r of novas) expect(r.price, r.id).toBeGreaterThan(0);
    for (const r of ep1.rods) {
      expect(r.episode, r.id).toBe(1);
      for (const value of [r.force, r.reach]) {
        expect(value, r.id).toBeGreaterThanOrEqual(1);
        expect(value, r.id).toBeLessThanOrEqual(10);
      }
    }
  });

  it('EQUIP-02: a Minhoca do início custa 0 e há pelo menos 1 isca nova, entre elas a Isca de Carne', () => {
    expect(ep1.baits.find((b) => b.id === START_BAIT)).toMatchObject({ name: 'Minhoca', price: 0 });
    const novas = ep1.baits.filter((b) => b.id !== START_BAIT);
    expect(novas.length).toBeGreaterThanOrEqual(1);
    for (const b of novas) expect(b.price, b.id).toBeGreaterThan(0);
    for (const b of ep1.baits) expect(b.episode, b.id).toBe(1);
    expect(ep1.baits.find((b) => b.id === 'carne')?.name).toBe('Isca de Carne');
  });

  it('EQUIP-02: toda isca citada pelas espécies existe e cada isca atrai um conjunto diferente de espécies', () => {
    const baitIds = new Set(ep1.baits.map((b) => b.id));
    for (const sp of ep1.species) for (const b of sp.baits) expect(baitIds.has(b), `${sp.id} → ${b}`).toBe(true);

    const attracted = ep1.baits.map((b) =>
      ep1.species
        .filter((sp) => sp.baits.includes(b.id))
        .map((sp) => sp.id)
        .sort()
        .join(','),
    );
    for (const set of attracted) expect(set).not.toBe('');
    expect(new Set(attracted).size).toBe(ep1.baits.length);
  });

  it('toda espécie aparece em pelo menos uma zona', () => {
    const inZones = new Set(zoneSpecies());
    for (const sp of ep1.species) expect(inZones.has(sp.id), sp.id).toBe(true);
  });
});
