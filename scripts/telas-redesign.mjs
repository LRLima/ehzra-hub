// Capturas para revisar o redesign (precisa do dev server na 5173).
import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' });
const p = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
const shot = (n) => p.screenshot({ path: `test-results/telas/r-${n}.png` });
const base = process.env.BASE ?? 'http://localhost:5173';
await p.goto(base + '/#/combate'); await p.waitForTimeout(1800); await shot('inicio');
await p.evaluate(() => scrollTo(0, 520)); await p.waitForTimeout(700); await shot('grupos');
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
// dano: captura no meio da animação
await p.getByTestId('pv').click();
for (const d of '27') await p.getByRole('dialog').getByRole('button', { name: d, exact: true }).click();
await p.getByRole('dialog').getByRole('button', { name: 'Dano', exact: true }).click();
await p.waitForTimeout(260); await shot('dano');
await p.waitForTimeout(1500);
// conjurar: captura do clarão
await p.getByTestId('busca').click();
await p.getByRole('searchbox', { name: 'Buscar' }).fill('Guardiões');
await p.getByRole('dialog').getByRole('button', { name: /Guardiões Espirituais/ }).first().click();
await p.waitForTimeout(500); await shot('magia');
await p.getByRole('dialog').getByRole('button', { name: /^Conjurar/ }).click();
await p.waitForTimeout(330); await shot('conjurar');
await p.waitForTimeout(1500); await shot('depois');
await p.goto(base + '/#/magias'); await p.waitForTimeout(900); await shot('grimorio');
await p.goto(base + '/#/mais/ceifadora'); await p.waitForTimeout(900); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await shot('ceifadora');
await b.close();
console.log('ok');
