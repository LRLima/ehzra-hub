/**
 * Liga o domínio ao React: lê eventos do Dexie, reduz para GameState e expõe
 * dispatch/desfazer. O estado de interface (folhas abertas, toasts) fica no Zustand.
 */
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { create } from 'zustand';
import { db, aparelho, novoId } from './db/dexie';
import { carregarRegras } from './domain/data';
import type { Envelope, Evento } from './domain/events';
import { SCHEMA_VERSION } from './domain/schemas';
import { reduzir, estadoInicial, contexto, type GameState } from './domain/state';
import { descrever } from './domain/log';
import type { Regras, Contexto } from './domain/rules';

// ---------- interface ----------
export type Aberto =
  | { tipo: 'magia'; id: string; ciclo?: number }
  | { tipo: 'habilidade'; id: string }
  | { tipo: 'condicao'; id: string }
  | { tipo: 'busca' }
  | { tipo: 'pv' }
  | { tipo: 'mana' }
  | { tipo: 'descanso' };

export interface Toast {
  id: string;
  texto: string;
  tipo?: string;
  desfazer?: string; // id do evento
  ms?: number;
}

interface UI {
  pilha: Aberto[];
  abrir: (a: Aberto) => void;
  fechar: () => void;
  fecharTudo: () => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  tirarToast: (id: string) => void;
}

export const useUI = create<UI>((set, get) => ({
  pilha: [],
  abrir: (a) => set({ pilha: [...get().pilha.filter((x) => x.tipo !== 'busca' || a.tipo === 'busca'), a] }),
  fechar: () => set({ pilha: get().pilha.slice(0, -1) }),
  fecharTudo: () => set({ pilha: [] }),
  toasts: [],
  toast: (t) => {
    const id = novoId();
    // Só a ação mais recente tem "Desfazer" no toast (as antigas se desfazem pelo Log).
    const antigos = t.desfazer ? get().toasts.filter((x) => !x.desfazer) : get().toasts;
    set({ toasts: [...antigos.slice(-2), { ...t, id }] });
    setTimeout(() => get().tirarToast(id), t.ms ?? 5000);
  },
  tirarToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

// ---------- jogo ----------
interface Jogo {
  r: Regras;
  s: GameState;
  c: Contexto;
  eventos: Envelope[];
  pronto: boolean;
  dispatch: (e: Evento, opts?: { silencioso?: boolean }) => Promise<string>;
  desfazer: (alvo: string) => Promise<void>;
}

const JogoCtx = createContext<Jogo | null>(null);
const regras = carregarRegras();

export function JogoProvider({ children }: { children: ReactNode }) {
  const eventos = useLiveQuery(() => db.eventos.toArray(), [], undefined);
  const lista = useMemo(() => eventos ?? [], [eventos]);
  const s = useMemo(() => (eventos ? reduzir(regras, lista) : estadoInicial(regras)), [eventos, lista]);

  const dispatch = useCallback<Jogo['dispatch']>(async (e, opts) => {
    const env: Envelope = { id: novoId(), em: Date.now(), aparelho: await aparelho(), v: SCHEMA_VERSION, e };
    await db.eventos.add({ ...env, enviado: 0 });
    // Avisos calculados na hora, a partir do estado que o evento produz.
    const todos = await db.eventos.toArray();
    const depois = reduzir(regras, todos);
    const ui = useUI.getState();
    if (!opts?.silencioso) ui.toast({ texto: descrever(regras, env, todos), desfazer: env.id });
    for (const a of depois.avisos) ui.toast({ texto: a.texto, tipo: a.tipo, ms: a.tipo === 'concentracao' ? 12000 : 7000 });
    return env.id;
  }, []);

  const desfazer = useCallback(async (alvo: string) => {
    const env: Envelope = { id: novoId(), em: Date.now(), aparelho: await aparelho(), v: SCHEMA_VERSION, e: { t: 'desfazer', alvo } };
    await db.eventos.add({ ...env, enviado: 0 });
  }, []);

  const valor = useMemo<Jogo>(
    () => ({ r: regras, s, c: contexto(s), eventos: lista, pronto: eventos !== undefined, dispatch, desfazer }),
    [s, lista, eventos, dispatch, desfazer],
  );
  return <JogoCtx.Provider value={valor}>{children}</JogoCtx.Provider>;
}

export function useJogo() {
  const j = useContext(JogoCtx);
  if (!j) throw new Error('useJogo fora do JogoProvider');
  return j;
}

// ---------- rota (hash) ----------
const sub = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
export function useRota(): string[] {
  const h = useSyncExternalStore(sub, () => location.hash, () => '');
  const partes = h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return partes.length ? partes : ['combate'];
}
export const ir = (...partes: string[]) => {
  location.hash = '/' + partes.map(encodeURIComponent).join('/');
};
