/**
 * Sync de eventos com o Worker. Como o estado é um log de eventos, sincronizar
 * é só trocar eventos: cada aparelho envia os seus e recebe os dos outros.
 * Não existe conflito de "qual versão vence": todos reduzem a mesma lista.
 */
import { create } from 'zustand';
import { db } from './dexie';
import { Envelope } from '../domain/events';

export type StatusSync = 'desligado' | 'offline' | 'sincronizando' | 'ok' | 'login' | 'erro';

export const useSync = create<{ status: StatusSync; ultimo: number | null; detalhe?: string }>(() => ({
  status: 'desligado',
  ultimo: null,
}));

class PrecisaLogin extends Error {}
class SemApi extends Error {}

async function chamar(url: string, init?: RequestInit) {
  // redirect: 'manual' impede que um 302 do Access (login expirado) vire uma página HTML tratada como JSON.
  const res = await fetch(url, { ...init, credentials: 'same-origin', redirect: 'manual', headers: { 'content-type': 'application/json' } });
  if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 403) throw new PrecisaLogin();
  if (res.status === 404 && !res.headers.get('content-type')?.includes('json')) throw new SemApi(); // `npm run dev` sem Worker
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const tipo = res.headers.get('content-type') ?? '';
  if (!tipo.includes('json')) throw new SemApi();
  return res.json();
}

let rodando: Promise<void> | null = null;

export function sincronizar(): Promise<void> {
  rodando ??= passo().finally(() => { rodando = null; });
  return rodando;
}

async function passo() {
  if (!navigator.onLine) { useSync.setState({ status: 'offline' }); return; }
  useSync.setState({ status: 'sincronizando' });
  try {
    // 1. Envia o que este aparelho ainda não mandou.
    const pendentes = await db.eventos.where('enviado').equals(0).toArray();
    for (let i = 0; i < pendentes.length; i += 200) {
      const lote = pendentes.slice(i, i + 200);
      await chamar('/api/eventos', { method: 'POST', body: JSON.stringify({ eventos: lote.map(({ enviado: _e, ...env }) => env) }) });
      await db.eventos.bulkUpdate(lote.map((e) => ({ key: e.id, changes: { enviado: 1 as const } })));
    }
    // 2. Recebe o que os outros aparelhos mandaram desde a última vez.
    let cursor = Number((await db.meta.get('cursor'))?.v ?? 0);
    for (;;) {
      const r = (await chamar(`/api/eventos?desde=${cursor}`)) as { eventos: unknown[]; cursor: number; mais: boolean };
      const validos = r.eventos.map((e) => Envelope.safeParse(e)).filter((x) => x.success).map((x) => x.data);
      const existentes = new Set((await db.eventos.bulkGet(validos.map((e) => e.id))).filter(Boolean).map((e) => e!.id));
      const novos = validos.filter((e) => !existentes.has(e.id));
      if (novos.length) await db.eventos.bulkAdd(novos.map((e) => ({ ...e, enviado: 1 as const })));
      cursor = r.cursor;
      await db.meta.put({ k: 'cursor', v: cursor });
      if (!r.mais) break;
    }
    useSync.setState({ status: 'ok', ultimo: Date.now(), detalhe: undefined });
  } catch (e) {
    if (e instanceof PrecisaLogin) useSync.setState({ status: 'login' });
    else if (e instanceof SemApi) useSync.setState({ status: 'desligado' });
    else useSync.setState({ status: navigator.onLine ? 'erro' : 'offline', detalhe: (e as Error).message });
  }
}

let agendado: ReturnType<typeof setTimeout> | undefined;
/** Chamado depois de cada ação: junta várias ações rápidas num envio só. */
export function agendarSync() {
  clearTimeout(agendado);
  agendado = setTimeout(sincronizar, 2500);
}

/** Liga o sync: ao abrir, ao voltar a conexão, ao voltar para o app e a cada minuto. */
let iniciado = false;
export function iniciarSync() {
  if (iniciado) return;
  iniciado = true;
  sincronizar();
  window.addEventListener('online', () => sincronizar());
  window.addEventListener('offline', () => useSync.setState({ status: 'offline' }));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && sincronizar());
  setInterval(() => document.visibilityState === 'visible' && sincronizar(), 60_000);
}

/** Login do Access expirou: navega para uma rota da API (fora do cache do service worker). */
export const reentrar = () => { location.href = '/api/entrar'; };
