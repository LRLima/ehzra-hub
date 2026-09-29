# Deploy: colocando o Hub na nuvem

Este guia leva o Hub do seu PC para a internet, com login, sync entre aparelhos e deploy automático. Custo: zero (planos gratuitos do GitHub e da Cloudflare). Tempo: uns 40 minutos na primeira vez.

## O desenho

```
 celular / notebook / PC                          Cloudflare
 ┌──────────────────────┐   HTTPS   ┌───────────────────────────────────────┐
 │ PWA (app instalado)  │ ────────► │ Access (porteiro: só você entra)      │
 │  IndexedDB (Dexie)   │           │   │                                   │
 │  = cópia local       │ ◄──────── │   ▼                                   │
 └──────────────────────┘  eventos  │ Worker "ehzra-hub"                    │
                                    │   ├─ /        → arquivos do app       │
                                    │   └─ /api/*   → sync de eventos       │
                                    │                  │                    │
                                    │                  ▼                    │
                                    │               D1 (SQLite)             │
                                    └───────────────────────────────────────┘
        GitHub (código)  ── push na main ──►  GitHub Actions  ── wrangler deploy ──► Cloudflare
```

| Peça | O que faz | Por que ela |
|---|---|---|
| **GitHub** (repo privado) | Guarda o código e o histórico | É o seu backup e o gatilho do deploy |
| **GitHub Actions** | Roda testes e publica sozinho a cada push | Você nunca publica na mão uma versão quebrada |
| **Cloudflare Worker** | Um programa pequeno que roda na borda da Cloudflare. Serve os arquivos do app e a API `/api` | Mesma origem para app e API: sem CORS, um só login |
| **Static Assets** | Os arquivos de `dist/` (HTML, JS, imagens) servidos pelo próprio Worker | Não precisa de um serviço de hosting separado |
| **D1** | Banco SQLite gerenciado. Guarda os eventos | Gratuito, SQL de verdade, e o Worker acessa direto |
| **Cloudflare Access** | Porteiro na frente do domínio. Pede login antes de qualquer requisição | Você não escreve tela de login nem guarda senha |
| **Service worker** (no navegador) | Guarda o app para abrir offline | Mesa sem internet continua funcionando |

**Por que eventos, e não "o estado"?** Cada toque no app vira um evento ("Recebeu 12 de dano"). O sync só troca eventos que o outro lado ainda não tem, e cada aparelho recalcula o estado a partir da lista completa. Se o celular estava offline e o PC também mexeu, nada se perde: os dois eventos entram na lista, em ordem de horário.

## Pré-requisitos

- Uma conta pessoal no GitHub (não use a da empresa).
- Uma conta gratuita na Cloudflare, com seu e-mail pessoal.
- Node e git, que já estão neste PC.

## 1. Repositório no GitHub

1. Em https://github.com/new crie um repositório **privado** chamado `ehzra-hub`, sem README (o projeto já tem um).
2. No terminal, dentro de `C:\dev\ehzra-hub`:

```bash
git remote add origin https://github.com/SEU-USUARIO/ehzra-hub.git
```

```bash
git push -u origin main
```

O Git for Windows abre uma janela para você logar no GitHub (Git Credential Manager). Logue com a conta **pessoal**.

**O que aconteceu:** o histórico de commits foi para o GitHub. O workflow `CI` já vai rodar sozinho (aba Actions). O `Deploy` vai falhar até o passo 5, e isso é esperado.

## 2. Wrangler: o terminal da Cloudflare

O `wrangler` já está instalado no projeto. Faça login:

```bash
npx wrangler login
```

Abre o navegador para autorizar o wrangler na sua conta Cloudflare. Ele guarda um token só neste PC. Quando terminar o projeto, rode `npx wrangler logout`.

## 3. Banco D1

```bash
npx wrangler d1 create ehzra-hub
```

A saída mostra um `database_id`. Copie e cole no `wrangler.jsonc`, no lugar de `PREENCHER_COM_O_ID_DO_D1`. Esse id não é segredo: ele só funciona com um token da sua conta.

Crie a tabela no banco remoto:

```bash
npx wrangler d1 migrations apply ehzra-hub --remote
```

**O que aconteceu:** o arquivo `worker/migrations/0001_eventos.sql` rodou no D1. As migrações ficam numeradas; uma mudança futura no banco vira um `0002_...sql`, e o deploy aplica só o que falta.

## 4. Primeiro deploy e o porteiro (Access)

```bash
npm run build
```

```bash
npx wrangler deploy
```

A saída mostra a URL, algo como `https://ehzra-hub.SEU-SUBDOMINIO.workers.dev`. **Faça o próximo passo logo em seguida**: até ligar o Access, a página (com o retrato e a lore) fica pública para quem souber a URL. A API já recusa tudo sem login.

Ligue o Access:

