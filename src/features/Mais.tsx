/** Menu "Mais": lore, estratégias, avatar, subir de nível, condições, preparar magias, backup. */
import { useRef, useState } from 'react';
import {
  CaretRightIcon, FeatherIcon, SwordIcon, SunIcon, ArrowUpIcon, WarningIcon, ListBulletsIcon, DownloadSimpleIcon, SparkleIcon,
} from '@phosphor-icons/react';
import { useJogo, useUI, ir } from '../store';
import { Markdown, SpellCard } from '../ui/components';
import { carregarLore, carregarEstrategiasOriginais } from '../domain/data';
import { ganhosProximoNivel } from '../domain/levelup';
import { contagemPreparadas, estaPreparada, magiaEfetiva, custoMana, magia as achaMagia, NOMES_ATRIBUTO } from '../domain/rules';
import { recursoRestante } from '../domain/state';
import { db } from '../db/dexie';
import { migrar, type Backup } from '../domain/migrations';
import { SCHEMA_VERSION, type Atributo } from '../domain/schemas';

const lore = carregarLore();
const estrategiasOriginais = carregarEstrategiasOriginais();

export function Mais({ rota }: { rota: string[] }) {
  const [pagina, id] = rota;
  switch (pagina) {
    case 'lore': return <Lore id={id} />;
    case 'estrategias': return <Estrategias id={id} />;
    case 'avatar': return <Avatar />;
    case 'nivel': return <SubirNivel />;
    case 'condicoes': return <Condicoes />;
    case 'preparar': return <Preparar />;
    case 'backup': return <BackupPage />;
    default: return <Menu />;
  }
}

function Voltar() {
  return <a href="#/mais" className="btn mini fantasma" style={{ marginBottom: 10 }}>Voltar</a>;
}

function Menu() {
  const { s } = useJogo();
  const item = (href: string, Icone: typeof FeatherIcon, t: string, d: string) => (
    <a href={href} className="card card-btn">
      <span className="menu"><span style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
        <Icone size={22} color="var(--gold)" />
        <span className="grow"><span style={{ fontFamily: 'var(--font-display)' }}>{t}</span><br /><span className="faint" style={{ fontSize: 14 }}>{d}</span></span>
        <CaretRightIcon size={18} />
      </span></span>
    </a>
  );
  return (
    <>
      <h1 className="page-title">Mais</h1>
      <div className="stack">
        {item('#/mais/estrategias', SwordIcon, 'Estratégias', 'Playbooks por turno com custo de mana')}
        {item('#/mais/avatar', SunIcon, 'Avatar dos Quatro Túmulos', s.avatar ? 'Ativo agora' : 'Role o d4 e descubra quem responde')}
        {item('#/mais/nivel', ArrowUpIcon, 'Subir de nível', `Nível ${s.nivel} para ${s.nivel + 1}`)}
        {item('#/mais/preparar', SparkleIcon, 'Preparar magias', 'Escolha as preparadas do dia')}
        {item('#/mais/condicoes', WarningIcon, 'Condições 2024', 'Glossário rápido')}
        {lore.paginas.filter((p) => p.id !== 'reliquia' && p.id !== 'avatar').map((p) => (
          <div key={p.id}>{item(`#/mais/lore/${p.id}`, FeatherIcon, p.titulo, p.sub)}</div>
        ))}
        {item('#/mais/backup', DownloadSimpleIcon, 'Backup', 'Exportar e importar tudo em JSON')}
      </div>
    </>
  );
}

// ---------- lore ----------
function Lore({ id }: { id?: string }) {
  const p = lore.paginas.find((x) => x.id === id) ?? lore.paginas[1];
  return (
    <article className="leitura">
      <Voltar />
      <p className="tipo" style={{ color: 'var(--crimson-fg)' }}>{p.eyebrow}</p>
      <h1 className="page-title" style={{ fontSize: 30 }}>{p.titulo}</h1>
      <p className="page-sub">{p.sub}</p>
      {p.blocos.map((b, i) =>
        b.tipo === 'separador' ? <hr key={i} />
        : b.tipo === 'titulo' || b.tipo === 'subtitulo' ? <h3 key={i}>{b.md}</h3>
        : b.tipo === 'citacao' ? <blockquote key={i}><Markdown md={b.md} className="" /></blockquote>
        : b.tipo === 'caixa' ? <div key={i} className="box"><Markdown md={b.md} className="" /></div>
        : <Markdown key={i} md={b.md} className="" />,
      )}
    </article>
  );
}

