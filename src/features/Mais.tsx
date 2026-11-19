/** Menu "Mais": lore, estratégias, avatar, subir de nível, condições, preparar magias, backup. */
import { Fragment, useRef, useState } from 'react';
import {
  CaretRightIcon, FeatherIcon, SwordIcon, ArrowUpIcon, WarningIcon, ListBulletsIcon, DownloadSimpleIcon, SparkleIcon,
  CloudIcon, CloudSlashIcon, SkullIcon, UserIcon, BookOpenTextIcon, ScrollIcon, GearSixIcon, CrownIcon,
} from '@phosphor-icons/react';
import { Reliquia } from './Reliquia';
import { useSync, sincronizar, reentrar, type StatusSync as StatusSyncT } from '../db/sync';
import { useJogo, useUI, ir } from '../store';
import { Markdown, SpellCard, catDe } from '../ui/components';
import { carregarLore, carregarEstrategiasOriginais } from '../domain/data';
import { ganhosProximoNivel } from '../domain/levelup';
import { contagemPreparadas, estaPreparada, magiaEfetiva, custoMana, magia as achaMagia, NOMES_ATRIBUTO, linhaNivel } from '../domain/rules';
import { recursoRestante } from '../domain/state';
import { db } from '../db/dexie';
import { migrar, type Backup } from '../domain/migrations';
import { SCHEMA_VERSION, type Atributo } from '../domain/schemas';

const lore = carregarLore();
const estrategiasOriginais = carregarEstrategiasOriginais();

export function Mais({ rota }: { rota: string[] }) {
  const [pagina, id] = rota;
  switch (pagina) {
    case 'ceifadora': return <Reliquia />;
    case 'lore': return <Lore id={id} />;
    case 'estrategias': return <Estrategias id={id} />;
    case 'avatar': return <Avatar />;
    case 'nivel': return <SubirNivel />;
    case 'condicoes': return <Condicoes />;
    case 'preparar': return <Preparar />;
    case 'backup': return <BackupPage />;
    case 'g': return <GrupoMenu id={id} />;
    default: return <Menu />;
  }
}

/** Em que categoria cada página mora: o "Voltar" sobe um nível, como num menu de jogo. */
const GRUPO_DA_PAGINA: Record<string, string> = {
  nivel: 'personagem', ceifadora: 'personagem', avatar: 'personagem',
  preparar: 'magias', estrategias: 'magias', condicoes: 'magias',
  lore: 'historia', backup: 'ajustes',
};
export const voltarPara = (pagina: string) => (GRUPO_DA_PAGINA[pagina] ? `#/mais/g/${GRUPO_DA_PAGINA[pagina]}` : '#/mais');

function Voltar() {
  const [, , pagina, id] = location.hash.split('/');
  const href = pagina === 'estrategias' && id ? '#/mais/estrategias' : voltarPara(pagina);
  return <a href={href} className="btn mini fantasma" style={{ marginBottom: 10 }}>Voltar</a>;
}

type Item = { href: string; Icone: typeof FeatherIcon; titulo: string; desc: string };
type Grupo = { id: string; titulo: string; desc: string; Icone: typeof FeatherIcon; itens: Item[] };

function useGrupos(): Grupo[] {
  const { s } = useJogo();
  return [
    {
      id: 'personagem', titulo: 'Personagem', desc: 'Nível, relíquia e avatar', Icone: UserIcon,
      itens: [
        { href: '#/mais/nivel', Icone: ArrowUpIcon, titulo: 'Subir de nível', desc: `Nível ${s.nivel} para ${s.nivel + 1}` },
        { href: '#/mais/ceifadora', Icone: SkullIcon, titulo: 'Ceifadora de Myrkul', desc: 'A relíquia, suas magias e a sintonia' },
        { href: '#/mais/avatar', Icone: CrownIcon, titulo: 'Avatar dos Quatro Túmulos', desc: 'Os quatro aspectos e o ativo' },
      ],
    },
    {
      id: 'magias', titulo: 'Magias e táticas', desc: 'Preparar, estratégias e regras', Icone: BookOpenTextIcon,
      itens: [
        { href: '#/mais/preparar', Icone: SparkleIcon, titulo: 'Preparar magias', desc: 'Escolha as preparadas do dia' },
        { href: '#/mais/estrategias', Icone: SwordIcon, titulo: 'Estratégias', desc: 'Playbooks por turno com custo de mana' },
        { href: '#/mais/condicoes', Icone: WarningIcon, titulo: 'Condições 2024', desc: 'Glossário rápido' },
      ],
    },
    {
      id: 'historia', titulo: 'História', desc: 'A lore de Ehzra', Icone: ScrollIcon,
      itens: lore.paginas.filter((p) => p.id !== 'reliquia' && p.id !== 'avatar')
        .map((p) => ({ href: `#/mais/lore/${p.id}`, Icone: FeatherIcon, titulo: p.titulo, desc: p.sub })),
    },
    {
      id: 'ajustes', titulo: 'Ajustes', desc: 'Sincronização e backup', Icone: GearSixIcon,
      itens: [{ href: '#/mais/backup', Icone: DownloadSimpleIcon, titulo: 'Backup', desc: 'Exportar e importar tudo em JSON' }],
    },
  ];
}

