/**
 * Gera public/img/fumaca.webp: fumaça negra procedural (ruído fractal), que se
 * repete sem emenda nas duas direções. Usada nas margens do desktop.
 * Uso: npx tsx scripts/gerar-fumaca.ts
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' });
const page = await browser.newPage();
// O tsx marca funções nomeadas com __name; a página precisa conhecer esse auxiliar.
await page.evaluate('globalThis.__name = (f) => f');
const dataUrl = await page.evaluate(() => {
  const N = 512;
  // Ruído de valor periódico: a grade "dá a volta", então a textura emenda perfeitamente.
  let semente = 1337;
  const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const camadas = [4, 8, 16, 32, 64].map((p) => ({ p, v: Float32Array.from({ length: p * p }, rnd) }));
  const suave = (t: number) => t * t * (3 - 2 * t);
  const ruido = (x: number, y: number, c: { p: number; v: Float32Array }) => {
    const fx = (x / N) * c.p, fy = (y / N) * c.p;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = suave(fx - x0), ty = suave(fy - y0);
    const at = (i: number, j: number) => c.v[((j + c.p) % c.p) * c.p + ((i + c.p) % c.p)];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const ctx = c.getContext('2d')!;
  const im = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // Domínio "torcido": o ruído grosso desloca o fino, o que dá cara de fumaça enrolada.
    const w = ruido(x, y, camadas[1]) * 60;
    let v = 0, amp = 0.55, soma = 0;
    for (const cam of camadas) { v += ruido(x + w, y + w * 0.6, cam) * amp; soma += amp; amp *= 0.55; }
    v /= soma;
    const a = Math.max(0, Math.min(1, (v - 0.36) / 0.34)); // corta o ralo, deixa os rolos densos
    const i = (y * N + x) * 4;
    im.data[i] = 3; im.data[i + 1] = 7; im.data[i + 2] = 8;
    im.data[i + 3] = Math.round(Math.pow(a, 1.25) * 250);
  }
  ctx.putImageData(im, 0, 0);
  return c.toDataURL('image/webp', 0.88);
});
await browser.close();
const out = join(root, 'public', 'img', 'fumaca.webp');
writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log(`Gravado ${out}`);
