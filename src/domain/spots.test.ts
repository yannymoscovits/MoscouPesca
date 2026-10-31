import { describe, expect, it } from 'vitest';
import { ep1 } from '../content/episodes/ep1';
import type { Rod } from '../content/types';
import { spotsFor } from './spots';

const POCO = ep1.locations[0];
const rod = (id: string): Rod => ep1.rods.find((r) => r.id === id)!;

describe('spotsFor: os pontos do pesqueiro', () => {
  it('PONTO-01: o Poço do Magro mostra os 3 pontos, cada um com o nome do lugar', () => {
    const spots = spotsFor(POCO, rod('bambu'), ep1.species, {});
    expect(spots.map((s) => s.id)).toEqual(['raso', 'meio', 'fundo']);
    expect(spots.map((s) => s.name)).toEqual(['Beira do píer', 'Pedral', 'Fundão']);
  });

  it('PONTO-03: com a Vara de Bambu (alcance 2), o meio e o fundo ficam com cadeado e a frase do alcance', () => {
    const spots = spotsFor(POCO, rod('bambu'), ep1.species, {});
    expect(spots.map((s) => s.locked)).toEqual([false, true, true]);
    expect(spots.map((s) => s.lockText)).toEqual([null, 'Precisa de vara com alcance 3', 'Precisa de vara com alcance 5']);
    expect(spots.map((s) => s.minReach)).toEqual([0, 3, 5]);
  });

  it('PONTO-03: vara com alcance igual ao mínimo libera o ponto', () => {
    const spots = spotsFor(POCO, rod('fibra'), ep1.species, {}); // alcance 5
    expect(spots.map((s) => s.locked)).toEqual([false, false, false]);
    expect(spots.map((s) => s.lockText)).toEqual([null, null, null]);
  });

  it('PONTO-02: espécie já pescada aparece pelo nome; a não pescada, "???"', () => {
    const [raso] = spotsFor(POCO, rod('bambu'), ep1.species, { tilapia: { recordKg: 1.2 }, traira: { recordKg: 2 } });
    expect(raso.species).toEqual([
      { id: 'tilapia', name: 'Tilápia' },
      { id: 'piau', name: '???' },
      { id: 'traira', name: 'Traíra' },
      { id: 'curimata', name: '???' },
      { id: 'piranha-lavinia', name: '???' },
    ]);
  });

  it('PONTO-02: o ponto bloqueado também lista as espécies que vivem ali', () => {
    const fundo = spotsFor(POCO, rod('bambu'), ep1.species, { 'pirarucu-lendario': { recordKg: 30 } })[2];
    expect(fundo.species.map((s) => s.name)).toEqual(['???', '???', '???', '???', 'Pirarucu Lendário']);
  });
});
