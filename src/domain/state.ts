/**
 * Estado de jogo = reduce(estadoInicial, eventos). Nada aqui toca em disco ou
 * em React: o mesmo código roda no navegador, nos testes e no servidor.
 */
import type { Envelope, Evento, Item, MortoVivo } from './events';
import { ordenar } from './events';
import type { Atributo } from './schemas';
import {
  type Regras, type Contexto, cdConcentracao, cicloMaximo, habilidadeEfetiva, magia, manaMaxima, recursos,
  temConjuradorDeGuerra,
} from './rules';

export interface Efeito {
  id: string;
  nome: string;
  rodadas: number | null; // null = sem contagem (dura horas)
  concentracao: boolean;
  origem?: string; // id da magia
}

export interface Aviso {
  tipo: 'concentracao' | 'caiu' | 'alaDaMorte' | 'expirou' | 'info';
  texto: string;
}

export interface GameState {
  nivel: number;
  bonusAtributos: Partial<Record<Atributo, number>>;
  talentosExtras: string[];
  pvMaxExtra: number;
  pv: number;
  pvTemp: number;
  mana: number;
  inspiracao: number;
  usos: Record<string, number>; // recurso -> usos gastos
  ciclosAltosUsados: number[];
  concentracao: { magia: string; ciclo: number } | null;
  efeitos: Efeito[];
  condicoes: string[];
  exaustao: number;
  combate: { rodada: number } | null;
  turno: { acao: boolean; acaoBonus: boolean; reacao: boolean; movimento: boolean; cicloGasto: boolean };
  avatar: { aspecto: number; rodadas: number } | null;
  ultimoToqueFoice: number | null;
  mortosVivos: MortoVivo[];
  inventario: Item[];
  ouro: number;
  sessoes: { id: string; nome: string; criadaEm: number }[];
  notas: Record<string, string>;
  preparadas: string[] | null;
  magiasExtras: string[];
  avisos: Aviso[]; // do último evento aplicado (a UI mostra e descarta)
}

const TURNO_LIMPO = { acao: false, acaoBonus: false, reacao: false, movimento: false, cicloGasto: false };

export const contexto = (s: GameState): Contexto => ({ nivel: s.nivel, bonusAtributos: s.bonusAtributos });

export function pvMaximo(r: Regras, s: GameState) {
  return r.character.pvMax.valor + s.pvMaxExtra;
}

