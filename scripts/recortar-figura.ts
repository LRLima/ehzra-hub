/**
 * Recorta o fundo branco de public/img/corpo-inteiro.webp e grava
 * public/img/ehzra-figura.webp (com transparência), usada no palco da tela inicial.
 *
 * Como funciona:
 * 1. Fundo: regiões claras ligadas à borda da imagem, ou buracos claros entre os fios
 *    de cabelo e a capa (regiões claras que têm um miolo branco puro).
 * 2. Borda: nos poucos pixels em volta do fundo, "tira o branco" da cor (cor para alfa),
 *    para não sobrar o halo claro do antisserrilhado quando a figura fica sobre fundo escuro.
 * Uso: npx tsx scripts/recortar-figura.ts
 */
import sharp from 'sharp';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const { data, info } = await sharp(join(root, 'public', 'img', 'corpo-inteiro.webp')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height, N = w * h;
const d = data;
const minc = (i: number) => Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);

const CLARO = 200;     // pixel que pode ser fundo ou halo
const BRANCO = 248;    // miolo de fundo de verdade
const MIOLO_MIN = 20;  // um buraco precisa de ao menos isso de branco puro
const FAIXA = 3;       // pixels de borda tratados com cor para alfa

const fundo = new Uint8Array(N);
const visto = new Uint8Array(N);
const fila = new Int32Array(N);
for (let s = 0; s < N; s++) {
  if (visto[s] || minc(s) <= CLARO) continue;
  let ini = 0, fim = 0, borda = false, miolo = 0;
  fila[fim++] = s; visto[s] = 1;
  while (ini < fim) {
    const p = fila[ini++], x = p % w, y = (p / w) | 0;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) borda = true;
    if (minc(p) >= BRANCO) miolo++;
    const viz = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of viz) {
      if (q < 0 || visto[q] || minc(q) <= CLARO) continue;
      visto[q] = 1; fila[fim++] = q;
    }
  }
  if (borda || miolo >= MIOLO_MIN) for (let k = 0; k < fim; k++) fundo[fila[k]] = 1;
}

// Distância (em passos) até o fundo, só até FAIXA.
const dist = new Uint8Array(N).fill(255);
let atual: number[] = [];
for (let i = 0; i < N; i++) if (fundo[i]) { dist[i] = 0; atual.push(i); }
for (let passo = 1; passo <= FAIXA; passo++) {
  const prox: number[] = [];
  for (const p of atual) {
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
      if (q < 0 || q >= N || dist[q] !== 255) continue;
      dist[q] = passo; prox.push(q);
    }
  }
  atual = prox;
}

for (let i = 0; i < N; i++) {
  if (fundo[i]) { d[i * 4 + 3] = 0; continue; }
  if (dist[i] === 255) continue;
  // Cor para alfa contra o branco: quanto mais claro, mais transparente; a cor que sobra é a "tinta" sem o branco.
  const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
  const a = Math.max(255 - r, 255 - g, 255 - b) / 255;
  if (a <= 0.02) { d[i * 4 + 3] = 0; continue; }
  const un = (c: number) => Math.max(0, Math.min(255, Math.round(255 - (255 - c) / a)));
  d[i * 4] = un(r); d[i * 4 + 1] = un(g); d[i * 4 + 2] = un(b);
  d[i * 4 + 3] = Math.round(Math.min(1, a) * 255);
}

const out = join(root, 'public', 'img', 'ehzra-figura.webp');
await sharp(d, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 90, alphaQuality: 100 }).toFile(out);
console.log(`Gravado ${out}`);
