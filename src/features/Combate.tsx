/** Modo Combate (HUD) e Modo Testes/Exploração. */
import { AcoesBasicas, ComboBar, CombosDoTurno } from './Combos';
import { useState } from 'react';
import { SkullIcon, CampfireIcon, XIcon, SwordIcon } from '@phosphor-icons/react';
import { useJogo, useUI } from '../store';
import { SpellCard, Grupo, catDe } from '../ui/components';
import { Palco } from './Palco';
import {
  NOMES_ATRIBUTO, cicloMaximo, estaPreparada, fmtMod, habilidadeEfetiva, habilidadeVisivel, magiaEfetiva, modAtr, pericia,
  percepcaoPassiva, proficiencia, salvaguarda, toqueDaMorte, usaCeifadora,
} from '../domain/rules';
import { recursoRestante } from '../domain/state';
import type { Atributo, Spell } from '../domain/schemas';

type Parte = 'acao' | 'acaoBonus' | 'reacao' | 'movimento';
const PARTES: { id: Parte; rotulo: string }[] = [
  { id: 'acao', rotulo: 'Ação' }, { id: 'acaoBonus', rotulo: 'Bônus' }, { id: 'reacao', rotulo: 'Reação' }, { id: 'movimento', rotulo: 'Movimento' },
];

export function Combate() {
  const [modo, setModo] = useState<'combate' | 'testes'>('combate');
  return (
    <>
      <Palco />
      <Status />
      <div className="segmented" style={{ margin: '12px 0' }} role="group" aria-label="Modo">
        <button aria-pressed={modo === 'combate'} onClick={() => setModo('combate')}>Combate</button>
        <button aria-pressed={modo === 'testes'} onClick={() => setModo('testes')}>Testes e exploração</button>
      </div>
      {modo === 'combate' ? <Hud /> : <Testes />}
    </>
  );
}

function Status() {
  const { r, s, dispatch } = useJogo();
  const abrir = useUI((u) => u.abrir);
  const ca = r.character.ca.valor;
  return (
    <div className="status-strip">
      <div><div className="v">{ca}</div><div className="k">CA</div></div>
      <div><div className="v">{fmtMod(r.character.iniciativa.valor)}</div><div className="k">Inic.</div></div>
      <button className={s.inspiracao ? 'on' : 'off'} onClick={() => dispatch({ t: 'inspiracao', delta: s.inspiracao ? -1 : 1 })} aria-pressed={s.inspiracao > 0}>
        <div className="v">{s.inspiracao ? '★' : '☆'}</div><div className="k">Inspiração</div>
      </button>
      <button onClick={() => abrir({ tipo: 'descanso' })}>
        <div className="v"><CampfireIcon size={20} /></div><div className="k">Descansar</div>
      </button>
    </div>
  );
}

