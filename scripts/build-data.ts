/**
 * Junta data/extracted (fiel ao original) com data/curation (decisões) e gera
 * os arquivos de regra que o app usa: spells.json, features.json,
 * homebrew-rules.json, lore.json, strategies.json. Valida tudo com Zod.
 *
 * Uso: npm run build-data
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Spell, Feature, HomebrewRules, Lore, Strategies, Character, ClassProgression, Conditions, SCHEMA_VERSION,
} from '../src/domain/schemas.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const extracted = (f: string) => read(`data/extracted/${f}`).data;
const write = (f: string, data: unknown) => writeFileSync(join(root, 'data', f), JSON.stringify(data, null, 2) + '\n');

// ---------- conversões a partir do texto original ----------
const pesParaMetros = (pes: number) => (pes / 5) * 1.5;
const fmtM = (m: number) => `${String(m).replace('.', ',')} m`;

export function alcanceDe(texto: string) {
  const t = texto.trim();
  const pes = t.match(/(\d+)\s*pés/);
  const metros = t.match(/(\d+(?:,\d+)?)\s*(?:metros|m\b)/);
  const convertido = t.replace(/(\d+)\s*pés/g, (_, n) => fmtM(pesParaMetros(Number(n))));
  if (/^toque/i.test(t)) return { tipo: 'toque' as const, texto: 'Toque' };
  if (/^(pessoal|eu)\b/i.test(t)) {
    return { tipo: 'pessoal' as const, texto: /^eu$/i.test(t) ? 'Pessoal' : convertido };
  }
  if (pes) {
    const p = Number(pes[1]);
    return { tipo: 'distancia' as const, pes: p, metros: pesParaMetros(p), texto: fmtM(pesParaMetros(p)) };
  }
  if (metros) {
    const m = Number(metros[1].replace(',', '.'));
    return { tipo: 'distancia' as const, metros: m, pes: Math.round((m / 1.5) * 5), texto: fmtM(m) };
  }
  return { tipo: 'especial' as const, texto: t };
}

export function tempoDe(texto: string) {
  if (/ação bônus/i.test(texto)) return { tipo: 'acaoBonus' as const, texto };
  if (/reação/i.test(texto)) return { tipo: 'reacao' as const, texto };
  if (/^1 ação/i.test(texto)) return { tipo: 'acao' as const, texto };
  return { tipo: 'longo' as const, texto };
}

export function duracaoDe(texto: string) {
  const t = texto.toLowerCase();
  const rodadas =
    /instant/.test(t) ? null
    : /1 rodada/.test(t) ? 1
    : /10 minutos/.test(t) ? 100
    : /1 minuto/.test(t) ? 10
    : /8 horas/.test(t) ? 4800
    : /1 hora/.test(t) ? 600
    : null;
  return { texto, rodadas };
}

const componentesDe = (comp: string) => ({ v: /\bV\b/.test(comp), s: /\bS\b/.test(comp), m: /\bM\b/.test(comp) });

// ---------- magias ----------
const curSpells = read('data/curation/spells.json');
// Magias que saíram do grimório: continuam no extraído (fiel ao original), mas não entram no app.
const removidasLista: { nomeFicha: string; id: string }[] = curSpells._removidas ?? [];
const removidas = new Set<string>(removidasLista.map((x) => x.nomeFicha));
const idsRemovidos = new Set<string>(removidasLista.map((x) => x.id));
const rawSpells = extracted('spells.json').filter((raw: any) => !removidas.has(raw.nomeFicha));
const spellsOriginais = rawSpells.map((raw: any) => {
  const c = curSpells[raw.nomeFicha];
  if (!c) throw new Error(`Magia sem curadoria: ${raw.nomeFicha}`);
  const m = raw.meta ?? { tempo: 'não registrado', alcance: 'não registrado', comp: '', duracao: 'não registrada' };
  const escola = String(raw.escola).replace(/\s*\(ritual\)/i, '');
  const { alcanceTexto, ...rest } = c;
  const alcance = alcanceDe(alcanceTexto ?? m.alcance);
  return Spell.parse({
    ...rest,
    nomeFicha: raw.nomeFicha,
    ciclo: c.ciclo ?? raw.ciclo, // a curadoria pode corrigir o ciclo da ficha
    escola,
    tempo: tempoDe(m.tempo),
    alcance,
    componentes: componentesDe(m.comp),
    duracao: duracaoDe(m.duracao),
    concentracao: /concentração/i.test(m.duracao),
    ritual: /ritual/i.test(raw.escola) || /ritual/i.test(m.tempo),
    alvo: c.alvo ?? m.alvo,
    perdida: raw.tagOriginal === 'perdida',
    descricaoCompleta: c.descricaoCompleta ?? (raw.descricaoMd || null), // a curadoria pode reescrever (variantes homebrew)
  });
});
// Magias que entraram depois do original: escritas inteiras à mão.
const novas = read('data/curation/spells-novas.json').magias.map((m: any) => Spell.parse({ nomeFicha: m.nome, descricaoCompleta: null, ...m }));
const spells = [...spellsOriginais, ...novas];
const repetidas = spells.map((x: Spell) => x.id).filter((id: string, i: number, a: string[]) => a.indexOf(id) !== i);
if (repetidas.length) throw new Error(`Magias com id repetido: ${repetidas.join(', ')}`);
const unused = Object.keys(curSpells).filter((k) => !k.startsWith('_') && !rawSpells.some((r: any) => r.nomeFicha === k));
if (unused.length) throw new Error(`Curadoria sem magia correspondente: ${unused.join(', ')}`);

// ---------- habilidades ----------
const rawFeat = extracted('features.json');
const features = read('data/curation/features.json').features.map((f: any) => {
  const { nomeFicha, ...rest } = f;
  const orig = nomeFicha ? rawFeat.features.find((x: any) => x.nome === nomeFicha) : null;
  if (nomeFicha && !orig) throw new Error(`Habilidade não encontrada no original: ${nomeFicha}`);
  return Feature.parse({ ...rest, texto: orig ? orig.texto : f.texto });
});

// ---------- homebrew (números da curadoria + textos do original) ----------
const hb = read('data/curation/homebrew.json');
const avatarRaw = extracted('avatar.json');
const weaponRaw = extracted('weapon.json');
const homebrew = HomebrewRules.parse({
  schemaVersion: SCHEMA_VERSION,
  mana: hb.mana,
  ceifadora: {
    ...hb.ceifadora,
    cartao: {
      nome: weaponRaw.nome,
      sub: weaponRaw.sub,
      estrelas: [...weaponRaw.estrelas].length,
      selo: weaponRaw.selo,
      imagem: hb.ceifadora.imagem,
      meta: weaponRaw.meta,
      titulo: weaponRaw.habilidade.titulo,
      paragrafos: weaponRaw.habilidade.paragrafos,
    },
  },
  avatar: {
    custo: hb.avatar.custo,
    recarga: hb.avatar.recarga,
    duracaoRodadas: hb.avatar.duracaoRodadas,
    aspectos: avatarRaw.aspectos.map((a: any, i: number) => {
      const [nome, titulo] = a.nome.split(/,\s*/);
      return {
        d4: i + 1,
        id: hb.avatar.ids[i],
        nome,
        titulo: titulo ?? '',
        citacao: a.citacao.replace(/^"|"$/g, ''),
        visual: a.visual.replace(/^\*\*Visual:\*\*\s*/, ''),
        efeitos: a.efeitos,
      };
    }),
  },
  treinamento: hb.treinamento,
});

