import { describe, expect, it } from 'vitest';
import type { FightStyle, Rod, Species } from '../content/types';
import { barOutcome, barRulesFor, fightStyleOf, fishInside, pressBar, startBar, stepBar, type BarRules, type CatchBar } from './catchBar';
import { createRng, type Rng } from './rng';
import { ep1 } from '../content/episodes/ep1';

function fish(power: number, stamina = 5, fightStyle?: FightStyle): Species {
  return {
    id: `peixe-${power}-${stamina}`,
    name: 'Peixe',
    sprite: '',
    kg: { min: 1, max: 2 },
    power,
    stamina,
    baits: ['minhoca'],
    rarity: 1,
    description: '',
    rare: false,
    medals: { bronze: 1.2, prata: 1.5, ouro: 1.8 },
    ...(fightStyle ? { fightStyle } : {}),
  };
}

function rod(force: number): Rod {
  return { id: `vara-${force}`, name: 'Vara', price: 0, force, reach: 2, episode: 1 };
}

const DESAFIO = barRulesFor('desafio');
const TRANQUILO = barRulesFor('tranquilo');
const DT = 1 / 60;

describe('Pirarucu Lendário', () => {
  const sp = ep1.species.find(sp => sp.id === 'pirarucu-lendario')!;
  const carbon = ep1.rods.find(rod => rod.id === 'carbono')!;
  it('tem faixa menor e muda de profundidade mais rápido', () => {
    const baseline = { ...sp, fightTuning: undefined };
    const harder = startBar(sp, carbon, TRANQUILO, createRng(7));
    const normal = startBar(baseline, carbon, TRANQUILO, createRng(7));
    expect(harder.style).toBe('afundador');
    expect(harder.zoneH).toBeLessThan(normal.zoneH);
    expect(harder.retargetInS).toBeLessThan(normal.retargetInS);
  });
  it('precisa de mais tempo com o peixe dentro da faixa para completar a captura', () => {
    const rng = (): Rng => ({ next: () => 0, range: min => min, pick: items => items[0].item });
    const normal = startBar({ ...sp, fightTuning: undefined }, carbon, TRANQUILO, rng());
    const harder = startBar(sp, carbon, TRANQUILO, rng());
    const oldGain = stepBar(normal, 1, false, TRANQUILO, rng()).meter - normal.meter;
    const newGain = stepBar(harder, 1, false, TRANQUILO, rng()).meter - harder.meter;
    expect(newGain).toBeGreaterThan(0);
    expect(newGain).toBeLessThan(oldGain);
  });
  it.each(['tranquilo', 'desafio'] as const)('continua capturável com Carbono no %s', difficulty => {
    const rules = barRulesFor(difficulty);
    let caught = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      let b = startBar(sp, carbon, rules, rng);
      let held = false;
      for (let t = 0; t < 180 && barOutcome(b, rules) === null; t += DT) {
        const hold = b.fishY > b.zoneY + b.zoneH / 2 + b.zoneV * 0.2;
        if (hold && !held) b = pressBar(b);
        held = hold;
        b = stepBar(b, DT, hold, rules, rng);
      }
      if (barOutcome(b, rules) === 'pegou') caught++;
    }
    expect(caught).toBeGreaterThan(0);
  });
});

/** Roda `seconds` com o botão seguro ou solto; o medidor fica preso em 50% para a briga não acabar. */
function run(b: CatchBar, seconds: number, holding: boolean, rules: BarRules, rng: Rng): CatchBar {
  for (let i = 0; i < Math.round(seconds / DT); i++) b = stepBar({ ...b, meter: 0.5 }, DT, holding, rules, rng);
  return b;
}

