// Contraste do texto (ACES-07): o axe mede; onde ele não consegue ("incomplete", com o fundo do mar
// desenhado atrás), o texto é medido contra os pixels da tela atrás dele, como em title.spec.ts.

import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/** Todo texto dentro de `scope` com contraste >= 4,5:1: nenhuma violação do axe e cada caso sem medida do axe medido nos pixels. */
export async function expectContrast(page: Page, scope: string) {
  const axe = await new AxeBuilder({ page }).include(scope).withRules(['color-contrast']).analyze();
  const nodes = (results: typeof axe.violations) => results.flatMap((r) => r.nodes);
  expect(nodes(axe.violations).map((n) => n.html)).toEqual([]);
  expect(nodes(axe.passes).length + nodes(axe.incomplete).length).toBeGreaterThan(0);
  for (const n of nodes(axe.incomplete)) {
    const target = page.locator(String(n.target[0]));
    expect(await worstContrast(page, target), `contraste de ${n.html}`).toBeGreaterThanOrEqual(4.5);
  }
}

/**
 * Menor contraste entre a cor do texto e os pixels atrás dele: o texto some na hora da foto e cada
 * pixel da caixa dele é comparado com a cor do texto (fórmula de luminância da WCAG).
 */
export async function worstContrast(page: Page, target: Locator) {
  const color = await target.evaluate((el) => getComputedStyle(el).color);
  const box = (await target.boundingBox())!;
  const old = await target.evaluate((el) => {
    const style = (el as HTMLElement).style;
    const before = style.cssText;
    style.setProperty('color', 'transparent', 'important');
    style.setProperty('text-shadow', 'none', 'important');
    return before;
  });
  const shot = await page.screenshot({ clip: box, animations: 'disabled' });
  await target.evaluate((el, before) => void ((el as HTMLElement).style.cssText = before), old);

  return page.evaluate(
    async ([png, fg]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, img.width, img.height).data;
      const channel = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = (r: number, g: number, b: number) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      const [r, g, b] = fg.match(/\d+/g)!.map(Number);
      const text = lum(r, g, b);
      let worst = Infinity;
      for (let i = 0; i < px.length; i += 4) {
        const back = lum(px[i], px[i + 1], px[i + 2]);
        worst = Math.min(worst, (Math.max(text, back) + 0.05) / (Math.min(text, back) + 0.05));
      }
      return worst;
    },
    [shot.toString('base64'), color] as const,
  );
}