// ---------- lore ----------
const loreRaw = extracted('lore.json');
const profile = extracted('profile.json');
const lore = Lore.parse({
  schemaVersion: SCHEMA_VERSION,
  paginas: [
    {
      id: 'retrato', eyebrow: profile.eyebrow, titulo: profile.nome, sub: profile.titulo,
      blocos: [
        { tipo: 'paragrafo', md: profile.resumo },
        { tipo: 'titulo', md: profile.alinhamento.titulo },
        { tipo: 'paragrafo', md: profile.alinhamento.texto },
      ],
    },
    { id: 'historia', ...loreRaw.historia },
    { id: 'personalidade', ...loreRaw.personalidade },
    { id: 'apendice', ...loreRaw.apendice },
    {
      id: 'reliquia', eyebrow: 'Relíquia', titulo: weaponRaw.nome, sub: weaponRaw.sub,
      blocos: weaponRaw.habilidade.paragrafos.map((md: string) => ({ tipo: 'paragrafo', md })),
    },
    {
      id: 'avatar', eyebrow: avatarRaw.eyebrow, titulo: avatarRaw.titulo, sub: avatarRaw.sub,
      blocos: [{ tipo: 'paragrafo', md: avatarRaw.introTabela }],
    },
  ],
  diario: extracted('diario.json'),
});