// ---------- estratégias ----------
function Estrategias({ id }: { id?: string }) {
  const { r } = useJogo();
  const abrir = useUI((u) => u.abrir);
  const [original, setOriginal] = useState(false);
  const lista = id ? r.playbooks.filter((p) => p.id === id) : r.playbooks;
  const custo = (ms: { id: string; ciclo: number }[]) => ms.reduce((a, m) => a + custoMana(r, achaMagia(r, m.id), m.ciclo), 0);
  const PARTES = [['preCombate', ''], ['acao', 'Ação'], ['bonus', 'Bônus'], ['reacao', 'Reação'], ['movimento', 'Movimento']] as const;

  return (
    <>
      <Voltar />
      <h1 className="page-title">Estratégias</h1>
      <p className="page-sub">"Executar passo" abre o Conjurar já preenchido. Nada é gasto sem sua confirmação.</p>
      <div className="stack">
        {lista.map((p) => {
          const total = custo([...(p.preCombate?.magias ?? []), ...p.turnos.flatMap((t) => t.magias)]);
          return (
            <details key={p.id} className="card" open={!!id}>
              <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                <div className="row"><span className="grow" style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{p.nome}</span>
                  <span className="chip mana">até {total} mana</span>{p.original && <span className="selo legado">Original</span>}</div>
                <p className="muted" style={{ fontSize: 15, margin: '4px 0 0' }}>{p.resumo}</p>
              </summary>
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 15 }}><b style={{ color: 'var(--heal)' }}>Quando usar:</b> {p.quandoUsar.join(' ')}</p>
                <p style={{ fontSize: 15 }}><b style={{ color: 'var(--hp-fg)' }}>Quando não usar:</b> {p.quandoNaoUsar.join(' ')}</p>
                {[...(p.preCombate ? [{ ...p.preCombate, rotulo: 'Antes da iniciativa' }] : []), ...p.turnos].map((t, i) => (
                  <div key={i} className="box" style={{ borderStyle: 'solid' }}>
                    <h4 style={{ color: 'var(--gold)' }}>{t.rotulo}</h4>
                    {PARTES.slice(1).map(([k, rot]) => t[k as 'acao'] ? <p key={k} style={{ fontSize: 15, margin: '4px 0' }}><b>{rot}:</b> {t[k as 'acao']}</p> : null)}
                    {t.magias.map((m) => (
                      <button key={m.id} className="btn mini ouro" style={{ marginTop: 6, marginRight: 6 }} onClick={() => abrir({ tipo: 'magia', id: m.id, ciclo: m.ciclo })}>
                        Executar passo: {achaMagia(r, m.id).nome} ({m.ciclo}º)
                      </button>
                    ))}
                  </div>
                ))}
                {p.conflitosConcentracao.length > 0 && <div className="aviso">Concentração: {p.conflitosConcentracao.join(' ')}</div>}
                {p.dependeDeHomebrew.length > 0 && <p className="faint" style={{ fontSize: 14 }}>Depende de homebrew: {p.dependeDeHomebrew.join(', ')}.</p>}
              </div>
            </details>
          );
        })}
      </div>
      {!id && (
        <>
          <button className="btn mini fantasma" style={{ marginTop: 14 }} onClick={() => setOriginal((x) => !x)}>{original ? 'Esconder' : 'Ver'} o texto original das estratégias</button>
          {original && <div className="leitura" style={{ fontSize: 16 }}>{estrategiasOriginais.map((b, i) => b.tipo === 'titulo' || b.tipo === 'subtitulo' ? <h3 key={i}>{b.md}</h3> : <Markdown key={i} md={b.md} className="" />)}</div>}
        </>
      )}
    </>
  );
}

