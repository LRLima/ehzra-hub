/** Modo Combate (HUD) e Modo Testes/Exploração. */
import { useEffect, useState } from 'react';
import { PlusIcon, MinusIcon, TrashIcon, SunIcon, SkullIcon, CampfireIcon, XIcon } from '@phosphor-icons/react';
import { useJogo, useUI } from '../store';
import { SpellCard } from '../ui/components';
import {
  NOMES_ATRIBUTO, cicloMaximo, estaPreparada, fmtMod, habilidadeEfetiva, habilidadeVisivel, magiaEfetiva, modAtr, pericia,
  percepcaoPassiva, proficiencia, salvaguarda, toqueDaMorte, usaCeifadora,
} from '../domain/rules';
import { recursoRestante } from '../domain/state';
import type { Atributo, Spell } from '../domain/schemas';
import { novoId } from '../db/dexie';

type Parte = 'acao' | 'acaoBonus' | 'reacao' | 'movimento';
const PARTES: { id: Parte; rotulo: string }[] = [
  { id: 'acao', rotulo: 'Ação' }, { id: 'acaoBonus', rotulo: 'Bônus' }, { id: 'reacao', rotulo: 'Reação' }, { id: 'movimento', rotulo: 'Movimento' },
];

export function Combate() {
  const [modo, setModo] = useState<'combate' | 'testes'>('combate');
  return (
    <>
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

function useWakeLock(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const pedir = () => navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => undefined);
    pedir();
    const vis = () => document.visibilityState === 'visible' && pedir();
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => undefined); };
  }, [ativo]);
}

