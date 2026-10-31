// Cena lógica e layout das vistas da pescaria (spec, "Tamanho da cena"): escala inteira e a cena de
// 180 × 400 centralizada e ancorada embaixo. O desenho de cada vista tem os testes dela.
import { describe, expect, it } from 'vitest';
import { SCENE_H, SCENE_W, computeLayout, sceneScale } from './fishingRenderer';

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
