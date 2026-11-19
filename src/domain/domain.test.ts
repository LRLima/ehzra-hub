import { describe, it, expect } from 'vitest';
import { carregarRegras } from './data';
import {
  regrasNoNivel, dominioNoNivel,
  cdMagia, ataqueMagia, pericia, salvaguarda, custoMana, danoMagia, curaMagia, magia, podeConjurar, magiaEfetiva,
  percepcaoPassiva, type Regras,
} from './rules';
import { estadoInicial, reduzir, contexto, type GameState, recursoRestante } from './state';
import type { Envelope, Evento } from './events';
import { ganhosProximoNivel } from './levelup';
import { migrar } from './migrations';
import { descrever } from './log';

// Os testes de mecanismo usam a ficha pura (sem aprovações 2024); o bloco
// "decisões de 29/09" no fim confere os dados reais, com as aprovações.
const real = carregarRegras();
const r: Regras = { ...real, character: { ...real.character, aprovacoes2024: [], recusadas2024: [] } };
const c8 = { nivel: 8, bonusAtributos: {} };
const exprs = (s: string, ciclo?: number, rr: Regras = r, c = c8) =>
  danoMagia(rr, c, magia(rr, s), ciclo).map((x) => x.expr);

let seq = 0;
const env = (e: Evento, em = ++seq): Envelope => ({ id: `ev${em}-${Math.random()}`, em, aparelho: 'teste', v: 1, e });
const run = (evs: Evento[]) => {
  const envs = evs.map((e) => env(e));
  return { s: reduzir(r, envs), envs };
};
const conjurar = (id: string, ciclo = magia(r, id).ciclo): Evento => {
  const sp = magia(r, id);
  return {
    t: 'conjurar', magia: id, ciclo, custo: custoMana(r, sp, ciclo), viaCeifadora: r.homebrew.ceifadora.magias.includes(id),
    concentracao: sp.concentracao, rodadas: sp.duracao.rodadas, tempo: sp.tempo.tipo,
  };
};

describe('ficha no nível 8', () => {
  it('CD 16 e ataque +8, como na ficha original', () => {
    expect(cdMagia(r, c8)).toBe(16);
    expect(ataqueMagia(r, c8)).toBe(8);
  });
  it('salvaguardas batem com o original', () => {
    expect(salvaguarda(r, c8, 'sab')).toBe(8);
    expect(salvaguarda(r, c8, 'car')).toBe(2);
    expect(salvaguarda(r, c8, 'con')).toBe(2);
  });
  it('perícias corrigidas', () => {
    expect(pericia(r, c8, 'Religião')).toBe(4);
    expect(pericia(r, c8, 'Enganação')).toBe(-1);
    expect(pericia(r, c8, 'Persuasão')).toBe(-1);
    expect(pericia(r, c8, 'Intimidação')).toBe(-1);
    expect(pericia(r, c8, 'Percepção')).toBe(8);
    expect(pericia(r, c8, 'Atletismo')).toBe(6);
    expect(pericia(r, c8, 'Sobrevivência')).toBe(5);
    expect(percepcaoPassiva(r, c8)).toBe(18);
  });
});

describe('mana', () => {
  it('custos do DMG e Ceifadora arredondando para baixo', () => {
    expect(custoMana(r, magia(r, 'guardioes-espirituais'), 3)).toBe(5);
    expect(custoMana(r, magia(r, 'animar-morto'), 3)).toBe(2);
    expect(custoMana(r, magia(r, 'animar-morto'), 4)).toBe(3);
    expect(custoMana(r, magia(r, 'ala-da-morte'), 4)).toBe(3);
    expect(custoMana(r, magia(r, 'repouso-gentil'), 2)).toBe(1);
    expect(custoMana(r, magia(r, 'soar-os-mortos'), 0)).toBe(0);
  });
  it('bloqueia ciclo acima do nível e mana insuficiente', () => {
    const base = { nivel: 8, mana: 44, ciclosAltosUsados: [] };
    expect(podeConjurar(r, base, magia(r, 'circulo-de-poder'), 5).ok).toBe(false);
    expect(podeConjurar(r, { ...base, nivel: 9 }, magia(r, 'circulo-de-poder'), 5).ok).toBe(true);
    expect(podeConjurar(r, { ...base, mana: 4 }, magia(r, 'guardioes-espirituais'), 3).ok).toBe(false);
  });
});

