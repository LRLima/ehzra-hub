/**
 * Garante que a migração não perdeu texto: cada bloco de texto visível do HTML
 * original precisa aparecer (normalizado) em algum lugar de data/extracted/.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const root = join(import.meta.dirname, '..');
const html = readFileSync(join(root, 'source', 'grimorio-ehzra-original.html'), 'utf8');
const extractedDir = join(root, 'data', 'extracted');

// Normaliza HTML e Markdown para o mesmo texto plano comparável.
const norm = (s: string) =>
  s
    .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, '$1') // escapes do turndown
    .replace(/[*_#>`]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links markdown
    .replace(/[“”"]/g, '"')
    .replace(/\s+/g, '') // compara sem espaços: <br> some no .text() do cheerio
    .toLowerCase();

function allStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string' || typeof v === 'number') out.push(String(v));
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => (out.push(k), allStrings(x, out)));
  return out;
}

const corpus = norm(
  readdirSync(extractedDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => allStrings(JSON.parse(readFileSync(join(extractedDir, f), 'utf8'))))
    .map((s) => (s.includes('<') ? cheerio.load(s).text() : s))
    .join(' \n '),
);

// Blocos "folha" com texto. Pula navegação e o texto de UI gerado por JS.
const LEAVES = 'p, li, blockquote, h1, h2, h3, h4, td, th, .chip, .v, .k, .name, .val, .mod, .roll, .tagline, .weapon-stars';

describe('extração sem perda', () => {
  const $ = cheerio.load(html);
  const sections = $('section[data-route]').toArray();

  it('encontra as 11 seções do grimório', () => {
    expect(sections.length).toBe(11);
  });

  for (const sec of sections) {
    const route = $(sec).attr('data-route')!;
    it(`seção ${route}: todo texto está nos JSONs`, () => {
      const missing: string[] = [];
      $(sec)
        .find(LEAVES)
        .each((_, el) => {
          // cabeçalhos de tabela e rótulos de UI não são conteúdo
          if ($(el).is('th')) return;
          const t = norm($(el).text());
          if (t.length < 2) return;
          if (!corpus.includes(t)) missing.push(t.slice(0, 90));
        });
      expect(missing).toEqual([]);
    });
  }

  it('todas as descrições de magia estão presentes', () => {
    const spells = JSON.parse(readFileSync(join(extractedDir, 'spells.json'), 'utf8')).data;
    for (const s of spells) {
      if (!s.descricaoHtml) continue;
      const $d = cheerio.load(s.descricaoHtml);
      $d('p, li').each((_, el) => {
        expect(norm(s.descricaoMd)).toContain(norm($d(el).text()));
      });
    }
  });
});
