// Auditoria de contraste (WCAG) dos pares de cor do tema. Uso: node scripts/contraste.mjs
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/ui/tokens.css', import.meta.url), 'utf8');
const tok = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const cor = (v) => (v.startsWith('#') ? v : tok[v]);
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const razao = (a, b) => { const [x, y] = [lum(cor(a)), lum(cor(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Ponto mais claro da textura (~#3fb8ad) sob o véu de 62% de preto do .lava.
const texturaClara = '#2a2826'; // textura dessaturada sob o véu
const pares = [
  ['Texto principal / cartão', 'bone', 'panel', 4.5],
  ['Texto secundário / cartão', 'bone-dim', 'panel', 4.5],
  ['Texto apagado / cartão', 'bone-faint', 'panel', 4.5],
  ['Texto principal / fundo claro da textura', 'bone', texturaClara, 4.5],
  ['Número de PV / fundo claro da textura (grande)', 'bone', texturaClara, 3],
  ['Número de mana / fundo claro da textura (grande)', 'mana', texturaClara, 3],
  ['Rótulo VIDA/MANA / fundo claro da textura', 'bone', texturaClara, 4.5],
  ['Botão primário: texto / fundo', 'bone', 'panel-3', 4.5],
  ['Botão de combate: texto / gema', 'bone', '#551520', 4.5],
  ['Botão primário: borda / fundo (forma)', 'bone-dim', 'void', 3],
  ['Pílula ativa: texto / osso', 'void', 'bone', 4.5],
  ['Chip de dano / chip', 'bone', 'void-2', 4.5],
  ['Chip de habilidade / chip', 'gold', 'void-2', 4.5],
  ['Chip de mana / chip', 'mana', 'void-2', 4.5],
  ['Chip de concentração / chip', 'conc', 'void-2', 4.5],
  ['Selo homebrew / cartão', 'src-homebrew', 'panel', 4.5],
  ['Selo mudou / cartão', 'src-mudou', 'panel', 4.5],
  ['Selo legado / cartão', 'src-legado', 'panel', 4.5],
  ['Selo 2024 ok / cartão', 'src-ok', 'panel', 4.5],
  ...['fisico', 'habilidade', 'truque', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map((c) => [`Categoria ${c} / cartão`, `cat-${c}`, 'panel', 4.5]),
  ...['fisico', 'habilidade', 'truque', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map((c) => [`Categoria ${c} / fundo claro (título)`, `cat-${c}`, texturaClara, 3]),
  ['Aviso de PV baixo / cartão', 'hp-fg', 'panel', 4.5],
  ['Cura / cartão', 'heal', 'panel', 4.5],
];
let falhas = 0;
for (const [nome, a, b, min] of pares) {
  const r = razao(a, b);
  const ok = r >= min;
  if (!ok) falhas++;
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${r.toFixed(2).padStart(5)}:1 (mín ${min}) ${nome}`);
}
console.log(falhas ? `\n${falhas} par(es) abaixo do mínimo` : '\nTodos os pares passam');
