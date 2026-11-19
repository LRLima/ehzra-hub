/**
 * Cálculos de regra. Funções puras: recebem os dados (Regras) e o nível atual,
 * nunca leem estado global. É aqui que "ficha" vira número.
 */
import type {
  Atributo, Character, ClassProgression, Condition, Cura, Dano, Feature, HomebrewRules, Playbook, Spell,
} from './schemas';

export interface Regras {
  character: Character;
  progressao: ClassProgression;
  homebrew: HomebrewRules;
  magias: Spell[];
  /** Todas as magias do grimório, inclusive as indisponíveis no nível (para abrir links e playbooks antigos). */
  grimorio?: Spell[];
  habilidades: Feature[];
  condicoes: Condition[];
  playbooks: Playbook[];
}

/** O que muda com o jogo e afeta as contas. Vem do GameState. */
export interface Contexto {
  nivel: number;
  bonusAtributos: Partial<Record<Atributo, number>>;
}

export const NOMES_ATRIBUTO: Record<Atributo, string> = {
  for: 'Força', des: 'Destreza', con: 'Constituição', int: 'Inteligência', sab: 'Sabedoria', car: 'Carisma',
};

export const mod = (valor: number) => Math.floor((valor - 10) / 2);
export const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

export function atributo(r: Regras, c: Contexto, a: Atributo) {
  return Math.min(20, r.character.atributos[a] + (c.bonusAtributos[a] ?? 0));
}
export const modAtr = (r: Regras, c: Contexto, a: Atributo) => mod(atributo(r, c, a));

export function linhaNivel(r: Regras, nivel: number) {
  const l = r.progressao.niveis[nivel - 1];
  if (!l) throw new Error(`Nível ${nivel} fora da tabela`);
  return l;
}
export const proficiencia = (r: Regras, c: Contexto) => linhaNivel(r, c.nivel).proficiencia;
export const cdMagia = (r: Regras, c: Contexto) => 8 + proficiencia(r, c) + modAtr(r, c, 'sab');
export const ataqueMagia = (r: Regras, c: Contexto) => proficiencia(r, c) + modAtr(r, c, 'sab');

export function salvaguarda(r: Regras, c: Contexto, a: Atributo) {
  const prof = r.character.salvaguardasProficientes.includes(a) ? proficiencia(r, c) : 0;
  return modAtr(r, c, a) + prof;
}

export function pericia(r: Regras, c: Contexto, nome: string) {
  const p = r.character.pericias.find((x) => x.nome === nome);
  if (!p) throw new Error(`Perícia desconhecida: ${nome}`);
  const pb = proficiencia(r, c);
  const prof = p.especialista ? pb * 2 : p.proficiente ? pb : 0;
  return modAtr(r, c, p.atributo) + prof + p.bonusExtra;
}

export const percepcaoPassiva = (r: Regras, c: Contexto) => 10 + pericia(r, c, 'Percepção');

// ---------- aprovações 2024 ----------

/** A magia como vale na mesa: texto da ficha, ou versão 2024 se aprovada. */
export function magiaEfetiva(r: Regras, s: Spell): Spell {
  if (!s.v2024 || !r.character.aprovacoes2024.includes(s.id)) return s;
  const { texto: _texto, ...patch } = s.v2024;
  return { ...s, ...patch };
}
export function habilidadeEfetiva(r: Regras, f: Feature): Feature {
  if (!f.v2024 || !r.character.aprovacoes2024.includes(f.id)) return f;
  return { ...f, texto: f.v2024.texto, resumo: f.v2024.resumo ?? f.resumo, usos: f.v2024.usos ?? f.usos };
}
export const habilidadeVisivel = (r: Regras, f: Feature) =>
  !f.somenteSeAprovado || r.character.aprovacoes2024.includes(f.id);

/**
 * As regras como valem num nível: habilidades fora da faixa de nível somem, e
 * magias de domínio fora da faixa viram magia comum da lista (ou somem, se não
 * estiverem na lista de clérigo). É assim que a troca de domínio acontece.
 */
export function regrasNoNivel(r: Regras, nivel: number): Regras {
  const magias = r.magias.flatMap((s) => {
    const foraDoDominio = (s.dominioDesde !== undefined && nivel < s.dominioDesde) || (s.dominioAte !== undefined && nivel > s.dominioAte);
    if (!foraDoDominio || !s.origens.includes('dominio')) return [s];
    const origens = s.origens.filter((o) => o !== 'dominio');
    if (s.listaClerigo && origens.length === 0) origens.push('classe');
    return origens.length ? [{ ...s, origens }] : [];
  });
  const habilidades = r.habilidades.filter((f) => (f.nivelMin ?? 1) <= nivel && nivel <= (f.nivelMax ?? 20));
  return { ...r, magias, grimorio: r.grimorio ?? r.magias, habilidades };
}

/** Nome do domínio no nível: o último declarado na progressão até ali. */
export function dominioNoNivel(r: Regras, nivel: number): string | null {
  for (let n = nivel; n >= 1; n--) { const d = r.progressao.niveis[n - 1]?.dominio; if (d) return d; }
  return null;
}

