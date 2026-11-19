/** "O que você ganha" ao subir de nível, calculado só a partir dos dados. */
import {
  dominioNoNivel, type Regras, cdMagia, ataqueMagia, cicloMaximo, danoMagia, linhaNivel, manaMaxima, modAtr, proficiencia,
  toqueDaMorte, magiaEfetiva,
} from './rules';
import type { GameState } from './state';
import { contexto } from './state';

export interface Mudanca { rotulo: string; antes: string; depois: string }

export interface Ganhos {
  de: number;
  para: number;
  mudancas: Mudanca[];
  featuresNovas: string[];
  subclasseNova: string[];
  /** Domínio em vigor depois de subir. */
  dominio: string | null;
  /** Domínio novo neste nível (troca de domínio), e o que sai do antigo. */
  dominioNovo: string | null;
  dominioSai: string[];
  asi: boolean;
  magiasDominioNovas: string[];
  magiasLiberadas: { id: string; nome: string }[];
  truquesEscalados: { nome: string; antes: string; depois: string }[];
  pvMedio: number;
  dadoDeVida: number;
  preparadasExtras: number;
}

export function ganhosProximoNivel(r: Regras, s: GameState): Ganhos | null {
  if (s.nivel >= 20) return null;
  const de = s.nivel;
  const para = de + 1;
  const c0 = contexto(s);
  const c1 = { ...c0, nivel: para };
  const l0 = linhaNivel(r, de);
  const l1 = linhaNivel(r, para);
  const m: Mudanca[] = [];
  const add = (rotulo: string, a: string | number, b: string | number) => {
    if (String(a) !== String(b)) m.push({ rotulo, antes: String(a), depois: String(b) });
  };
  add('Bônus de proficiência', `+${proficiencia(r, c0)}`, `+${proficiencia(r, c1)}`);
  add('CD de magia', cdMagia(r, c0), cdMagia(r, c1));
  add('Ataque com magia', `+${ataqueMagia(r, c0)}`, `+${ataqueMagia(r, c1)}`);
  add('Mana máxima', manaMaxima(r, de), manaMaxima(r, para));
  add('Ciclo máximo', `${cicloMaximo(r, de)}º`, `${cicloMaximo(r, para)}º`);
  add('Espaços de magia', l0.espacos.filter(Boolean).join('/'), l1.espacos.filter(Boolean).join('/'));
  add('Magias preparadas', l0.preparadas, l1.preparadas);
  add('Truques conhecidos', l0.truques, l1.truques);
  add('Canalizar Divindade', l0.canalizar, l1.canalizar);
  const toque = r.habilidades.find((f) => f.id === 'toque-da-morte');
  if (toque) add('Toque da Morte', toqueDaMorte(c0), para <= (toque.nivelMax ?? 20) ? toqueDaMorte(c1) : 'sai com o domínio');

  const truquesEscalados = r.magias
    .filter((sp) => sp.ciclo === 0 && sp.dano.some((d) => d.porNivel))
    .map((sp0) => {
      const sp = magiaEfetiva(r, sp0);
      const f = (n: number) => danoMagia(r, { ...c0, nivel: n }, sp).map((x) => x.expr).join(' / ');
      return { nome: sp.nome, antes: f(de), depois: f(para) };
    })
    .filter((x) => x.antes !== x.depois);

  const cicloNovo = cicloMaximo(r, para);
  const magiasLiberadas = cicloNovo > cicloMaximo(r, de)
    ? r.magias.filter((sp) => sp.ciclo === cicloNovo).map((sp) => ({ id: sp.id, nome: sp.nome }))
    : [];

  return {
    de,
    para,
    mudancas: m,
    featuresNovas: l1.features,
    subclasseNova: l1.subclasse,
    dominio: dominioNoNivel(r, para),
    dominioNovo: l1.dominio ?? null,
    dominioSai: l1.dominio ? r.habilidades.filter((f) => f.nivelMax !== undefined && f.nivelMax < para).map((f) => f.nome) : [],
    asi: l1.asi,
    magiasDominioNovas: r.progressao.magiasDeDominio[String(para)] ?? [],
    magiasLiberadas,
    truquesEscalados,
    pvMedio: r.progressao.pvMedio + modAtr(r, c0, 'con'),
    dadoDeVida: r.progressao.dadoDeVida,
    preparadasExtras: l1.preparadas - l0.preparadas,
  };
}
