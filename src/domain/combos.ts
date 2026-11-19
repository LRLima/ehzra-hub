/**
 * Combos: sequências de magias e habilidades que rendem mais juntas.
 * Um combo nunca gasta nada sozinho: cada passo abre a ficha normal da magia ou
 * habilidade, e as perguntas ("acertou?") decidem se o próximo gasto acontece.
 * Só aparecem os combos cujas peças existem no nível atual.
 */
import { type Regras, custoMana, magia as achaMagia, estaPreparada, cicloMaximo } from './rules';
import type { GameState } from './state';
import { recursoRestante } from './state';

export type ParteTurno = 'acao' | 'acaoBonus' | 'reacao';

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
  {
    id: 'golpe-do-epitafio',
    nome: 'Golpe do Epitáfio',
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
    id: 'carrasco-do-paralisado',
    nome: 'Carrasco do Paralisado',
    parte: 'acao',
    quando: 'Contra humanoides: cultistas, magos, meio-dragões.',
    formula: [
      { rotulo: 'Imobilizar Pessoa', cat: 'c2' },
      { rotulo: 'Infligir 4º crítico', cat: 'c4' },
      { rotulo: 'Toque da Morte', cat: 'habilidade' },
    ],
    resultado: '~87, ou ~174 com o Epitáfio',
    economia: 'ação, e ação no turno seguinte',
    canalizar: 1,
    requer: { habilidades: ['toque-da-morte'], magias: ['imobilizar-pessoa', 'infligir-ferimentos'] },
    passos: [
      { tipo: 'magia', id: 'imobilizar-pessoa', ciclo: 2, rotulo: 'Imobilizar Pessoa no alvo' },
      { tipo: 'pergunta', texto: 'Ele ficou Paralisado?', senao: 'Passou na salvaguarda. Tente de novo no próximo turno ou troque de alvo.' },
      { tipo: 'lembrete', texto: 'No próximo turno, chegue a 1,5 m: todo golpe corpo a corpo num Paralisado é crítico. Se tiver Inspiração, use o Epitáfio antes.' },
      { tipo: 'magia', id: 'infligir-ferimentos', ciclo: 4, rotulo: 'Infligir Ferimentos no 4º ciclo (crítico)' },
      { tipo: 'pergunta', texto: 'Acertou?', senao: 'Errou. O Toque da Morte não é gasto.' },
      { tipo: 'habilidade', id: 'toque-da-morte', rotulo: 'Toque da Morte no acerto' },
    ],
  },
  {
    id: 'manto-e-lamina',
    nome: 'Foice Assombrada',
    parte: 'acao',
    quando: 'Você na linha de frente, sem os Guardiões.',
    formula: [
      { rotulo: 'Manto Espiritual', cat: 'c3' },
      { rotulo: 'Lâmina Necrótica', cat: 'truque' },
      { rotulo: 'Toque da Morte', cat: 'habilidade' },
    ],
    resultado: '~44 num acerto, e o alvo não se cura',
    economia: 'bônus + ação',
    canalizar: 1,
    requer: { habilidades: ['toque-da-morte'], magias: ['manto-espiritual', 'lamina-necrotica'] },
    passos: [
      { tipo: 'magia', id: 'manto-espiritual', ciclo: 3, rotulo: 'Manto Espiritual do Ehzra' },
      { tipo: 'magia', id: 'lamina-necrotica', ciclo: 0, rotulo: 'Lâmina Necrótica com a foice' },
      { tipo: 'pergunta', texto: 'A foice acertou?', senao: 'Errou. O Toque da Morte não é gasto; o Manto continua para o próximo turno.' },
      { tipo: 'habilidade', id: 'toque-da-morte', rotulo: 'Toque da Morte no acerto' },
    ],
  },
  {
    id: 'ferida-no-chefe',
    nome: 'Ferida no Chefe',
    parte: 'reacao',
    quando: 'Um aliado acabou de acertar o chefe.',
    formula: [
      { rotulo: 'Ferida Aberta', cat: 'c2' },
      { rotulo: 'golpes do grupo', cat: 'fisico' },
    ],
    resultado: '+2d6 por aliado que acertar',
    economia: 'reação',
    requer: { magias: ['ferida-aberta'] },
    passos: [
      { tipo: 'magia', id: 'ferida-aberta', ciclo: 2, rotulo: 'Ferida Aberta no chefe' },
      { tipo: 'lembrete', texto: 'Até o seu próximo turno, cada aliado que acertar o chefe soma 2d6 necrótico (uma vez no turno de cada um), e o chefe não se cura.' },
    ],
  },
  {
    id: 'epitafio-do-aliado',
    nome: 'Sentença do Paladino',
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
  {
    id: 'nova-e-barreira',
    nome: 'Nova e Barreira',
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
];

/** Mana total das magias do combo, já com a Ceifadora. */
export function manaDoCombo(r: Regras, combo: Combo) {
  return combo.passos.reduce((a, p) => (p.tipo === 'magia' ? a + custoMana(r, achaMagia(r, p.id), p.ciclo) : a), 0);
}

/** Combos possíveis no nível (as peças existem) e o que falta para fazer agora. */
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
  });
}
