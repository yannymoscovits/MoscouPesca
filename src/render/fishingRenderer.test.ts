// Cena lógica e layout das vistas da pescaria (spec, "Tamanho da cena"): escala inteira e a cena de
// 180 × 400 centralizada e ancorada embaixo. O desenho de cada vista tem os testes dela.
import { describe, expect, it } from 'vitest';
import { episodes } from '../content';
import { SCENE_H, SCENE_W, computeLayout, fishBox, sceneScale } from './fishingRenderer';

describe('escala da cena', () => {
  it('escala inteira: 2× até 539 px de largura e 3× a partir de 540 px', () => {
    expect(sceneScale(360)).toBe(2);
    expect(sceneScale(412)).toBe(2);
    expect(sceneScale(539)).toBe(2);
    expect(sceneScale(540)).toBe(3);
    expect(sceneScale(600)).toBe(3);
  });

  it.each([
    [360, 740, 2],
    [412, 839, 2],
    [600, 960, 3],
  ])('%i × %i px: cena lógica 180 × 400 centralizada e a vista cobre a tela inteira', (w, h, scale) => {
    const l = computeLayout(w, h);

    expect(l.scale).toBe(scale);
    expect(l.viewW * l.scale).toBeGreaterThanOrEqual(w);
    expect(l.viewH * l.scale).toBeGreaterThanOrEqual(h);
    const left = l.offsetX;
    const right = l.viewW - (l.offsetX + SCENE_W);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(l.offsetY + SCENE_H).toBe(l.viewH); // a margem da represa fica embaixo
  });
});

describe('fishBox: o tamanho do peixe na cena importa', () => {
  it('três faixas pelo kg máximo: gigante (>= 20), pequeno (<= 1) e o resto', () => {
    expect(fishBox({ kg: { max: 25 } })).toEqual({ w: 72, h: 32 });
    expect(fishBox({ kg: { max: 20 } })).toEqual({ w: 72, h: 32 });
    expect(fishBox({ kg: { max: 0.8 } })).toEqual({ w: 24, h: 12 });
    expect(fishBox({ kg: { max: 1 } })).toEqual({ w: 24, h: 12 });
    expect(fishBox({ kg: { max: 4 } })).toEqual({ w: 36, h: 16 });
  });

  it('toda espécie do conteúdo cai numa das três caixas (as folhas de sprite vêm nesses tamanhos)', () => {
    const species = episodes.flatMap((ep) => ep.species);
    expect(species.length).toBeGreaterThan(0);
    for (const sp of species) {
      expect([24, 36, 72], sp.id).toContain(fishBox(sp).w);
    }
    // O pirarucu lendário é dos gigantes: a sombra e o sprite dele precisam aparecer grandes.
    const pirarucu = species.find((sp) => sp.id === 'pirarucu-lendario')!;
    expect(fishBox(pirarucu)).toEqual({ w: 72, h: 32 });
  });
});
