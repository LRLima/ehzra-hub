/**
 * Sync entre dois aparelhos contra um Worker rodando (wrangler dev ou produção).
 * Só roda com SYNC_URL definido, ex.: SYNC_URL=http://localhost:8787 npx playwright test sync
 */
import { test, expect, devices, type Page } from '@playwright/test';

const URL = process.env.SYNC_URL ?? (process.env.npm_lifecycle_event === 'e2e:sync' ? 'http://localhost:8787' : undefined);
test.skip(!URL, 'defina SYNC_URL para testar o sync');
test.describe.configure({ mode: 'serial' });

const pv = async (p: Page) => Number(await p.getByTestId('pv').textContent());

async function dano(page: Page, n: number) {
  await page.getByTestId('pv').click();
  for (const d of String(n)) await page.getByRole('dialog').getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Dano', exact: true }).click();
}

async function sincronizado(page: Page) {
  await page.goto(`${URL}/#/mais/g/ajustes`);
  await page.getByTestId('sync').getByRole('button', { name: 'Sincronizar' }).click().catch(() => undefined);
  await expect(page.getByTestId('sync')).toContainText('Sincronizado', { timeout: 15_000 });
}

test('alteração no celular aparece no PC, inclusive depois de ficar offline', async ({ browser }) => {
  const celular = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  const pc = await browser.newContext({ serviceWorkers: 'block' });
  const cel = await celular.newPage();
  const comp = await pc.newPage();

  await sincronizado(cel);
  await sincronizado(comp);
  await comp.goto(`${URL}/#/combate`);
  const inicio = await pv(comp);

  // 1. Online: o celular toma 12 de dano e o PC vê depois de recarregar.
  await cel.goto(`${URL}/#/combate`);
  await dano(cel, 12);
  await sincronizado(cel);
  await sincronizado(comp);
  await comp.goto(`${URL}/#/combate`);
  expect(await pv(comp)).toBe(Math.max(0, inicio - 12));

  // 2. Offline: o celular perde a rede, toma 7, e o PC ainda não sabe.
  await celular.setOffline(true);
  await cel.goto(`${URL}/#/combate`).catch(() => undefined);
  await dano(cel, 7);
  await sincronizado(comp);
  await comp.goto(`${URL}/#/combate`);
  expect(await pv(comp)).toBe(Math.max(0, inicio - 12));

  // 3. A rede volta: o evento guardado sobe sozinho e o PC converge.
  await celular.setOffline(false);
  await sincronizado(cel);
  await sincronizado(comp);
  await comp.goto(`${URL}/#/combate`);
  expect(await pv(comp)).toBe(Math.max(0, inicio - 19));

  await celular.close();
  await pc.close();
});
