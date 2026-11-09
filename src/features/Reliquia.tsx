/** Ficha da Ceifadora de Myrkul: a relíquia, suas magias e a sintonia. */
import { useEffect, useState } from 'react';
import { StarIcon, HandIcon } from '@phosphor-icons/react';
import { useJogo } from '../store';
import { Markdown, SpellCard } from '../ui/components';
import { fmtMod, magia, modAtr, proficiencia, toqueDaMorte } from '../domain/rules';

function useAgora(ms: number) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return agora;
}

export function Reliquia() {
  const { r, c, s, dispatch } = useJogo();
  const agora = useAgora(30_000);
  const cr = r.homebrew.ceifadora;
  const cartao = cr.cartao;
  const arma = r.character.armas.find((a) => a.id === 'ceifadora-de-myrkul') ?? r.character.armas[0];
  const atk = modAtr(r, c, arma.atributo) + proficiencia(r, c);
  const limite = cr.perdaSintoniaMinutos;
  const min = s.ultimoToqueFoice ? Math.floor((agora - s.ultimoToqueFoice) / 60_000) : null;
  const perdida = min !== null && min >= limite;
  const restante = min === null ? null : Math.max(0, limite - min);

  return (
    <>
      <a href="#/mais" className="btn mini fantasma" style={{ marginBottom: 10 }}>Voltar</a>
      <article className="reliquia">
        <header className="reliquia-topo">
          <h1 className="reliquia-nome">{cartao.nome}</h1>
          <span className="reliquia-selo" title="Atributo">{cartao.selo}</span>
        </header>
        <div className="reliquia-estrelas" aria-label={`${cartao.estrelas} estrelas`}>
          {Array.from({ length: cartao.estrelas }, (_, i) => <StarIcon key={i} size={18} weight="fill" />)}
        </div>
        <figure className="reliquia-arte">
          <img src={cartao.imagem} alt="A Ceifadora de Myrkul: foice negra de lâmina curva, com crânios junto à lâmina e cabo retorcido" />
        </figure>
        <p className="reliquia-sub">{cartao.sub}</p>

        <div className="status-strip" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div><div className="v">{fmtMod(atk)}</div><div className="k">Ataque</div></div>
          <div><div className="v" style={{ fontSize: 16 }}>{arma.dano} + {modAtr(r, c, arma.atributo)}</div><div className="k">{arma.tipo}</div></div>
          <div><div className="v" style={{ fontSize: 16 }}>+{toqueDaMorte(c)}</div><div className="k">Toque da Morte</div></div>
          <div><div className="v" style={{ fontSize: 16 }}>{cartao.meta['ATK / DEF'] ?? '?'}</div><div className="k">ATK / DEF</div></div>
        </div>
        <div className="chips" style={{ marginTop: 8 }}>
          {Object.entries(cartao.meta).filter(([k]) => k !== 'ATK / DEF' && k !== 'Dano').map(([k, v]) => <span key={k} className="chip">{k}: {v}</span>)}
        </div>

        <section className={`card sintonia${perdida ? ' perdida' : ''}`} data-testid="sintonia">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <div className="grow">
              <div style={{ fontFamily: 'var(--font-display)' }}>Sintonia</div>
              <div className="muted" style={{ fontSize: 15 }}>
                {min === null ? 'Sem registro de toque. Marque quando pegar a foice.'
                  : perdida ? `Há ${min} min sem tocar: a sintonia se perdeu.`
                  : `Tocada há ${min} min. Perde em ${restante} min.`}
              </div>
            </div>
            <button className="btn ouro" onClick={() => dispatch({ t: 'tocarFoice' })}><HandIcon size={18} />Toquei</button>
          </div>
          {min !== null && !perdida && (
            <div className="hpbar" style={{ marginTop: 8 }} aria-hidden="true">
              <span className="fill" style={{ width: `${(restante! / limite) * 100}%`, background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))' }} />
            </div>
          )}
          <p className="faint" style={{ fontSize: 14, margin: '8px 0 0' }}>
            Enquanto sintonizado, se você morrer, volta à vida em {cr.ressurreicaoHoras} horas (sem perder a sintonia nesse período).
          </p>
        </section>

        <h2 className="section-h">Sempre preparadas, metade da mana</h2>
        <div className="stack">
          {cr.magias.map((id) => <SpellCard key={id} spell={magia(r, id)} />)}
        </div>

        <h2 className="section-h">{cartao.titulo}</h2>
        <div className="card reliquia-texto">
          {cartao.paragrafos.map((p, i) => <Markdown key={i} md={p} className="" />)}
        </div>
      </article>
    </>
  );
}
