# Hub de Ehzra Thanaris

Grimório e ficha de combate do Ehzra Thanaris (Clérigo da Morte, nível 8) como PWA: funciona offline, grava tudo no aparelho e calcula dano, mana, concentração e subida de nível a partir dos dados.

## Rodar

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # testes unitários (Vitest)
npm run e2e          # testes de ponta a ponta (Playwright, usa o Edge instalado)
npm run build        # versão de produção em dist/
```

## Onde fica cada coisa

| Pasta | O que é |
|---|---|
| `source/` | O grimório HTML original, intocado |
| `data/extracted/` | Cópia fiel do original em JSON (gerada por `npm run extract`) |
| `data/curation/` | Decisões: campos estruturados das magias, playbooks, números homebrew |
| `data/*.json` | Regras que o app usa (geradas por `npm run build-data`, validadas com Zod) |
| `src/domain/` | Regras, eventos e reducer em TypeScript puro, sem React |
| `src/features/` | Telas: Combate, Grimório, Ficha, Sessão, Mais |

Para mudar uma regra, edite `data/curation/` ou `data/character.json` e rode `npm run build-data`. Para aprovar uma mudança do `VALIDACAO-2024.md`, coloque o id em `aprovacoes2024` no `data/character.json`.

Documentos: [DECISIONS.md](DECISIONS.md), [VALIDACAO-2024.md](VALIDACAO-2024.md), [CHANGELOG.md](CHANGELOG.md).