describe('dano e cura calculados', () => {
  it('Soar os Mortos no nível 8 soma Conjurador Potente', () => {
    expect(exprs('soar-os-mortos')).toEqual(['2d8 + 5', '2d12 + 5']);
  });
  it('Soar os Mortos: ficha no 11º tem 2d12; versão 2024 aprovada tem 3d12', () => {
    const c11 = { nivel: 11, bonusAtributos: {} };
    expect(exprs('soar-os-mortos', undefined, r, c11)).toEqual(['3d8 + 5', '2d12 + 5']);
    const aprovado = { ...r, character: { ...r.character, aprovacoes2024: ['soar-os-mortos'] } };
    expect(exprs('soar-os-mortos', undefined, aprovado, c11)).toEqual(['3d8 + 5', '3d12 + 5']);
  });
  it('upcast soma dados do mesmo tipo', () => {
    expect(exprs('infligir-ferimentos', 3)).toEqual(['5d10']);
    expect(exprs('praga', 5)).toEqual(['9d8']);
  });
  it('Lâmina Necrótica não soma Conjurador Potente (não é truque da lista de Clérigo)', () => {
    expect(exprs('lamina-necrotica')).toEqual(['1d8', '2d8']);
  });
  it('Manto Espiritual do Ehzra cresce por ciclo, a cada 2', () => {
    expect(exprs('manto-espiritual', 3)).toEqual(['1d8']);
    expect(exprs('manto-espiritual', 5)).toEqual(['2d8']);
    expect(exprs('manto-espiritual', 7)).toEqual(['3d8']);
  });
  it('curas', () => {
    expect(curaMagia(r, c8, magia(r, 'curar-ferimentos'), 2)?.expr).toBe('2d8 + 5');
    expect(curaMagia(r, c8, magia(r, 'vitalidade-falsa'), 4)?.expr).toBe('2d4 + 19');
    expect(curaMagia(r, c8, magia(r, 'vitalidade-falsa'), 4)?.pvTemporario).toBe(true);
    const aprovado = { ...r, character: { ...r.character, aprovacoes2024: ['palavra-curativa'] } };
    expect(curaMagia(aprovado, c8, magiaEfetiva(aprovado, magia(r, 'palavra-curativa')), 2)?.expr).toBe('4d4 + 5');
  });
  it('dano fixo (Guardião da Fé)', () => {
    expect(exprs('guardiao-da-fe')).toEqual(['20']);
  });
});

