// Barra de captura na tela (pesca-bass T14; BRIGA-01, BRIGA-13): faixa, peixe e medidor em % da
// altura, e a faixa mudando de cor com o peixe dentro.
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { ep1 } from '../content/episodes/ep1';
import { barRulesFor, startBar, type CatchBar as Bar } from '../domain/catchBar';
import { createRng } from '../domain/rng';
import { CatchBar } from './CatchBar';

const bambu = ep1.rods.find((r) => r.id === 'bambu')!; // Força 1: faixa de 19,5%
const tilapia = ep1.species.find((sp) => sp.id === 'tilapia')!;

const roots: HTMLElement[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) act(() => render(null, root));
});

function setup(bar: Bar) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  roots.push(root);
  act(() => render(<CatchBar bar={bar} />, root));
  const el = (sel: string) => root.querySelector<HTMLElement>(sel)!;
  return {
    zone: el('.catch-bar__zone'),
    fish: el('.catch-bar__fish'),
    meter: el('[role="meter"]'),
    fill: el('.catch-bar__meter-fill'),
  };
}

const percent = (css: string) => parseFloat(css);

describe('CatchBar', () => {
  it('BRIGA-01: na fisgada, a faixa verde no fundo, o peixe dentro dela e o medidor ao lado em 30%', () => {
    const bar = startBar(tilapia, bambu, barRulesFor('desafio'), createRng(1));
    const { zone, fish, meter, fill } = setup(bar);
    expect(percent(zone.style.bottom)).toBe(0);
    expect(percent(zone.style.height)).toBeCloseTo(19.5, 9);
    expect(percent(fish.style.bottom)).toBeGreaterThan(0);
    expect(percent(fish.style.bottom)).toBeLessThan(19.5);
    expect(meter.getAttribute('aria-valuenow')).toBe('30');
    expect(percent(fill.style.height)).toBeCloseTo(30, 9);
  });

  it('faixa com bottom e height em % de zoneY e zoneH, peixe em % de fishY e medidor em % de meter', () => {
    const base = startBar(tilapia, bambu, barRulesFor('desafio'), createRng(1));
    const { zone, fish, meter, fill } = setup({ ...base, zoneY: 0.42, zoneH: 0.27, fishY: 0.81, meter: 0.66 });
    expect(percent(zone.style.bottom)).toBeCloseTo(42, 9);
    expect(percent(zone.style.height)).toBeCloseTo(27, 9);
    expect(percent(fish.style.bottom)).toBeCloseTo(81, 9);
    expect(percent(fill.style.height)).toBeCloseTo(66, 9);
    expect(meter.getAttribute('aria-valuenow')).toBe('66');
  });

  it('a faixa muda de cor com o peixe dentro dela', () => {
    const base = startBar(tilapia, bambu, barRulesFor('desafio'), createRng(1));
    const inside = setup({ ...base, zoneY: 0.25, zoneH: 0.2, fishY: 0.3 }).zone;
    const outside = setup({ ...base, zoneY: 0.25, zoneH: 0.2, fishY: 0.6 }).zone;
    expect(inside.dataset.inside).toBe('true');
    expect(outside.dataset.inside).toBe('false');
    expect(inside.className).not.toBe(outside.className);
  });
});