/** Cada troca de destino num trecho longo: quando, de onde o peixe saiu e para onde vai. */
function retargets(b: CatchBar, seconds: number, rules: BarRules, rng: Rng, dt = 0.01) {
  const events: { atS: number; fromY: number; target: number }[] = [];
  const ys: number[] = [];
  for (let i = 1; i <= Math.round(seconds / dt); i++) {
    const before = b;
    b = stepBar({ ...b, meter: 0.5 }, dt, false, rules, rng);
    ys.push(b.fishY, b.fishTarget);
    if (b.retargetInS > before.retargetInS) events.push({ atS: i * dt, fromY: b.fishY, target: b.fishTarget });
  }
  const gaps = events.slice(1).map((e, i) => e.atS - events[i].atS);
  const jumps = events.map((e) => Math.abs(e.target - e.fromY));
  return { events, gaps, jumps, ys };
}

describe('startBar: o começo da briga', () => {
  it('BRIGA-01: a faixa verde começa parada no fundo, o medidor em 30% e o peixe dentro da barra', () => {
    const b = startBar(fish(3), rod(1), DESAFIO, createRng(1));
    expect(b.zoneY).toBe(0);
    expect(b.zoneV).toBe(0);
    expect(b.meter).toBeCloseTo(0.3);
    expect(b.fishY).toBeGreaterThanOrEqual(0);
    expect(b.fishY).toBeLessThanOrEqual(1);
  });

  it('BRIGA-07: a faixa tem 18% da barra + 1,5% por ponto de Força da vara', () => {
    expect(startBar(fish(3), rod(1), DESAFIO, createRng(1)).zoneH).toBeCloseTo(0.195);
    expect(startBar(fish(3), rod(6), DESAFIO, createRng(1)).zoneH).toBeCloseTo(0.27);
    expect(startBar(fish(3), rod(10), DESAFIO, createRng(1)).zoneH).toBeCloseTo(0.33);
  });

  it('BRIGA-12: no Tranquilo a faixa fica 40% mais alta', () => {
    expect(startBar(fish(3), rod(1), TRANQUILO, createRng(1)).zoneH).toBeCloseTo(0.195 * 1.4);
    expect(startBar(fish(3), rod(10), TRANQUILO, createRng(1)).zoneH).toBeCloseTo(0.33 * 1.4);
  });
});

