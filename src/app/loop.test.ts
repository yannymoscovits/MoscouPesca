import { describe, expect, it } from 'vitest';
import { createLoop } from './loop';

/** requestAnimationFrame de mentira: cada `frame(ms)` roda os quadros pedidos com esse horário. */
function fakeRaf() {
  let queue: FrameRequestCallback[] = [];
  return {
    raf: (cb: FrameRequestCallback) => queue.push(cb),
    caf: () => void (queue = []),
    frame(ms: number) {
      const due = queue;
      queue = [];
      for (const cb of due) cb(ms);
    },
    pending: () => queue.length,
  };
}

function setup(paused = { value: false }) {
  const f = fakeRaf();
  const ticks: number[] = [];
  const draws: number[] = [];
  const loop = createLoop({
    tick: (dt) => ticks.push(dt),
    draw: (t) => draws.push(t),
    isPaused: () => paused.value,
    raf: f.raf,
    caf: f.caf,
  });
  return { f, ticks, draws, loop, paused };
}

const HZ60 = 1000 / 60;

describe('GameLoop', () => {
  it('um salto de 5 s entre quadros vira tick(0.1), não tick(5)', () => {
    const { f, ticks, loop } = setup();
    loop.start();
    f.frame(0);
    f.frame(HZ60);
    f.frame(HZ60 + 5000);

    expect(ticks).toHaveLength(2);
    expect(ticks[0]).toBeCloseTo(HZ60 / 1000, 6);
    expect(ticks[1]).toBe(0.1);
  });

  it('SAVE-01: pausado, nenhum tick nem desenho, e nenhum quadro novo pedido', () => {
    const { f, ticks, draws, loop, paused } = setup();
    loop.start();
    f.frame(0);
    f.frame(HZ60);
    const before = { ticks: ticks.length, draws: draws.length };

    paused.value = true;
    f.frame(2 * HZ60);
    f.frame(3 * HZ60);

    expect(ticks).toHaveLength(before.ticks);
    expect(draws).toHaveLength(before.draws);
    expect(f.pending()).toBe(0);
  });

  it('SAVE-01: ao voltar da pausa, o tempo parado não entra no tick', () => {
    const { f, ticks, loop, paused } = setup();
    loop.start();
    f.frame(0);
    paused.value = true;
    f.frame(HZ60);

    paused.value = false;
    loop.start();
    f.frame(60_000);
    f.frame(60_000 + HZ60);

    expect(ticks).toHaveLength(1);
    expect(ticks[0]).toBeCloseTo(HZ60 / 1000, 6);
  });

  it('a 60 Hz, desenha 30 vezes por segundo', () => {
    const { f, ticks, draws, loop } = setup();
    loop.start();
    for (let i = 0; i < 60; i++) f.frame(i * HZ60);

    expect(draws).toHaveLength(30);
    expect(ticks).toHaveLength(59); // o primeiro quadro só marca o horário
  });

  it('stop para de pedir quadros', () => {
    const { f, ticks, loop } = setup();
    loop.start();
    f.frame(0);
    loop.stop();
    f.frame(HZ60);

    expect(ticks).toHaveLength(0);
    expect(f.pending()).toBe(0);
  });
});
