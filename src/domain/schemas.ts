/**
 * Formato de todos os dados de regra. Zod valida os JSON em data/ (no build e
 * no import de backup) e gera os tipos TypeScript com z.infer.
 */
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

export const Atributo = z.enum(['for', 'des', 'con', 'int', 'sab', 'car']);
export type Atributo = z.infer<typeof Atributo>;

export const TipoDano = z.enum([
  'acido', 'contundente', 'cortante', 'eletrico', 'fogo', 'forca', 'gelido',
  'necrotico', 'perfurante', 'psiquico', 'radiante', 'trovejante', 'veneno',
  'escolha', // "necrótico, radiante ou gélido, à sua escolha"
]);
export type TipoDano = z.infer<typeof TipoDano>;

export const Status2024 = z.enum(['ok', 'mudou', 'legado', 'homebrew']);
export type Status2024 = z.infer<typeof Status2024>;

/** Tempo que ocupa no turno. Decide em qual bloco do HUD a opção aparece. */
export const Tempo = z.object({
  tipo: z.enum(['acao', 'acaoBonus', 'reacao', 'livre', 'longo']),
  texto: z.string(),
});

export const Distancia = z.object({
  tipo: z.enum(['pessoal', 'toque', 'distancia', 'especial']),
  metros: z.number().optional(),
  pes: z.number().optional(),
  texto: z.string(),
});

/** Dados que crescem com o nível do personagem (truques) ou com o ciclo usado. */
const Escala = z.object({
  porNivel: z.record(z.string(), z.string()).optional(), // {"5": "2d8", "11": "3d8"}
  porCiclo: z.string().optional(), // "1d10" a mais por ciclo acima do base
  porCicloACada: z.number().int().positive().optional(), // Spirit Shroud: a cada 2 ciclos
});

export const Dano = Escala.extend({
  rotulo: z.string().optional(),
  dados: z.string(),
  tipo: TipoDano,
  tipoAlternativo: TipoDano.optional(), // Soar os Mortos no 11º (ficha): psíquico e necrótico
  somaMod: Atributo.optional(),
  condicao: z.string().optional(),
});
export type Dano = z.infer<typeof Dano>;

export const Cura = Escala.extend({
  dados: z.string(),
  somaMod: Atributo.optional(),
  bonus: z.number().optional(),
  bonusPorCiclo: z.number().optional(), // Vitalidade Falsa: +5 por ciclo
  pvTemporario: z.boolean().default(false),
});
export type Cura = z.infer<typeof Cura>;

export const Resolucao = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('ataque'), alcance: z.enum(['corpo', 'distancia']) }),
  z.object({ tipo: z.literal('salvaguarda'), atributo: Atributo, metadeNoSucesso: z.boolean().default(false) }),
  z.object({ tipo: z.literal('automatico') }),
]);
export type Resolucao = z.infer<typeof Resolucao>;

export const Tag = z.enum(['dano', 'cura', 'controle', 'buff', 'defesa', 'utilidade', 'invocacao', 'mortos-vivos']);

export const OrigemPreparo = z.enum(['classe', 'dominio', 'ceifadora', 'iniciado', 'grimorio']);

/** Campos mecânicos que uma revisão 2024 pode substituir. */
const SpellMecanica = z.object({
  tempo: Tempo,
  alcance: Distancia,
  area: z.string().optional(),
  alvo: z.string().optional(),
  componentes: z.object({ v: z.boolean(), s: z.boolean(), m: z.boolean() }),
  material: z.string().optional(),
  duracao: z.object({ texto: z.string(), rodadas: z.number().int().nullable() }),
  concentracao: z.boolean(),
  ritual: z.boolean().default(false),
  resolucao: Resolucao.optional(),
  dano: z.array(Dano).default([]),
  cura: Cura.optional(),
  alvosPorCiclo: z.number().int().optional(),
  condicoes: z.array(z.string()).default([]),
  escola: z.string(),
  resumo: z.string(), // 1 linha para o cartão
});