function Hud() {
  const { r, c, s, dispatch } = useJogo();
  const abrir = useUI((u) => u.abrir);
  const [parte, setParte] = useState<Parte>('acao');
  const [telaAcesa, setTelaAcesa] = useState(true);
  useWakeLock(!!s.combate && telaAcesa);

  const cicloMax = cicloMaximo(r, s.nivel);
  const magias = r.magias
    .map((m) => magiaEfetiva(r, m))
    .filter((m) => !m.perdida && m.tempo.tipo === parte && m.ciclo <= cicloMax && estaPreparada(m, s.preparadas))
    .sort((a, b) => Number(usaCeifadora(r, b)) - Number(usaCeifadora(r, a)) || Number(b.dano.length > 0) - Number(a.dano.length > 0) || a.ciclo - b.ciclo);
  const feats = r.habilidades.filter((f) => habilidadeVisivel(r, f) && f.gatilho === parte).map((f) => habilidadeEfetiva(r, f));
  const arma = r.character.armas[0];
  const atk = modAtr(r, c, arma.atributo) + proficiencia(r, c);
  const canal = recursoRestante(r, s, 'canalizar');
  const avatar = recursoRestante(r, s, 'avatar');

  return (
    <>
      {!s.combate ? (
        <button className="btn primario largo grande" onClick={() => dispatch({ t: 'iniciarCombate' }, { silencioso: true })}>Iniciar combate</button>
      ) : (
        <div className="row">
          <span className="grow" style={{ fontFamily: 'var(--font-display)' }}>Rodada <b className="num" style={{ color: 'var(--gold)', fontSize: 20 }} data-testid="rodada">{s.combate.rodada}</b></span>
          <label className="row faint" style={{ fontSize: 14, gap: 6 }}>
            <input type="checkbox" checked={telaAcesa} onChange={(e) => setTelaAcesa(e.target.checked)} /> Tela acesa
          </label>
          <button className="btn mini fantasma" onClick={() => dispatch({ t: 'encerrarCombate' })}>Encerrar</button>
        </div>
      )}

      <div className="turno" role="group" aria-label="O que posso fazer neste turno">
        {PARTES.map((p) => (
          <button key={p.id} aria-pressed={parte === p.id} className={s.combate && s.turno[p.id] ? 'gasto' : ''} onClick={() => setParte(p.id)}>{p.rotulo}</button>
        ))}
      </div>
      {s.combate && (
        <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 6 }}>
          <button className="btn mini fantasma" onClick={() => dispatch({ t: 'usarTurno', parte }, { silencioso: true })}>
            {s.turno[parte] ? 'Desmarcar' : 'Marcar'} {PARTES.find((p) => p.id === parte)!.rotulo.toLowerCase()} como usada
          </button>
        </div>
      )}

      <div className="stack" data-testid={`opcoes-${parte}`}>
        {parte === 'acao' && (
          <div className="card">
            <div className="row">
              <a className="grow" href="#/mais/ceifadora" style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)', textDecoration: 'none' }}>Atacar com a {arma.nome}</a>
              <span className="chip res">Ataque {fmtMod(atk)}</span>
            </div>
            <div className="chips">
              <span className="chip dano">{arma.dano} + {modAtr(r, c, arma.atributo)} {arma.tipo}</span>
              <span className="chip">{String(arma.alcanceMetros).replace('.', ',')} m</span>
              {canal && <span className="chip conc">Toque da Morte +{toqueDaMorte(c)}</span>}
            </div>
          </div>
        )}
        {parte === 'movimento' && (
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)' }}>Deslocamento {r.character.deslocamentoMetros.valor} m</div>
            <p className="muted" style={{ fontSize: 15, margin: '6px 0 0' }}>
              {s.efeitos.some((e) => e.origem === 'guardioes-espirituais') ? 'Guardiões Espirituais ativo: leve a aura até os inimigos. ' : ''}
              {s.mortosVivos.some((m) => m.fio) ? 'Fique a até 3 m de dois mortos-vivos para o +2 de CA do Fio da Obediência.' : 'Levantar do chão custa metade do deslocamento.'}
            </p>
          </div>
        )}
        {parte === 'acaoBonus' && s.mortosVivos.length > 0 && (
          <div className="card"><span style={{ fontFamily: 'var(--font-display)' }}>Comandar mortos-vivos</span><p className="muted" style={{ fontSize: 15, margin: '4px 0 0' }}>Animar Morto: todos a até 18 m recebem a mesma ordem.</p></div>
        )}
        {parte === 'reacao' && (
          <div className="card"><span style={{ fontFamily: 'var(--font-display)' }}>Ataque de oportunidade</span><p className="muted" style={{ fontSize: 15, margin: '4px 0 0' }}>Quando um inimigo sai do seu alcance. Com Conjurador de Guerra, pode conjurar uma magia de 1 ação nele.</p></div>
        )}
        {feats.map((f) => (
          <button key={f.id} className="card card-btn" onClick={() => abrir({ tipo: 'habilidade', id: f.id })}>
            <div className="topo row"><span className="grow" style={{ fontFamily: 'var(--font-display)' }}>{f.nome}</span>
              {f.recurso && <span className="chip">{recursoRestante(r, s, f.recurso)?.restante ?? '?'} usos</span>}</div>
            <p className="muted" style={{ fontSize: 15, margin: '4px 0 0' }}>{f.resumo}</p>
          </button>
        ))}
        {magias.map((m: Spell) => <SpellCard key={m.id} spell={m} />)}
        {magias.length === 0 && feats.length === 0 && parte !== 'acao' && parte !== 'movimento' && <p className="faint">Nada preparado para este tempo.</p>}
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
          <SunIcon size={18} color="var(--gold)" />
          <span className="grow">Avatar dos Quatro Túmulos {s.avatar ? <b style={{ color: 'var(--gold)' }}>· {r.homebrew.avatar.aspectos[s.avatar.aspecto - 1].nome}, {s.avatar.rodadas} rod.</b> : avatar && !avatar.restante ? <span className="faint">· usado</span> : null}</span>
          <a className="btn mini ouro" href="#/mais/avatar">Abrir</a>
        </div>
      </div>

      <Efeitos />
      <MortosVivos />

      {s.combate && (
        <div className="proxima">
          <button className="btn primario largo grande" onClick={() => dispatch({ t: 'proximaRodada' }, { silencioso: true })} data-testid="proxima-rodada">
            Próxima rodada
          </button>
        </div>
      )}
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
          <div key={e.id} className={`card efeito${e.rodadas === 0 ? ' expirou' : ''}`}>
            <button className="nome" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }} onClick={() => e.origem && abrir({ tipo: 'magia', id: e.origem })}>
              {e.nome}{e.concentracao && <span className="chip conc" style={{ marginLeft: 6 }}>Conc.</span>}
            </button>
            <span className="rodadas">{e.rodadas === null ? 'longa' : e.rodadas === 0 ? 'expirou?' : `${e.rodadas} rod.`}</span>
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

