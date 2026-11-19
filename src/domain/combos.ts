/**
 * Combos: sequências de magias e habilidades que rendem mais juntas.
 * Um combo nunca gasta nada sozinho: cada passo abre a ficha normal da magia ou
 * habilidade, e as perguntas ("acertou?") decidem se o próximo gasto acontece.
 *
 * Três camadas, para não depender de recurso escasso:
 * - rotina: quase de graça, para toda luta;
 * - médio: mana moderada, uma vez por luta quando vale;
 * - feito: Canalizar Divindade, Inspiração ou muita mana, para o momento decisivo.
 * Só aparecem os combos cujas peças existem no nível atual.
 */
import { type Regras, custoMana, magia as achaMagia, estaPreparada, cicloMaximo } from './rules';
import type { GameState } from './state';
import { recursoRestante } from './state';

export type ParteTurno = 'acao' | 'acaoBonus' | 'reacao';
export type Camada = 'rotina' | 'medio' | 'feito';

/** Peça da fórmula. cat decide a cor (as mesmas categorias da tela de Combate). */
export interface Peca { rotulo: string; cat: string }

export type Passo =
  | { tipo: 'magia'; id: string; ciclo: number; rotulo: string }
  | { tipo: 'habilidade'; id: string; rotulo: string }
  | { tipo: 'pergunta'; texto: string; senao: string }
  | { tipo: 'lembrete'; texto: string };

export interface Combo {
  id: string;
  nome: string;
  /** Uma frase em linguagem de mesa, para o cartão fechado. */
  descricao: string;
  camada: Camada;
  parte: ParteTurno;
  quando: string;
  formula: Peca[];
  resultado: string;
  economia: string;
  inspiracao?: number;
  canalizar?: number;
  requer: { habilidades?: string[]; magias?: string[] };
  passos: Passo[];
}

