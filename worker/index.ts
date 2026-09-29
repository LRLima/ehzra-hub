/**
 * Cloudflare Worker: serve o PWA (Static Assets) e a API de sync em /api.
 *
 * Quem protege o site é o Cloudflare Access: sem login, a requisição nem chega
 * aqui. Mesmo assim o Worker confere a assinatura do JWT que o Access envia
 * (defesa em profundidade) e usa o e-mail dele como dono dos eventos.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { Envelope } from '../src/domain/events';

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  TEAM_DOMAIN: string; // ex.: https://seu-time.cloudflareaccess.com
  POLICY_AUD: string; // "Application Audience (AUD) Tag" da aplicação no Access
  DEV_DONO?: string; // só no `wrangler dev` local, para testar sem Access
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function dono(req: Request, env: Env): Promise<string | null> {
  if (env.DEV_DONO) return env.DEV_DONO;
  const token = req.headers.get('cf-access-jwt-assertion');
  if (!token || !env.TEAM_DOMAIN || !env.POLICY_AUD) {
    console.warn('auth: sem token do Access', { temToken: !!token });
    return null;
  }
  jwks ??= createRemoteJWKSet(new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`));
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: env.TEAM_DOMAIN, audience: env.POLICY_AUD });
    if (typeof payload.email !== 'string') console.warn('auth: token sem e-mail', { claims: Object.keys(payload), type: payload.type });
    return typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
  } catch (e) {
    // Mostra só metadados do token (nunca o token inteiro) para diagnosticar.
    let meta: unknown = null;
    try { const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); meta = { iss: p.iss, aud: p.aud, type: p.type, temEmail: !!p.email }; } catch { /* ignora */ }
    console.warn('auth: token recusado', { erro: (e as Error).message, meta });
    return null;
  }
}

const Envio = z.object({ eventos: z.array(Envelope).max(500) });

async function api(req: Request, env: Env, url: URL): Promise<Response> {
  // Navegação de topo para reautenticar: o Access intercepta antes, depois volta ao app.
  if (url.pathname === '/api/entrar') return Response.redirect(new URL('/', url).toString(), 302);

  const quem = await dono(req, env);
  if (!quem) return json({ erro: 'nao-autenticado' }, 401);

  if (url.pathname === '/api/eventos' && req.method === 'GET') {
    const desde = Number(url.searchParams.get('desde') ?? 0) || 0;
    const { results } = await env.DB
      .prepare('SELECT seq, corpo FROM eventos WHERE dono = ? AND seq > ? ORDER BY seq LIMIT 1000')
      .bind(quem, desde)
      .all<{ seq: number; corpo: string }>();
    const cursor = results.length ? results[results.length - 1].seq : desde;
    return json({ eventos: results.map((r) => JSON.parse(r.corpo)), cursor, mais: results.length === 1000 });
  }

  if (url.pathname === '/api/eventos' && req.method === 'POST') {
    const corpo = Envio.safeParse(await req.json().catch(() => null));
    if (!corpo.success) return json({ erro: 'formato-invalido', detalhe: corpo.error.issues.slice(0, 3) }, 400);
    const agora = Date.now();
    // INSERT OR IGNORE: reenviar o mesmo evento (rede caiu no meio) não duplica nada.
    const stmt = env.DB.prepare('INSERT OR IGNORE INTO eventos (id, dono, em, aparelho, corpo, recebido) VALUES (?, ?, ?, ?, ?, ?)');
    if (corpo.data.eventos.length) {
      await env.DB.batch(corpo.data.eventos.map((e) => stmt.bind(e.id, quem, e.em, e.aparelho, JSON.stringify(e), agora)));
    }
    return json({ ok: true, recebidos: corpo.data.eventos.length });
  }

  return json({ erro: 'nao-encontrado' }, 404);
}

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return api(req, env, url);
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
