/**
 * IndexedDB local via Dexie. É a fonte da verdade no aparelho: o app funciona
 * 100% offline, e o sync (Fase 3) só envia/recebe eventos desta tabela.
 */
import Dexie, { type Table } from 'dexie';
import type { Envelope } from '../domain/events';

export interface EventoLocal extends Envelope {
  enviado: 0 | 1; // 0 = ainda não foi para a nuvem
}

class HubDB extends Dexie {
  eventos!: Table<EventoLocal, string>;
  meta!: Table<{ k: string; v: unknown }, string>;

  constructor() {
    super('ehzra-hub');
    this.version(1).stores({ eventos: 'id, em, enviado', meta: 'k' });
  }
}

export const db = new HubDB();

/** uuid sem depender de crypto.randomUUID (que não existe em http na rede local). */
export function novoId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

let aparelhoCache: string | null = null;
export async function aparelho(): Promise<string> {
  if (aparelhoCache) return aparelhoCache;
  const salvo = await db.meta.get('aparelho');
  if (salvo) return (aparelhoCache = String(salvo.v));
  const id = novoId().slice(0, 12);
  await db.meta.put({ k: 'aparelho', v: id });
  return (aparelhoCache = id);
}