export const COMBOS: Combo[] = [
  // ---------- rotina: toda luta, quase de graça ----------
  {
    id: 'canhao-de-perto',
    nome: 'Dança dos Guardiões e Colheita de Almas',
    descricao: 'Você entra no meio dos inimigos e fere todos à volta, todo turno, gastando pouco.',
    camada: 'rotina',
    parte: 'acao',
    quando: 'No meio dos inimigos. Usa as cinco partes do turno sem gastar Canalizar.',
    formula: [
      { rotulo: 'Guardiões', cat: 'c3' },
      { rotulo: 'atravessar', cat: 'fisico' },
      { rotulo: 'Palavra Radiante', cat: 'truque' },
      { rotulo: 'Lanterna', cat: 'c5' },
      { rotulo: 'Sangria', cat: 'c2' },
    ],
    resultado: '~120 por rodada em três inimigos, ~65 num chefe',
    economia: 'concentração + movimento + ação + bônus + reação',
    requer: { magias: ['guardioes-espirituais', 'palavra-radiante', 'lanterna-espiritual', 'ferida-aberta'] },
    passos: [
      { tipo: 'magia', id: 'guardioes-espirituais', ciclo: 3, rotulo: 'Guardiões Espirituais (antes da luta; pule se já estiver ativo)' },
      { tipo: 'magia', id: 'lanterna-espiritual', ciclo: 5, rotulo: 'Lanterna Espiritual (antes da luta; dura 10 minutos)' },
      { tipo: 'lembrete', texto: 'Movimento: atravesse o grupo inimigo. Cada um que a aura tocar faz a salvaguarda agora e de novo no fim do turno dele.' },
      { tipo: 'magia', id: 'palavra-radiante', ciclo: 0, rotulo: 'Ação: Palavra Radiante em todos a 1,5 m' },
      { tipo: 'lembrete', texto: 'Ação bônus: se a Lanterna tiver alma, Drenar Vida no mais perigoso (4d8 + 5). Reação: Sangria quando um aliado acertar o chefe.' },
    ],
  },
  {
    id: 'canhao-de-longe',
    nome: 'Dor sem Fim, Sino e Lanterna',
    descricao: 'Castiga um alvo distante a luta inteira, sem ocupar a concentração.',
    camada: 'rotina',
    parte: 'acao',
    quando: 'Alvo longe ou voando. Deixa a concentração livre para outra magia.',
    formula: [
      { rotulo: 'Palavra Sombria: Dor', cat: 'c1' },
      { rotulo: 'Soar os Mortos', cat: 'truque' },
      { rotulo: 'Lanterna', cat: 'c5' },
      { rotulo: 'Sangria', cat: 'c2' },
    ],
    resultado: '~52 por rodada num alvo',
    economia: 'ação + bônus + reação, sem concentração',
    requer: { magias: ['palavra-sombria-dor', 'soar-os-mortos', 'lanterna-espiritual', 'ferida-aberta'] },
    passos: [
      { tipo: 'magia', id: 'lanterna-espiritual', ciclo: 5, rotulo: 'Lanterna Espiritual (antes da luta; dura 10 minutos)' },
      { tipo: 'magia', id: 'palavra-sombria-dor', ciclo: 1, rotulo: 'Ação, 1ª rodada: Palavra Sombria: Dor no alvo (1 de mana)' },
      { tipo: 'magia', id: 'soar-os-mortos', ciclo: 0, rotulo: 'Ação, rodadas seguintes: Soar os Mortos (sempre no d12)' },
      { tipo: 'lembrete', texto: 'Ação bônus: Drenar Vida quando houver alma na Lanterna. Reação: Sangria quando um aliado acertar. A concentração fica livre.' },
    ],
  },
  {
    id: 'danca-dos-guardioes',
    nome: 'Dança Selvagem dos Guardiões',
    descricao: 'Os espíritos acertam cada inimigo duas vezes por rodada enquanto você caminha entre eles.',
    camada: 'rotina',
    parte: 'acao',
    quando: 'Toda luta com inimigos agrupados. Conjure antes de abrir a porta: dura 10 minutos.',
    formula: [
      { rotulo: 'Guardiões Espirituais', cat: 'c3' },
      { rotulo: 'atravessar os inimigos', cat: 'fisico' },
      { rotulo: 'Palavra Radiante', cat: 'truque' },
    ],
    resultado: 'a aura acerta cada um duas vezes por rodada',
    economia: 'ação + movimento',
    requer: { magias: ['guardioes-espirituais', 'palavra-radiante'] },
    passos: [
      { tipo: 'magia', id: 'guardioes-espirituais', ciclo: 3, rotulo: 'Guardiões Espirituais (pule se já estiver ativo)' },
      { tipo: 'lembrete', texto: 'No seu turno, ande por dentro do grupo inimigo: cada um que a aura tocar faz a salvaguarda agora, e de novo no fim do turno dele.' },
      { tipo: 'magia', id: 'palavra-radiante', ciclo: 0, rotulo: 'Palavra Radiante em todos a 1,5 m' },
    ],
  },
  {
    id: 'dor-e-sino',
    nome: 'Dor sem Fim e Sino Fúnebre',
    descricao: 'Uma dor que não passa deixa o alvo sempre ferido, e o sino fúnebre bate mais forte.',
    camada: 'rotina',
    parte: 'acao',
    quando: 'Um alvo forte que vai durar a luta.',
    formula: [
      { rotulo: 'Palavra Sombria: Dor', cat: 'c1' },
      { rotulo: 'Soar os Mortos', cat: 'truque' },
    ],
    resultado: '1d10 por turno + 2d12 + 5 do sino, sempre',
    economia: 'ação, depois só o truque',
    requer: { magias: ['palavra-sombria-dor', 'soar-os-mortos'] },
    passos: [
      { tipo: 'magia', id: 'palavra-sombria-dor', ciclo: 1, rotulo: 'Palavra Sombria: Dor no alvo (1 de mana pela Ceifadora)' },
      { tipo: 'lembrete', texto: 'Enquanto a Dor durar, o alvo começa cada turno ferido: o Soar os Mortos sempre usa o d12.' },
      { tipo: 'magia', id: 'soar-os-mortos', ciclo: 0, rotulo: 'Soar os Mortos nos turnos seguintes' },
    ],
  },
  {
    id: 'cura-que-abencoa',
    nome: 'Cura Abençoada para a Barreira',
    descricao: 'Cura um aliado e já o deixa pronto para receber a Barreira.',
    camada: 'rotina',
    parte: 'acaoBonus',
    quando: 'Um aliado ferido, e você vai causar dano com magia nesta rodada.',
    formula: [
      { rotulo: 'Palavra Curativa 1º', cat: 'c1' },
      { rotulo: 'Expiação', cat: 'habilidade' },
    ],
    resultado: 'cura agora, cura de novo a cada magia de dano, e deixa a Barreira pronta',
    economia: 'bônus',
    requer: { habilidades: ['expiacao'], magias: ['palavra-curativa'] },
    passos: [
      { tipo: 'magia', id: 'palavra-curativa', ciclo: 1, rotulo: 'Palavra Curativa no 1º ciclo' },
      { tipo: 'lembrete', texto: 'O aliado está abençoado até o fim do seu próximo turno: cada magia de dano que você conjurar com ciclo o cura de novo, e ele pode receber a Barreira Luminosa.' },
    ],
  },

  {
    id: 'vigilia-da-manha',
    nome: 'Bênçãos da Manhã',
    descricao: 'Antes de sair: mais vida para o grupo e duas mortes evitadas.',
    camada: 'rotina',
    parte: 'acao',
    quando: 'No começo do dia de aventura, antes de sair.',
    formula: [
      { rotulo: 'Auxílio', cat: 'c2' },
      { rotulo: 'Ala da Morte ×2', cat: 'c4' },
      { rotulo: 'Vínculo Protetor', cat: 'c2' },
    ],
    resultado: 'o grupo começa o dia com mais PV e duas mortes evitadas',
    economia: 'fora de combate',
    requer: { magias: ['auxilio', 'ala-da-morte', 'vinculo-protetor'] },
    passos: [
      { tipo: 'magia', id: 'auxilio', ciclo: 2, rotulo: 'Auxílio em três aliados (8 horas)' },
      { tipo: 'magia', id: 'ala-da-morte', ciclo: 4, rotulo: 'Ala da Morte no paladino (8 horas)' },
      { tipo: 'magia', id: 'ala-da-morte', ciclo: 4, rotulo: 'Ala da Morte no bárbaro (8 horas)' },
      { tipo: 'lembrete', texto: 'Guarde o Vínculo Protetor para antes da luta grande: dura 1 hora. No paladino, ele resiste a tudo, e você sofre o mesmo dano que ele.' },
      { tipo: 'magia', id: 'vinculo-protetor', ciclo: 2, rotulo: 'Vínculo Protetor no paladino (1 hora)' },
    ],
  },

  // ---------- médio: uma vez por luta, quando vale ----------
  {
    id: 'cego-e-aberto',
    nome: 'Cegar e Sangrar',
    descricao: 'O inimigo fica cego: todos acertam mais e cada golpe sangra mais.',
    camada: 'medio',
    parte: 'acao',
    quando: 'Um alvo perigoso que enxerga (dragões não: eles percebem às cegas).',
    formula: [
      { rotulo: 'Cegueira e Surdez', cat: 'c2' },
      { rotulo: 'Sangria', cat: 'c2' },
    ],
    resultado: 'vantagem para todos contra ele, e cada acerto soma 2d6',
    economia: 'ação + reação',
    requer: { magias: ['cegueira-e-surdez', 'ferida-aberta'] },
    passos: [
      { tipo: 'magia', id: 'cegueira-e-surdez', ciclo: 2, rotulo: 'Cegueira e Surdez (Cego) no alvo' },
      { tipo: 'pergunta', texto: 'Ele ficou Cego?', senao: 'Passou na salvaguarda. Guarde a reação para o Veto da Morte.' },
      { tipo: 'lembrete', texto: 'Cego: todos atacam com vantagem e ele ataca com desvantagem. Quando o primeiro aliado acertar, use a reação.' },
      { tipo: 'magia', id: 'ferida-aberta', ciclo: 2, rotulo: 'Sangria no alvo cego' },
    ],
  },

  // ---------- feito: o momento decisivo ----------
  {
    id: 'nova-e-barreira',
    nome: 'Nova Sagrada com Barreira Luminosa',
    descricao: 'Cura o grupo inteiro e corta pela metade o próximo golpe grande.',
    camada: 'feito',
    parte: 'acao',
    quando: 'O grupo tomou dano em área, ou o sopro vai voltar.',
    formula: [
      { rotulo: 'Nova Sagrada', cat: 'c4' },
      { rotulo: 'Barreira Luminosa', cat: 'habilidade' },
    ],
    resultado: 'cura 3d6, PV temporário e resistência a tudo',
    economia: 'ação + bônus',
    canalizar: 1,
    requer: { habilidades: ['barreira-luminosa'], magias: ['nova-sagrada'] },
    passos: [
      { tipo: 'magia', id: 'nova-sagrada', ciclo: 4, rotulo: 'Nova Sagrada (cura e abençoa o grupo)' },
      { tipo: 'habilidade', id: 'barreira-luminosa', rotulo: 'Barreira Luminosa nos abençoados' },
    ],
  },
  {
    id: 'tribunal',
    nome: 'Horror que Atordoa, Lança que Derruba',
    descricao: 'O chefe fica atordoado e caído por duas rodadas.',
    camada: 'feito',
    parte: 'acao',
    quando: 'Chefe sem Resistência Lendária: meio-dragões, magos, capitães do Culto.',
    formula: [
      { rotulo: 'Horror Psíquico', cat: 'c4' },
      { rotulo: 'Lança de Prata', cat: 'c3' },
    ],
    resultado: 'atordoado e caído por duas rodadas',
    economia: 'ação, e ação no turno seguinte',
    requer: { magias: ['horror-psiquico', 'lanca-de-prata-de-laeral'] },
    passos: [
      { tipo: 'magia', id: 'horror-psiquico', ciclo: 4, rotulo: 'Horror Psíquico no chefe' },
      { tipo: 'pergunta', texto: 'Ele ficou Atordoado?', senao: 'Passou. Tente no próximo turno, ou use o Comando para gastar a Resistência Lendária antes.' },
      { tipo: 'lembrete', texto: 'Atordoado: falha automática em FOR e DES, não age, e todos atacam com vantagem.' },
      { tipo: 'magia', id: 'lanca-de-prata-de-laeral', ciclo: 3, rotulo: 'No turno seguinte: Lança de Prata (falha automática, fica Caído)' },
    ],
  },
  {
    id: 'sentenca-final',
    nome: 'Contágio que Abre o Horror',
    descricao: 'Envenena o chefe e quase garante que ele fique atordoado.',
    camada: 'feito',
    parte: 'acao',
    quando: 'O chefe da sessão, ao alcance da mão.',
    formula: [
      { rotulo: 'Contágio', cat: 'c5' },
      { rotulo: 'Horror Psíquico', cat: 'c4' },
    ],
    resultado: 'envenenado e quase certo de ficar atordoado',
    economia: 'ação, e ação no turno seguinte',
    requer: { magias: ['contagio', 'horror-psiquico'] },
    passos: [
      { tipo: 'magia', id: 'contagio', ciclo: 5, rotulo: 'Contágio: escolha desvantagem nas salvaguardas de Sabedoria' },
      { tipo: 'pergunta', texto: 'Ele falhou na salvaguarda?', senao: 'Passou. O Horror Psíquico ainda pode pegar, mas sem a desvantagem.' },
      { tipo: 'magia', id: 'horror-psiquico', ciclo: 4, rotulo: 'Horror Psíquico: ele salva com desvantagem' },
    ],
  },
  {
    id: 'golpe-do-epitafio',
    nome: 'Epitáfio com Infligir Ferimentos',
    descricao: 'Um único golpe seu que pode derrubar um chefe sozinho.',
    camada: 'feito',
    parte: 'acao',
    quando: 'Um chefe ao alcance da sua mão.',
    formula: [
      { rotulo: 'Epitáfio', cat: 'habilidade' },
      { rotulo: 'Infligir Ferimentos 4º', cat: 'c4' },
      { rotulo: 'Toque da Morte', cat: 'habilidade' },
    ],
    resultado: '~108 num acerto',
    economia: 'bônus + ação',
    inspiracao: 1,
    canalizar: 1,
    requer: { habilidades: ['epitafio', 'toque-da-morte'], magias: ['infligir-ferimentos'] },
    passos: [
      { tipo: 'habilidade', id: 'epitafio', rotulo: 'Epitáfio no alvo' },
      { tipo: 'magia', id: 'infligir-ferimentos', ciclo: 4, rotulo: 'Infligir Ferimentos no 4º ciclo' },
      { tipo: 'pergunta', texto: 'O Infligir Ferimentos acertou?', senao: 'Errou. O Toque da Morte não é gasto, e o Epitáfio continua marcado até o fim do seu próximo turno.' },
      { tipo: 'habilidade', id: 'toque-da-morte', rotulo: 'Toque da Morte no acerto' },
    ],
  },
  {
    id: 'epitafio-do-aliado',
    nome: 'Epitáfio no Golpe do Paladino',
    descricao: 'Marca o chefe para o próximo golpe do paladino causar o dobro.',
    camada: 'feito',
    parte: 'acaoBonus',
    quando: 'O paladino vai bater no chefe com Destruição Divina.',
    formula: [
      { rotulo: 'Epitáfio', cat: 'habilidade' },
      { rotulo: 'golpe do paladino', cat: 'fisico' },
    ],
    resultado: 'o golpe dele dobra',
    economia: 'bônus',
    inspiracao: 1,
    requer: { habilidades: ['epitafio'] },
    passos: [
      { tipo: 'habilidade', id: 'epitafio', rotulo: 'Epitáfio no chefe' },
      { tipo: 'lembrete', texto: 'Avise o paladino: o próximo golpe dele no chefe causa o dobro, Destruição Divina inclusa.' },
    ],
  },
];

