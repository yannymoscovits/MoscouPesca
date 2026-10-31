import { describe, expect, it } from 'vitest';
import { aimAngleDeg, castDistanceM, powerAt } from './castAim';
import { maxCastDistance } from './fishing';

describe('aimAngleDeg: a seta da mira', () => {
  it.each([2, 4])('ARREM-01, ARREM-06: vai de -45° a 45° e volta em %i s', (sweepS) => {
    expect(aimAngleDeg(0, sweepS)).toBeCloseTo(-45);
    expect(aimAngleDeg(sweepS / 4, sweepS)).toBeCloseTo(0);
    expect(aimAngleDeg(sweepS / 2, sweepS)).toBeCloseTo(45);
    expect(aimAngleDeg((3 * sweepS) / 4, sweepS)).toBeCloseTo(0);
    expect(aimAngleDeg(sweepS, sweepS)).toBeCloseTo(-45);
  });

  it('ARREM-01: continua balançando, sempre no arco de 90° à frente do Adilson', () => {
    expect(aimAngleDeg(2.5, 2)).toBeCloseTo(aimAngleDeg(0.5, 2));
    expect(aimAngleDeg(7, 4)).toBeCloseTo(aimAngleDeg(3, 4));
    for (let t = 0; t < 8; t += 0.07) {
      expect(aimAngleDeg(t, 2)).toBeGreaterThanOrEqual(-45);
      expect(aimAngleDeg(t, 2)).toBeLessThanOrEqual(45);
    }
  });
});

describe('powerAt: a barra de força', () => {
  it.each([2, 4])('ARREM-02, ARREM-06: faz 0 → 1 → 0 em %i s', (sweepS) => {
    expect(powerAt(0, sweepS)).toBeCloseTo(0);
    expect(powerAt(sweepS / 4, sweepS)).toBeCloseTo(0.5);
    expect(powerAt(sweepS / 2, sweepS)).toBeCloseTo(1);
    expect(powerAt((3 * sweepS) / 4, sweepS)).toBeCloseTo(0.5);
    expect(powerAt(sweepS, sweepS)).toBeCloseTo(0);
  });

  it('ARREM-02: repete o ciclo enquanto ninguém aperta', () => {
    expect(powerAt(5, 2)).toBeCloseTo(powerAt(1, 2));
    expect(powerAt(9, 4)).toBeCloseTo(powerAt(1, 4));
  });
});

describe('castDistanceM: a distância do arremesso', () => {
  it('ARREM-03: força 1 usa todo o alcance; Bambu (alcance 2) chega a 10,8 m', () => {
    expect(castDistanceM(1, 2)).toBeCloseTo(10.8);
    expect(castDistanceM(1, 8)).toBeCloseTo(maxCastDistance(8) / 10);
  });

  it('ARREM-07: força 0 põe a isca a 30% do alcance máximo da vara', () => {
    expect(castDistanceM(0, 2)).toBeCloseTo(0.3 * 10.8);
    expect(castDistanceM(0, 5)).toBeCloseTo(0.3 * (maxCastDistance(5) / 10));
  });

  it('ARREM-03: no meio, (30% + 70% × força) do alcance máximo', () => {
    expect(castDistanceM(0.5, 2)).toBeCloseTo(0.65 * 10.8);
    expect(castDistanceM(0.25, 10)).toBeCloseTo(0.475 * (maxCastDistance(10) / 10));
  });
});
