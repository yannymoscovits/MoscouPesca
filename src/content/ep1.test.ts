import { describe, expect, it } from 'vitest';
import { START_LOCATION } from '../domain/profile';
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