const ORDEM: Record<Camada, number> = { rotina: 0, medio: 1, feito: 2 };
export const NOME_CAMADA: Record<Camada, string> = { rotina: '●', medio: '●●', feito: '●●●' };
/** Texto para leitores de tela e dica ao passar o mouse. */
export const DICA_CAMADA: Record<Camada, string> = { rotina: 'Leve: gasta pouco, use toda luta', medio: 'Médio: uma vez por luta, quando vale', feito: 'Pesado: gasta recurso escasso, para o momento decisivo' };

/** Mana total das magias do combo, já com a Ceifadora (cada magia contada uma vez por passo). */
export function manaDoCombo(r: Regras, combo: Combo) {
  return combo.passos.reduce((a, p) => (p.tipo === 'magia' ? a + custoMana(r, achaMagia(r, p.id), p.ciclo) : a), 0);
}

/** Combos possíveis no nível (as peças existem) e o que falta para fazer agora, da rotina ao feito. */
export function combosDisponiveis(r: Regras, s: GameState) {
  const cicloMax = cicloMaximo(r, s.nivel);
  return COMBOS.filter((cb) =>
    (cb.requer.habilidades ?? []).every((id) => r.habilidades.some((f) => f.id === id))
    && (cb.requer.magias ?? []).every((id) => r.magias.some((m) => m.id === id)),
  ).map((cb) => {
    const falta: string[] = [];
    const mana = manaDoCombo(r, cb);
    if ((cb.inspiracao ?? 0) > s.inspiracao) falta.push('Inspiração');
    if (mana > s.mana) falta.push(`mana (${mana})`);
    const canal = recursoRestante(r, s, 'canalizar');
    if ((cb.canalizar ?? 0) > (canal?.restante ?? 0)) falta.push('Canalizar Divindade');
    for (const p of cb.passos) {
      if (p.tipo !== 'magia') continue;
      const sp = achaMagia(r, p.id);
      if (!estaPreparada(sp, s.preparadas)) falta.push(`${sp.nome} preparada`);
      else if (p.ciclo > cicloMax) falta.push(`${p.ciclo}º ciclo`);
    }
    return { combo: cb, mana, falta: [...new Set(falta)] };
  }).sort((a, b) => ORDEM[a.combo.camada] - ORDEM[b.combo.camada]);
}
