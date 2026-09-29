/** Ficha completa do personagem. */
import { useJogo, useUI } from '../store';
import { SeloDe } from '../ui/components';
import {
  NOMES_ATRIBUTO, atributo, ataqueMagia, cdMagia, fmtMod, habilidadeEfetiva, habilidadeVisivel, modAtr, pericia, proficiencia,
  salvaguarda, linhaNivel,
} from '../domain/rules';
import { pvMaximo, recursoRestante } from '../domain/state';
import type { Atributo } from '../domain/schemas';
import { carregarLore } from '../domain/data';

const ATR: Atributo[] = ['for', 'des', 'con', 'int', 'sab', 'car'];
const lore = carregarLore();

export function Ficha() {
  const { r, c, s } = useJogo();
  const abrir = useUI((u) => u.abrir);
  const ch = r.character;
  const reliquia = lore.paginas.find((p) => p.id === 'reliquia')!;
  const minutosSemTocar = s.ultimoToqueFoice ? Math.floor((Date.now() - s.ultimoToqueFoice) / 60000) : null;
  const l = linhaNivel(r, s.nivel);

  return (
    <>
      <div className="hero">
        <img className="retrato" src={ch.retrato} alt={`Retrato de ${ch.nome}`} />
        <div>
          <h1 className="titulo-deco">{ch.nome}</h1>
          <p className="muted" style={{ fontStyle: 'italic', margin: '0 0 8px' }}>{ch.titulo}</p>
          <div className="chips" style={{ marginTop: 0 }}>
            <span className="chip">{ch.classe} {s.nivel}</span>
            <span className="chip">{ch.raca}</span>
            <span className="chip">{ch.antecedente}</span>
            <span className="chip">{ch.alinhamento}</span>
            <span className="chip">{ch.idade}</span>
            <span className="chip">{ch.altura}</span>
          </div>
        </div>
      </div>

      <div className="status-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div><div className="v">{ch.ca.valor}</div><div className="k">CA</div></div>
        <div><div className="v">{pvMaximo(r, s)}</div><div className="k">PV máx.</div></div>
        <div><div className="v">{ch.deslocamentoMetros.valor} m</div><div className="k">Deslocamento</div></div>
        <div><div className="v">+{proficiencia(r, c)}</div><div className="k">Proficiência</div></div>
        <div><div className="v">{cdMagia(r, c)}</div><div className="k">CD magia</div></div>
        <div><div className="v">{fmtMod(ataqueMagia(r, c))}</div><div className="k">Ataque mágico</div></div>
      </div>
      <p className="faint" style={{ fontSize: 14, marginTop: 6 }}>
        {ch.pvMax.nota}. {l.truques} truques e {l.preparadas} magias preparadas pela tabela do nível {s.nivel}.
      </p>

      <h2 className="section-h">Atributos</h2>
      <div className="attrs">
        {ATR.map((a) => (
          <div key={a} className="card attr">
            <div className="n">{NOMES_ATRIBUTO[a]}</div>
            <div className="m">{fmtMod(modAtr(r, c, a))}</div>
            <div className="v">{atributo(r, c, a)} · salv. {fmtMod(salvaguarda(r, c, a))}</div>
          </div>
        ))}
      </div>

      <h2 className="section-h">Perícias</h2>
      <div className="card">
        <dl className="kv">
          {ch.pericias.map((p) => (
            <div key={p.nome} style={{ display: 'contents' }}>
              <dt>{p.nome} <span className="faint" style={{ fontSize: 13 }}>({p.atributo.toUpperCase()}{p.proficiente ? ', prof.' : ''})</span></dt>
              <dd className="num" style={{ textAlign: 'right' }}>
                {fmtMod(pericia(r, c, p.nome))}
                {p.valorOriginal && <span className="faint" style={{ fontSize: 12 }} title="Valor na ficha original"> (era {p.valorOriginal})</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <h2 className="section-h">Proficiências</h2>
      <div className="card">
        <dl className="kv">
          <dt>Armas</dt><dd>{ch.proficiencias.armas}</dd>
          <dt>Armaduras</dt><dd>{ch.proficiencias.armaduras}</dd>
          <dt>Ferramentas</dt><dd>{ch.proficiencias.ferramentas}</dd>
          <dt>Idiomas</dt><dd>{ch.proficiencias.idiomas}</dd>
          <dt>Talentos</dt><dd>{[...ch.talentos, ...s.talentosExtras].join(', ')}</dd>
        </dl>
      </div>

      <h2 className="section-h">Relíquia</h2>
      <a href="#/mais/ceifadora" className="card card-btn reliquia-mini">
        <img src={r.homebrew.ceifadora.cartao.imagem} alt="" />
        <span className="grow">
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: 16 }}>{reliquia.titulo}</span><br />
          <span className="muted" style={{ fontSize: 14 }}>{reliquia.sub}</span><br />
          <span className="faint" style={{ fontSize: 13.5 }}>
            {minutosSemTocar === null ? 'Sintonia: sem registro de toque.' : minutosSemTocar >= 60 ? 'Mais de 1 hora sem tocar: a sintonia se perdeu!' : `Sintonia: tocada há ${minutosSemTocar} min.`}
          </span>
        </span>
      </a>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}><TocarFoice /></div>

      <h2 className="section-h">Habilidades</h2>
      <div className="stack">
        {r.habilidades.filter((f) => habilidadeVisivel(r, f)).map((f0) => {
          const f = habilidadeEfetiva(r, f0);
          const rec = f.recurso ? recursoRestante(r, s, f.recurso) : null;
          return (
            <button key={f.id} className="card card-btn" onClick={() => abrir({ tipo: 'habilidade', id: f.id })}>
              <div className="row"><span className="grow" style={{ fontFamily: 'var(--font-display)' }}>{f.nome}</span>
                {rec && f.usos && <span className="chip num">{rec.restante}/{rec.max}</span>}
                <SeloDe id={f.id} status={f.status2024} /></div>
              <p className="muted" style={{ fontSize: 15, margin: '4px 0 0' }}>{f.resumo}</p>
            </button>
          );
        })}
      </div>

      <h2 className="section-h">Galeria</h2>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        {ch.galeria.map((g) => <img key={g} src={g} alt="Ilustração de Ehzra" loading="lazy" style={{ width: '50%', borderRadius: 'var(--r)', border: '1px solid var(--line-soft)', objectFit: 'cover', aspectRatio: '3 / 4' }} />)}
      </div>
    </>
  );
}

function TocarFoice() {
  const { dispatch } = useJogo();
  return <button className="btn mini ouro" onClick={() => dispatch({ t: 'tocarFoice' })}>Toquei a foice</button>;
}