describe('estado de jogo', () => {
  it('começa cheio', () => {
    const s = estadoInicial(r);
    expect(s.pv).toBe(70);
    expect(s.mana).toBe(44);
    expect(s.nivel).toBe(8);
  });

  it('conjurar atualiza mana, concentração, efeito e turno de uma vez', () => {
    const { s } = run([{ t: 'iniciarCombate' }, conjurar('guardioes-espirituais')]);
    expect(s.mana).toBe(39);
    expect(s.concentracao?.magia).toBe('guardioes-espirituais');
    expect(s.efeitos.find((e) => e.origem === 'guardioes-espirituais')?.rodadas).toBe(100);
    expect(s.turno.acao).toBe(true);
  });

  it('nova concentração encerra a anterior e avisa', () => {
    const { s } = run([conjurar('escudo-da-fe'), conjurar('guardioes-espirituais')]);
    expect(s.concentracao?.magia).toBe('guardioes-espirituais');
    expect(s.efeitos.some((e) => e.origem === 'escudo-da-fe')).toBe(false);
    expect(s.avisos[0].texto).toContain('Escudo da Fé');
  });

  it('dano consome PV temporário primeiro e pede teste de concentração', () => {
    const { s } = run([conjurar('escudo-da-fe'), { t: 'pvTemp', valor: 10 }, { t: 'dano', valor: 24 }]);
    expect(s.pvTemp).toBe(0);
    expect(s.pv).toBe(56);
    expect(s.avisos[0].texto).toContain('CD 12');
    expect(s.avisos[0].texto).toContain('vantagem');
  });

  it('PV temporário não acumula', () => {
    const { s } = run([{ t: 'pvTemp', valor: 10 }, { t: 'pvTemp', valor: 6 }]);
    expect(s.pvTemp).toBe(10);
  });

  it('Ala da Morte segura em 1 PV', () => {
    const { s } = run([conjurar('ala-da-morte'), { t: 'dano', valor: 200 }]);
    expect(s.pv).toBe(1);
    expect(s.efeitos.some((e) => e.origem === 'ala-da-morte')).toBe(false);
    expect(s.avisos[0].tipo).toBe('alaDaMorte');
  });

  it('próxima rodada desce os efeitos e avisa quando chegam a 0, sem remover', () => {
    const evs: Evento[] = [{ t: 'iniciarCombate' }, conjurar('manto-espiritual')];
    for (let i = 0; i < 10; i++) evs.push({ t: 'proximaRodada' });
    const { s } = run(evs);
    expect(s.combate?.rodada).toBe(11);
    const manto = s.efeitos.find((e) => e.origem === 'manto-espiritual');
    expect(manto?.rodadas).toBe(0);
  });

  it('descanso longo restaura tudo', () => {
    const { s } = run([
      conjurar('guardioes-espirituais'), { t: 'dano', valor: 30 }, { t: 'usarRecurso', recurso: 'canalizar', qtd: 2 },
      { t: 'avatar', d4: 2 }, { t: 'exaustao', delta: 2 }, { t: 'descanso', tipo: 'longo', pvDadosDeVida: 0 },
    ]);
    expect(s.pv).toBe(70);
    expect(s.mana).toBe(44);
    expect(s.concentracao).toBeNull();
    expect(s.usos).toEqual({});
    expect(s.avatar).toBeNull();
    expect(s.exaustao).toBe(1);
    expect(recursoRestante(r, s, 'canalizar')?.restante).toBe(2);
  });

  it('descanso curto: Canalizar só volta 1 se a regra 2024 for aprovada', () => {
    const evs: Evento[] = [{ t: 'usarRecurso', recurso: 'canalizar', qtd: 2 }, { t: 'descanso', tipo: 'curto', pvDadosDeVida: 0 }];
    expect(reduzir(r, evs.map((e) => env(e))).usos.canalizar).toBe(2);
    const aprovado = { ...r, character: { ...r.character, aprovacoes2024: ['canalizar-divindade'] } };
    const s = reduzir(aprovado, evs.map((e) => env(e)));
    expect(s.usos.canalizar).toBe(1);
    expect(recursoRestante(aprovado, s, 'canalizar')).toMatchObject({ max: 3, restante: 2 });
  });

  it('desfazer anula o evento, e desfazer o desfazer refaz', () => {
    const dano = env({ t: 'dano', valor: 20 });
    const undo = env({ t: 'desfazer', alvo: dano.id });
    expect(reduzir(r, [dano]).pv).toBe(50);
    expect(reduzir(r, [dano, undo]).pv).toBe(70);
    expect(reduzir(r, [dano, undo, env({ t: 'desfazer', alvo: undo.id })]).pv).toBe(50);
  });

  it('eventos de dois aparelhos convergem na mesma ordem', () => {
    const a = { ...env({ t: 'dano', valor: 12 }, 100), aparelho: 'celular' };
    const b = { ...env({ t: 'dano', valor: 5 }, 100), aparelho: 'pc' };
    expect(reduzir(r, [a, b])).toEqual(reduzir(r, [b, a]));
    expect(reduzir(r, [a, b]).pv).toBe(53);
  });

  it('6º ciclo em diante só uma vez por descanso longo', () => {
    const s: GameState = { ...estadoInicial(r), nivel: 11, mana: 73 };
    const s2 = reduzir(r, [env({ ...(conjurar('praga', 6) as object), custo: 9 } as Evento)], s);
    expect(podeConjurar(r, { nivel: 11, mana: s2.mana, ciclosAltosUsados: s2.ciclosAltosUsados }, magia(r, 'praga'), 6).ok).toBe(false);
  });

  it('o log descreve em português', () => {
    const e = env(conjurar('animar-morto'));
    expect(descrever(r, e)).toBe('Conjurou Animar Morto (3º, 2 mana pela Ceifadora)');
  });
});

