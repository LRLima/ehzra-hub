import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pv = (p: Page) => p.getByTestId('pv');
const mana = (p: Page) => p.getByTestId('mana');

async function abrirMagiaPelaBusca(page: Page, nome: string) {
  await page.getByTestId('busca').click();
  await page.getByRole('searchbox', { name: 'Buscar' }).fill(nome);
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(nome) }).first().click();
  await expect(page.getByRole('dialog', { name: nome })).toBeVisible();
}

async function conjurar(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: /^Conjurar/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function tomarDano(page: Page, n: number) {
  await pv(page).click();
  for (const d of String(n)) await page.getByRole('dialog').getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Dano', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(pv(page)).toHaveText('70');
});

test('conjurar atualiza mana, concentração, efeito e log de uma vez', async ({ page }) => {
  await abrirMagiaPelaBusca(page, 'Guardiões Espirituais');
  await conjurar(page);
  await expect(mana(page)).toHaveText('39');
  await expect(page.getByTestId('concentracao')).toContainText('Guardiões Espirituais');
  await expect(page.getByTestId('efeitos')).toContainText('Guardiões Espirituais');
  await page.getByRole('link', { name: 'Sessão' }).click();
  await expect(page.getByTestId('log')).toContainText('Conjurou Guardiões Espirituais (3º, 5 mana)');
});

test('Ceifadora corta o custo pela metade, arredondando para baixo', async ({ page }) => {
  await abrirMagiaPelaBusca(page, 'Transferência de Vida');
  await expect(page.getByRole('dialog').getByRole('button', { name: /^Conjurar/ })).toHaveText(/2 mana/);
  await conjurar(page);
  await expect(mana(page)).toHaveText('42');
});

test('dano com concentração avisa o teste de CON e desfazer volta', async ({ page }) => {
  await abrirMagiaPelaBusca(page, 'Escudo da Fé');
  await conjurar(page);
  await tomarDano(page, 24);
  await expect(pv(page)).toHaveText('46');
  await expect(page.getByRole('alert')).toContainText('CD 12');
  await page.getByRole('button', { name: 'Desfazer' }).first().click();
  await expect(pv(page)).toHaveText('70');
});

test('o teclado de PV mostra a CD antes do dano, e "Perdi" encerra a concentração', async ({ page }) => {
  await abrirMagiaPelaBusca(page, 'Escudo da Fé');
  await conjurar(page);
  await pv(page).click();
  for (const d of '30') await page.getByRole('dialog').getByRole('button', { name: d, exact: true }).click();
  await expect(page.getByTestId('cd-concentracao')).toContainText('CD 15');
  await page.getByRole('dialog').getByRole('button', { name: 'Dano', exact: true }).click();
  await page.getByRole('button', { name: 'Perdi' }).click();
  await expect(page.getByTestId('concentracao')).toHaveCount(0);
});

test('descanso longo restaura tudo', async ({ page }) => {
  await abrirMagiaPelaBusca(page, 'Guardiões Espirituais');
  await conjurar(page);
  await tomarDano(page, 30);
  await expect(pv(page)).toHaveText('40');
  await page.getByRole('button', { name: 'Descansar' }).click();
  await page.getByRole('button', { name: 'Fazer descanso longo' }).click();
  await expect(pv(page)).toHaveText('70');
  await expect(mana(page)).toHaveText('44');
  await expect(page.getByTestId('concentracao')).toHaveCount(0);
});

test('subir do nível 8 para o 9 mostra os ganhos, aplica e reverte', async ({ page }) => {
  await page.goto('/#/mais/nivel');
  const g = page.getByTestId('ganhos');
  await expect(g).toContainText('CD de magia');
  await expect(g).toContainText('17');
  await expect(g).toContainText('57');
  await expect(g).toContainText('4/3/3/3/1');
  await page.getByTestId('aplicar-nivel').click();
  await expect(page.getByText('A morte ensina')).toBeVisible();
  await expect(pv(page)).toHaveText('77');
  await expect(mana(page)).toHaveText('57');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Reverter a subida/ }).click();
  await expect(mana(page)).toHaveText('44');
});

test('exportar e importar backup', async ({ page }, info) => {
  await tomarDano(page, 9);
  await expect(pv(page)).toHaveText('61');
  await page.goto('/#/mais/backup');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('exportar').click()]);
  const arquivo = join(info.outputDir, 'backup.json');
  await download.saveAs(arquivo);
  const json = JSON.parse(readFileSync(arquivo, 'utf8'));
  expect(json.app).toBe('ehzra-hub');
  expect(json.eventos.length).toBeGreaterThan(0);

  // Limpa o aparelho e importa de volta.
  await page.evaluate(() => new Promise<void>((ok) => { const r = indexedDB.deleteDatabase('ehzra-hub'); r.onsuccess = r.onblocked = () => ok(); }));
  await page.reload();
  await page.goto('/#/mais/backup');
  await page.getByTestId('importar-arquivo').setInputFiles(arquivo);
  await page.getByTestId('confirmar-importar').click();
  await expect(pv(page)).toHaveText('61');
});

test('dano, alcance, tempo e concentração de qualquer magia em até 2 toques', async ({ page }) => {
  const telas = ['/#/combate', '/#/magias', '/#/ficha', '/#/sessao', '/#/mais'];
  for (const tela of telas) {
    await page.goto(tela);
    await page.getByTestId('busca').click(); // toque 1
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('Toque Vampirico'); // digitar não conta como toque
    const cartao = page.getByRole('dialog').getByRole('button', { name: /Toque Vampírico/ }).first();
    // Os chips já aparecem no resultado: tempo, alcance, dano, concentração.
    await expect(cartao).toContainText('Ação');
    await expect(cartao).toContainText('Pessoal');
    await expect(cartao).toContainText('3d6');
    await expect(cartao).toContainText('Conc.');
    await cartao.click(); // toque 2: detalhe completo
    await expect(page.getByRole('dialog', { name: 'Toque Vampírico' })).toBeVisible();
    await page.keyboard.press('Escape');
  }
});