describe('stepBar: a faixa verde', () => {
  const start = () => startBar(fish(3), rod(1), DESAFIO, createRng(2));

  it('BRIGA-02: segurando, a faixa acelera para cima a 2,8 − 1,4 = 1,4 barra/s²', () => {
    const b = run(start(), 0.5, true, DESAFIO, createRng(2));
    expect(b.zoneV).toBeCloseTo(0.7, 6); // 1,4 × 0,5
    expect(b.zoneY).toBeCloseTo(0.175, 6); // ½ × 1,4 × 0,5²
  });

  it('BRIGA-02: encostar o dedo dá um tranco de 0,5 barra/s para cima, sem passar do máximo', () => {
    const b = startBar(fish(3), rod(1), DESAFIO, createRng(1));
    expect(pressBar(b).zoneV).toBeCloseTo(0.5, 6);
    expect(pressBar({ ...b, zoneV: 1.0 }).zoneV).toBeCloseTo(1.2, 6);
  });

  it('BRIGA-02: segurando com a faixa caindo, o freio é 2,5 vezes a aceleração', () => {
    const b = { ...startBar(fish(3), rod(1), DESAFIO, createRng(1)), zoneY: 0.5, zoneV: -1.2 };
    const after = stepBar(b, 1 / 30, true, DESAFIO, createRng(2));
    expect(after.zoneV).toBeCloseTo(-1.2 + (2.8 * 2.5 - 1.4) / 30, 6);
  });

  it('BRIGA-02: segurando, a velocidade para em 1,2 barra/s', () => {
    let b = start();
    let fastest = 0;
    for (let i = 0; i < 60; i++) {
      b = run(b, DT, true, DESAFIO, createRng(2));
      fastest = Math.max(fastest, b.zoneV);
    }
    expect(b.zoneV).toBeCloseTo(1.2, 9); // em 1 s já passou dos 1,2 que 1,4 barra/s² daria
    expect(fastest).toBeLessThanOrEqual(1.2 + 1e-12);
  });

  it('BRIGA-05: bate no topo e para ali, com velocidade zero', () => {
    const b = { ...start(), zoneY: 1 - 0.195 - 0.01, zoneV: 1.2 };
    const after = stepBar(b, 1 / 30, true, DESAFIO, createRng(2));
    expect(after.zoneY).toBeCloseTo(1 - 0.195, 9);
    expect(after.zoneV).toBe(0);
    const held = run(start(), 2, true, DESAFIO, createRng(2));
    expect(held.zoneY + held.zoneH).toBeCloseTo(1, 9);
    expect(held.zoneV).toBe(0);
  });

  it('BRIGA-03, BRIGA-14: soltando no topo, a faixa cai do repouso com a gravidade de 1,4 barra/s²', () => {
    const top = run(start(), 2, true, DESAFIO, createRng(2));
    const b = run(top, 0.5, false, DESAFIO, createRng(2));
    expect(b.zoneV).toBeCloseTo(-0.7, 6);
    expect(b.zoneY).toBeCloseTo(top.zoneY - 0.175, 6);
  });

  it('a queda também não passa de 1,2 barra/s (velocidade máxima da Assumption "Física da briga")', () => {
    let b = run(start(), 2, true, DESAFIO, createRng(2));
    let fastest = 0;
    for (let i = 0; i < 90 && b.zoneY > 0.01; i++) {
      b = run(b, DT, false, DESAFIO, createRng(2));
      fastest = Math.max(fastest, -b.zoneV);
    }
    expect(fastest).toBeCloseTo(1.2, 9);
  });

  it('BRIGA-04: bate no fundo e quica para cima com 60% da velocidade', () => {
    const b = { ...start(), zoneY: 0.01, zoneV: -1 };
    const after = stepBar(b, 1 / 30, false, DESAFIO, createRng(2));
    expect(after.zoneY).toBe(0);
    // velocidade na batida: 1 barra/s mais o que a gravidade somou no passo (até 1,4 × 1/30)
    expect(after.zoneV).toBeGreaterThanOrEqual(0.6);
    expect(after.zoneV).toBeLessThanOrEqual(0.6 * (1 + 1.4 / 30) + 1e-12);
  });
});

