/**
 * Recorta o fundo cinza de public/img/ceifadora.webp e grava
 * public/img/ceifadora-recorte.webp (com transparência).
 * Uso: npx tsx scripts/recortar-foice.ts
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const src = readFileSync(join(root, 'public', 'img', 'ceifadora.webp')).toString('base64');

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' });
const page = await browser.newPage();
// O tsx marca funções nomeadas com __name; a página precisa conhecer esse auxiliar.
await page.evaluate('globalThis.__name = (f) => f');
const dataUrl = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/webp;base64,' + b64;
  await img.decode();
  const w = img.width, h = img.height, n = w * h;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
  // Fundo = cinza claro e liso (degradê suave). A foice é escura e cheia de contraste.
  const fundo = (i: number) => lum[i] > 118 && Math.abs(d[i * 4] - d[i * 4 + 2]) < 14;
  const rotulo = new Int32Array(n).fill(-1);
  const fila = new Int32Array(n);
  let id = 0;
  for (let s = 0; s < n; s++) {
    if (rotulo[s] !== -1 || !fundo(s)) continue;
    let ini = 0, fim = 0, borda = false, soma = 0, soma2 = 0;
    fila[fim++] = s; rotulo[s] = id;
    while (ini < fim) {
      const p = fila[ini++], x = p % w, y = (p / w) | 0;
      soma += lum[p]; soma2 += lum[p] * lum[p];
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) borda = true;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= n || rotulo[q] !== -1 || Math.abs((q % w) - x) > 1) continue;
        if (fundo(q) && Math.abs(lum[q] - lum[p]) < 7) { rotulo[q] = id; fila[fim++] = q; }
      }
    }
    // Vãos fechados (entre a lâmina e os espinhos) também são fundo: grandes e lisos.
    const media = soma / fim, desvio = Math.sqrt(Math.max(0, soma2 / fim - media * media));
    if (borda || (fim > 500 && desvio < 9)) for (let k = 0; k < fim; k++) d[fila[k] * 4 + 3] = 0;
    id++;
  }
  // Borda suave: pixel claro encostado no transparente fica semitransparente.
  const alfa = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) alfa[i] = d[i * 4 + 3];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!alfa[i] || (alfa[i - 1] && alfa[i + 1] && alfa[i - w] && alfa[i + w])) continue;
    d[i * 4 + 3] = Math.max(0, Math.min(255, (150 - lum[i]) * 4));
  }
  ctx.putImageData(im, 0, 0);
  return c.toDataURL('image/webp', 0.9);
}, src);
await browser.close();
const out = join(root, 'public', 'img', 'ceifadora-recorte.webp');
writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log(`Gravado ${out}`);
