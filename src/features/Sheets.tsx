/** Folhas que sobem de baixo: magia, habilidade, condição, busca, PV, mana, descanso. */
import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { BackspaceIcon, SparkleIcon, BedIcon, CoffeeIcon, WarningIcon } from '@phosphor-icons/react';
import { useJogo, useUI, type Aberto } from '../store';
import { Sheet, SpellChips, SeloDe, Markdown, SpellCard, TEMPO_CURTO } from '../ui/components';
import {
  alvosMagia, cicloMaximo, custoMana, curaMagia, danoMagia, estaPreparada, habilidadeEfetiva, magia as achaMagia,
  manaMaxima, metrosParaPes, podeConjurar, resolucaoTexto, usaCeifadora, toqueDaMorte, dadosQueimarMortos, habilidadeVisivel,
} from '../domain/rules';
import { pvMaximo, recursoRestante } from '../domain/state';

export function Sheets() {
  const pilha = useUI((u) => u.pilha);
  const topo = pilha[pilha.length - 1];
  if (!topo) return null;
  return <SheetPara a={topo} key={JSON.stringify(topo) + pilha.length} />;
}

function SheetPara({ a }: { a: Aberto }) {
  switch (a.tipo) {
    case 'magia': return <MagiaSheet id={a.id} cicloInicial={a.ciclo} />;
    case 'habilidade': return <HabilidadeSheet id={a.id} />;
    case 'condicao': return <CondicaoSheet id={a.id} />;
    case 'busca': return <BuscaSheet />;
    case 'pv': return <PvSheet />;
    case 'mana': return <ManaSheet />;
    case 'descanso': return <DescansoSheet />;
  }
}

function Relacionada({ id }: { id: string }) {
  const { r } = useJogo();
  const abrir = useUI((u) => u.abrir);
  const sp = r.magias.find((m) => m.id === id);
  const f = r.habilidades.find((h) => h.id === id);
  const arma = r.character.armas.find((x) => x.id === id);
  const nome = sp?.nome ?? f?.nome ?? arma?.nome ?? id;
  const alvo: Aberto | null = sp ? { tipo: 'magia', id } : f ? { tipo: 'habilidade', id } : null;
  return alvo ? <button className="btn mini fantasma ouro" onClick={() => abrir(alvo)}>{nome}</button> : <span className="chip">{nome}</span>;
}