describe('subida de nível 8 para 9', () => {
  const g = ganhosProximoNivel(r, estadoInicial(r))!;
  const mudou = (rotulo: string) => g.mudancas.find((m) => m.rotulo === rotulo);

  it('mostra exatamente o que muda', () => {
    expect(mudou('Bônus de proficiência')).toEqual({ rotulo: 'Bônus de proficiência', antes: '+3', depois: '+4' });
    expect(mudou('CD de magia')).toMatchObject({ antes: '16', depois: '17' });
    expect(mudou('Ataque com magia')).toMatchObject({ antes: '+8', depois: '+9' });
    expect(mudou('Mana máxima')).toMatchObject({ antes: '44', depois: '57' });
    expect(mudou('Ciclo máximo')).toMatchObject({ antes: '4º', depois: '5º' });
    expect(mudou('Espaços de magia')).toMatchObject({ antes: '4/3/3/2', depois: '4/3/3/3/1' });
    expect(mudou('Magias preparadas')).toMatchObject({ antes: '12', depois: '14' });
    expect(mudou('Toque da Morte')).toMatchObject({ antes: '21', depois: 'sai com o domínio' });
    expect(mudou('Truques conhecidos')).toBeUndefined();
    expect(g.pvMedio).toBe(7);
    expect(g.featuresNovas).toEqual([]);
    expect(g.magiasLiberadas.map((m) => m.id)).toContain('circulo-de-poder');
    expect(g.magiasDominioNovas).toHaveLength(10);
    expect(g.dominioNovo).toBe('Domínio da Disciplina');
    expect(g.dominioSai).toEqual(expect.arrayContaining(['Ceifador', 'Toque da Morte', 'Morte Inescapável']));
    expect(g.subclasseNova).toEqual(['Raio Sagrado', 'Expiação', 'Barreira Luminosa']);
    expect(g.truquesEscalados).toEqual([]);
  });

  it('aplica sem erro e recalcula tudo', () => {
    const { s } = run([{ t: 'dano', valor: 10 }, conjurar('guardioes-espirituais'), { t: 'subirNivel', para: 9, pvGanho: 7, atributos: {}, magias: [] }]);
    expect(s.nivel).toBe(9);
    expect(s.pv).toBe(67);
    expect(70 + s.pvMaxExtra).toBe(77);
    expect(s.mana).toBe(39 + 13);
    expect(cdMagia(r, contexto(s))).toBe(17);
    expect(pericia(r, contexto(s), 'Religião')).toBe(5);
  });

  it('pode ser revertido com desfazer', () => {
    const up = env({ t: 'subirNivel', para: 9, pvGanho: 7, atributos: {}, magias: [] });
    const s = reduzir(r, [up, env({ t: 'desfazer', alvo: up.id })]);
    expect(s.nivel).toBe(8);
    expect(s.mana).toBe(44);
  });
});