function ItemMenu({ href, Icone, titulo, desc }: Item) {
  return (
    <a href={href} className="card card-btn">
      <span className="menu"><span style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
        <Icone size={22} color="var(--bone-dim)" />
        <span className="grow"><span style={{ fontFamily: 'var(--font-display)' }}>{titulo}</span><br /><span className="faint" style={{ fontSize: 14 }}>{desc}</span></span>
        <CaretRightIcon size={18} />
      </span></span>
    </a>
  );
}

/** Primeiro nível: só as quatro categorias. O detalhe aparece ao entrar em cada uma. */
function Menu() {
  const grupos = useGrupos();
  const { status } = useSync();
  return (
    <>
      <h1 className="page-title">Mais</h1>
      {(status === 'login' || status === 'erro') && <StatusSync />}
      <nav className="categorias" aria-label="Categorias">
        {grupos.map((g) => (
          <a key={g.id} href={`#/mais/g/${g.id}`} className="categoria" data-testid={`grupo-${g.id}`}>
            <g.Icone size={30} weight="light" aria-hidden="true" />
            <span className="categoria-titulo">{g.titulo}</span>
            <span className="categoria-desc">{g.desc}</span>
          </a>
        ))}
      </nav>
    </>
  );
}

function GrupoMenu({ id }: { id?: string }) {
  const g = useGrupos().find((x) => x.id === id);
  if (!g) return <Menu />;
  return (
    <>
      <a href="#/mais" className="btn mini fantasma" style={{ marginBottom: 10 }}>Voltar</a>
      <h1 className="page-title">{g.titulo}</h1>
      {g.id === 'ajustes' && <StatusSync />}
      <div className="stack">{g.itens.map((it) => <ItemMenu key={it.href} {...it} />)}</div>
    </>
  );
}

const TEXTO_SYNC: Record<StatusSyncT, string> = {
  desligado: 'Só neste aparelho (sem servidor de sync nesta versão).',
  offline: 'Sem internet. Tudo continua salvo aqui e sobe quando a conexão voltar.',
  sincronizando: 'Sincronizando...',
  ok: 'Sincronizado com a nuvem.',
  login: 'Seu login expirou. Suas ações estão guardadas neste aparelho.',
  erro: 'Falha ao sincronizar. Tento de novo em instantes.',
};