// ---------- avatar ----------
function Avatar() {
  const { r, s, dispatch } = useJogo();
  const [rolando, setRolando] = useState<number | null>(null);
  const [revelado, setRevelado] = useState<number | null>(s.avatar?.aspecto ?? null);
  const uso = recursoRestante(r, s, 'avatar');
  const pode = s.inspiracao > 0 && (uso?.restante ?? 1) > 0 && !s.avatar;
  const reduz = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ativo = revelado ? r.homebrew.avatar.aspectos[revelado - 1] : null;

  const ativar = () => {
    const d4 = 1 + Math.floor(Math.random() * 4);
    setRevelado(null);
    setRolando(d4);
    setTimeout(async () => {
      setRolando(null);
      setRevelado(d4);
      await dispatch({ t: 'avatar', d4 });
    }, reduz ? 0 : 950);
  };

  return (
    <>
      <Voltar />
      <h1 className="page-title">Avatar dos Quatro Túmulos</h1>
      <p className="page-sub">Custa {r.homebrew.avatar.custo}. Ação bônus, 1 minuto, 1 vez por amanhecer. A escolha é caótica.</p>
      <div className={`d4${rolando ? ' rolando' : ''}`} aria-live="polite" onClick={() => rolando === null && pode && ativar()}>{rolando ? '?' : revelado ?? 'd4'}</div>
      {!s.avatar && (
        <button className="btn primario largo grande" disabled={!pode || rolando !== null} onClick={ativar}>
          {s.inspiracao === 0 ? 'Sem Inspiração' : uso && uso.restante === 0 ? 'Já usado hoje' : 'Ativar e rolar o d4'}
        </button>
      )}
      {s.avatar && <p className="aviso">Ativo: {r.homebrew.avatar.aspectos[s.avatar.aspecto - 1].nome}, {s.avatar.rodadas} rodadas restantes.</p>}
      {ativo && rolando === null && (
        <div className="card aspecto revela" data-id={ativo.id} style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: 22, color: 'var(--gold)' }}>{ativo.nome}</h2>
          <p className="muted">{ativo.titulo}</p>
          <blockquote>"{ativo.citacao}"</blockquote>
          <Markdown md={ativo.visual} className="muted" />
          <ul>{ativo.efeitos.map((e) => <li key={e}><Markdown md={e} className="" /></li>)}</ul>
        </div>
      )}
      <h2 className="section-h">Os quatro aspectos</h2>
      <div className="stack">
        {r.homebrew.avatar.aspectos.filter((a) => a.d4 !== revelado).map((a) => (
          <details key={a.id} className="card aspecto" data-id={a.id}>
            <summary style={{ cursor: 'pointer' }}><span className="num faint">{a.d4}</span> <b style={{ fontFamily: 'var(--font-display)' }}>{a.nome}</b> <span className="faint">{a.titulo}</span></summary>
            <blockquote>"{a.citacao}"</blockquote>
            <ul>{a.efeitos.map((e) => <li key={e}><Markdown md={e} className="" /></li>)}</ul>
          </details>
        ))}
      </div>
    </>
  );
}