function Hud() {
  const { r, c, s, dispatch } = useJogo();
  const abrir = useUI((u) => u.abrir);
  const [parte, setParte] = useState<Parte>('acao');

  const cicloMax = cicloMaximo(r, s.nivel);
  const magias = r.magias
    .map((m) => magiaEfetiva(r, m))
    .filter((m) => !m.perdida && m.tempo.tipo === parte && m.ciclo <= cicloMax && estaPreparada(m, s.preparadas))
    .sort((a, b) => Number(usaCeifadora(r, b)) - Number(usaCeifadora(r, a)) || Number(b.dano.length > 0) - Number(a.dano.length > 0) || a.ciclo - b.ciclo);
  const feats = r.habilidades.filter((f) => habilidadeVisivel(r, f) && f.gatilho === parte).map((f) => habilidadeEfetiva(r, f));
  const arma = r.character.armas[0];
  const atk = modAtr(r, c, arma.atributo) + proficiencia(r, c);
  const canal = recursoRestante(r, s, 'canalizar');
  const ciclos = [...new Set(magias.map((m: Spell) => m.ciclo))].sort((a, b) => a - b);
  const lancar = useUI((u) => u.lancar);
  const atacar = () => lancar(arma.nome, 'fisico');

  return (
    <>
      <div className="turno" role="group" aria-label="O que posso fazer neste turno">
        {PARTES.map((p) => (
          <button key={p.id} aria-pressed={parte === p.id} onClick={() => setParte(p.id)}>{p.rotulo}</button>
        ))}
      </div>

      <ComboBar />
      <div className="grupos page-in" key={parte} data-testid={`opcoes-${parte}`}>
        {parte === 'acao' && (
          <Grupo cat="fisico" titulo="Ataque físico" nota="só gasta a ação">
            <div className="card atk-card">
              <div className="row">
                <a className="grow nome" href="#/mais/ceifadora">{arma.nome}</a>
                <span className="chip res">{fmtMod(atk)} para acertar</span>
              </div>
              <div className="chips">
                <span className="chip dano">{arma.dano} + {modAtr(r, c, arma.atributo)} {arma.tipo}</span>
                <span className="chip">{String(arma.alcanceMetros).replace('.', ',')} m</span>
                {canal && r.habilidades.some((f) => f.id === 'toque-da-morte') && <span className="chip hab">Toque da Morte +{toqueDaMorte(c)}</span>}
              </div>
              <button className="btn mini aco" onClick={atacar}><SwordIcon size={16} />Atacar</button>
            </div>
          </Grupo>
        )}
        {parte !== 'movimento' && <CombosDoTurno parte={parte} />}
        {parte === 'reacao' && (
          <Grupo cat="fisico" titulo="Ataque físico" nota="só gasta a reação">
            <div className="card atk-card"><span className="nome">Ataque de oportunidade</span><p className="muted" style={{ fontSize: 15, margin: '4px 0 0' }}>Quando um inimigo sai do seu alcance. Com Conjurador de Guerra, pode conjurar uma magia de 1 ação nele.</p></div>
          </Grupo>
        )}
        {parte === 'movimento' && (
          <Grupo cat="fisico" titulo="Movimento" nota="sem custo">
            <div className="card atk-card">
              <span className="nome">Deslocamento {r.character.deslocamentoMetros.valor} m</span>
              <p className="muted" style={{ fontSize: 15, margin: '6px 0 0' }}>
                {s.efeitos.some((e) => e.origem === 'guardioes-espirituais') ? 'Guardiões ativos: atravesse os inimigos, e a aura os acerta agora e de novo no fim do turno deles. ' : ''}
                Levantar do chão custa metade do deslocamento.
              </p>
            </div>
          </Grupo>
        )}
        {feats.length > 0 && (
          <Grupo cat="habilidade" titulo="Habilidades" nota="usos por descanso" n={feats.length}>
            {feats.map((f) => (
              <button key={f.id} className="card card-btn" onClick={() => abrir({ tipo: 'habilidade', id: f.id })}>
                <div className="topo row"><span className="grow nome">{f.nome}</span>
                  {f.recurso && <span className="chip">{recursoRestante(r, s, f.recurso)?.restante ?? '?'} usos</span>}
                  {f.custoInspiracao && <span className="chip">1 Inspiração</span>}</div>
                <p className="muted" style={{ fontSize: 15, margin: '4px 0 0' }}>{f.resumo}</p>
              </button>
            ))}
          </Grupo>
        )}
        {ciclos.map((ciclo) => {
          const ms = magias.filter((m: Spell) => m.ciclo === ciclo);
          return (
            <Grupo key={ciclo} cat={catDe(ciclo)} titulo={ciclo === 0 ? 'Truques' : `${ciclo}º ciclo`} n={ms.length}
              nota={ciclo === 0 ? 'sem custo de mana' : `${r.homebrew.mana.custoPorCiclo[ciclo - 1]} de mana`}>
              {ms.map((m: Spell) => <SpellCard key={m.id} spell={m} />)}
            </Grupo>
          );
        })}
        {magias.length === 0 && feats.length === 0 && parte !== 'acao' && parte !== 'movimento' && <p className="faint">Nada preparado para este tempo.</p>}
        {parte === 'acao' && <AcoesBasicas />}
      </div>

      <h3 className="section-h">Recursos</h3>
      <div className="stack">
        {canal && (
          <div className="card recurso">
            <span className="grow">Canalizar Divindade</span>
            <span className="pips" aria-label={`${canal.restante} de ${canal.max}`}>{Array.from({ length: canal.max }, (_, i) => <i key={i} className={i < canal.restante ? 'on' : ''} />)}</span>
            <button className="btn mini ouro" disabled={!canal.restante} onClick={() => dispatch({ t: 'usarRecurso', recurso: 'canalizar', qtd: 1 })}>Usar</button>
          </div>
        )}
        <div className="card recurso">
          <SkullIcon size={18} color="var(--cat-habilidade)" />
          <span className="grow">Epitáfio {s.efeitos.some((e) => e.id === 'epitafio') ? <b style={{ color: 'var(--cat-habilidade)' }}>· alvo marcado</b> : <span className="faint">· 1 Inspiração</span>}</span>
          <button className="btn mini ouro" onClick={() => abrir({ tipo: 'habilidade', id: 'epitafio' })}>Abrir</button>
        </div>
      </div>

      <Efeitos />
    </>
  );
}

