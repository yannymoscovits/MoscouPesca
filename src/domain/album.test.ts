import { describe, expect, it } from 'vitest';
import { record, type Album } from './album';

describe('álbum', () => {
  it('ALBUM-01: a primeira tilápia de 1,20 kg é registrada com 1,20 e conta como recorde', () => {
    const r = record({}, 'tilapia', 1.2);
    expect(r.album).toEqual({ tilapia: { recordKg: 1.2 } });
    expect(r.isNewRecord).toBe(true);
  });

  it('ALBUM-01: registrar uma espécie nova mantém as já registradas', () => {
    const a: Album = { tilapia: { recordKg: 1.2 } };
    const r = record(a, 'traira', 0.7);
    expect(r.album).toEqual({ tilapia: { recordKg: 1.2 }, traira: { recordKg: 0.7 } });
    expect(r.isNewRecord).toBe(true);
  });

  it('ALBUM-02: peixe mais leve mantém o recorde; mais pesado atualiza e marca "Novo recorde!"', () => {
    const first = record({}, 'tilapia', 1.2).album;

    const lighter = record(first, 'tilapia', 0.9);
    expect(lighter.album.tilapia).toEqual({ recordKg: 1.2 });
    expect(lighter.isNewRecord).toBe(false);

    const heavier = record(lighter.album, 'tilapia', 1.5);
    expect(heavier.album.tilapia).toEqual({ recordKg: 1.5 });
    expect(heavier.isNewRecord).toBe(true);
  });

  it('ALBUM-02: peso igual ao recorde não é "mais pesado" e não é novo recorde', () => {
    const r = record({ tilapia: { recordKg: 1.2 } }, 'tilapia', 1.2);
    expect(r.album.tilapia).toEqual({ recordKg: 1.2 });
    expect(r.isNewRecord).toBe(false);
  });
});