// ---------- magia ----------
function MagiaSheet({ id, cicloInicial }: { id: string; cicloInicial?: number }) {
  const { r, c, s, dispatch } = useJogo();
  const { fechar, fecharTudo } = useUI();
  const sp = achaMagia(r, id);
  const bruta = r.magias.find((m) => m.id === id)!;
  const aprovado = r.character.aprovacoes2024.includes(id);
  const max = Math.max(sp.ciclo, cicloMaximo(r, s.nivel));
  const [ciclo, setCiclo] = useState(Math.max(sp.ciclo, cicloInicial ?? sp.ciclo));
  const pode = podeConjurar(r, { nivel: s.nivel, mana: s.mana, ciclosAltosUsados: s.ciclosAltosUsados }, sp, ciclo);
  const danos = danoMagia(r, c, sp, ciclo);
  const cura = curaMagia(r, c, sp, ciclo);
  const alvos = alvosMagia(sp, ciclo);
  const res = resolucaoTexto(r, c, sp);
  const troca = sp.concentracao && s.concentracao && s.concentracao.magia !== id ? achaMagia(r, s.concentracao.magia).nome : null;
  const preparada = estaPreparada(sp, s.preparadas);
  const fixa = sp.ciclo === 0 || sp.origens.some((o) => o === 'dominio' || o === 'ceifadora');

  async function conjurar() {
    await dispatch({
      t: 'conjurar', magia: id, ciclo, custo: custoMana(r, sp, ciclo), viaCeifadora: usaCeifadora(r, sp),
      concentracao: sp.concentracao, rodadas: sp.duracao.rodadas, tempo: sp.tempo.tipo,
    });
    fecharTudo();
  }

  return (
    <Sheet
      label={sp.nome}
      titulo={sp.nome}
      sub={[sp.nomeOriginal, `${sp.ciclo === 0 ? 'Truque' : `${sp.ciclo}º ciclo`} de ${sp.escola}${sp.ritual ? ' (ritual)' : ''}`].filter(Boolean).join(' · ')}
      extra={<SeloDe id={id} status={sp.status2024} />}
      onClose={fechar}
    >
      <SpellChips spell={sp} ciclo={ciclo} />

      {sp.ciclo > 0 && (
        <div className="ciclos" role="group" aria-label="Ciclo">
          {Array.from({ length: Math.max(1, max - sp.ciclo + 1) }, (_, i) => sp.ciclo + i).map((n) => (
            <button key={n} aria-pressed={n === ciclo} onClick={() => setCiclo(n)} className="num">{n}º</button>
          ))}
        </div>
      )}

      {(danos.length > 0 || cura || alvos || res) && (
        <div className="linhas">
          {res && <div className="linha"><span>{sp.resolucao?.tipo === 'ataque' ? 'Jogada de ataque' : 'Salvaguarda'}</span><span className="expr">{res}{sp.resolucao?.tipo === 'salvaguarda' && sp.resolucao.metadeNoSucesso ? <small> metade no sucesso</small> : null}</span></div>}
          {danos.map((d, i) => (
            <div className="linha" key={i}>
              <span>{d.rotulo ?? 'Dano'}{d.condicao && <div className="faint" style={{ fontSize: 13.5 }}>{d.condicao}</div>}</span>
              <span className="expr">{d.expr} <small>{d.tipo} · média {d.media}</small></span>
            </div>
          ))}
          {cura && <div className="linha"><span>{cura.pvTemporario ? 'PV temporários' : 'Cura'}</span><span className="expr">{cura.expr} <small>média {cura.media}</small></span></div>}
          {alvos && <div className="linha"><span>Alvos</span><span className="expr">{alvos}</span></div>}
          {sp.alcance.metros && <div className="linha"><span>Alcance</span><span className="expr">{sp.alcance.texto} <small>{sp.alcance.pes ?? metrosParaPes(sp.alcance.metros)} pés</small></span></div>}
          {sp.area && <div className="linha"><span>Área</span><span className="expr" style={{ fontSize: 15 }}>{sp.area}</span></div>}
        </div>
      )}

      {troca && <div className="aviso perigo">Conjurar encerra a concentração em <b>{troca}</b>.</div>}
      {sp.cicloNota && <div className="aviso">{sp.cicloNota}</div>}
      {!pode.ok && <div className="aviso">{pode.motivo}</div>}
      {s.turno.cicloGasto && ciclo > 0 && s.combate && <div className="aviso">Você já gastou uma magia com ciclo neste turno (regra 2024: só uma por turno).</div>}

      <div className="row" style={{ margin: '12px 0' }}>
        <button className="btn primario grande grow" disabled={!pode.ok} onClick={conjurar}>
          <SparkleIcon size={20} />Conjurar{ciclo > 0 ? ` (${custoMana(r, sp, ciclo)} mana)` : ''}
        </button>
      </div>

      <p className="muted" style={{ fontSize: 15.5 }}>{sp.resumo}</p>
      {sp.alvo && <p className="faint">Alvo: {sp.alvo}</p>}
      {sp.material && <p className="faint">Material: {sp.material}</p>}
      <p className="faint">Componentes: {[sp.componentes.v && 'V', sp.componentes.s && 'S', sp.componentes.m && 'M'].filter(Boolean).join(', ') || 'nenhum'} · {TEMPO_CURTO[sp.tempo.tipo] ?? sp.tempo.texto} · {sp.duracao.texto}</p>

      {sp.descricaoCompleta ? <Markdown md={sp.descricaoCompleta} /> : (
        <div className="box">Nenhuma anotação sobreviveu no grimório para esta magia. Talvez tenha se perdido nas cinzas de Fervora.</div>
      )}

      {bruta.v2024 && (
        <div className="box v2024">
          <h4>{aprovado ? 'Versão 2024 em uso' : r.character.recusadas2024.includes(id) ? 'Versão 2024 (recusada: vale a ficha)' : `Versão 2024 (não aplicada${bruta.itemValidacao ? `, item ${bruta.itemValidacao}` : ''})`}</h4>
          <div>{bruta.v2024.texto}</div>
        </div>
      )}

      {sp.relacionadas.length > 0 && (
        <>
          <h3 className="section-h">Relacionadas</h3>
          <div className="row">{sp.relacionadas.map((x) => <Relacionada key={x} id={x} />)}</div>
        </>
      )}

      <p className="faint" style={{ fontSize: 13.5, marginTop: 16 }}>Fonte: {sp.fonte}.</p>
      {!fixa && (
        <button className="btn mini fantasma" onClick={() => dispatch({ t: 'preparar', magia: id, preparada: !preparada })}>
          {preparada ? 'Tirar das preparadas' : 'Preparar'}
        </button>
      )}
    </Sheet>
  );
}