export function estadoInicial(r: Regras): GameState {
  const nivel = r.character.nivel;
  return {
    nivel,
    bonusAtributos: {},
    talentosExtras: [],
    pvMaxExtra: 0,
    pv: r.character.pvMax.valor,
    pvTemp: 0,
    mana: manaMaxima(r, nivel),
    inspiracao: 1,
    usos: {},
    ciclosAltosUsados: [],
    concentracao: null,
    efeitos: [],
    condicoes: [],
    exaustao: 0,
    combate: null,
    turno: { ...TURNO_LIMPO },
    avatar: null,
    ultimoToqueFoice: null,
    mortosVivos: [],
    inventario: r.character.inventarioInicial.map((it, i) => ({ id: `item-${i}`, ...it })),
    ouro: r.character.ouroInicial,
    sessoes: [],
    notas: {},
    preparadas: r.character.preparadas,
    magiasExtras: [],
    avisos: [],
  };
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function tirarConcentracao(s: GameState): GameState {
  if (!s.concentracao) return s;
  return { ...s, concentracao: null, efeitos: s.efeitos.filter((e) => !e.concentracao) };
}

function aplicarDano(r: Regras, s: GameState, valor: number): GameState {
  const avisos: Aviso[] = [];
  const absorvido = Math.min(s.pvTemp, valor);
  let pv = s.pv - (valor - absorvido);
  let efeitos = s.efeitos;
  if (pv <= 0 && s.pv > 0) {
    const ala = efeitos.find((e) => e.origem === 'ala-da-morte');
    if (ala) {
      pv = 1;
      efeitos = efeitos.filter((e) => e !== ala);
      avisos.push({ tipo: 'alaDaMorte', texto: 'Ala da Morte segurou você com 1 PV (efeito encerrado).' });
    } else {
      avisos.push({ tipo: 'caiu', texto: 'Você caiu a 0 PV. Salvaguardas contra morte!' });
    }
  }
  if (s.concentracao && valor > 0) {
    const vant = temConjuradorDeGuerra(r) ? ', com vantagem (Conjurador de Guerra)' : '';
    avisos.push({ tipo: 'concentracao', texto: `Teste de CON CD ${cdConcentracao(valor)}${vant} para manter ${magia(r, s.concentracao.magia).nome}.` });
  }
  return { ...s, pvTemp: s.pvTemp - absorvido, pv: Math.max(0, pv), efeitos, avisos };
}

function aplicar(r: Regras, s: GameState, e: Evento): GameState {
  const pvMax = pvMaximo(r, s);
  switch (e.t) {
    case 'dano':
      return aplicarDano(r, s, e.valor);
    case 'cura':
      return { ...s, pv: clamp(s.pv + e.valor, 0, pvMax), condicoes: s.pv === 0 ? s.condicoes.filter((c) => c !== 'inconsciente') : s.condicoes };
    case 'pvTemp': // PV temporário não acumula: fica o maior
      return { ...s, pvTemp: Math.max(s.pvTemp, e.valor) };
    case 'conjurar': {
      const sp = magia(r, e.magia);
      let st = { ...s, mana: s.mana - e.custo };
      const avisos: Aviso[] = [];
      if (e.concentracao) {
        if (st.concentracao) avisos.push({ tipo: 'info', texto: `Concentração em ${magia(r, st.concentracao.magia).nome} encerrada.` });
        st = tirarConcentracao(st);
        st.concentracao = { magia: e.magia, ciclo: e.ciclo };
      }
      if (e.rodadas !== null || e.concentracao) {
        const efeito: Efeito = {
          id: `${e.magia}`,
          nome: e.ciclo > sp.ciclo ? `${sp.nome} (${e.ciclo}º)` : sp.nome,
          rodadas: e.rodadas !== null && e.rodadas <= 100 ? e.rodadas : null,
          concentracao: e.concentracao,
          origem: e.magia,
        };
        st.efeitos = [...st.efeitos.filter((x) => x.id !== efeito.id), efeito];
      }
      if (e.ciclo >= r.homebrew.mana.limitePorDescansoAPartirDoCiclo) st.ciclosAltosUsados = [...st.ciclosAltosUsados, e.ciclo];
      if (st.combate && (e.tempo === 'acao' || e.tempo === 'acaoBonus' || e.tempo === 'reacao')) {
        st.turno = { ...st.turno, [e.tempo]: true, cicloGasto: st.turno.cicloGasto || e.ciclo > 0 };
      }
      return { ...st, avisos };
    }
    case 'quebrarConcentracao':
      return tirarConcentracao(s);
    case 'efeitoAdd':
      return { ...s, efeitos: [...s.efeitos.filter((x) => x.id !== e.efeito.id), { ...e.efeito, concentracao: false }] };
    case 'efeitoRemover': {
      const ef = s.efeitos.find((x) => x.id === e.efeito);
      const semEfeito = { ...s, efeitos: s.efeitos.filter((x) => x.id !== e.efeito) };
      return ef?.concentracao ? { ...semEfeito, concentracao: null } : semEfeito;
    }
    case 'iniciarCombate':
      return { ...s, combate: { rodada: 1 }, turno: { ...TURNO_LIMPO } };
    case 'encerrarCombate':
      return { ...s, combate: null, turno: { ...TURNO_LIMPO } };
    case 'proximaRodada': {
      const efeitos = s.efeitos.map((x) => (x.rodadas === null ? x : { ...x, rodadas: Math.max(0, x.rodadas - 1) }));
      const avisos: Aviso[] = efeitos
        .filter((x, i) => x.rodadas === 0 && s.efeitos[i].rodadas !== 0)
        .map((x) => ({ tipo: 'expirou' as const, texto: `${x.nome} chegou a 0 rodadas. Expirou?` }));
      const avatar = s.avatar && s.avatar.rodadas > 1 ? { ...s.avatar, rodadas: s.avatar.rodadas - 1 } : null;
      if (s.avatar && !avatar) avisos.push({ tipo: 'expirou', texto: 'O Avatar se desfez.' });
      return { ...s, combate: { rodada: (s.combate?.rodada ?? 0) + 1 }, turno: { ...TURNO_LIMPO }, efeitos, avatar, avisos };
    }
    case 'usarTurno':
      return { ...s, turno: { ...s.turno, [e.parte]: !s.turno[e.parte] } };
    case 'usarRecurso':
      return { ...s, usos: { ...s.usos, [e.recurso]: Math.max(0, (s.usos[e.recurso] ?? 0) + e.qtd) } };
    case 'inspiracao':
      return { ...s, inspiracao: clamp(s.inspiracao + e.delta, 0, 1) };
    case 'mana':
      return { ...s, mana: clamp(s.mana + e.delta, 0, manaMaxima(r, s.nivel)) };
    case 'descanso': {
      const c = contexto(s);
      if (e.tipo === 'curto') {
        const usos = { ...s.usos };
        for (const rec of recursos(r, c)) {
          const volta = rec.habilidade.usos?.recarga === 'curto' ? Infinity : rec.habilidade.usos?.recuperaNoCurto ?? 0;
          if (usos[rec.id]) usos[rec.id] = Math.max(0, usos[rec.id] - volta);
        }
        return { ...s, pv: clamp(s.pv + e.pvDadosDeVida, 0, pvMax), usos, avisos: [] };
      }
      // Descanso longo: tudo volta. "Amanhecer" (Avatar) também é tratado aqui.
      return {
        ...tirarConcentracao(s),
        pv: pvMax,
        pvTemp: 0,
        mana: manaMaxima(r, s.nivel),
        usos: {},
        ciclosAltosUsados: [],
        efeitos: s.efeitos.filter((x) => x.rodadas === null && !x.concentracao),
        exaustao: Math.max(0, s.exaustao - 1),
        combate: null,
        turno: { ...TURNO_LIMPO },
        avatar: null,
        avisos: [],
      };
    }
    case 'condicao':
      return { ...s, condicoes: e.ativa ? [...new Set([...s.condicoes, e.condicao])] : s.condicoes.filter((c) => c !== e.condicao) };
    case 'exaustao':
      return { ...s, exaustao: clamp(s.exaustao + e.delta, 0, 6) };
    case 'avatar':
      return {
        ...s,
        inspiracao: Math.max(0, s.inspiracao - 1),
        usos: { ...s.usos, avatar: (s.usos.avatar ?? 0) + 1 },
        avatar: { aspecto: e.d4, rodadas: r.homebrew.avatar.duracaoRodadas },
      };
    case 'tocarFoice':
      return s; // o horário vem do envelope (ver reduzir)
    case 'mortoVivoAdd':
      return { ...s, mortosVivos: [...s.mortosVivos, e.mv] };
    case 'mortoVivoAtualizar':
      return {
        ...s,
        mortosVivos: s.mortosVivos.map((m) => {
          if (m.id !== e.id) return m;
          const { t: _t, id: _id, ...patch } = e;
          const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
          const next = { ...m, ...clean };
          return { ...next, pv: clamp(next.pv, 0, next.campeao ? next.pvMax * 3 : next.pvMax) };
        }),
      };
    case 'mortoVivoRemover':
      return { ...s, mortosVivos: s.mortosVivos.filter((m) => m.id !== e.id) };
    case 'inventarioAdd':
      return { ...s, inventario: [...s.inventario, e.item] };
    case 'inventarioQtd':
      return { ...s, inventario: s.inventario.map((i) => (i.id === e.id ? { ...i, qtd: Math.max(0, i.qtd + e.delta) } : i)) };
    case 'inventarioRemover':
      return { ...s, inventario: s.inventario.filter((i) => i.id !== e.id) };
    case 'ouro':
      return { ...s, ouro: Math.max(0, Math.round((s.ouro + e.delta) * 100) / 100) };
    case 'novaSessao':
      return s; // criadaEm vem do envelope (ver reduzir)
    case 'nota':
      return { ...s, notas: { ...s.notas, [e.sessao]: e.texto } };
    case 'preparar': {
      const base = s.preparadas ?? r.magias.filter((m) => !m.origens.includes('grimorio')).map((m) => m.id);
      const preparadas = e.preparada ? [...new Set([...base, e.magia])] : base.filter((id) => id !== e.magia);
      return { ...s, preparadas };
    }
    case 'definirPreparadas':
      return { ...s, preparadas: [...new Set(e.magias)] };
    case 'subirNivel': {
      const bonusAtributos = { ...s.bonusAtributos };
      for (const [a, v] of Object.entries(e.atributos)) bonusAtributos[a as Atributo] = (bonusAtributos[a as Atributo] ?? 0) + v;
      const mana = manaMaxima(r, e.para);
      return {
        ...s,
        nivel: e.para,
        bonusAtributos,
        talentosExtras: e.talento ? [...s.talentosExtras, e.talento] : s.talentosExtras,
        pvMaxExtra: s.pvMaxExtra + e.pvGanho,
        pv: s.pv + e.pvGanho,
        mana: s.mana + (mana - manaMaxima(r, s.nivel)),
        magiasExtras: [...new Set([...s.magiasExtras, ...e.magias])],
        preparadas: e.preparadas ? [...new Set(e.preparadas)] : s.preparadas,
        avisos: [{ tipo: 'info', texto: `Nível ${e.para}! Agora você conjura até o ${cicloMaximo(r, e.para)}º ciclo.` }],
      };
    }
    case 'desfazer':
      return s; // tratado em reduzir
  }
}

/** Ids de eventos anulados por "desfazer". Desfazer um desfazer refaz. */
export function anulados(eventos: Envelope[]) {
  const alvoDe = new Map(eventos.filter((x) => x.e.t === 'desfazer').map((x) => [x.id, (x.e as { alvo: string }).alvo]));
  const cancelado = new Set<string>();
  // Do mais novo para o mais antigo: um desfazer só vale se ele mesmo não foi desfeito.
  for (const x of [...eventos].sort(ordenar).reverse()) {
    if (x.e.t !== 'desfazer' || cancelado.has(x.id)) continue;
    cancelado.add(alvoDe.get(x.id)!);
  }
  return cancelado;
}

export function reduzir(r: Regras, eventos: Envelope[], base: GameState = estadoInicial(r)): GameState {
  const ordenados = [...eventos].sort(ordenar);
  const fora = anulados(ordenados);
  let s = base;
  for (const env of ordenados) {
    if (env.e.t === 'desfazer' || fora.has(env.id)) continue;
    s = aplicar(r, { ...s, avisos: [] }, env.e);
    if (env.e.t === 'tocarFoice') s = { ...s, ultimoToqueFoice: env.em };
    if (env.e.t === 'novaSessao') {
      const { sessao, nome } = env.e;
      s = { ...s, sessoes: [...s.sessoes.filter((x) => x.id !== sessao), { id: sessao, nome, criadaEm: env.em }] };
    }
  }
  return s;
}

export function recursoRestante(r: Regras, s: GameState, recurso: string) {
  const rec = recursos(r, contexto(s)).find((x) => x.id === recurso);
  if (!rec) return null;
  return { max: rec.max, restante: Math.max(0, rec.max - (s.usos[recurso] ?? 0)), habilidade: habilidadeEfetiva(r, rec.habilidade) };
}
