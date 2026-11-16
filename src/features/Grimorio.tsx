/** Grimório: todas as magias, com filtros. */
import { useMemo, useState } from 'react';
import { useJogo } from '../store';
import { SpellCard, Grupo, catDe } from '../ui/components';
import { contagemPreparadas, estaPreparada, magiaEfetiva, NOMES_DANO } from '../domain/rules';
import type { Spell } from '../domain/schemas';

type Filtro = {
  ciclo: number | null;
  tempo: string | null;
  conc: 'sim' | 'nao' | null;
  dano: string | null;
  tag: string | null;
  status: string | null;
  prep: 'preparadas' | 'todas';
  texto: string;
};
const VAZIO: Filtro = { ciclo: null, tempo: null, conc: null, dano: null, tag: null, status: null, prep: 'todas', texto: '' };

const TEMPOS = { acao: 'Ação', acaoBonus: 'Bônus', reacao: 'Reação', longo: 'Longa' };
const TAGS = { dano: 'Dano', cura: 'Cura', controle: 'Controle', buff: 'Buff', defesa: 'Defesa', utilidade: 'Utilidade', invocacao: 'Invocação', 'mortos-vivos': 'Mortos-vivos' };
const STATUS = { ok: '2024 ok', mudou: 'Mudou', legado: 'Legado', homebrew: 'Homebrew' };

function Pilulas<T extends string | number>({ opcoes, valor, set, rotulo }: { opcoes: [T, string][]; valor: T | null; set: (v: T | null) => void; rotulo: string }) {
  return (
    <div className="row" role="group" aria-label={rotulo} style={{ gap: 5, marginBottom: 6 }}>
      {opcoes.map(([v, t]) => (
        <button key={String(v)} className="chip" style={valor === v ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : undefined} aria-pressed={valor === v} onClick={() => set(valor === v ? null : v)}>{t}</button>
      ))}
    </div>
  );
}

export function Grimorio() {
  const { r, c, s } = useJogo();
  const [f, setF] = useState<Filtro>(VAZIO);
  const [abertos, setAbertos] = useState(false);
  const set = <K extends keyof Filtro>(k: K) => (v: Filtro[K]) => setF((x) => ({ ...x, [k]: v }));

  const magias = useMemo(() => r.magias.map((m) => magiaEfetiva(r, m)), [r]);
  const lista = magias.filter((m: Spell) =>
    (f.ciclo === null || m.ciclo === f.ciclo) &&
    (f.tempo === null || m.tempo.tipo === f.tempo) &&
    (f.conc === null || m.concentracao === (f.conc === 'sim')) &&
    (f.dano === null || m.dano.some((d) => d.tipo === f.dano)) &&
    (f.tag === null || m.tags.includes(f.tag as Spell['tags'][number])) &&
    (f.status === null || m.status2024 === f.status) &&
    (f.prep === 'todas' || estaPreparada(m, s.preparadas)) &&
    (!f.texto || `${m.nome} ${m.nomeOriginal ?? ''}`.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').includes(f.texto.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''))),
  );
  const porCiclo = new Map<number, Spell[]>();
  for (const m of lista) porCiclo.set(m.ciclo, [...(porCiclo.get(m.ciclo) ?? []), m]);
  const tiposDano = [...new Set(magias.flatMap((m) => m.dano.map((d) => d.tipo)))].sort();
  const prep = contagemPreparadas(r, c, s.preparadas);
  const ativos = Object.entries(f).filter(([k, v]) => v !== null && v !== '' && !(k === 'prep' && v === 'todas')).length;

  return (
    <>
      <h1 className="page-title">Grimório</h1>
      <p className="page-sub">
        {r.magias.length} magias. Preparadas: <span className="num" style={{ color: prep.usadas > prep.limite ? 'var(--hp-fg)' : 'var(--gold)' }}>{prep.usadas}/{prep.limite}</span>
        {s.preparadas === null && ' (escolha as suas em Mais, Preparar magias)'}
      </p>

      <input className="search-input" type="search" placeholder="Filtrar por nome" value={f.texto} onChange={(e) => set('texto')(e.target.value)} aria-label="Filtrar por nome" />
      <div className="row" style={{ margin: '10px 0' }}>
        <div className="segmented grow" role="group" aria-label="Preparadas">
          <button aria-pressed={f.prep === 'todas'} onClick={() => set('prep')('todas')}>Todas</button>
          <button aria-pressed={f.prep === 'preparadas'} onClick={() => set('prep')('preparadas')}>Preparadas</button>
        </div>
        <button className="btn mini" onClick={() => setAbertos((x) => !x)} aria-expanded={abertos}>Filtros{ativos ? ` (${ativos})` : ''}</button>
      </div>
      <Pilulas rotulo="Ciclo" valor={f.ciclo} set={set('ciclo')} opcoes={[0, 1, 2, 3, 4, 5].map((n) => [n, n === 0 ? 'Truques' : `${n}º`] as [number, string])} />
      {abertos && (
        <div className="card" style={{ marginBottom: 10 }}>
          <Pilulas rotulo="Tempo" valor={f.tempo} set={set('tempo')} opcoes={Object.entries(TEMPOS)} />
          <Pilulas rotulo="Concentração" valor={f.conc} set={set('conc')} opcoes={[['sim', 'Concentração'], ['nao', 'Sem concentração']]} />
          <Pilulas rotulo="Tipo de dano" valor={f.dano} set={set('dano')} opcoes={tiposDano.map((t) => [t, NOMES_DANO[t]] as [string, string])} />
          <Pilulas rotulo="Tag" valor={f.tag} set={set('tag')} opcoes={Object.entries(TAGS)} />
          <Pilulas rotulo="Status 2024" valor={f.status} set={set('status')} opcoes={Object.entries(STATUS)} />
          {ativos > 0 && <button className="btn mini fantasma" onClick={() => setF(VAZIO)}>Limpar filtros</button>}
        </div>
      )}

      <div key={JSON.stringify(f)} className="page-in">
        {[...porCiclo.entries()].sort(([a], [b]) => a - b).map(([ciclo, ms]) => (
          <Grupo key={ciclo} cat={catDe(ciclo)} titulo={ciclo === 0 ? 'Truques' : `${ciclo}º ciclo`} n={ms.length}
            nota={ciclo === 0 ? 'sem custo de mana' : `${r.homebrew.mana.custoPorCiclo[ciclo - 1]} de mana`}>
            {ms.map((m) => <SpellCard key={m.id} spell={m} mostrarSelo />)}
          </Grupo>
        ))}
        {lista.length === 0 && <p className="faint">Nenhuma magia com esses filtros.</p>}
      </div>
    </>
  );
}
