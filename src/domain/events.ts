/**
 * Eventos de jogo. O estado nunca é editado direto: cada ação vira um evento,
 * e o estado é reduce(eventos). Isso dá desfazer, log e sync de graça.
 */
import { z } from 'zod';
import { Atributo, SCHEMA_VERSION } from './schemas';

const id = z.string().min(1);

export const MortoVivo = z.object({
  id,
  nome: z.string(),
  tipo: z.enum(['esqueleto', 'zumbi', 'outro']),
  pv: z.number().int(),
  pvMax: z.number().int(),
  ca: z.number().int(),
  fio: z.boolean().default(false),
  campeao: z.boolean().default(false),
  ordem: z.string().default(''),
});
export type MortoVivo = z.infer<typeof MortoVivo>;

export const Item = z.object({ id, nome: z.string(), qtd: z.number().int(), nota: z.string().optional() });
export type Item = z.infer<typeof Item>;

export const Evento = z.discriminatedUnion('t', [
  z.object({ t: z.literal('dano'), valor: z.number().int().positive() }),
  z.object({ t: z.literal('cura'), valor: z.number().int().positive() }),
  z.object({ t: z.literal('pvTemp'), valor: z.number().int().min(0) }),
  z.object({
    t: z.literal('conjurar'),
    magia: id,
    ciclo: z.number().int().min(0).max(9),
    custo: z.number().int().min(0), // gravado no evento: o histórico não muda se a regra mudar
    viaCeifadora: z.boolean(),
    concentracao: z.boolean(),
    rodadas: z.number().int().nullable(),
    tempo: z.enum(['acao', 'acaoBonus', 'reacao', 'livre', 'longo']),
  }),
  z.object({ t: z.literal('quebrarConcentracao') }),
  z.object({ t: z.literal('efeitoAdd'), efeito: z.object({ id, nome: z.string(), rodadas: z.number().int().nullable() }) }),
  z.object({ t: z.literal('efeitoRemover'), efeito: id }),
  z.object({ t: z.literal('iniciarCombate') }),
  z.object({ t: z.literal('encerrarCombate') }),
  z.object({ t: z.literal('proximaRodada') }),
  z.object({ t: z.literal('usarTurno'), parte: z.enum(['acao', 'acaoBonus', 'reacao', 'movimento']) }),
  z.object({ t: z.literal('usarRecurso'), recurso: id, qtd: z.number().int() }), // qtd negativa devolve
  z.object({ t: z.literal('inspiracao'), delta: z.number().int() }),
  z.object({ t: z.literal('mana'), delta: z.number().int() }), // ajuste manual / poção
  z.object({ t: z.literal('descanso'), tipo: z.enum(['curto', 'longo']), pvDadosDeVida: z.number().int().min(0).default(0) }),
  z.object({ t: z.literal('condicao'), condicao: id, ativa: z.boolean() }),
  z.object({ t: z.literal('exaustao'), delta: z.number().int() }),
  z.object({ t: z.literal('avatar'), d4: z.number().int().min(1).max(4) }),
  z.object({ t: z.literal('tocarFoice') }),
  z.object({ t: z.literal('mortoVivoAdd'), mv: MortoVivo }),
  z.object({ t: z.literal('mortoVivoAtualizar'), id, pv: z.number().int().optional(), fio: z.boolean().optional(), campeao: z.boolean().optional(), ordem: z.string().optional(), ca: z.number().int().optional() }),
  z.object({ t: z.literal('mortoVivoRemover'), id }),
  z.object({ t: z.literal('inventarioAdd'), item: Item }),
  z.object({ t: z.literal('inventarioQtd'), id, delta: z.number().int() }),
  z.object({ t: z.literal('inventarioRemover'), id }),
  z.object({ t: z.literal('ouro'), delta: z.number() }),
  z.object({ t: z.literal('novaSessao'), sessao: id, nome: z.string() }),
  z.object({ t: z.literal('nota'), sessao: id, texto: z.string() }),
  z.object({ t: z.literal('preparar'), magia: id, preparada: z.boolean() }),
  z.object({ t: z.literal('definirPreparadas'), magias: z.array(id), origem: z.string().optional() }),
  z.object({
    t: z.literal('subirNivel'),
    para: z.number().int().min(2).max(20),
    pvGanho: z.number().int().min(1),
    atributos: z.partialRecord(Atributo, z.number().int()).default({}),
    talento: z.string().optional(),
    magias: z.array(id).default([]),
    /** Troca a lista de preparadas junto com a subida (desfazer a subida desfaz a troca). */
    preparadas: z.array(id).optional(),
  }),
  z.object({ t: z.literal('desfazer'), alvo: id }),
]);
export type Evento = z.infer<typeof Evento>;
export type TipoEvento = Evento['t'];

/** Envelope gravado no IndexedDB e enviado ao servidor. */
export const Envelope = z.object({
  id,
  em: z.number().int(), // Date.now() do aparelho
  aparelho: z.string(),
  v: z.literal(SCHEMA_VERSION),
  e: Evento,
});
export type Envelope = z.infer<typeof Envelope>;

/** Ordem total e determinística entre aparelhos: tempo, depois aparelho, depois id. */
export const ordenar = (a: Envelope, b: Envelope) =>
  a.em - b.em || a.aparelho.localeCompare(b.aparelho) || a.id.localeCompare(b.id);