function StatusSync() {
  const { status, ultimo, detalhe } = useSync();
  const { eventos } = useJogo();
  return (
    <div className={`card row${status === 'login' || status === 'erro' ? ' aviso perigo' : ''}`} style={{ marginBottom: 10 }} data-testid="sync">
      <span className="grow" style={{ fontSize: 15 }}>
        {status === 'offline' ? <CloudSlashIcon size={16} /> : <CloudIcon size={16} />} {TEXTO_SYNC[status]}
        {ultimo && status === 'ok' && <span className="faint"> Última vez: {new Date(ultimo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</span>}
        {detalhe && status === 'erro' && <span className="faint"> ({detalhe})</span>}
        <span className="faint"> {eventos.length} eventos.</span>
      </span>
      {status === 'login' ? <button className="btn mini ouro" onClick={reentrar}>Entrar de novo</button>
        : status !== 'desligado' && <button className="btn mini" onClick={() => sincronizar()}>Sincronizar</button>}
    </div>
  );
}

// ---------- lore ----------
function Lore({ id }: { id?: string }) {
  const p = lore.paginas.find((x) => x.id === id) ?? lore.paginas[1];
  return (
    <article className="leitura">
      <Voltar />
      <p className="tipo" style={{ color: 'var(--bone-faint)' }}>{p.eyebrow}</p>
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
                    <h4 style={{ color: 'var(--bone)' }}>{t.rotulo}</h4>
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
          <h2 style={{ fontSize: 22, color: 'var(--bone)' }}>{ativo.nome}</h2>
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
  const [trocarLista, setTrocarLista] = useState(true);
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
    const listaNova = r.progressao.niveis[g.para - 1]?.preparadasSugeridas;
    await dispatch({ t: 'subirNivel', para: g.para, pvGanho, atributos: atr, talento: talento.trim() || undefined, magias, preparadas: trocarLista && listaNova ? listaNova : undefined });
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
        {g.dominioNovo && <p><b>Troca de domínio:</b> {g.dominioNovo}.{g.dominioSai.length > 0 && <> Saem {g.dominioSai.join(', ')}.</>}</p>}
        {g.subclasseNova.length > 0 && <p><b>{g.dominio ?? 'Domínio'}:</b> {g.subclasseNova.join(', ')}</p>}
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

      {r.progressao.niveis[g.para - 1]?.preparadasSugeridas && (
        <label className="card row" style={{ marginTop: 12, gap: 10 }}>
          <input type="checkbox" checked={trocarLista} onChange={(e) => setTrocarLista(e.target.checked)} data-testid="trocar-lista" />
          <span>Trocar as preparadas pela lista sugerida do nível {g.para}: {r.progressao.niveis[g.para - 1]!.preparadasSugeridas!.map((id) => achaMagia(r, id).nome).join(', ')}</span>
        </label>
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
/** Botão que troca as preparadas pela lista sugerida do nível, num evento só (com desfazer). */
function ListaSugerida() {
  const { r, s, dispatch } = useJogo();
  const lista = linhaNivel(r, s.nivel).preparadasSugeridas;
  if (!lista?.length) return null;
  const atuais = new Set(r.magias.filter((m) => m.ciclo > 0 && m.origens.includes('classe') && estaPreparada(m, s.preparadas)).map((m) => m.id));
  const igual = lista.length === atuais.size && lista.every((id) => atuais.has(id));
  return (
    <div className="card" style={{ marginBottom: 12 }} data-testid="lista-sugerida">
      <b>Lista sugerida do nível {s.nivel}</b>
      <p className="faint" style={{ fontSize: 14, margin: '4px 0 8px' }}>{lista.map((id) => achaMagia(r, id).nome).join(', ')}</p>
      {igual
        ? <p className="faint" style={{ margin: 0 }}>Você já está com essa lista.</p>
        : <button className="btn mini primario" onClick={() => dispatch({ t: 'definirPreparadas', magias: lista, origem: `lista sugerida do nível ${s.nivel}` })}>Usar esta lista</button>}
    </div>
  );
}

function Preparar() {
  const { r, c, s, dispatch } = useJogo();
  const cont = contagemPreparadas(r, c, s.preparadas);
  const escolhiveis = r.magias.map((m) => magiaEfetiva(r, m))
    .filter((m) => m.ciclo > 0 && !m.origens.some((o) => o === 'dominio' || o === 'ceifadora'))
    .sort((a, b) => a.ciclo - b.ciclo || a.nome.localeCompare(b.nome, 'pt'));
  const fixas = r.magias.map((m) => magiaEfetiva(r, m)).filter((m) => m.ciclo > 0 && m.origens.some((o) => o === 'dominio' || o === 'ceifadora'))
    .sort((a, b) => a.ciclo - b.ciclo || a.nome.localeCompare(b.nome, 'pt'));
  return (
    <>
      <Voltar />
      <h1 className="page-title">Preparar magias</h1>
      <p className="page-sub">
        <span className="num" style={{ color: cont.usadas > cont.limite ? 'var(--hp-fg)' : 'var(--bone)' }}>{cont.usadas}/{cont.limite}</span> preparadas.
        {s.preparadas === null && ' Hoje todas contam como preparadas; desmarque até chegar no limite.'}
      </p>
      <ListaSugerida />
      <div className="stack">
        {escolhiveis.map((m, i) => {
          const on = estaPreparada(m, s.preparadas);
          const novoCiclo = i === 0 || escolhiveis[i - 1].ciclo !== m.ciclo;
          return (
            <Fragment key={m.id}>
            {novoCiclo && <div className="ciclo-titulo" data-cat={catDe(m.ciclo)}>{m.ciclo}º ciclo</div>}
            <label className="card row" style={{ flexWrap: 'nowrap' }}>
              <input type="checkbox" checked={on} onChange={() => dispatch({ t: 'preparar', magia: m.id, preparada: !on }, { silencioso: true })} />
              <span className="grow">{m.nome}</span>
            </label>
            </Fragment>
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
