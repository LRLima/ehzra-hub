/** Combos guiados passo a passo e a faixa de ações básicas da tela de Combate. */
import { Fragment, useState } from 'react';
import { useJogo, useUI } from '../store';
import { COMBOS, NOME_CAMADA, combosDisponiveis, type Combo, type ParteTurno } from '../domain/combos';
import { modAtr, proficiencia } from '../domain/rules';

function Formula({ combo }: { combo: Combo }) {
  return (
    <div className="formula">
      {combo.formula.map((p, i) => (
        <Fragment key={p.rotulo}>
          {i > 0 && <span className="op" aria-hidden="true">+</span>}
          <span className="peca" data-cat={p.cat}>{p.rotulo}</span>
        </Fragment>
      ))}
      <span className="op" aria-hidden="true">=</span>
      <b className="resultado">{combo.resultado}</b>
    </div>
  );
}

function Custo({ combo, mana }: { combo: Combo; mana: number }) {
  return (
    <div className="custo">
      {combo.inspiracao ? <span className="gasto insp">−{combo.inspiracao} Inspiração</span> : null}
      {mana ? <span className="gasto mana">−{mana} mana</span> : null}
      {combo.canalizar ? <span className="gasto canal">−{combo.canalizar} Canalizar</span> : null}
      <span className="economia">{combo.economia}</span>
    </div>
  );
}