// ---------- subir de nível ----------
function SubirNivel() {
  const { r, s, eventos, dispatch, desfazer } = useJogo();
  const g = ganhosProximoNivel(r, s);
  const [pvModo, setPvModo] = useState<'media' | 'rolar'>('media');
  const [rolado, setRolado] = useState('');
  const [atr, setAtr] = useState<Partial<Record<Atributo, number>>>({});
  const [talento, setTalento] = useState('');
  const [magias, setMagias] = useState<string[]>([]);
  const [festa, setFesta] = useState<number | null>(null);
  const ultimoUp = [...eventos].filter((e) => e.e.t === 'subirNivel').sort((a, b) => b.em - a.em)[0];
  const desfeito = ultimoUp && eventos.some((e) => e.e.t === 'desfazer' && e.e.alvo === ultimoUp.id);

  if (festa) {
    return (
      <div className="celebra">
        <p className="tipo">Nível</p>
        <div className="n">{festa}</div>
        <p className="muted">A morte ensina mais uma lição a Ehzra.</p>
        <button className="btn ouro" onClick={() => setFesta(null)}>Continuar</button>
      </div>
    );
  }
  if (!g) return <><Voltar /><p>Nível máximo.</p></>;

  const conMod = Math.floor((r.character.atributos.con - 10) / 2);
  const pvGanho = pvModo === 'media' ? g.pvMedio : Math.max(1, (Number(rolado) || 0) + conMod);
  const somaAsi = Object.values(atr).reduce((a, b) => a + (b ?? 0), 0);
  const asiOk = !g.asi || somaAsi === 0 || somaAsi === 2 || talento.trim();
  const aplicar = async () => {
    await dispatch({ t: 'subirNivel', para: g.para, pvGanho, atributos: atr, talento: talento.trim() || undefined, magias });
    setFesta(g.para);
  };

  return (
    <>
      <Voltar />
      <h1 className="page-title">Subir para o nível {g.para}</h1>
      <p className="page-sub">O que você ganha, calculado da tabela do Clérigo 2024 e das regras homebrew.</p>
      <div className="card" data-testid="ganhos">
        {g.mudancas.map((m) => (
          <div key={m.rotulo} className="mudanca"><span>{m.rotulo}</span><span className="antes">{m.antes}</span><span className="faint">→</span><span className="depois">{m.depois}</span></div>
        ))}
        {g.featuresNovas.length > 0 && <p style={{ marginTop: 10 }}><b>Habilidades de classe:</b> {g.featuresNovas.join(', ')}</p>}
        {g.featuresNovas.length === 0 && <p className="faint" style={{ marginTop: 10 }}>Nenhuma habilidade nova de classe neste nível.</p>}
        {g.subclasseNova.length > 0 && <p><b>Domínio da Morte:</b> {g.subclasseNova.join(', ')}</p>}
        {g.magiasDominioNovas.length > 0 && <p><b>Magias de domínio novas:</b> {g.magiasDominioNovas.join(', ')}</p>}
        {g.truquesEscalados.map((t) => <p key={t.nome}><b>{t.nome}:</b> {t.antes} → {t.depois}</p>)}
        {g.preparadasExtras > 0 && <p><b>+{g.preparadasExtras}</b> magias preparadas.</p>}
      </div>

      <h2 className="section-h">Pontos de vida</h2>
      <div className="segmented" role="group" aria-label="PV">
        <button aria-pressed={pvModo === 'media'} onClick={() => setPvModo('media')}>Média fixa (+{g.pvMedio})</button>
        <button aria-pressed={pvModo === 'rolar'} onClick={() => setPvModo('rolar')}>Rolei o d{g.dadoDeVida}</button>
      </div>
      {pvModo === 'rolar' && (
        <div className="campo" style={{ marginTop: 8 }}>
          <label htmlFor="rolado">Resultado do d{g.dadoDeVida} (o app soma CON {conMod >= 0 ? '+' : ''}{conMod})</label>
          <input id="rolado" className="input num" inputMode="numeric" value={rolado} onChange={(e) => setRolado(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </div>
      )}
      <p className="faint">Ganho: +{pvGanho} PV.</p>

      {g.asi && (
        <>
          <h2 className="section-h">Aumento de atributo ou talento</h2>
          <p className="faint" style={{ fontSize: 15 }}>+2 em um atributo, +1 em dois, ou escreva o talento. Sugestão: SAB já está em 20; CON sobe PV e concentração.</p>
          <div className="attrs">
            {(Object.keys(NOMES_ATRIBUTO) as Atributo[]).map((a) => (
              <button key={a} className="card attr" onClick={() => setAtr((x) => ({ ...x, [a]: ((x[a] ?? 0) + 1) % 3 }))}>
                <div className="n">{NOMES_ATRIBUTO[a]}</div><div className="m">+{atr[a] ?? 0}</div>
              </button>
            ))}
          </div>
          <div className="campo" style={{ marginTop: 8 }}><label htmlFor="talento">Ou talento</label><input id="talento" className="input" value={talento} onChange={(e) => setTalento(e.target.value)} /></div>
        </>
      )}

      {g.magiasLiberadas.length > 0 && (
        <>
          <h2 className="section-h">Magias liberadas</h2>
          <p className="faint" style={{ fontSize: 15 }}>Marque as que quer preparar.</p>
          {g.magiasLiberadas.map((m) => (
            <label key={m.id} className="card row"><input type="checkbox" checked={magias.includes(m.id)} onChange={(e) => setMagias((x) => e.target.checked ? [...x, m.id] : x.filter((y) => y !== m.id))} /> {m.nome}</label>
          ))}
        </>
      )}

      <button className="btn primario largo grande" style={{ marginTop: 16 }} disabled={!asiOk} onClick={aplicar} data-testid="aplicar-nivel">
        <ArrowUpIcon size={20} />Subir para o nível {g.para}
      </button>
      {ultimoUp && !desfeito && ultimoUp.e.t === 'subirNivel' && (
        <button className="btn largo fantasma" style={{ marginTop: 8 }} onClick={() => desfazer(ultimoUp.id)}>
          Reverter a subida para o nível {ultimoUp.e.para}
        </button>
      )}
    </>
  );
}

// ---------- condições ----------
function Condicoes() {
  const { r, s } = useJogo();
  const abrir = useUI((u) => u.abrir);
  return (
    <>
      <Voltar />
      <h1 className="page-title">Condições 2024</h1>
      <div className="stack">
        {r.condicoes.map((c) => (
          <button key={c.id} className="card card-btn" onClick={() => abrir({ tipo: 'condicao', id: c.id })}>
            <div className="row"><span className="grow" style={{ fontFamily: 'var(--font-display)' }}>{c.nome}</span>
              {(s.condicoes.includes(c.id) || (c.id === 'exaustao' && s.exaustao > 0)) && <span className="chip dano">em você</span>}</div>
            <p className="muted" style={{ fontSize: 15, margin: '4px 0 0' }}>{c.efeitos[0]}</p>
          </button>
        ))}
      </div>
    </>
  );
}

// ---------- preparar ----------
function Preparar() {
  const { r, c, s, dispatch } = useJogo();
  const cont = contagemPreparadas(r, c, s.preparadas);
  const escolhiveis = r.magias.map((m) => magiaEfetiva(r, m))
    .filter((m) => m.ciclo > 0 && !m.origens.some((o) => o === 'dominio' || o === 'ceifadora'));
  const fixas = r.magias.map((m) => magiaEfetiva(r, m)).filter((m) => m.ciclo > 0 && m.origens.some((o) => o === 'dominio' || o === 'ceifadora'));
  return (
    <>
      <Voltar />
      <h1 className="page-title">Preparar magias</h1>
      <p className="page-sub">
        <span className="num" style={{ color: cont.usadas > cont.limite ? 'var(--hp-fg)' : 'var(--gold)' }}>{cont.usadas}/{cont.limite}</span> preparadas.
        {s.preparadas === null && ' Hoje todas contam como preparadas; desmarque até chegar no limite.'}
      </p>
      <div className="stack">
        {escolhiveis.map((m) => {
          const on = estaPreparada(m, s.preparadas);
          return (
            <label key={m.id} className="card row" style={{ flexWrap: 'nowrap' }}>
              <input type="checkbox" checked={on} onChange={() => dispatch({ t: 'preparar', magia: m.id, preparada: !on }, { silencioso: true })} />
              <span className="grow">{m.nome} <span className="faint num">{m.ciclo}º</span></span>
            </label>
          );
        })}
      </div>
      <h2 className="section-h">Sempre preparadas (domínio e Ceifadora)</h2>
      <div className="stack">{fixas.map((m) => <SpellCard key={m.id} spell={m} />)}</div>
    </>
  );
}

// ---------- backup ----------
function BackupPage() {
  const { eventos } = useJogo();
  const toast = useUI((u) => u.toast);
  const input = useRef<HTMLInputElement>(null);
  const [pendente, setPendente] = useState<Backup | null>(null);

  const exportar = () => {
    const b: Backup = { app: 'ehzra-hub', schemaVersion: SCHEMA_VERSION, exportadoEm: new Date().toISOString(), eventos };
    const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehzra-hub-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const ler = async (f: File) => {
    try {
      setPendente(migrar(JSON.parse(await f.text())));
    } catch (e) {
      toast({ texto: `Não consegui importar: ${(e as Error).message}`, tipo: 'perigo', ms: 8000 });
    }
  };
  const confirmar = async () => {
    if (!pendente) return;
    await db.transaction('rw', db.eventos, async () => {
      await db.eventos.clear();
      await db.eventos.bulkAdd(pendente.eventos.map((e) => ({ ...e, enviado: 0 as const })));
    });
    toast({ texto: `Backup importado: ${pendente.eventos.length} eventos.` });
    setPendente(null);
    ir('combate');
  };

  return (
    <>
      <Voltar />
      <h1 className="page-title">Backup</h1>
      <p className="page-sub">Todo o seu progresso é uma lista de eventos. O arquivo guarda todos eles.</p>
      <div className="stack">
        <button className="btn ouro largo grande" onClick={exportar} data-testid="exportar"><DownloadSimpleIcon size={20} />Exportar ({eventos.length} eventos)</button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && ler(e.target.files[0])} data-testid="importar-arquivo" />
        <button className="btn largo" onClick={() => input.current?.click()}><ListBulletsIcon size={20} />Importar arquivo</button>
        {pendente && (
          <div className="aviso perigo">
            <p>Importar substitui tudo neste aparelho por {pendente.eventos.length} eventos exportados em {new Date(pendente.exportadoEm).toLocaleString('pt-BR')}.</p>
            <div className="row"><button className="btn dano" onClick={confirmar} data-testid="confirmar-importar">Substituir</button><button className="btn fantasma" onClick={() => setPendente(null)}>Cancelar</button></div>
          </div>
        )}
      </div>
    </>
  );
}
