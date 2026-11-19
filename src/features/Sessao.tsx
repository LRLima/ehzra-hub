/** Sessão: notas por sessão, inventário, ouro, log automático e diário original. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PlusIcon, MinusIcon, TrashIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { useJogo } from '../store';
import { novoId } from '../db/dexie';
import { descrever } from '../domain/log';
import { anulados } from '../domain/state';
import { carregarLore } from '../domain/data';

const lore = carregarLore();

export function Sessao() {
  return (
    <>
      <h1 className="page-title">Sessão</h1>
      <Notas />
      <Inventario />
      <Log />
      <Diario />
    </>
  );
}

function Notas() {
  const { s, dispatch } = useJogo();
  const ordenadas = [...s.sessoes].sort((a, b) => b.criadaEm - a.criadaEm);
  const [atual, setAtual] = useState<string | null>(ordenadas[0]?.id ?? null);
  const sessao = s.sessoes.find((x) => x.id === atual) ?? ordenadas[0];
  const [texto, setTexto] = useState(sessao ? s.notas[sessao.id] ?? '' : '');
  const salvo = useRef(texto);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const t = sessao ? s.notas[sessao.id] ?? '' : '';
    setTexto(t);
    salvo.current = t;
  }, [sessao?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = (valor: string) => {
    if (!sessao || valor === salvo.current) return;
    salvo.current = valor;
    dispatch({ t: 'nota', sessao: sessao.id, texto: valor }, { silencioso: true });
  };
  const nova = async () => {
    const id = novoId();
    const hoje = new Date().toLocaleDateString('pt-BR');
    await dispatch({ t: 'novaSessao', sessao: id, nome: `Sessão ${hoje}` }, { silencioso: true });
    setAtual(id);
  };

  return (
    <>
      <h2 className="section-h">Notas</h2>
      <div className="row" style={{ marginBottom: 8 }}>
        {ordenadas.length > 0 && (
          <select className="input grow" value={sessao?.id} onChange={(e) => { salvar(texto); setAtual(e.target.value); }} aria-label="Sessão">
            {ordenadas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        )}
        <button className="btn ouro" onClick={nova}><PlusIcon size={16} />Nova sessão</button>
      </div>
      {sessao ? (
        <textarea
          className="input" style={{ width: '100%' }} value={texto} aria-label={`Notas de ${sessao.nome}`}
          placeholder="O que aconteceu, nomes, pistas, promessas..."
          onChange={(e) => { setTexto(e.target.value); clearTimeout(timer.current); const v = e.target.value; timer.current = setTimeout(() => salvar(v), 1500); }}
          onBlur={() => salvar(texto)}
        />
      ) : <p className="faint">Crie uma sessão para começar a anotar. Cada sessão guarda suas notas separadas.</p>}
    </>
  );
}

function Inventario() {
  const { s, dispatch } = useJogo();
  const [nome, setNome] = useState('');
  const [ouro, setOuro] = useState('');
  return (
    <>
      <h2 className="section-h">Inventário</h2>
      <div className="stack">
        {s.inventario.map((i) => (
          <div key={i.id} className="card row" style={{ flexWrap: 'nowrap' }}>
            <span className="grow">{i.nome}{i.nota && <span className="faint"> · {i.nota}</span>}</span>
            <button className="icon-btn" aria-label={`Menos ${i.nome}`} onClick={() => dispatch({ t: 'inventarioQtd', id: i.id, delta: -1 })}><MinusIcon size={16} /></button>
            <span className="num" style={{ minWidth: 24, textAlign: 'center' }}>{i.qtd}</span>
            <button className="icon-btn" aria-label={`Mais ${i.nome}`} onClick={() => dispatch({ t: 'inventarioQtd', id: i.id, delta: 1 }, { silencioso: true })}><PlusIcon size={16} /></button>
            <button className="icon-btn" aria-label={`Remover ${i.nome}`} onClick={() => dispatch({ t: 'inventarioRemover', id: i.id })}><TrashIcon size={16} /></button>
          </div>
        ))}
        <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          dispatch({ t: 'inventarioAdd', item: { id: novoId(), nome: nome.trim(), qtd: 1 } });
          setNome('');
        }}>
          <input className="input grow" placeholder="Novo item" aria-label="Novo item" value={nome} onChange={(e) => setNome(e.target.value)} />
          <button className="btn ouro" type="submit"><PlusIcon size={16} />Adicionar</button>
        </form>
        <div className="card row" style={{ flexWrap: 'nowrap' }}>
          <span className="grow">Ouro: <b className="num" style={{ color: 'var(--gold)' }}>{s.ouro} PO</b></span>
          <input className="input num" style={{ width: 80 }} inputMode="decimal" placeholder="PO" aria-label="Quantidade de ouro" value={ouro} onChange={(e) => setOuro(e.target.value.replace(/[^\d.,]/g, ''))} />
          <button className="btn mini" onClick={() => { const n = Number(ouro.replace(',', '.')); if (n) dispatch({ t: 'ouro', delta: -n }); setOuro(''); }}>Gastar</button>
          <button className="btn mini ouro" onClick={() => { const n = Number(ouro.replace(',', '.')); if (n) dispatch({ t: 'ouro', delta: n }); setOuro(''); }}>Ganhar</button>
        </div>
      </div>
    </>
  );
}

function Log() {
  const { r, eventos, desfazer } = useJogo();
  const [n, setN] = useState(30);
  const fora = useMemo(() => anulados(eventos), [eventos]);
  const lista = useMemo(() => [...eventos].sort((a, b) => b.em - a.em).filter((e) => e.e.t !== 'nota'), [eventos]);
  return (
    <>
      <h2 className="section-h">Log</h2>
      {lista.length === 0 && <p className="faint">Tudo que você fizer no app aparece aqui, com horário.</p>}
      <div data-testid="log">
        {lista.slice(0, n).map((e) => (
          <div key={e.id} className={`log-item${fora.has(e.id) ? ' desfeito' : ''}`}>
            <span className="hora">{new Date(e.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="t grow">{descrever(r, e, eventos)}</span>
            {e.e.t !== 'desfazer' && (
              <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={fora.has(e.id) ? 'Refazer' : 'Desfazer'} title={fora.has(e.id) ? 'Refazer' : 'Desfazer'}
                onClick={() => {
                  // Desfazer um item já desfeito = desfazer o "desfazer" mais recente dele.
                  const undo = fora.has(e.id) ? eventos.filter((x) => x.e.t === 'desfazer' && x.e.alvo === e.id).sort((a, b) => b.em - a.em)[0] : null;
                  desfazer(undo ? undo.id : e.id);
                }}>
                <ArrowCounterClockwiseIcon size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {lista.length > n && <button className="btn mini fantasma" onClick={() => setN(n + 50)}>Ver mais</button>}
    </>
  );
}

function Diario() {
  const d = lore.diario as { treinamento: string; sessoes: { titulo: string; resumo: string[]; notas: string[] }[] };
  return (
    <>
      <h2 className="section-h">Diário antigo (do grimório original)</h2>
      <p className="faint">{d.treinamento}</p>
      <div className="stack">
        {d.sessoes.map((x, i) => (
          <div key={i} className="card">
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--bone)' }}>{x.titulo}</div>
            <div className="num muted" style={{ fontSize: 14 }}>{x.resumo.join(' · ')}</div>
            {x.notas.map((n) => <p key={n} className="muted" style={{ fontSize: 14.5, margin: '6px 0 0' }}>{n}</p>)}
          </div>
        ))}
      </div>
    </>
  );
}