// ---------- habilidade ----------
function HabilidadeSheet({ id }: { id: string }) {
  const { r, c, s, dispatch } = useJogo();
  const fechar = useUI((u) => u.fechar);
  const bruta = r.habilidades.find((h) => h.id === id);
  if (!bruta) return null;
  const f = habilidadeEfetiva(r, bruta);
  const aprovado = r.character.aprovacoes2024.includes(id);
  const rec = f.recurso ? recursoRestante(r, s, f.recurso) : null;
  const extra =
    id === 'toque-da-morte' ? `Dano extra agora: ${toqueDaMorte(c)} necrótico.`
    : id === 'queimar-os-mortos-vivos' ? `Role ${dadosQueimarMortos(r, c)}d8 radiante.`
    : null;
  return (
    <Sheet label={f.nome} titulo={f.nome} sub={[f.nomeOriginal, f.origem].filter(Boolean).join(' · ')} extra={<SeloDe id={id} status={f.status2024} />} onClose={fechar}>
      <p className="muted">{f.resumo}</p>
      {extra && <div className="aviso">{extra}</div>}
      {rec && (
        <div className="row" style={{ margin: '10px 0' }}>
          <span className="grow">{rec.habilidade.nome}: <b className="num">{rec.restante}/{rec.max}</b></span>
          <button className="btn ouro" disabled={rec.restante <= 0} onClick={() => dispatch({ t: 'usarRecurso', recurso: f.recurso!, qtd: 1 })}>Usar</button>
        </div>
      )}
      <Markdown md={f.texto} />
      {bruta.v2024 && (
        <div className="box v2024">
          <h4>{aprovado ? 'Versão 2024 em uso' : r.character.recusadas2024.includes(id) ? 'Versão 2024 (recusada: vale a ficha)' : `Versão 2024 (não aplicada${bruta.itemValidacao ? `, item ${bruta.itemValidacao}` : ''})`}</h4>
          <div>{bruta.v2024.texto}</div>
        </div>
      )}
      {f.relacionadas.length > 0 && <div className="row" style={{ marginTop: 12 }}>{f.relacionadas.map((x) => <Relacionada key={x} id={x} />)}</div>}
    </Sheet>
  );
}

function CondicaoSheet({ id }: { id: string }) {
  const { r, s, dispatch } = useJogo();
  const fechar = useUI((u) => u.fechar);
  const cond = r.condicoes.find((x) => x.id === id);
  if (!cond) return null;
  const ativa = s.condicoes.includes(id);
  return (
    <Sheet label={cond.nome} titulo={cond.nome} sub={cond.nomeOriginal} onClose={fechar}>
      <ul className="desc">{cond.efeitos.map((e) => <li key={e}>{e}</li>)}</ul>
      {id === 'exaustao' ? (
        <div className="row"><span className="grow">Nível atual: <b className="num">{s.exaustao}</b></span>
          <button className="btn" onClick={() => dispatch({ t: 'exaustao', delta: -1 })} disabled={s.exaustao === 0}>−1</button>
          <button className="btn" onClick={() => dispatch({ t: 'exaustao', delta: 1 })}>+1</button>
        </div>
      ) : (
        <button className={`btn largo ${ativa ? '' : 'ouro'}`} onClick={() => dispatch({ t: 'condicao', condicao: id, ativa: !ativa })}>
          {ativa ? 'Remover de mim' : 'Estou com esta condição'}
        </button>
      )}
    </Sheet>
  );
}

// ---------- busca (lupa e Ctrl+K) ----------
type Resultado =
  | { tipo: 'magia'; id: string; nome: string; extra: string }
  | { tipo: 'habilidade'; id: string; nome: string; extra: string }
  | { tipo: 'condicao'; id: string; nome: string; extra: string }
  | { tipo: 'item'; id: string; nome: string; extra: string }
  | { tipo: 'estrategia'; id: string; nome: string; extra: string };