describe('decisões de 29/09/2026 aplicadas nos dados reais', () => {
  const ex = (s: string, ciclo?: number) => danoMagia(real, c8, magia(real, s), ciclo).map((x) => x.expr);
  const cura = (s: string, ciclo?: number) => curaMagia(real, c8, magia(real, s), ciclo)?.expr;

  it('aprovar uma versão 2024 nunca apaga dano ou condições que ela não mudou', () => {
    for (const id of real.character.aprovacoes2024) {
      const bruta = real.magias.find((m) => m.id === id);
      if (!bruta?.v2024) continue;
      const ef = magia(real, id);
      if (!('dano' in bruta.v2024)) expect(ef.dano, id).toEqual(bruta.dano);
      if (!('condicoes' in bruta.v2024)) expect(ef.condicoes, id).toEqual(bruta.condicoes);
      if (!('ritual' in bruta.v2024)) expect(ef.ritual, id).toBe(bruta.ritual);
    }
    expect(ex('guardioes-espirituais')).toEqual(['3d8']);
    expect(ex('praga', 5)).toEqual(['9d8']);
  });
  it('M8 recusado: Infligir Ferimentos segue como ataque 3d10', () => {
    expect(magia(real, 'infligir-ferimentos').resolucao?.tipo).toBe('ataque');
    expect(ex('infligir-ferimentos')).toEqual(['3d10']);
  });
  it('curas 2024 (M9, M10, M33) e Aura sem ação bônus (M29)', () => {
    expect(cura('curar-ferimentos')).toBe('2d8 + 5');
    expect(cura('palavra-curativa')).toBe('2d4 + 5');
    expect(cura('palavra-curativa-em-massa')).toBe('2d4 + 5');
    expect(magia(real, 'aura-de-vitalidade').componentes).toEqual({ v: true, s: false, m: false });
  });
  it('tempos e alcances 2024 (M2, M5, M20, M23)', () => {
    expect(magia(real, 'orientacao').tempo.tipo).toBe('acao');
    expect(magia(real, 'salve-o-moribundo').alcance.metros).toBe(9);
    expect(magia(real, 'restauracao-menor').tempo.tipo).toBe('acaoBonus');
    expect(magia(real, 'cegueira-e-surdez').alcance.metros).toBe(36);
    expect(magia(real, 'raio-do-enfraquecimento').resolucao).toMatchObject({ tipo: 'salvaguarda', atributo: 'con' });
  });
  it('Soar os Mortos com o escalonamento oficial (M1)', () => {
    expect(danoMagia(real, { nivel: 11, bonusAtributos: {} }, magia(real, 'soar-os-mortos')).map((x) => x.expr)).toEqual(['3d8 + 5', '3d12 + 5']);
  });
  it('Manto Espiritual do Ehzra cresce por ciclo, a cada 2 (M32)', () => {
    expect(ex('manto-espiritual', 4)).toEqual(['1d8']);
    expect(ex('manto-espiritual', 5)).toEqual(['2d8']);
  });
  it('Canalizar Divindade com 3 usos e Centelha Divina visível (H1, H2)', () => {
    const s = estadoInicial(real);
    expect(recursoRestante(real, s, 'canalizar')).toMatchObject({ max: 3, restante: 3 });
    expect(real.habilidades.find((f) => f.id === 'centelha-divina')).toBeTruthy();
  });
});

describe('backup', () => {
  it('rejeita arquivo que não é do app', () => {
    expect(() => migrar({ foo: 1 })).toThrow(/não é um backup/);
    expect(() => migrar({ app: 'ehzra-hub', schemaVersion: 99, eventos: [] })).toThrow(/mais nova/);
  });
  it('aceita backup atual', () => {
    const b = migrar({ app: 'ehzra-hub', schemaVersion: 1, exportadoEm: 'x', eventos: [env({ t: 'dano', valor: 3 })] });
    expect(b.eventos).toHaveLength(1);
  });
});

describe('troca de domínio no nível 9', () => {
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  const n8 = regrasNoNivel(r, 8);
  const n9 = regrasNoNivel(r, 9);
  it('no 8 vale o Domínio da Morte', () => {
    expect(ids(n8.habilidades)).toEqual(expect.arrayContaining(['ceifador', 'toque-da-morte', 'morte-inescapavel']));
    expect(ids(n8.habilidades)).not.toContain('barreira-luminosa');
    expect(n8.magias.find((m) => m.id === 'praga')?.origens).toContain('dominio');
    expect(n8.magias.find((m) => m.id === 'raio-guia')?.origens).toEqual(['classe']);
    expect(ids(n8.magias)).not.toContain('pele-de-pedra'); // fora da lista de clérigo, só pelo domínio
    expect(dominioNoNivel(r, 8)).toBe('Domínio da Morte');
  });
  it('no 9 vale o Domínio da Disciplina', () => {
    expect(ids(n9.habilidades)).toEqual(expect.arrayContaining(['raio-sagrado', 'expiacao', 'barreira-luminosa']));
    expect(ids(n9.habilidades)).not.toContain('toque-da-morte');
    expect(ids(n9.habilidades)).not.toContain('penitencia-suprema');
    expect(n9.magias.find((m) => m.id === 'raio-guia')?.origens).toEqual(['dominio']);
    expect(n9.magias.find((m) => m.id === 'pele-de-pedra')?.origens).toEqual(['dominio']);
    expect(ids(n9.magias)).not.toContain('praga'); // saiu do domínio e não está na lista de clérigo
    expect(n9.magias.find((m) => m.id === 'ala-da-morte')?.origens).toEqual(['ceifadora']);
    expect(n9.magias.find((m) => m.id === 'cegueira-e-surdez')?.origens).toEqual(['classe']);
    expect(dominioNoNivel(r, 9)).toBe('Domínio da Disciplina');
  });
});
