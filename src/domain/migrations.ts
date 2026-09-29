/**
 * Migrações do backup exportado. Cada função leva a versão n para n+1.
 * Para mudar o formato: incremente SCHEMA_VERSION, adicione migracoes[n] e um
 * teste com uma fixture congelada da versão antiga em src/domain/fixtures/.
 */
import { z } from 'zod';
import { Envelope } from './events';
import { SCHEMA_VERSION } from './schemas';

export const Backup = z.object({
  app: z.literal('ehzra-hub'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportadoEm: z.string(),
  eventos: z.array(Envelope),
});
export type Backup = z.infer<typeof Backup>;

type Json = Record<string, unknown>;
export const migracoes: Record<number, (v: Json) => Json> = {
  // 1: (v) => ({ ...v, schemaVersion: 2, ... }),
};

export function migrar(bruto: unknown): Backup {
  if (!bruto || typeof bruto !== 'object') throw new Error('Arquivo de backup inválido');
  let v = bruto as Json;
  if (v.app !== 'ehzra-hub') throw new Error('Este arquivo não é um backup do Hub de Ehzra');
  let versao = Number(v.schemaVersion);
  if (!Number.isInteger(versao) || versao < 1) throw new Error('Backup sem schemaVersion');
  if (versao > SCHEMA_VERSION) throw new Error(`Backup da versão ${versao}, mais nova que este app (${SCHEMA_VERSION}). Atualize o app.`);
  while (versao < SCHEMA_VERSION) {
    const m = migracoes[versao];
    if (!m) throw new Error(`Falta a migração da versão ${versao}`);
    v = m(v);
    versao++;
  }
  return Backup.parse(v);
}