function Efeitos() {
  const { r, s, dispatch } = useJogo();
  const abrir = useUI((u) => u.abrir);
  if (!s.efeitos.length && !s.condicoes.length && !s.exaustao) return null;
  return (
    <>
      <h3 className="section-h">Efeitos ativos</h3>
      <div className="stack" data-testid="efeitos">
        {s.efeitos.map((e) => (
          <div key={e.id} className="card efeito">
            <button className="nome" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }} onClick={() => e.origem && abrir({ tipo: 'magia', id: e.origem })}>
              {e.nome}{e.concentracao && <span className="chip conc" style={{ marginLeft: 6 }}>Conc.</span>}
            </button>
            <button className="icon-btn" aria-label={`Encerrar ${e.nome}`} onClick={() => dispatch({ t: 'efeitoRemover', efeito: e.id })}><XIcon size={16} /></button>
          </div>
        ))}
        {(s.condicoes.length > 0 || s.exaustao > 0) && (
          <div className="chips">
            {s.condicoes.map((id) => <button key={id} className="chip dano" onClick={() => abrir({ tipo: 'condicao', id })}>{r.condicoes.find((x) => x.id === id)?.nome ?? id}</button>)}
            {s.exaustao > 0 && <button className="chip dano" onClick={() => abrir({ tipo: 'condicao', id: 'exaustao' })}>Exaustão {s.exaustao}</button>}
          </div>
        )}
      </div>
    </>
  );
}



function Testes() {
  const { r, c, s } = useJogo();
  const ATR: Atributo[] = ['for', 'des', 'con', 'int', 'sab', 'car'];
  const utilidades = r.magias
    .map((m) => magiaEfetiva(r, m))
    .filter((m) => !m.perdida && estaPreparada(m, s.preparadas) && m.ciclo <= cicloMaximo(r, s.nivel) && (m.ritual || m.tags.includes('utilidade')));
  return (
    <>
      <div className="grade">
        <div className="card"><span>Percepção passiva</span><span className="v">{percepcaoPassiva(r, c)}</span></div>
        <div className="card"><span>Iniciativa</span><span className="v">{fmtMod(r.character.iniciativa.valor)}</span></div>
      </div>
      <h3 className="section-h">Salvaguardas</h3>
      <div className="grade">
        {ATR.map((a) => (
          <div key={a} className={`card${r.character.salvaguardasProficientes.includes(a) ? ' prof' : ''}`}>
            <span className="n">{NOMES_ATRIBUTO[a]}</span><span className="v">{fmtMod(salvaguarda(r, c, a))}</span>
          </div>
        ))}
      </div>
      <h3 className="section-h">Perícias</h3>
      <div className="grade" data-testid="pericias">
        {r.character.pericias.map((p) => (
          <div key={p.nome} className={`card${p.proficiente ? ' prof' : ''}`}>
            <span className="n">{p.nome}</span><span className="v">{fmtMod(pericia(r, c, p.nome))}</span>
          </div>
        ))}
      </div>
      <h3 className="section-h">Rituais e utilidade</h3>
      <div className="stack">{utilidades.map((m) => <SpellCard key={m.id} spell={m} />)}</div>
    </>
  );
}
