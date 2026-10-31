// Barra de força e "Trocar de ponto" (pesca-bass T13; ARREM-02, PONTO-05).
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ep1 } from '../content/episodes/ep1';
import { barRulesFor, startBar } from '../domain/catchBar';
import { spawnWater } from '../domain/lure';
import type { PescaState } from '../domain/pesca';
import { createRng } from '../domain/rng';
import { CastHud } from './CastHud';

const SWEEP_S = 2; // Desafio: a força faz 0 → 1 → 0 em 2 s
const gear = { rod: ep1.rods[0], bait: 'minhoca' };
const water = spawnWater(ep1.locations[0].zones[0], ep1.species, 6, createRng(1), null, 'minhoca');
const bar = startBar(ep1.species[0], gear.rod, barRulesFor('desafio'), createRng(1));

const roots: HTMLElement[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) act(() => render(null, root));
});

function setup(pesca: PescaState) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  roots.push(root);
  const leaveSpot = vi.fn();
  act(() => render(<CastHud pesca={pesca} sweepS={SWEEP_S} leaveSpot={leaveSpot} />, root));
  const meter = root.querySelector<HTMLElement>('[role="meter"]');
  const fill = root.querySelector<HTMLElement>('.cast-hud__fill');
  const leave = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Trocar de ponto') ?? null;
  return { root, leaveSpot, meter, fill, leave };
}

describe('CastHud', () => {
  it('ARREM-02: com a seta balançando, a barra de força fica vazia', () => {
    const { meter, fill } = setup({ phase: 'Aim', sinceS: 0.7 });
    expect(meter?.getAttribute('aria-valuenow')).toBe('0');
    expect(fill?.style.width).toBe('0%');
  });

  it.each([
    [0.5, 50], // enchendo
    [1, 100], // cheia
    [1.5, 50], // esvaziando
  ])('ARREM-02: com a seta travada, a barra mostra a força em %% (%s s → %i%%)', (sinceS, percent) => {
    const { meter, fill } = setup({ phase: 'Power', angleDeg: 10, sinceS });
    expect(meter?.getAttribute('aria-valuenow')).toBe(String(percent));
    expect(fill?.style.width).toBe(`${percent}%`);
  });

  it.each<PescaState>([
    { phase: 'Aim', sinceS: 0 },
    { phase: 'Power', angleDeg: -20, sinceS: 0.3 },
  ])('PONTO-05: em $phase, "Trocar de ponto" aparece e chama leaveSpot', (pesca) => {
    const { leave, leaveSpot } = setup(pesca);
    expect(leave).not.toBeNull();
    act(() => leave!.click());
    expect(leaveSpot).toHaveBeenCalledTimes(1);
  });

  it.each<PescaState>([
    { phase: 'Flying', gear, angleDeg: 0, distanceM: 6, sinceS: 0.2 },
    { phase: 'Lure', gear, water, notice: null },
    { phase: 'Strike', gear, water, fishId: 1, sinceS: 0 },
    { phase: 'Fight', gear, water, fishId: 1, bar },
    { phase: 'Result_Nothing' },
  ])('PONTO-05: em $phase, sem "Trocar de ponto" nem barra de força', (pesca) => {
    const { leave, meter } = setup(pesca);
    expect(leave).toBeNull();
    expect(meter).toBeNull();
  });
});