export const Spell = SpellMecanica.extend({
  id: z.string(),
  nome: z.string(),
  nomeOriginal: z.string().optional(),
  nomeFicha: z.string(), // como estava no HTML original
  ciclo: z.number().int().min(0).max(9),
  tags: z.array(Tag).default([]),
  fonte: z.string(),
  listaClerigo: z.boolean(),
  status2024: Status2024,
  itemValidacao: z.string().optional(), // "M8" no VALIDACAO-2024.md
  origens: z.array(OrigemPreparo).min(1),
  perdida: z.boolean().default(false),
  cicloNota: z.string().optional(),
  descricaoCompleta: z.string().nullable(), // markdown fiel ao original
  notasPessoais: z.string().optional(),
  relacionadas: z.array(z.string()).default([]),
  /** Versão 2024. Só entra em vigor se o id estiver em character.aprovacoes2024. */
  v2024: SpellMecanica.partial().extend({ texto: z.string() }).optional(),
});
export type Spell = z.infer<typeof Spell>;

export const Recarga = z.enum(['curto', 'longo', 'amanhecer', 'nenhuma']);

export const Feature = z.object({
  id: z.string(),
  nome: z.string(),
  nomeOriginal: z.string().optional(),
  origem: z.string(), // "Clérigo 2024 nv 5", "Domínio da Morte (DMG 2014)"
  status2024: Status2024,
  itemValidacao: z.string().optional(),
  nivel: z.number().int().optional(),
  gatilho: z.enum(['acao', 'acaoBonus', 'reacao', 'passiva', 'aoAcertar', 'livre']),
  recurso: z.string().optional(), // id de recurso gasto, ex. "canalizar"
  usos: z.object({ max: z.union([z.number(), z.string()]), recarga: Recarga, recuperaNoCurto: z.number().optional() }).optional(),
  resumo: z.string(),
  texto: z.string(),
  relacionadas: z.array(z.string()).default([]),
  /** Habilidade que não estava na ficha: só aparece depois de aprovada. */
  somenteSeAprovado: z.boolean().default(false),
  v2024: z.object({
    texto: z.string(),
    resumo: z.string().optional(),
    usos: z.object({ max: z.union([z.number(), z.string()]), recarga: Recarga, recuperaNoCurto: z.number().optional() }).optional(),
  }).optional(),
});
export type Feature = z.infer<typeof Feature>;

const Valor = z.object({ valor: z.number(), valorOriginal: z.string().optional(), nota: z.string().optional() });

export const Character = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  nome: z.string(),
  titulo: z.string(),
  epiteto: z.string(),
  nivel: z.number().int().min(1).max(20),
  classe: z.string(),
  subclasse: z.string(),
  raca: z.string(),
  antecedente: z.string(),
  idade: z.string(),
  altura: z.string(),
  alinhamento: z.string(),
  retrato: z.string(),
  galeria: z.array(z.string()),
  atributos: z.record(Atributo, z.number()),
  salvaguardasProficientes: z.array(Atributo),
  pericias: z.array(z.object({
    nome: z.string(),
    atributo: Atributo,
    proficiente: z.boolean(),
    especialista: z.boolean().default(false),
    bonusExtra: z.number().default(0),
    valorOriginal: z.string().optional(),
  })),
  ca: Valor,
  pvMax: Valor,
  iniciativa: Valor,
  deslocamentoMetros: Valor,
  dadoDeVida: z.string(),
  proficiencias: z.object({ armas: z.string(), armaduras: z.string(), ferramentas: z.string(), idiomas: z.string() }),
  armas: z.array(z.object({
    id: z.string(), nome: z.string(), atributo: Atributo, dano: z.string(), tipo: TipoDano,
    alcanceMetros: z.number(), propriedades: z.string().optional(),
  })),
  talentos: z.array(z.string()),
  opcoes: z.object({ golpesAbencoados: z.enum(['golpeDivino', 'conjuradorPotente']), ordemDivina: z.enum(['protetor', 'taumaturgo']) }),
  inventarioInicial: z.array(z.object({ nome: z.string(), qtd: z.number(), nota: z.string().optional() })),
  ouroInicial: z.number(),
  aprovacoes2024: z.array(z.string()), // ids de magias/features com v2024 aprovado
  preparadas: z.array(z.string()).nullable(), // null = ainda não escolhidas (todas valem)
});
export type Character = z.infer<typeof Character>;