// ---------- estratégias ----------
const strat = read('data/curation/playbooks.json');
const strategies = Strategies.parse({
  schemaVersion: SCHEMA_VERSION,
  playbooks: strat.playbooks,
  // Links para magias que saíram viram texto simples.
  textoOriginal: JSON.parse(JSON.stringify(extracted('strategies.json').blocos)
    .replace(/\[([^\][")]+)\]\(#\/magia\/([a-z0-9-]+)\)/g, (m: string, nome: string, id: string) => (idsRemovidos.has(id) ? nome : m))),
});

// ---------- valida arquivos escritos à mão ----------
const character = Character.parse(read('data/character.json'));
ClassProgression.parse(read('data/class-progression.json'));
Conditions.parse(read('data/conditions-2024.json'));

// Referências cruzadas: tudo que aponta para um id precisa existir.
const ids = new Set<string>([
  ...spells.map((s: Spell) => s.id),
  ...features.map((f: Feature) => f.id),
  ...character.armas.map((a) => a.id),
  'inspiracao',
]);
const broken: string[] = [];
for (const s of spells) for (const r of s.relacionadas) if (!ids.has(r)) broken.push(`${s.id} -> ${r}`);
for (const f of features) for (const r of f.relacionadas) if (!ids.has(r)) broken.push(`${f.id} -> ${r}`);
for (const id of homebrew.ceifadora.magias) if (!ids.has(id)) broken.push(`ceifadora -> ${id}`);
for (const p of strategies.playbooks)
  for (const t of [p.preCombate, ...p.turnos]) for (const m of t?.magias ?? []) if (!ids.has(m.id)) broken.push(`${p.id} -> ${m.id}`);
for (const id of character.aprovacoes2024) if (!ids.has(id)) broken.push(`aprovacoes2024 -> ${id}`);
for (const id of character.recusadas2024) if (!ids.has(id)) broken.push(`recusadas2024 -> ${id}`);
for (const id of character.aprovacoes2024) if (character.recusadas2024.includes(id)) broken.push(`${id} está aprovada e recusada ao mesmo tempo`);
const semPatch = character.aprovacoes2024.filter((id) =>
  !spells.some((s: Spell) => s.id === id && s.v2024) && !features.some((f: Feature) => f.id === id && (f.v2024 || f.somenteSeAprovado)));
if (semPatch.length) broken.push(`aprovadas sem versão 2024 para aplicar: ${semPatch.join(', ')}`);
if (broken.length) throw new Error(`Referências quebradas:\n  ${broken.join('\n  ')}`);

write('spells.json', { schemaVersion: SCHEMA_VERSION, magias: spells });
write('features.json', { schemaVersion: SCHEMA_VERSION, habilidades: features });
write('homebrew-rules.json', homebrew);
write('lore.json', lore);
write('strategies.json', strategies);

const count = <T,>(xs: T[], k: (x: T) => string) =>
  Object.entries(xs.reduce<Record<string, number>>((a, x) => ((a[k(x)] = (a[k(x)] ?? 0) + 1), a), {}))
    .map(([a, b]) => `${a}: ${b}`).join(', ');
console.log(`Magias: ${spells.length} (${count(spells, (s: Spell) => s.status2024)})`);
console.log(`Habilidades: ${features.length}; Avatar: ${homebrew.avatar.aspectos.length} aspectos; Playbooks: ${strategies.playbooks.length}`);
console.log(`Lore: ${lore.paginas.length} páginas. Tudo validado com Zod.`);
