/**
 * Vitrine pública do Hub: o mesmo app, sem login e sem sincronização.
 * Não tem banco nem API; o que o visitante fizer fica só no navegador dele.
 * O site principal (com Access e D1) continua em wrangler.jsonc.
 */
export interface Env { ASSETS: Fetcher }

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    // 404 sem JSON: o app entende como "sem API" e desliga a sincronização em silêncio.
    if (url.pathname.startsWith('/api/')) return new Response('Vitrine sem sincronização', { status: 404, headers: { 'content-type': 'text/plain' } });
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
