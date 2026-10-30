import { expect, test } from '@playwright/test';

type ManifestIcon = { src: string; sizes: string; type?: string; purpose?: string };

test('INST-05: manifest abre o jogo em tela cheia, em retrato e com ícones', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const res = await request.get(new URL(href!, page.url()).toString());
  expect(res.status()).toBe(200);
  const manifest = await res.json();

  expect(manifest.name).toBe('MoscouFishing');
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('portrait');

  const icons: ManifestIcon[] = manifest.icons;
  const purposes = (icon: ManifestIcon) => (icon.purpose ?? 'any').split(' ');
  const anyIcon192 = icons.find((i) => i.sizes === '192x192' && purposes(i).includes('any'));
  const anyIcon512 = icons.find((i) => i.sizes === '512x512' && purposes(i).includes('any'));
  const maskable = icons.find((i) => purposes(i).includes('maskable'));
  expect(anyIcon192).toBeDefined();
  expect(anyIcon512).toBeDefined();
  expect(maskable).toBeDefined();

  for (const icon of [anyIcon192!, anyIcon512!, maskable!]) {
    const img = await request.get(new URL(icon.src, res.url()).toString());
    expect(img.status(), icon.src).toBe(200);
    expect(img.headers()['content-type'], icon.src).toContain('image/png');
  }
});

test('INST-09: página marcada com noindex', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toMatch(/^Disallow: \/\s*$/m);

  const headers = await request.get('/_headers');
  expect(headers.status()).toBe(200);
  expect(await headers.text()).toMatch(/^\s+X-Robots-Tag: noindex\s*$/m);
});

test('INST-06: depois da primeira abertura, o jogo abre sem internet', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active?.state !== 'activated') {
      await new Promise<void>((resolve) =>
        reg.active!.addEventListener('statechange', function onChange() {
          if (this.state === 'activated') resolve();
        }),
      );
    }
  });

  await context.setOffline(true);
  const response = await page.reload();

  expect(response?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole('heading', { name: 'MoscouFishing' })).toBeVisible();
});