export const magia = (r: Regras, id: string) => {
  const s = r.magias.find((m) => m.id === id) ?? r.grimorio?.find((m) => m.id === id);
  if (!s) throw new Error(`Magia desconhecida: ${id}`);
  return magiaEfetiva(r, s);
};

// ---------- dados ----------

interface Parcela { n: number; faces: number }
function parseDados(expr: string): { dados: Parcela[]; fixo: number } {
  const out: Parcela[] = [];
  let fixo = 0;
  for (const part of expr.replace(/\s/g, '').split('+')) {
    const m = part.match(/^(\d+)d(\d+)$/);
    if (m) out.push({ n: Number(m[1]), faces: Number(m[2]) });
    else if (/^\d+$/.test(part)) fixo += Number(part);
    else throw new Error(`Expressão de dados inválida: ${expr}`);
  }
  return { dados: out, fixo };
}

/** Soma parcelas do mesmo dado: 3d10 + 2d10 = 5d10. */
function juntar(parcelas: Parcela[]): Parcela[] {
  const m = new Map<number, number>();
  for (const p of parcelas) m.set(p.faces, (m.get(p.faces) ?? 0) + p.n);
  return [...m.entries()].filter(([, n]) => n > 0).map(([faces, n]) => ({ n, faces }));
}

export interface Rolagem {
  rotulo?: string;
  expr: string; // "2d8 + 5"
  media: number;
  tipo?: string;
  condicao?: string;
}

function rolagem(dados: Parcela[], fixo: number, extra?: Omit<Rolagem, 'expr' | 'media'>): Rolagem | null {
  const ds = juntar(dados);
  if (!ds.length && fixo === 0) return null;
  const partes = ds.map((d) => `${d.n}d${d.faces}`);
  if (fixo) partes.push(String(fixo));
  const media = ds.reduce((a, d) => a + (d.n * (d.faces + 1)) / 2, 0) + fixo;
  return { ...extra, expr: partes.join(' + '), media: Math.floor(media) };
}

/** Dados base da parcela, já escalonados por nível do personagem e por ciclo. */
function escalonar(
  base: { dados: string; porNivel?: Record<string, string>; porCiclo?: string; porCicloACada?: number },
  nivel: number,
  ciclo: number,
  cicloBase: number,
) {
  let expr = base.dados;
  if (base.porNivel) {
    const passos = Object.keys(base.porNivel).map(Number).sort((a, b) => a - b);
    for (const p of passos) if (nivel >= p) expr = base.porNivel[String(p)];
  }
  const { dados, fixo } = parseDados(expr);
  if (base.porCiclo && ciclo > cicloBase) {
    const vezes = Math.floor((ciclo - cicloBase) / (base.porCicloACada ?? 1));
    const extra = parseDados(base.porCiclo).dados[0];
    if (vezes > 0) dados.push({ n: extra.n * vezes, faces: extra.faces });
  }
  return { dados, fixo };
}

export const NOMES_DANO: Record<string, string> = {
  acido: 'ácido', contundente: 'contundente', cortante: 'cortante', eletrico: 'elétrico', fogo: 'fogo',
  forca: 'força', gelido: 'gélido', necrotico: 'necrótico', perfurante: 'perfurante', psiquico: 'psíquico',
  radiante: 'radiante', trovejante: 'trovejante', veneno: 'veneno', escolha: 'à escolha',
};

/** Dano da magia no nível e ciclo informados, com Conjurador Potente se couber. */
export function danoMagia(r: Regras, c: Contexto, s: Spell, ciclo = s.ciclo): Rolagem[] {
  const potente =
    s.ciclo === 0 && s.listaClerigo && r.character.opcoes.golpesAbencoados === 'conjuradorPotente';
  return s.dano
    .map((d: Dano) => {
      const { dados, fixo } = escalonar(d, c.nivel, ciclo, s.ciclo);
      const somaMod = d.somaMod ? modAtr(r, c, d.somaMod) : 0;
      const bonusPotente = potente && dados.some((x) => x.n > 0) ? modAtr(r, c, 'sab') : 0;
      return rolagem(dados, fixo + somaMod + bonusPotente, {
        rotulo: d.rotulo, tipo: NOMES_DANO[d.tipo], condicao: d.condicao,
      });
    })
    .filter((x): x is Rolagem => x !== null);
}

export function curaMagia(r: Regras, c: Contexto, s: Spell, ciclo = s.ciclo): (Rolagem & { pvTemporario: boolean }) | null {
  if (!s.cura) return null;
  const cura: Cura = s.cura;
  const { dados, fixo } = escalonar(cura, c.nivel, ciclo, s.ciclo);
  const bonus = (cura.bonus ?? 0) + (cura.bonusPorCiclo ?? 0) * Math.max(0, ciclo - s.ciclo);
  const somaMod = cura.somaMod ? modAtr(r, c, cura.somaMod) : 0;
  const rol = rolagem(dados, fixo + bonus + somaMod);
  return rol && { ...rol, pvTemporario: cura.pvTemporario };
}

export function alvosMagia(s: Spell, ciclo: number) {
  return s.alvosPorCiclo ? 1 + s.alvosPorCiclo * Math.max(0, ciclo - s.ciclo) : null;
}

