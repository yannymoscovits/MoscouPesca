import { describe, expect, it, vi } from 'vitest';
import { createSprite, frameAt, resolveAsset } from './sprites';

/** Contexto 2D de mentira: guarda as chamadas de desenho. */
function fakeCtx() {
  return {
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('frameAt', () => {
  it('4 quadros a 8 qps, t = 0,3 s → quadro 2', () => {
    expect(frameAt(0.3, 4, 8)).toBe(2);
  });

  it('a animação volta ao primeiro quadro depois do último', () => {
    expect(frameAt(0.5, 4, 8)).toBe(0);
    expect(frameAt(0.625, 4, 8)).toBe(1);
  });
});

describe('createSprite', () => {
  it('imagem carregada: desenha o quadro do tempo, recortado da folha', async () => {
    const sheet = { naturalWidth: 64, naturalHeight: 16 } as HTMLImageElement; // 4 quadros de 16 × 16
    const sprite = createSprite('/peixe.png', { frames: 4, fps: 8, color: '#f80' }, async () => sheet);
    await flush();
    const ctx = fakeCtx();

    sprite.draw(ctx as unknown as CanvasRenderingContext2D, 10, 20, 32, 32, 0.3);

    expect(ctx.drawImage).toHaveBeenCalledWith(sheet, 32, 0, 16, 16, 10, 20, 32, 32);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('Sprite não carregou: desenha o retângulo colorido no lugar, sem lançar erro', async () => {
    const sprite = createSprite('/peixe.png', { color: '#f80' }, () => Promise.reject(new Error('404')));
    await flush();
    const ctx = fakeCtx();

    expect(() => sprite.draw(ctx as unknown as CanvasRenderingContext2D, 10, 20, 32, 16, 0)).not.toThrow();
    expect(ctx.fillStyle).toBe('#f80');
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 32, 16);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('enquanto a imagem carrega, também desenha o retângulo', () => {
    const sprite = createSprite('/peixe.png', { color: '#0a0' }, () => new Promise(() => {}));
    const ctx = fakeCtx();

    sprite.draw(ctx as unknown as CanvasRenderingContext2D, 0, 0, 8, 8, 0);

    expect(ctx.fillStyle).toBe('#0a0');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 8, 8);
  });

  it('com a forma provisória: sem a imagem, desenha a forma na caixa, e não o retângulo', () => {
    const fallback = vi.fn();
    const sprite = createSprite(null, { color: '#00f', fallback });
    const ctx = fakeCtx();

    sprite.draw(ctx as unknown as CanvasRenderingContext2D, 5, 6, 24, 29, 0.5);

    expect(fallback).toHaveBeenCalledWith(ctx, 5, 6, 24, 29, 0.5);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('com a forma provisória: com a imagem carregada, desenha a imagem e não a forma', async () => {
    const sheet = { naturalWidth: 96, naturalHeight: 29 } as HTMLImageElement;
    const fallback = vi.fn();
    const sprite = createSprite('/adilson.png', { frames: 4, color: '#00f', fallback }, async () => sheet);
    await flush();
    const ctx = fakeCtx();

    sprite.draw(ctx as unknown as CanvasRenderingContext2D, 5, 6, 24, 29, 0);

    expect(ctx.drawImage).toHaveBeenCalledWith(sheet, 0, 0, 24, 29, 5, 6, 24, 29);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('arte que não existe no build: retângulo, sem tentar baixar', () => {
    const load = vi.fn(async () => ({}) as HTMLImageElement);
    const sprite = createSprite(resolveAsset('src/assets/nao-existe.png'), { color: '#00f' }, load);
    const ctx = fakeCtx();

    sprite.draw(ctx as unknown as CanvasRenderingContext2D, 0, 0, 8, 8, 0);

    expect(load).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 8, 8);
  });
});
