/**
 * Gera os ícones PNG do PWA a partir do public/icon.svg e tira capturas das
 * telas principais (para revisar o visual). Precisa do preview rodando na 4173.
 * Uso: npm run build && npm run preview -- --port 4173  (em outro terminal)
 *      npx tsx scripts/screens.ts
 */
import { chromium, devices } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const out = join(root, 'test-results', 'telas');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' });

// Ícones
const svg = readFileSync(join(root, 'public', 'icon.svg'), 'utf8');
for (const size of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: join(root, 'public', `icon-${size}.png`) });
  await p.close();
}

// Telas
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();
const base = process.env.BASE ?? 'http://localhost:4173';
const telas: [string, string][] = [
  ['combate', '/#/combate'], ['magias', '/#/magias'], ['ficha', '/#/ficha'], ['sessao', '/#/sessao'],
  ['mais', '/#/mais'], ['historia', '/#/mais/lore/historia'], ['avatar', '/#/mais/avatar'], ['nivel', '/#/mais/nivel'],
];
for (const [nome, url] of telas) {
  await page.goto(base + url);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${nome}.png`) });
}
// Combate com concentração e folha de magia aberta
await page.goto(base + '/#/combate');
await page.getByRole('button', { name: 'Iniciar combate' }).click();
await page.getByTestId('busca').click();
await page.getByRole('searchbox', { name: 'Buscar' }).fill('Guardiões');
await page.getByRole('dialog').getByRole('button', { name: /Guardiões Espirituais/ }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, 'magia-aberta.png') });
await page.getByRole('dialog').getByRole('button', { name: /^Conjurar/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, 'combate-concentrado.png') });
await browser.close();
console.log(`Capturas em ${out}`);
