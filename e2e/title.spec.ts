import { expect, test } from '@playwright/test';

// Tela inicial e instalação (INST-01 a INST-04), no build de teste.

test('INST-01: a tela inicial mostra "MoscouFishing", o subtítulo, "Colocar na tela" e "Jogar"', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();
  await expect(page.getByText('A Jornada de Adilson Moscovits')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Colocar na tela' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
});

test('INST-02: com o convite do navegador, "Colocar na tela" abre o diálogo de instalação', async ({ page }) => {
  await page.goto('/');
  // O Chrome dispara beforeinstallprompt quando o site pode ser instalado; o prompt() abre o diálogo do Android.
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt(): Promise<void> };
    e.prompt = async () => {
      (window as any).promptCalls = ((window as any).promptCalls ?? 0) + 1;
    };
    window.dispatchEvent(e);
  });

  await page.getByRole('button', { name: 'Colocar na tela' }).click();

  await expect.poll(() => page.evaluate(() => (window as any).promptCalls)).toBe(1);
  await expect(page.getByText('Adicionar à tela inicial')).toHaveCount(0); // sem a instrução do menu
});

test('INST-03: sem o convite, "Colocar na tela" mostra a instrução do menu ⋮ e "Adicionar à tela inicial"', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Colocar na tela' }).click();

  const help = page.getByRole('dialog', { name: 'Colocar o jogo na tela' });
  await expect(help).toBeVisible();
  await expect(help).toContainText('⋮');
  await expect(help).toContainText('Adicionar à tela inicial');

  await help.getByRole('button', { name: 'Entendi' }).click();
  await expect(help).toBeHidden();
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
});

test('INST-04: rodando instalado (display-mode standalone), o botão "Colocar na tela" some', async ({ page }) => {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes('display-mode: standalone')
        ? ({ matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {} } as any)
        : real(query);
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Colocar na tela' })).toHaveCount(0);
});