/** "Salvaguarda de SAB, CD 16" ou "Ataque +8". */
export function resolucaoTexto(r: Regras, c: Contexto, s: Spell) {
  const res = s.resolucao;
  if (!res) return null;
  if (res.tipo === 'ataque') return `Ataque ${fmtMod(ataqueMagia(r, c))}`;
  if (res.tipo === 'salvaguarda') return `${res.atributo.toUpperCase()} CD ${cdMagia(r, c)}`;
  return null;
}

// ---------- mana ----------

export const manaMaxima = (r: Regras, nivel: number) => r.homebrew.mana.maximoPorNivel[nivel - 1];
export const cicloMaximo = (r: Regras, nivel: number) => r.homebrew.mana.cicloMaximoPorNivel[nivel - 1];

export const usaCeifadora = (r: Regras, s: Spell) => r.homebrew.ceifadora.magias.includes(s.id);

export function custoMana(r: Regras, s: Spell, ciclo = s.ciclo, viaCeifadora = usaCeifadora(r, s)) {
  if (ciclo === 0) return 0;
  const cheio = r.homebrew.mana.custoPorCiclo[ciclo - 1];
  if (!viaCeifadora) return cheio;
  const metade = cheio * r.homebrew.ceifadora.fatorCusto;
  return r.homebrew.ceifadora.arredondamento === 'baixo' ? Math.floor(metade) : Math.ceil(metade);
}

export interface PodeConjurar {
  ok: boolean;
  motivo?: string;
}
export function podeConjurar(
  r: Regras,
  estado: { nivel: number; mana: number; ciclosAltosUsados: number[] },
  s: Spell,
  ciclo: number,
): PodeConjurar {
  if (s.perdida) return { ok: false, motivo: 'Magia sem texto no grimório' };
  if (ciclo < s.ciclo) return { ok: false, motivo: `Ciclo mínimo é ${s.ciclo}º` };
  if (ciclo > cicloMaximo(r, estado.nivel)) return { ok: false, motivo: `Nível ${estado.nivel} só conjura até o ${cicloMaximo(r, estado.nivel)}º ciclo` };
  if (ciclo >= r.homebrew.mana.limitePorDescansoAPartirDoCiclo && estado.ciclosAltosUsados.includes(ciclo))
    return { ok: false, motivo: `O ${ciclo}º ciclo já foi usado desde o último descanso longo` };
  const custo = custoMana(r, s, ciclo);
  if (custo > estado.mana) return { ok: false, motivo: `Precisa de ${custo} de mana, você tem ${estado.mana}` };
  return { ok: true };
}

// ---------- recursos e habilidades ----------

export function maxUsos(r: Regras, c: Contexto, f: Feature): number | null {
  const usos = habilidadeEfetiva(r, f).usos;
  if (!usos) return null;
  if (typeof usos.max === 'number') return usos.max;
  if (usos.max === 'canalizar') return linhaNivel(r, c.nivel).canalizar;
  if (usos.max === 'sab') return Math.max(1, modAtr(r, c, 'sab'));
  if (usos.max === 'prof') return proficiencia(r, c);
  throw new Error(`Fórmula de usos desconhecida: ${usos.max}`);
}

/** Recursos com contador (id do recurso -> habilidade que define o máximo). */
export function recursos(r: Regras, c: Contexto) {
  return r.habilidades
    .filter((f) => f.usos && habilidadeVisivel(r, f))
    .map((f) => ({ id: f.recurso ?? f.id, habilidade: habilidadeEfetiva(r, f), max: maxUsos(r, c, f)! }));
}

export const toqueDaMorte = (c: Contexto) => 5 + 2 * c.nivel;
export const dadosQueimarMortos = (r: Regras, c: Contexto) => Math.max(1, modAtr(r, c, 'sab'));

/** CD do teste de concentração ao sofrer dano (2024: máx. 30). */
export const cdConcentracao = (dano: number) => Math.min(30, Math.max(10, Math.floor(dano / 2)));

export const temConjuradorDeGuerra = (r: Regras) => r.character.talentos.includes('Conjurador de Guerra');

/** Magias preparadas contam contra o limite da classe; domínio e Ceifadora não. */
export function contagemPreparadas(r: Regras, c: Contexto, preparadas: string[] | null) {
  const contaNoLimite = (s: Spell) => s.ciclo > 0 && !s.origens.some((o) => o === 'dominio' || o === 'ceifadora' || o === 'grimorio');
  const lista = r.magias.filter(contaNoLimite).filter((s) => preparadas === null || preparadas.includes(s.id));
  return { usadas: lista.length, limite: linhaNivel(r, c.nivel).preparadas };
}

export function estaPreparada(s: Spell, preparadas: string[] | null) {
  if (s.origens.includes('grimorio')) return preparadas?.includes(s.id) ?? false;
  if (s.ciclo === 0 || s.origens.some((o) => o === 'dominio' || o === 'ceifadora')) return true;
  return preparadas === null || preparadas.includes(s.id);
}

export const metrosParaPes = (m: number) => Math.round((m / 1.5) * 5);
