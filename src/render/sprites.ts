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
  fit?: 'contain';
}

/** Artes aprovadas são imagens inteiras; as folhas antigas têm quatro quadros. */
export function fishSheet(path: string): Pick<SheetSpec, 'frames' | 'fps' | 'fit'> {
  return path.includes('/fish-portraits/') ? { frames: 1, fps: 0, fit: 'contain' } : { frames: 4, fps: 8 };
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

/** Imagens já carregadas, de qualquer cena: a pesca nova já começa com a arte, sem piscar a forma provisória. */
const ready = new Map<string, HTMLImageElement>();
/** Uma arte que falhou (rede fraca no celular) é pedida de novo depois disto, em vez de ficar provisória. */
const RETRY_MS = 1500;

/** `url` null: a arte não está no build e a forma provisória (ou o retângulo) fica no lugar. */
export function createSprite(url: string | null, spec: SheetSpec, load: ImageLoader = loadImage): Sprite {
  const frames = spec.frames ?? 1;
  const fps = spec.fps ?? 0;
  let image: HTMLImageElement | null = (url && ready.get(url)) || null;
  let loading = false;
  let failedAt = -Infinity;
  const fetch = () => {
    if (!url || image || loading) return;
    loading = true;
    load(url).then(
      (img) => {
        image = img;
        ready.set(url, img);
        loading = false;
      },
      () => {
        loading = false; // falhou: fica a forma provisória e tenta de novo daqui a pouco
        failedAt = Date.now();
      },
    );
  };
  fetch();

  return {
    draw(ctx, x, y, w, h, t) {
      if (!image) {
        if (!loading && Date.now() - failedAt >= RETRY_MS) fetch();
        if (spec.fallback) return spec.fallback(ctx, x, y, w, h, t);
        ctx.fillStyle = spec.color;
        ctx.fillRect(x, y, w, h);
        return;
      }
      const fw = image.naturalWidth / frames;
      if (spec.fit === 'contain') {
        const scale = Math.min(w / fw, h / image.naturalHeight);
        const dw = fw * scale;
        const dh = image.naturalHeight * scale;
        ctx.drawImage(image, frameAt(t, frames, fps) * fw, 0, fw, image.naturalHeight, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
        return;
      }
      ctx.drawImage(image, frameAt(t, frames, fps) * fw, 0, fw, image.naturalHeight, x, y, w, h);
    },
  };
}