function BuscaSheet() {
  const { r, s } = useJogo();
  const { fechar, abrir, fecharTudo } = useUI();
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const fonte = useMemo<Resultado[]>(() => [
    ...r.magias.map((m) => ({ tipo: 'magia' as const, id: m.id, nome: m.nome, extra: [m.nomeOriginal, m.resumo, m.tags.join(' ')].join(' ') })),
    ...r.habilidades.filter((f) => habilidadeVisivel(r, f)).map((f) => ({ tipo: 'habilidade' as const, id: f.id, nome: f.nome, extra: [f.nomeOriginal, f.resumo].join(' ') })),
    ...r.condicoes.map((x) => ({ tipo: 'condicao' as const, id: x.id, nome: x.nome, extra: x.nomeOriginal })),
    ...s.inventario.map((i) => ({ tipo: 'item' as const, id: i.id, nome: i.nome, extra: i.nota ?? '' })),
    ...r.playbooks.map((p) => ({ tipo: 'estrategia' as const, id: p.id, nome: p.nome, extra: p.resumo })),
  ], [r, s.inventario]);
  const fuse = useMemo(() => new Fuse(fonte, { keys: [{ name: 'nome', weight: 3 }, 'extra'], threshold: 0.38, ignoreDiacritics: true }), [fonte]);
  const res = q.trim() ? fuse.search(q.trim(), { limit: 12 }).map((x) => x.item) : [];
  const recentes = r.magias.filter((m) => m.ciclo <= cicloMaximo(r, s.nivel) && estaPreparada(m, s.preparadas) && m.dano.length > 0).slice(0, 6);
  const ROT = { magia: 'Magia', habilidade: 'Habilidade', condicao: 'Condição', item: 'Item', estrategia: 'Estratégia' };

  return (
    <Sheet label="Buscar" titulo="Buscar" onClose={fechar}>
      <input ref={ref} className="search-input" type="search" placeholder="Magia, habilidade, condição, item..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
      <div className="stack" style={{ marginTop: 12 }}>
        {(q.trim() ? res : recentes.map((m) => ({ tipo: 'magia' as const, id: m.id, nome: m.nome, extra: '' }))).map((x) =>
          x.tipo === 'magia' ? (
            <SpellCard key={x.id} spell={achaMagia(r, x.id)} />
          ) : (
            <button key={x.tipo + x.id} className="card card-btn" onClick={() => {
              if (x.tipo === 'item') { fecharTudo(); location.hash = '/sessao'; return; }
              if (x.tipo === 'estrategia') { fecharTudo(); location.hash = `/mais/estrategias/${x.id}`; return; }
              abrir({ tipo: x.tipo, id: x.id });
            }}>
              <div className="tipo">{ROT[x.tipo]}</div>
              <div style={{ fontFamily: 'var(--font-display)' }}>{x.nome}</div>
            </button>
          ),
        )}
        {q.trim() && res.length === 0 && <p className="faint">Nada encontrado para "{q}".</p>}
      </div>
    </Sheet>
  );
}

// ---------- PV: teclado numérico ----------
function PvSheet() {
  const { r, s, dispatch } = useJogo();
  const fechar = useUI((u) => u.fechar);
  const [v, setV] = useState('');
  const n = Number(v) || 0;
  const max = pvMaximo(r, s);
  const absorve = Math.min(s.pvTemp, n);
  const prevDano = Math.max(0, s.pv - (n - absorve));
  const prevCura = Math.min(max, s.pv + n);
  const tecla = (d: string) => setV((x) => (x + d).replace(/^0+/, '').slice(0, 3));
  const ok = async (e: 'dano' | 'cura' | 'pvTemp') => {
    if (!n) return;
    await dispatch(e === 'pvTemp' ? { t: 'pvTemp', valor: n } : { t: e, valor: n });
    fechar();
  };
  return (
    <Sheet label="Pontos de vida" titulo="Pontos de vida" sub={`${s.pv}/${max}${s.pvTemp ? ` · ${s.pvTemp} temporários` : ''}`} onClose={fechar}>
      <div className="numpad-display" aria-live="polite">{v || '0'}</div>
      <div className="numpad-prev">
        {n > 0 && <>Dano: {s.pv} → <b style={{ color: 'var(--hp-fg)' }}>{prevDano}</b>{absorve ? ` (−${absorve} temp)` : ''} · Cura: {s.pv} → <b style={{ color: 'var(--heal)' }}>{prevCura}</b></>}
      </div>
      <div className="numpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => tecla(d)}>{d}</button>)}
        <button onClick={() => setV('')} aria-label="Limpar">C</button>
        <button onClick={() => tecla('0')}>0</button>
        <button onClick={() => setV((x) => x.slice(0, -1))} aria-label="Apagar"><BackspaceIcon size={22} /></button>
      </div>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <button className="btn dano grande grow" disabled={!n} onClick={() => ok('dano')}>Dano</button>
        <button className="btn cura grande grow" disabled={!n} onClick={() => ok('cura')}>Cura</button>
      </div>
      <button className="btn largo" style={{ marginTop: 8 }} disabled={!n} onClick={() => ok('pvTemp')}>Definir PV temporário</button>
    </Sheet>
  );
}