/** Combos desta parte do turno, com a fórmula colorida e o custo. */
export function CombosDoTurno({ parte }: { parte: ParteTurno }) {
  const { r, s } = useJogo();
  const setCombo = useUI((u) => u.setCombo);
  const [aberto, setAberto] = useState<string | null>(null);
  const lista = combosDisponiveis(r, s).filter((x) => x.combo.parte === parte);
  if (!lista.length) return null;
  return (
    <section className="grupo" data-cat="combo">
      <header className="cat-h">
        <i className="cat-marca" aria-hidden="true" />
        <h3>Combos</h3>
        <span className="cat-nota">da rotina ao feito</span>
        <span className="cat-n num">{lista.length}</span>
      </header>
      <div className="stack">
        {lista.map(({ combo, mana, falta }) => {
          const ab = aberto === combo.id;
          return (
            <div key={combo.id} className={`card combo-card${falta.length > 0 ? ' faltando' : ''}${ab ? ' aberto' : ''}`}>
              <button className="combo-resumo" aria-expanded={ab} onClick={() => setAberto(ab ? null : combo.id)} data-testid={`combo-${combo.id}`}>
                <span className="row combo-topo"><span className="nome grow">{combo.nome}</span><span className="camada" data-camada={combo.camada}>{NOME_CAMADA[combo.camada]}</span></span>
                <span className="combo-desc">{combo.descricao}</span>
              </button>
              {ab && (
                <div className="combo-detalhe">
                  <Formula combo={combo} />
                  <Custo combo={combo} mana={mana} />
                  {falta.length > 0 ? <div className="falta">Falta: {falta.join(', ')}</div> : <div className="quando">{combo.quando}</div>}
                  <button className="btn mini primario" style={{ marginTop: 8 }} onClick={() => { setCombo({ id: combo.id, passo: 0 }); setAberto(null); }} data-testid={`comecar-${combo.id}`}>Começar combo</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Barra do combo em andamento: mostra o passo atual e guia até o fim. */
export function ComboBar() {
  const { r, s } = useJogo();
  const combo = useUI((u) => u.combo);
  const setCombo = useUI((u) => u.setCombo);
  const abrir = useUI((u) => u.abrir);
  if (!combo) return null;
  const cb = COMBOS.find((c) => c.id === combo.id);
  if (!cb) return null;
  const fim = combo.passo >= cb.passos.length;
  const p = cb.passos[combo.passo];
  const proximo = () => setCombo({ id: cb.id, passo: combo.passo + 1 });
  const encerrar = () => setCombo(null);

  return (
    <div className="combo-bar" role="status" data-testid="combo-bar">
      {(() => { const f = combosDisponiveis(r, s).find((x) => x.combo.id === combo.id)?.falta ?? []; return f.length > 0 && !fim && !combo.aviso ? <p className="falta-bar">Falta agora: {f.join(", ")}</p> : null; })()}
      <div className="row">
        <b className="grow">{cb.nome}</b>
        <span className="faint num">{fim || combo.aviso ? 'fim' : `passo ${combo.passo + 1} de ${cb.passos.length}`}</span>
      </div>
      {combo.aviso ? (
        <>
          <p className="combo-texto">{combo.aviso}</p>
          <button className="btn mini" onClick={encerrar}>Encerrar combo</button>
        </>
      ) : fim ? (
        <>
          <p className="combo-texto">Combo concluído.</p>
          <button className="btn mini" onClick={encerrar}>Fechar</button>
        </>
      ) : p.tipo === 'pergunta' ? (
        <>
          <p className="combo-texto">{p.texto}</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn mini primario" onClick={proximo}>Sim</button>
            <button className="btn mini" onClick={() => setCombo({ ...combo, aviso: p.senao })}>Não</button>
          </div>
        </>
      ) : p.tipo === 'lembrete' ? (
        <>
          <p className="combo-texto">{p.texto}</p>
          <button className="btn mini primario" onClick={proximo}>Entendido</button>
        </>
      ) : (
        <>
          <p className="combo-texto">{p.rotulo}</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn mini primario" onClick={() => abrir(p.tipo === 'magia' ? { tipo: 'magia', id: p.id, ciclo: p.ciclo } : { tipo: 'habilidade', id: p.id })}>Abrir</button>
            <button className="btn mini" onClick={proximo}>Feito</button>
          </div>
        </>
      )}
      {!fim && !combo.aviso && <button className="btn mini fantasma combo-cancelar" onClick={encerrar}>Cancelar</button>}
    </div>
  );
}

const ACOES: { nome: string; texto: (cd: number) => string }[] = [
  { nome: 'Esquivar', texto: () => 'Até o seu próximo turno, ataques contra você têm desvantagem (se você vê o atacante) e você tem vantagem nas salvaguardas de DES.' },
  { nome: 'Disparada', texto: () => 'Você ganha deslocamento extra igual ao seu deslocamento neste turno.' },
  { nome: 'Desengajar', texto: () => 'Seu movimento não provoca ataques de oportunidade neste turno.' },
  { nome: 'Ajudar', texto: () => 'Um aliado tem vantagem no próximo teste com uma perícia sua, ou no próximo ataque contra um inimigo a até 1,5 m de você.' },
  { nome: 'Esconder', texto: () => 'Teste de Furtividade (CD 15), longe da vista e atrás de cobertura. No sucesso, você fica Invisível até fazer barulho, atacar ou ser achado.' },
  { nome: 'Empurrar', texto: (cd) => `No lugar de um ataque: o alvo faz salvaguarda de FOR ou DES (CD ${cd}) ou é empurrado 1,5 m ou fica Caído.` },
  { nome: 'Agarrar', texto: (cd) => `No lugar de um ataque: o alvo faz salvaguarda de FOR ou DES (CD ${cd}) ou fica Agarrado.` },
  { nome: 'Preparar', texto: () => 'Escolha um gatilho e uma ação. Quando o gatilho acontecer, use-a como reação. Magia preparada ocupa a concentração até lá.' },
  { nome: 'Usar objeto', texto: () => 'Usar um objeto que pede uma ação, como beber uma poção.' },
  { nome: 'Ataque de oportunidade', texto: () => 'Reação quando um inimigo sai do seu alcance. Com o Conjurador de Guerra, pode ser uma magia de 1 ação só nele.' },
];

/** Ações que valem para todo mundo e são fáceis de esquecer. */
export function AcoesBasicas() {
  const { r, c } = useJogo();
  const [aberta, setAberta] = useState<string | null>(null);
  const cd = 8 + modAtr(r, c, 'for') + proficiencia(r, c);
  const atual = ACOES.find((a) => a.nome === aberta);
  return (
    <section className="acoes-basicas" aria-label="Ações básicas">
      <div className="faint acoes-titulo">Ações básicas</div>
      <div className="acoes-chips">
        {ACOES.map((a) => (
          <button key={a.nome} className="acao-chip" aria-pressed={aberta === a.nome} onClick={() => setAberta(aberta === a.nome ? null : a.nome)}>{a.nome}</button>
        ))}
      </div>
      {atual && <p className="acao-regra">{atual.texto(cd)}</p>}
    </section>
  );
}
