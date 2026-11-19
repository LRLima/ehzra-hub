/** Componentes pequenos e compartilhados: chips, selos, folha, markdown, toasts. */
import { useEffect, useMemo, type ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  HourglassIcon, CrosshairIcon, DropIcon, HeartIcon, ShieldIcon, TargetIcon, ClockIcon, DiamondIcon, XIcon,
  ArrowCounterClockwiseIcon, LightningIcon, ArrowBendUpLeftIcon, ClockCountdownIcon,
} from '@phosphor-icons/react';
import type { Spell, Status2024 } from '../domain/schemas';
import {
  custoMana, curaMagia, danoMagia, resolucaoTexto, usaCeifadora, magia as achaMagia,
} from '../domain/rules';
import { useJogo, useUI } from '../store';

const I = { size: 13, weight: 'bold' as const };

export const TEMPO_CURTO: Record<string, string> = {
  acao: 'Ação', acaoBonus: 'Bônus', reacao: 'Reação', livre: 'Livre',
};

export function duracaoCurta(s: Spell) {
  const r = s.duracao.rodadas;
  if (r === null) return /instant/i.test(s.duracao.texto) ? 'Instant.' : s.duracao.texto.replace(/^Concentração, até /i, '');
  if (r === 1) return '1 rodada';
  if (r < 100) return `${r / 10} min`;
  if (r < 600) return `${r / 10} min`;
  return `${r / 600} h`;
}

/** Linha de chips, sempre na mesma ordem: tempo, alcance, efeito, resolução, concentração, duração, custo. */
export function SpellChips({ spell, ciclo }: { spell: Spell; ciclo?: number }) {
  const { r, c, s } = useJogo();
  const cic = ciclo ?? spell.ciclo;
  const dano = danoMagia(r, c, spell, cic)[0];
  const cura = curaMagia(r, c, spell, cic);
  const res = resolucaoTexto(r, c, spell);
  const custoCheio = cic > 0 ? r.homebrew.mana.custoPorCiclo[cic - 1] : 0;
  const custo = custoMana(r, spell, cic);
  const troca = spell.concentracao && s.concentracao && s.concentracao.magia !== spell.id ? achaMagia(r, s.concentracao.magia).nome : null;

  return (
    <div className="chips">
      <span className="chip tempo" title={TEMPO_CURTO[spell.tempo.tipo] ?? spell.tempo.texto}>
        {spell.tempo.tipo === 'acaoBonus' ? <LightningIcon {...I} /> : spell.tempo.tipo === 'reacao' ? <ArrowBendUpLeftIcon {...I} /> : <HourglassIcon {...I} />}
        <span className="t">{TEMPO_CURTO[spell.tempo.tipo] ?? spell.tempo.texto}</span>
      </span>
      <span className="chip" title="Alcance"><CrosshairIcon {...I} />{spell.alcance.texto}</span>
      {dano ? (
        <span className="chip dano" title={dano.rotulo ?? 'Dano'}><DropIcon {...I} />{dano.expr} {dano.tipo}</span>
      ) : cura ? (
        <span className="chip cura" title="Cura"><HeartIcon {...I} />{cura.expr}{cura.pvTemporario ? ' temp' : ''}</span>
      ) : (
        <span className="chip vazio">sem dano</span>
      )}
      {res && (
        <span className="chip res" title="Resolução">
          {spell.resolucao?.tipo === 'ataque' ? <TargetIcon {...I} /> : <ShieldIcon {...I} />}{res}
        </span>
      )}
      {spell.concentracao && (
        <span className={`chip conc${troca ? ' troca' : ''}`} title={troca ? `Encerra ${troca}` : 'Concentração'}>
          <ClockCountdownIcon {...I} /><span className="t">{troca ? `troca ${troca}` : 'Conc.'}</span>
        </span>
      )}
      <span className="chip dur" title="Duração"><ClockIcon {...I} />{duracaoCurta(spell)}</span>
      {cic > 0 && (
        <span className="chip mana" title={usaCeifadora(r, spell) ? 'Metade do custo pela Ceifadora' : 'Custo em mana'}>
          <DiamondIcon {...I} />
          {usaCeifadora(r, spell) ? <><s>{custoCheio}</s>&nbsp;{custo}</> : custo}
        </span>
      )}
    </div>
  );
}

