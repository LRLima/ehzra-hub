/**
 * Recorta o fundo branco de public/img/corpo-inteiro.webp e grava
 * public/img/ehzra-figura.webp (com transparência), usada no palco da tela inicial.
 * Uso: npx tsx scripts/recortar-figura.ts
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const src = readFileSync(join(root, 'public', 'img', 'corpo-inteiro.webp')).toString('base64');

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' });
const page = await browser.newPage();
// O tsx marca funções nomeadas com __name; a página precisa conhecer esse auxiliar.
await page.evaluate('globalThis.__name = (f) => f');
const dataUrl = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/webp;base64,' + b64;
  await img.decode();
  const w = img.width, h = img.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;
  const claro = (i: number, lim: number) => d[i * 4] > lim && d[i * 4 + 1] > lim && d[i * 4 + 2] > lim;

  // Rotula regiões quase brancas; some com as que tocam a borda ou são grandes (vãos entre capa e cabo).
  const rotulo = new Int32Array(w * h).fill(-1);
  const fila = new Int32Array(w * h);
  let n = 0;
  for (let s = 0; s < w * h; s++) {
    if (rotulo[s] !== -1 || !claro(s, 238)) continue;
    let ini = 0, fim = 0, borda = false;
    fila[fim++] = s; rotulo[s] = n;
    while (ini < fim) {
      const p = fila[ini++], x = p % w, y = (p / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) borda = true;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || rotulo[q] !== -1) continue;
        if (Math.abs((q % w) - x) > 1) continue;
        if (claro(q, 238)) { rotulo[q] = n; fila[fim++] = q; }
      }
    }
    if (borda || fim > 250) for (let k = 0; k < fim; k++) d[fila[k] * 4 + 3] = 0;
    n++;
  }
  // Suaviza a borda: pixel claro vizinho de transparente fica semitransparente.
  const alfa = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) alfa[i] = d[i * 4 + 3];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!alfa[i]) continue;
    if (alfa[i - 1] && alfa[i + 1] && alfa[i - w] && alfa[i + w]) continue;
    const escuro = 255 - Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
    d[i * 4 + 3] = Math.min(255, escuro * 3);
  }
  ctx.putImageData(im, 0, 0);
  return c.toDataURL('image/webp', 0.9);
}, src);
await browser.close();
const out = join(root, 'public', 'img', 'ehzra-figura.webp');
writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log(`Gravado ${out}`);
