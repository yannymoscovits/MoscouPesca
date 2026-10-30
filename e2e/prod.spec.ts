import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Roda contra o build de produção (projeto pixel7-prod, servido de dist/).

test('ganchos de teste: window.__mf não existe no build de produção', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MoscouFishing' })).toBeVisible();

  expect(await page.evaluate(() => '__mf' in window)).toBe(false);
});

test('ganchos de teste: nenhum arquivo do build de produção menciona __mf', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
    );
  const scripts = files('dist').filter((f) => /\.(js|html)$/.test(f));

  expect(scripts.length).toBeGreaterThan(0);
  for (const f of scripts) expect(readFileSync(f, 'utf8'), f).not.toContain('__mf');
});