describe('stepBar: o peixe', () => {
  it('BRIGA-06: troca de destino a cada 0,5 a 1,5 s no Desafio', () => {
    const { gaps } = retargets(startBar(fish(5), rod(1), DESAFIO, createRng(3)), 120, DESAFIO, createRng(3));
    expect(gaps.length).toBeGreaterThan(60);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(0.5 - 0.011);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(1.5 + 0.011);
    expect(Math.min(...gaps)).toBeLessThan(0.6);
    expect(Math.max(...gaps)).toBeGreaterThan(1.4);
  });

  it('BRIGA-12: no Tranquilo o intervalo entre destinos é 50% maior (0,75 a 2,25 s)', () => {
    const { gaps } = retargets(startBar(fish(5), rod(1), TRANQUILO, createRng(3)), 120, TRANQUILO, createRng(3));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(0.75 - 0.011);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(2.25 + 0.011);
    expect(Math.min(...gaps)).toBeLessThan(0.9);
    expect(Math.max(...gaps)).toBeGreaterThan(2.1);
  });

  it.each(['calmo', 'saltador', 'afundador'] as const)('BRIGA-06: o peixe %s nunca sai da barra', (style) => {
    const { ys } = retargets(startBar(fish(8, 5, style), rod(1), DESAFIO, createRng(4)), 120, DESAFIO, createRng(4));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(1);
  });

  it('BRIGA-06: o saltador sorteia destinos mais longe que o calmo', () => {
    const calm = retargets(startBar(fish(5, 5, 'calmo'), rod(1), DESAFIO, createRng(5)), 120, DESAFIO, createRng(5));
    const leap = retargets(startBar(fish(5, 5, 'saltador'), rod(1), DESAFIO, createRng(5)), 120, DESAFIO, createRng(5));
    expect(Math.min(...leap.jumps)).toBeGreaterThan(Math.max(...calm.jumps));
  });

  it('BRIGA-06: o afundador fica na metade de baixo da barra', () => {
    const { ys, events } = retargets(startBar(fish(9, 5, 'afundador'), rod(1), DESAFIO, createRng(6)), 120, DESAFIO, createRng(6));
    expect(events.length).toBeGreaterThan(60);
    expect(Math.max(...ys)).toBeLessThanOrEqual(0.5);
  });

  it('BRIGA-06: o peixe desliza até o destino em aproximação exponencial, mais rápido quanto maior a força', () => {
    const remaining = (power: number, seconds: number) => {
      const b = startBar(fish(power, 5, 'saltador'), rod(1), DESAFIO, createRng(7));
      const after = run(b, seconds, false, DESAFIO, createRng(7));
      return { d0: Math.abs(b.fishTarget - b.fishY), left: Math.abs(after.fishTarget - after.fishY) };
    };
    const weak = remaining(2, 0.3);
    const strong = remaining(8, 0.3);
    expect(strong.d0).toBeCloseTo(weak.d0, 12); // mesmo destino sorteado
    expect(strong.left).toBeLessThan(weak.left);
    // exponencial: o que falta em 0,4 s é o quadrado do que falta em 0,2 s
    const at02 = remaining(5, 0.2);
    const at04 = remaining(5, 0.4);
    expect(at04.left / at04.d0).toBeCloseTo((at02.left / at02.d0) ** 2, 9);
  });

  it('BRIGA-12: no Tranquilo o peixe é 40% mais lento', () => {
    const rate = (rules: BarRules) => {
      const b = startBar(fish(6, 5, 'saltador'), rod(1), rules, createRng(8));
      const after = run(b, 0.3, false, rules, createRng(8));
      return -Math.log(Math.abs(after.fishTarget - after.fishY) / Math.abs(b.fishTarget - b.fishY)) / 0.3;
    };
    expect(rate(TRANQUILO) / rate(DESAFIO)).toBeCloseTo(0.6, 9);
  });
});