const MODELOS = {
  esqueleto: { nome: 'Esqueleto', pvMax: 13, ca: 14 },
  zumbi: { nome: 'Zumbi', pvMax: 15, ca: 8 },
} as const;

function MortosVivos() {
  const { s, dispatch } = useJogo();
  const add = (tipo: keyof typeof MODELOS) => {
    const m = MODELOS[tipo];
    const n = s.mortosVivos.filter((x) => x.tipo === tipo).length + 1;
    dispatch({ t: 'mortoVivoAdd', mv: { id: novoId(), nome: `${m.nome} ${n}`, tipo, pv: m.pvMax, pvMax: m.pvMax, ca: m.ca, fio: false, campeao: false, ordem: '' } });
  };
  return (
    <>
      <h3 className="section-h"><SkullIcon size={16} /> Mortos-vivos ({s.mortosVivos.length})</h3>
      <div className="stack">
        {s.mortosVivos.map((m) => {
          const ca = m.ca + (m.fio ? 2 : 0) + (m.campeao ? 3 : 0);
          const max = m.campeao ? m.pvMax * 3 : m.pvMax;
          return (
            <div key={m.id} className="card mv">
              <div>
                <div style={{ fontFamily: 'var(--font-display)' }}>{m.nome}</div>
                <div className="faint num" style={{ fontSize: 13.5 }}>CA {ca}{m.fio ? ' (Fio +2 perto de outro)' : ''}{m.campeao ? ' · Campeão' : ''}</div>
              </div>
              <div className="pvline">
                <button className="icon-btn" aria-label="−1 PV" onClick={() => dispatch({ t: 'mortoVivoAtualizar', id: m.id, pv: m.pv - 1 }, { silencioso: true })}><MinusIcon size={16} /></button>
                <span className="num" style={{ minWidth: 52, textAlign: 'center', color: m.pv === 0 ? 'var(--hp-fg)' : undefined }}>{m.pv}/{max}</span>
                <button className="icon-btn" aria-label="+1 PV" onClick={() => dispatch({ t: 'mortoVivoAtualizar', id: m.id, pv: m.pv + 1 }, { silencioso: true })}><PlusIcon size={16} /></button>
              </div>
              <div className="row" style={{ gridColumn: '1 / -1' }}>
                <label className="row" style={{ gap: 4, fontSize: 14 }}><input type="checkbox" checked={m.fio} onChange={(e) => dispatch({ t: 'mortoVivoAtualizar', id: m.id, fio: e.target.checked }, { silencioso: true })} /> Fio</label>
                <label className="row" style={{ gap: 4, fontSize: 14 }}><input type="checkbox" checked={m.campeao} onChange={(e) => dispatch({ t: 'mortoVivoAtualizar', id: m.id, campeao: e.target.checked }, { silencioso: true })} /> Campeão</label>
                <input className="input grow" style={{ minHeight: 36 }} placeholder="Ordem" aria-label={`Ordem para ${m.nome}`} defaultValue={m.ordem}
                  onBlur={(e) => e.target.value !== m.ordem && dispatch({ t: 'mortoVivoAtualizar', id: m.id, ordem: e.target.value }, { silencioso: true })} />
                <button className="icon-btn" aria-label={`Remover ${m.nome}`} onClick={() => dispatch({ t: 'mortoVivoRemover', id: m.id })}><TrashIcon size={16} /></button>
              </div>
            </div>
          );
        })}
        <div className="row">
          <button className="btn grow" onClick={() => add('esqueleto')}><PlusIcon size={16} />Esqueleto</button>
          <button className="btn grow" onClick={() => add('zumbi')}><PlusIcon size={16} />Zumbi</button>
        </div>
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