1. No painel da Cloudflare: **Workers e Pages** → `ehzra-hub` → **Configurações** → **Domínios e rotas**.
2. Na linha do `workers.dev`, ative **Cloudflare Access**. Faça o mesmo em **Preview URLs** (senão as versões de preview ficam abertas).
3. A Cloudflare cria uma aplicação no **Zero Trust**. Se for a primeira vez, ela pede para escolher um nome de time (por exemplo `ehzra`) e o plano **Free** (até 50 usuários). Se pedir cartão para ativar o plano gratuito, é você quem decide se aceita; o plano gratuito não cobra.
4. Em **Zero Trust** → **Access** → **Applications** → a aplicação do `ehzra-hub`:
   - **Policies**: deixe só uma regra `Allow` com **Emails** = seu e-mail pessoal.
   - **Session duration**: `1 month`, para não pedir login no meio da sessão de jogo.
   - **Login methods**: `One-time PIN` já vem ligado (a Cloudflare manda um código de 6 dígitos para o seu e-mail). Dá para ligar GitHub depois, se preferir.
   - Copie o **Application Audience (AUD) Tag**.
5. Em **Zero Trust** → **Settings** → **Custom Pages** (ou no topo do painel) veja o domínio do time: `https://SEU-TIME.cloudflareaccess.com`.
6. No `wrangler.jsonc`, preencha `TEAM_DOMAIN` e `POLICY_AUD`. Esses valores não são segredos: servem para o Worker conferir se o login veio do *seu* Access.

```bash
npx wrangler deploy
```

**O que aconteceu:** agora toda requisição passa pelo Access. Sem login, o navegador vai para a tela do código por e-mail. Com login, o Access coloca um cookie e envia ao Worker um JWT assinado (`Cf-Access-Jwt-Assertion`). O Worker confere a assinatura com as chaves públicas do seu time e usa o e-mail do token como dono dos eventos.

## 5. Deploy automático pelo GitHub Actions

O Actions precisa de permissão para publicar na sua conta. Isso é um **token de API** com o mínimo de poder:

1. Cloudflare → ícone do perfil → **Meu perfil** → **Tokens de API** → **Criar token** → modelo **Editar Cloudflare Workers**.
2. Em **Permissões**, adicione também **Conta → D1 → Editar**. Em **Recursos da conta**, escolha só a sua conta.
3. Crie e copie o token (ele aparece uma vez só).
4. Pegue o **Account ID** na página inicial do painel (barra da direita).
5. No GitHub: repositório → **Settings** → **Environments** → **New environment** → `production`. Dentro dele, em **Environment secrets**:
   - `CLOUDFLARE_API_TOKEN` = o token
   - `CLOUDFLARE_ACCOUNT_ID` = o Account ID
6. (Opcional) Em **Deployment protection rules**, ligue **Required reviewers** com você mesmo: cada deploy espera seu clique.

Commit e push das mudanças do `wrangler.jsonc`:

```bash
git commit -am "Configura D1 e Access"
```

```bash
git push
```

**O que aconteceu:** o `CI` roda lint, tipos, testes unitários e Playwright. Se tudo passar, o `Deploy` aplica as migrações e publica. O token fica só no GitHub, nunca no código. Se ele vazar, você o apaga na Cloudflare e cria outro.

## 6. No celular

1. Abra a URL `workers.dev` no navegador do celular.
2. Faça login com o código que chega no e-mail.
3. Menu do navegador → **Adicionar à tela inicial** (Chrome: "Instalar app"; Safari: botão compartilhar → "Adicionar à Tela de Início").
4. Em **Mais**, a linha de sync deve dizer "Sincronizado com a nuvem".

Faça o mesmo no notebook e no PC. Um dano registrado no celular aparece no PC ao recarregar a página (e sozinho em até 1 minuto).

## Como o app lida com os problemas do mundo real

| Situação | O que acontece |
|---|---|
| Sem internet na mesa | O app abre do cache e grava tudo no IndexedDB. Em **Mais** aparece "Sem internet". Quando a rede volta, os eventos sobem sozinhos |
| Login do Access expirou | A API responde com redirecionamento; o app não se confunde e mostra "Entrar de novo". Nada se perde: os eventos esperam na fila |
| Dois aparelhos mexeram ao mesmo tempo | Os dois eventos entram; a ordem é pelo horário de cada aparelho |
| Evento mandado duas vezes (rede caiu no meio) | O banco ignora o repetido (`INSERT OR IGNORE` pelo id) |
| Versão nova do app | Aparece "Nova versão do Hub disponível" com botão Atualizar. Ela nunca recarrega sozinha no meio do combate |
| Perdi o celular | Os dados estão no D1 e nos outros aparelhos. Em outro aparelho, **Mais** → **Backup** → Exportar, para ter também um arquivo |

## Testar o sync localmente (sem nuvem)

```bash
npm run build
```

```bash
npx wrangler d1 migrations apply ehzra-hub --local
```

```bash
npx wrangler dev --port 8787 --var DEV_DONO:voce@local
```

Em outro terminal:

```bash
npm run e2e:sync
```

O `DEV_DONO` pula a checagem do Access só no `wrangler dev` local. Nunca coloque essa variável no `wrangler.jsonc`.

## Custos e limites (plano gratuito)

Confira os números atuais em https://developers.cloudflare.com/workers/platform/pricing/ e https://developers.cloudflare.com/d1/platform/pricing/. Na ordem de grandeza: Workers com 100 mil requisições por dia, D1 com 5 GB e milhões de leituras por dia, Zero Trust com até 50 usuários. Uma sessão de jogo gera algumas centenas de eventos: o Hub fica muito abaixo de qualquer limite.
