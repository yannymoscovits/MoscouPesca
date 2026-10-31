// Folhas de sprite (design.md, "FishingRenderer"): carrega, escolhe o quadro pelo tempo e, sem a
// imagem, desenha a forma provisória (ou um retângulo colorido) para o jogo seguir jogável
// ("Sprite não carregou").

/** Arte embutida no build, por caminho do conteúdo (ex.: 'src/assets/fish/ep1/tilapia.png'). */
const bundled = import.meta.glob<string>('/src/assets/**/*.png', { eager: true, query: '?url', import: 'default' });

/** URL da arte no build, ou null se o arquivo ainda não existe (a arte chega nas fases 11 a 13). */
export function resolveAsset(path: string): string | null {
  return bundled[`/${path.replace(/^\//, '')}`] ?? null;
}

/** Quadro da animação no tempo `t` (s), com `frames` quadros a `fps` quadros por segundo. */
export function frameAt(t: number, frames: number, fps: number): number {
  return Math.floor(t * fps) % frames;
}

/** Desenho no lugar da imagem que falta, na mesma caixa. */
export type Fallback = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) => void;

export interface SheetSpec {
  frames?: number; // quadros lado a lado na horizontal; padrão 1
  fps?: number; // padrão 0 (parado)
  color: string; // cor do retângulo quando a imagem falta
  fallback?: Fallback; // forma provisória quando a imagem falta; no lugar do retângulo
}

export interface Sprite {
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number): void;
}

export type ImageLoader = (url: string) => Promise<HTMLImageElement>;

export const loadImage: ImageLoader = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

/** `url` null: a arte não está no build e a forma provisória (ou o retângulo) fica no lugar. */
export function createSprite(url: string | null, spec: SheetSpec, load: ImageLoader = loadImage): Sprite {
  const frames = spec.frames ?? 1;
  const fps = spec.fps ?? 0;
  let image: HTMLImageElement | null = null;
  if (url) {
    load(url).then(
      (img) => (image = img),
      () => (image = null), // falhou: fica o retângulo
    );
  }

  return {
    draw(ctx, x, y, w, h, t) {
      if (!image) {
        if (spec.fallback) return spec.fallback(ctx, x, y, w, h, t);
        ctx.fillStyle = spec.color;
        ctx.fillRect(x, y, w, h);
        return;
      }
      const fw = image.naturalWidth / frames;
      ctx.drawImage(image, frameAt(t, frames, fps) * fw, 0, fw, image.naturalHeight, x, y, w, h);
    },
  };
}