describe('stepBar: o medidor de captura', () => {
  /** Peixe parado em `fishY`, faixa no fundo (0 a 19,5%), sem troca de destino no trecho. */
  const still = (fishY: number, meter: number, stamina = 5, rules = DESAFIO): CatchBar => ({
    ...startBar(fish(3, stamina), rod(1), rules, createRng(9)),
    fishY,
    fishTarget: fishY,
    retargetInS: 10,
    meter,
  });
  const steps = (b: CatchBar, seconds: number, rules: BarRules) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) b = stepBar(b, DT, false, rules, createRng(9));
    return b;
  };

  it('BRIGA-08: com o peixe dentro da faixa, enche (15% − 0,7% × fôlego) por segundo', () => {
    expect(steps(still(0.1, 0.3, 3), 0.4, DESAFIO).meter).toBeCloseTo(0.3 + 0.4 * (0.15 - 0.007 * 3), 9);
    expect(steps(still(0.1, 0.3, 10), 0.4, DESAFIO).meter).toBeCloseTo(0.3 + 0.4 * (0.15 - 0.007 * 10), 9);
  });

  it('BRIGA-09: com o peixe fora da faixa, esvazia 12% por segundo no Desafio e 6% no Tranquilo', () => {
    expect(steps(still(0.9, 0.3), 0.4, DESAFIO).meter).toBeCloseTo(0.3 - 0.4 * 0.12, 9);
    expect(steps(still(0.9, 0.3, 5, TRANQUILO), 0.4, TRANQUILO).meter).toBeCloseTo(0.3 - 0.4 * 0.06, 9);
  });

  it('BRIGA-12: no Tranquilo o medidor nunca desce de 10% e o peixe não foge', () => {
    const b = steps(still(0.9, 0.12, 5, TRANQUILO), 3, TRANQUILO);
    expect(b.meter).toBeCloseTo(0.1, 12);
    expect(barOutcome(b, TRANQUILO)).toBeNull();
  });

  it('BRIGA-10: o medidor em 100% dá "pegou"', () => {
    const b = still(0.1, 0.99);
    expect(barOutcome(b, DESAFIO)).toBeNull();
    const full = steps(b, 0.2, DESAFIO);
    expect(full.meter).toBe(1);
    expect(barOutcome(full, DESAFIO)).toBe('pegou');
  });

  it('BRIGA-11: o medidor em 0% no Desafio dá "fugiu"', () => {
    const b = still(0.9, 0.02);
    expect(barOutcome(b, DESAFIO)).toBeNull();
    const empty = steps(b, 0.5, DESAFIO);
    expect(empty.meter).toBe(0);
    expect(barOutcome(empty, DESAFIO)).toBe('fugiu');
  });

  it('"peixe dentro da faixa": o centro do peixe entre a base e o topo da faixa, bordas incluídas', () => {
    const b = { ...startBar(fish(3), rod(1), DESAFIO, createRng(1)), zoneY: 0.2, zoneH: 0.2 };
    expect(fishInside({ ...b, fishY: 0.2 })).toBe(true);
    expect(fishInside({ ...b, fishY: 0.4 })).toBe(true);
    expect(fishInside({ ...b, fishY: 0.19 })).toBe(false);
    expect(fishInside({ ...b, fishY: 0.41 })).toBe(false);
  });
});

describe('stepBar: determinismo', () => {
  /** Segura e solta a cada 0,4 s, em passos de `dt`. */
  const play = (seed: number, seconds: number, dt: number, sub = 1) => {
    const rng = createRng(seed);
    let b = startBar(fish(6), rod(3), DESAFIO, rng);
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      const holding = Math.floor((i * dt) / 0.4) % 2 === 0;
      for (let k = 0; k < sub; k++) b = stepBar(b, dt / sub, holding, DESAFIO, rng);
    }
    return b;
  };

  it('a mesma semente dá a mesma briga', () => {
    expect(play(11, 5, 0.05)).toEqual(play(11, 5, 0.05));
    expect(play(11, 5, 0.05)).not.toEqual(play(12, 5, 0.05));
  });

  it('um passo de 0,1 s dá o mesmo que 3 passos de 1/30 s', () => {
    const big = play(13, 3, 0.1);
    const small = play(13, 3, 0.1, 3);
    for (const key of ['zoneY', 'zoneV', 'fishY', 'fishTarget', 'retargetInS', 'meter'] as const) {
      expect(big[key], key).toBeCloseTo(small[key], 9);
    }
  });
});

describe('fightStyleOf: o jeito do peixe', () => {
  it('BRIGA-06: vale o campo da espécie; sem campo, calmo até força 4 e saltador a partir de 5', () => {
    expect(fightStyleOf(fish(9, 5, 'afundador'))).toBe('afundador');
    expect(fightStyleOf(fish(2, 5, 'saltador'))).toBe('saltador');
    expect(fightStyleOf(fish(4))).toBe('calmo');
    expect(fightStyleOf(fish(5))).toBe('saltador');
  });

  it('TUTOB-04: um jeito nas regras vale para qualquer peixe', () => {
    expect(startBar(fish(9, 5, 'saltador'), rod(1), { ...TRANQUILO, style: 'calmo' }, createRng(1)).style).toBe('calmo');
    expect(startBar(fish(9, 5, 'saltador'), rod(1), TRANQUILO, createRng(1)).style).toBe('saltador');
  });
});