function ManaSheet() {
  const { r, s, dispatch } = useJogo();
  const fechar = useUI((u) => u.fechar);
  const max = manaMaxima(r, s.nivel);
  return (
    <Sheet label="Mana" titulo="Mana" sub={`${s.mana}/${max} · até o ${cicloMaximo(r, s.nivel)}º ciclo`} onClose={fechar}>
      <div className="linhas">
        {r.homebrew.mana.custoPorCiclo.slice(0, cicloMaximo(r, s.nivel)).map((custo, i) => (
          <div className="linha" key={i}><span>{i + 1}º ciclo</span><span className="expr">{custo} <small>pela Ceifadora {Math.floor(custo / 2)}</small></span></div>
        ))}
      </div>
      <p className="faint">Ajuste manual (poção, erro de conta):</p>
      <div className="row">
        {[-5, -1, 1, 5].map((d) => <button key={d} className="btn grow" onClick={() => dispatch({ t: 'mana', delta: d })}>{d > 0 ? `+${d}` : `−${-d}`}</button>)}
      </div>
    </Sheet>
  );
}

function DescansoSheet() {
  const { r, s, dispatch } = useJogo();
  const fechar = useUI((u) => u.fechar);
  const [pv, setPv] = useState('');
  const max = pvMaximo(r, s);
  const canal = recursoRestante(r, s, 'canalizar');
  const voltaCurto = canal?.habilidade.usos?.recuperaNoCurto ?? 0;
  const resumoLongo = [
    s.pv < max && `PV ${s.pv} → ${max}`,
    s.mana < manaMaxima(r, s.nivel) && `Mana ${s.mana} → ${manaMaxima(r, s.nivel)}`,
    canal && canal.restante < canal.max && `Canalizar Divindade ${canal.restante} → ${canal.max}`,
    s.usos.avatar && 'Avatar disponível de novo',
    s.ciclosAltosUsados.length > 0 && 'Ciclos 6+ liberados',
    s.concentracao && 'Concentração encerrada',
    s.exaustao > 0 && `Exaustão ${s.exaustao} → ${s.exaustao - 1}`,
    s.pvTemp > 0 && 'PV temporários zerados',
  ].filter(Boolean) as string[];

  return (
    <Sheet label="Descanso" titulo="Descansar" onClose={fechar}>
      <h3 className="section-h" style={{ marginTop: 4 }}><CoffeeIcon size={16} /> Descanso curto</h3>
      <div className="campo">
        <label htmlFor="dv">PV recuperados com Dados de Vida (d8 + 2 cada, role na mesa)</label>
        <input id="dv" className="input num" inputMode="numeric" value={pv} onChange={(e) => setPv(e.target.value.replace(/\D/g, ''))} />
      </div>
      <p className="faint" style={{ fontSize: 15 }}>
        {voltaCurto ? `Canalizar Divindade recupera ${voltaCurto} uso.` : 'Pela ficha, Canalizar Divindade só volta no descanso longo (item H1 do relatório 2024).'}
      </p>
      <button className="btn largo" onClick={async () => { await dispatch({ t: 'descanso', tipo: 'curto', pvDadosDeVida: Number(pv) || 0 }); fechar(); }}>Fazer descanso curto</button>

      <h3 className="section-h"><BedIcon size={16} /> Descanso longo</h3>
      {resumoLongo.length ? <ul className="desc" style={{ fontSize: 15.5 }}>{resumoLongo.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="faint">Você já está com tudo cheio.</p>}
      <p className="faint" style={{ fontSize: 14 }}><WarningIcon size={14} /> O Avatar recarrega ao amanhecer; o app trata isso junto com o descanso longo.</p>
      <button className="btn primario largo grande" onClick={async () => { await dispatch({ t: 'descanso', tipo: 'longo', pvDadosDeVida: 0 }); fechar(); }}>Fazer descanso longo</button>
    </Sheet>
  );
}