export const ClassLevel = z.object({
  nivel: z.number().int(),
  proficiencia: z.number().int(),
  features: z.array(z.string()),
  canalizar: z.number().int(),
  truques: z.number().int(),
  preparadas: z.number().int(),
  espacos: z.array(z.number().int()).length(9),
  subclasse: z.array(z.string()).default([]),
  asi: z.boolean().default(false),
});
export const ClassProgression = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  classe: z.string(),
  fonte: z.string(),
  dadoDeVida: z.number().int(),
  pvMedio: z.number().int(),
  niveis: z.array(ClassLevel).length(20),
  magiasDeDominio: z.record(z.string(), z.array(z.string())), // nível de clérigo -> ids ou nomes
});
export type ClassProgression = z.infer<typeof ClassProgression>;

export const HomebrewRules = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  mana: z.object({
    fonte: z.string(),
    custoPorCiclo: z.array(z.number().int()).length(9),
    maximoPorNivel: z.array(z.number().int()).length(20),
    cicloMaximoPorNivel: z.array(z.number().int()).length(20),
    limitePorDescansoAPartirDoCiclo: z.number().int(),
  }),
  ceifadora: z.object({
    magias: z.array(z.string()),
    fatorCusto: z.number(),
    arredondamento: z.enum(['baixo', 'cima']),
    ressurreicaoHoras: z.string(),
    perdaSintoniaMinutos: z.number().int(),
  }),
  avatar: z.object({
    custo: z.string(),
    recarga: Recarga,
    duracaoRodadas: z.number().int(),
    aspectos: z.array(z.object({
      d4: z.number().int(), id: z.string(), nome: z.string(), titulo: z.string(),
      citacao: z.string(), visual: z.string(), efeitos: z.array(z.string()),
    })).length(4),
  }),
  treinamento: z.array(z.object({ nome: z.string(), atual: z.number().int(), total: z.number().int() })),
});
export type HomebrewRules = z.infer<typeof HomebrewRules>;

export const Condition = z.object({ id: z.string(), nome: z.string(), nomeOriginal: z.string(), efeitos: z.array(z.string()) });
export const Conditions = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), fonte: z.string(), condicoes: z.array(Condition) });
export type Condition = z.infer<typeof Condition>;

export const LoreBlock = z.object({ tipo: z.enum(['paragrafo', 'citacao', 'titulo', 'subtitulo', 'separador', 'caixa']), md: z.string() });
export const LorePage = z.object({ id: z.string(), eyebrow: z.string(), titulo: z.string(), sub: z.string(), blocos: z.array(LoreBlock) });
export const Lore = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), paginas: z.array(LorePage), diario: z.any() });
export type Lore = z.infer<typeof Lore>;

export const PassoTurno = z.object({
  acao: z.string().optional(), bonus: z.string().optional(), reacao: z.string().optional(), movimento: z.string().optional(),
  magias: z.array(z.object({ id: z.string(), ciclo: z.number().int() })).default([]),
});
export const Playbook = z.object({
  id: z.string(),
  nome: z.string(),
  resumo: z.string(),
  quandoUsar: z.array(z.string()),
  quandoNaoUsar: z.array(z.string()),
  preCombate: PassoTurno.optional(),
  turnos: z.array(PassoTurno.extend({ rotulo: z.string() })),
  conflitosConcentracao: z.array(z.string()).default([]),
  dependeDeHomebrew: z.array(z.string()).default([]),
  original: z.boolean().default(false),
});
export const Strategies = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), playbooks: z.array(Playbook), textoOriginal: z.array(LoreBlock) });
export type Playbook = z.infer<typeof Playbook>;
