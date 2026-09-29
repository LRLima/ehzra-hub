/**
 * Tarefa 0: extrai o grimório original (source/grimorio-ehzra-original.html)
 * para JSON fiel em data/extracted/ e imagens em public/img/.
 *
 * Regra: este script NUNCA corrige nada. Ele copia. Correções e campos
 * estruturados entram por data/curation/ no build-data.ts.
 *
 * Uso: npm run extract
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'source', 'grimorio-ehzra-original.html');
const OUT = join(root, 'data', 'extracted');
const IMG = join(root, 'public', 'img');

const html = readFileSync(SOURCE, 'utf8');
const $ = cheerio.load(html);
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' });

const md = (h: string | null | undefined) => (h ? td.turndown(h).trim() : '');
const txt = (s: string) => s.replace(/\s+/g, ' ').trim();
const section = (route: string) => $(`section[data-route="${route}"]`);

mkdirSync(OUT, { recursive: true });
mkdirSync(IMG, { recursive: true });

// ---------- imagens ----------
const images: { file: string; bytes: number; where: string }[] = [];
function saveImg(src: string | undefined, name: string, where: string) {
  const m = src?.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) throw new Error(`imagem ausente em ${where}`);
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  const file = `${name}.${ext}`;
  writeFileSync(join(IMG, file), buf);
  images.push({ file: `img/${file}`, bytes: buf.length, where });
  return `img/${file}`;
}

// ---------- perfil ----------
const perfil = section('/perfil');
const chips: Record<string, string> = {};
perfil.find('.chip-row .chip').each((_, el) => {
  const k = txt($(el).find('b').text());
  chips[k] = txt($(el).clone().children('b').remove().end().text());
});
const statStrip: Record<string, string> = {};
perfil.find('.stat-cell').each((_, el) => {
  statStrip[txt($(el).find('.k').text())] = txt($(el).find('.v').text());
});
const retrato = saveImg(perfil.find('.portrait-frame img').attr('src'), 'retrato', 'perfil');
const galeria = perfil
  .find('.gallery img')
  .toArray()
  .map((el, i) => saveImg($(el).attr('src'), `galeria-${i + 1}`, 'perfil/galeria'));
const alinhamentoH = txt(perfil.find('h2.section-h').first().text());

const profile = {
  eyebrow: txt(perfil.find('.page-eyebrow').text()),
  nome: txt(perfil.find('.title-line').text()),
  titulo: txt(perfil.find('.title-sub').text()),
  chips,
  resumo: md(perfil.find('.hero-info p.lede').html()),
  statStrip,
  alinhamento: {
    titulo: alinhamentoH,
    texto: md(perfil.find('h2.section-h').first().next('p').html()),
  },
  retrato,
  galeria,
  sidebar: {
    sigilo: txt($('.sigil').text()),
    epiteto: txt($('.sidebar-brand small').text()),
    rodape: txt($('.sidebar-foot').text()),
  },
};

// ---------- ficha ----------
const ficha = section('/ficha');
const atributos = ficha
  .find('.attr-card')
  .toArray()
  .map((el) => ({
    nome: txt($(el).find('.name').text()),
    valor: Number(txt($(el).find('.val').text())),
    mod: txt($(el).find('.mod').text()),
  }));
const tables = ficha.find('table').toArray();
const rows = (t: any) =>
  $(t)
    .find('tbody tr')
    .toArray()
    .map((tr) => $(tr).find('td').toArray().map((td) => txt($(td).text())));
const salvaguardas = rows(tables[0]).map(([atributo, valor, prof]) => ({ atributo, valor, proficiente: prof === 'Sim' }));
const pericias = rows(tables[1]).map(([nome, valor, atributo, prof]) => ({ nome, valor, atributo, proficiente: prof === 'Sim' }));
const kv = (t: any) => Object.fromEntries(rows(t).map(([k, v]) => [k, v]));
const sheet = {
  atributos,
  salvaguardas,
  pericias,
  proficiencias: kv(tables[2]),
  equipamentos: kv(tables[3]),
};

// ---------- habilidades ----------
const hab = section('/habilidades');
const features = hab
  .find('.feature')
  .toArray()
  .map((el) => ({ nome: txt($(el).find('h4').text()), texto: md($(el).find('p').html()) }));
const habTables = hab.find('table').toArray();
const conjRow = rows(habTables[0])[0];
const slotRows = rows(habTables[1]);
const spellcasting = {
  cd: Number(conjRow[0]),
  ataque: conjRow[1],
  rotulos: slotRows.map((r) => r[0]),
  espacos: slotRows[0].slice(1).map(Number),
  mana: slotRows[1].slice(1).map(Number),
  nota: txt(hab.find('.mini-note').text()),
};

// ---------- armas ----------
const armas = section('/armas');
const meta: Record<string, string> = {};
armas.find('.meta-row div').each((_, el) => {
  meta[txt($(el).find('b').text())] = txt($(el).find('span').text());
});
const weapon = {
  estrelas: txt(armas.find('.weapon-stars').text()),
  nome: txt(armas.find('.weapon-name').text()),
  sub: txt(armas.find('.weapon-sub').text()),
  selo: txt(armas.find('.badge').text()),
  meta,
  habilidade: {
    titulo: txt(armas.find('.weapon-ability h4').text()),
    paragrafos: armas.find('.weapon-ability p').toArray().map((p) => md($(p).html())),
    magiasSempre: armas
      .find('.weapon-spelllist li')
      .toArray()
      .map((li) => ({
        nome: txt($(li).find('a').text()),
        slug: ($(li).find('a').attr('href') ?? '').replace('#/magia/', ''),
        ciclo: txt($(li).find('span').text()),
        textoOriginal: txt($(li).text()),
      })),
  },
};

// ---------- avatar ----------
const av = section('/avatar');
const avMeta: Record<string, string> = {};
av.find('.meta-row div').each((_, el) => {
  avMeta[txt($(el).find('b').text())] = txt($(el).find('span').text());
});
const avatar = {
  eyebrow: txt(av.find('.page-eyebrow').text()),
  titulo: txt(av.find('.page-title').text()),
  sub: txt(av.find('.page-sub').text()),
  meta: avMeta,
  introTabela: txt(av.find('.meta-row').next('p').text()),
  tabela: rows(av.find('table')[0]).map(([d4, aspecto]) => ({ d4: Number(d4), aspecto })),
  aspectos: av
    .find('.avatar-card')
    .toArray()
    .map((el) => ({
      nome: txt($(el).find('h4').text()),
      rolagem: txt($(el).find('.roll').text()),
      citacao: txt($(el).find('blockquote').text()),
      visual: md($(el).find('p').html()),
      efeitos: $(el).find('li').toArray().map((li) => md($(li).html())),
    })),
};

// ---------- lore (história, personalidade, apêndice) ----------
function blocks(sec: ReturnType<typeof section>) {
  // Tudo depois do cabeçalho da página, em ordem, como markdown por bloco.
  return sec
    .children()
    .toArray()
    .filter((el) => !$(el).is('.page-eyebrow,.page-title,.page-sub'))
    .map((el) => {
      const tag = el.tagName.toLowerCase();
      if ($(el).is('.rule') || tag === 'hr') return { tipo: 'separador', md: '' };
      if (tag === 'blockquote') return { tipo: 'citacao', md: md($(el).html()) };
      if (tag === 'h2') return { tipo: 'titulo', md: txt($(el).text()) };
      if (tag === 'h3') return { tipo: 'subtitulo', md: txt($(el).text()) };
      if ($(el).is('.appendix-box'))
        return { tipo: 'caixa', md: md($(el).html()) };
      return { tipo: 'paragrafo', md: md($.html(el)) };
    })
    .filter((b) => b.tipo === 'separador' || b.md);
}
const head = (sec: ReturnType<typeof section>) => ({
  eyebrow: txt(sec.find('.page-eyebrow').text()),
  titulo: txt(sec.find('.page-title').text()),
  sub: txt(sec.find('.page-sub').text()),
});
const lore = {
  historia: { ...head(section('/historia')), blocos: blocks(section('/historia')) },
  personalidade: { ...head(section('/personalidade')), blocos: blocks(section('/personalidade')) },
  apendice: { ...head(section('/apendice')), blocos: blocks(section('/apendice')) },
};

// ---------- estratégias ----------
const strategies = { ...head(section('/estrategias')), blocos: blocks(section('/estrategias')) };

// ---------- diário ----------
const ses = section('/sessoes');
const diario = {
  ...head(ses),
  treinamento: txt(ses.find('p.lede').text()),
  sessoes: ses
    .find('.session')
    .toArray()
    .map((el) => ({
      titulo: txt($(el).find('h4').text()),
      resumo: $(el).find('.hpmp span').toArray().map((s) => txt($(s).text())),
      notas: $(el).find('.note').toArray().map((n) => txt($(n).text())),
    })),
};

// ---------- magias (arrays JS) ----------
function jsArray(name: string): any[] {
  const start = html.indexOf(`const ${name} = [`);
  if (start < 0) throw new Error(`array ${name} não encontrado`);
  const open = html.indexOf('[', start);
  // acha o "];" que fecha, no início de linha
  const close = html.indexOf('\n];', open);
  const literal = html.slice(open, close + 2);
  return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
}
const conv = (list: any[], origem: 'ficha' | 'grimorio') =>
  list.map((s) => ({
    nomeFicha: s.name,
    ciclo: s.level === 'truque' ? 0 : Number(s.level),
    escola: s.school,
    tagOriginal: s.tag,
    cicloReal: s.trueLevel ?? null,
    meta: s.meta,
    descricaoHtml: s.desc,
    descricaoMd: md(s.desc),
    origem,
  }));
const spells = [...conv(jsArray('spells'), 'ficha'), ...conv(jsArray('bonusSpells'), 'grimorio')];

// ---------- cabeçalhos e rótulos de cada página ----------
const paginas = Object.fromEntries(
  $('section[data-route]')
    .toArray()
    .map((el) => {
      const sec = $(el);
      return [
        sec.attr('data-route'),
        {
          ...head(sec),
          secoes: sec.find('h2, h3').toArray().map((h) => txt($(h).text())),
          legenda: sec.find('.legend span').toArray().map((x) => txt($(x).text())),
          lede: sec.find('p.lede').toArray().map((x) => md($(x).html())),
        },
      ];
    }),
);

// ---------- grava ----------
const outputs = {
  'profile.json': profile,
  'sheet.json': sheet,
  'features.json': { features, spellcasting },
  'weapon.json': weapon,
  'avatar.json': avatar,
  'lore.json': lore,
  'strategies.json': strategies,
  'diario.json': diario,
  'spells.json': spells,
  'paginas.json': paginas,
};
for (const [file, data] of Object.entries(outputs)) {
  writeFileSync(join(OUT, file), JSON.stringify({ fonte: 'source/grimorio-ehzra-original.html', data }, null, 2) + '\n');
}

// ---------- relatório ----------
const count = (o: unknown): number => JSON.stringify(o).length;
const loreChars = (['/historia', '/personalidade', '/apendice', '/estrategias'] as const)
  .map((r) => txt(section(r).text()).length)
  .reduce((a, b) => a + b, 0);
const byLevel = spells.reduce<Record<string, number>>((acc, s) => {
  const k = s.ciclo === 0 ? 'truques' : `${s.ciclo}º`;
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});
const byTag = spells.reduce<Record<string, number>>((acc, s) => {
  acc[s.tagOriginal] = (acc[s.tagOriginal] ?? 0) + 1;
  return acc;
}, {});
const semTexto = spells.filter((s) => !s.descricaoHtml).map((s) => s.nomeFicha);

console.log('\n=== Relatório de extração ===');
console.log(`Imagens: ${images.map((i) => `${i.file} (${(i.bytes / 1024).toFixed(0)} KB)`).join(', ')}`);
console.log(`Perfil: ${Object.keys(chips).length} chips, ${Object.keys(statStrip).length} stats`);
console.log(`Ficha: ${atributos.length} atributos, ${salvaguardas.length} salvaguardas, ${pericias.length} perícias`);
console.log(`Habilidades: ${features.length} features; CD ${spellcasting.cd}, ataque ${spellcasting.ataque}, espaços ${spellcasting.espacos.join('/')}, mana ${spellcasting.mana.join('/')}`);
console.log(`Relíquia: ${weapon.nome}, ${weapon.habilidade.magiasSempre.length} magias sempre preparadas`);
console.log(`Avatar: ${avatar.aspectos.length} aspectos, ${avatar.aspectos.reduce((a, x) => a + x.efeitos.length, 0)} efeitos`);
console.log(`Magias: ${spells.length} (${Object.entries(byLevel).map(([k, v]) => `${k}: ${v}`).join(', ')})`);
console.log(`  por tag original: ${Object.entries(byTag).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
console.log(`  sem texto (perdidas): ${semTexto.join(', ') || 'nenhuma'}`);
console.log(`Lore: história ${lore.historia.blocos.length} blocos, personalidade ${lore.personalidade.blocos.length}, apêndice ${lore.apendice.blocos.length}`);
console.log(`Estratégias: ${strategies.blocos.length} blocos; Diário: ${diario.sessoes.length} sessões`);
console.log(`Texto de lore + estratégias no HTML: ${loreChars} caracteres`);
console.log(`JSON gerado: ${(Object.values(outputs).map(count).reduce((a, b) => a + b, 0) / 1024).toFixed(0)} KB em data/extracted/`);