const ROTULO_STATUS: Record<Status2024, string> = { ok: '2024 ok', mudou: 'Mudou em 2024', legado: 'Legado 2014', homebrew: 'Homebrew' };
export function Selo({ status, aprovado, recusado }: { status: Status2024; aprovado?: boolean; recusado?: boolean }) {
  if (recusado) return <span className="selo legado" title="Versão 2024 conferida e recusada: vale o texto da ficha">Ficha mantida</span>;
  return (
    <span className={`selo ${status}${aprovado ? ' ok' : ''}`} title={status === 'mudou' && !aprovado ? 'Vale o texto da ficha até você aprovar a versão 2024' : undefined}>
      {aprovado ? 'Atualizada 2024' : ROTULO_STATUS[status]}
    </span>
  );
}

/** Selo com a decisão já aplicada (aprovada, recusada ou pendente). */
export function SeloDe({ id, status }: { id: string; status: Status2024 }) {
  const { r } = useJogo();
  return <Selo status={status} aprovado={r.character.aprovacoes2024.includes(id)} recusado={r.character.recusadas2024.includes(id)} />;
}

export function Markdown({ md, className = 'desc' }: { md: string; className?: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(md, { async: false }) as string), [md]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Sheet({ titulo, sub, extra, children, onClose, label }: {
  titulo: ReactNode; sub?: ReactNode; extra?: ReactNode; children: ReactNode; onClose: () => void; label: string;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-grip" />
        <header className="sheet-head">
          <div>
            <h2>{titulo}</h2>
            {sub && <div className="muted" style={{ fontStyle: 'italic' }}>{sub}</div>}
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            {extra}
            <button className="icon-btn" onClick={onClose} aria-label="Fechar"><XIcon size={20} /></button>
          </div>
        </header>
        {children}
      </section>
    </>
  );
}

export function Toasts() {
  const { toasts, tirarToast } = useUI();
  const { desfazer } = useJogo();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tipo ?? ''}`} role={t.tipo === 'concentracao' || t.tipo === 'caiu' ? 'alert' : 'status'}>
          <span className="t">{t.texto}</span>
          {t.desfazer && (
            <button className="btn mini ouro" onClick={() => { desfazer(t.desfazer!); tirarToast(t.id); }}>
              <ArrowCounterClockwiseIcon size={16} />Desfazer
            </button>
          )}
          <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => tirarToast(t.id)} aria-label="Dispensar"><XIcon size={16} /></button>
        </div>
      ))}
    </div>
  );
}

/** Cartão compacto de magia usado em listas, busca e HUD. */
export function SpellCard({ spell, ciclo, mostrarSelo = false }: { spell: Spell; ciclo?: number; mostrarSelo?: boolean }) {
  const abrir = useUI((u) => u.abrir);
  return (
    <button className="card card-btn spell-card" data-cat={catDe(spell.ciclo)} onClick={() => abrir({ tipo: 'magia', id: spell.id, ciclo })}>
      <div className="topo">
        <span className="nome">{spell.nome}</span>
        <span className="row" style={{ gap: 6 }}>
          {mostrarSelo && <SeloDe id={spell.id} status={spell.status2024} />}
          <span className="faint num ciclo-rot" style={{ fontSize: 13 }}>{spell.ciclo === 0 ? 'truque' : `${spell.ciclo}º`}</span>
        </span>
      </div>
      {spell.nomeOriginal && <div className="sub">{spell.nomeOriginal}</div>}
      <SpellChips spell={spell} ciclo={ciclo} />
    </button>
  );
}

/** Categoria visual: ataque físico, habilidade, truque ou ciclo da magia. Cada uma tem cor própria (tokens --cat-*). */
export const catDe = (ciclo: number) => (ciclo === 0 ? 'truque' : `c${Math.min(ciclo, 6)}`);

/** Grupo de opções de uma mesma categoria, com cabeçalho colorido. */
export function Grupo({ cat, titulo, nota, n, children }: { cat: string; titulo: string; nota?: string; n?: number; children: ReactNode }) {
  return (
    <section className="grupo" data-cat={cat}>
      <header className="cat-h">
        <i className="cat-marca" aria-hidden="true" />
        <h3>{titulo}</h3>
        {nota && <span className="cat-nota">{nota}</span>}
        {n != null && <span className="cat-n num">{n}</span>}
      </header>
      <div className="stack">{children}</div>
    </section>
  );
}

/** Animação de uso: um clarão na cor da categoria com o nome do que foi usado. */
export function CastFlash() {
  const f = useUI((u) => u.flash);
  if (!f) return null;
  return (
    <div key={f.id} className="cast" data-cat={f.cat} aria-hidden="true">
      <i /><i />
      <span>{f.nome}</span>
    </div>
  );
}
