# Decisões

Registro das decisões do projeto. Cada item diz o que foi decidido, quem decidiu e por quê.

## Regras do personagem (decididas pelo Lucas em 29/09/2026)

| Tema | Decisão | Motivo |
|---|---|---|
| Nível | 8, gravado como campo explícito em `character.json` | Espaços 4/3/3/2, proficiência +3 e mana 44 batem com nível 8 |
| PV máximo | 70, origem "ajuste do mestre" | A média fixa daria 59; o valor da mesa prevalece |
| Mana | Variante Pontos de Magia do DMG 2014, tabela completa | Os custos 2/3/5/6 e o total 44 no nível 8 já são essa tabela |
| Custo 5º a 9º | 7, 9, 10, 11, 13 | Tabela do DMG |
| Mana máxima por nível | Tabela do DMG (nível 9 = 57) | Idem |
| Ciclos 6 a 9 | 1 uso de cada por descanso longo | Regra da variante |
| Ceifadora de Myrkul | Metade do custo, arredondado para baixo (5 vira 2) | Escolha do Lucas |
| Domínio da Morte | Legado 2014 aprovado pelo mestre. Ceifador, Toque da Morte (5 + 2 × nível) e Morte Inescapável ficam como estão | Não existe Domínio da Morte em 2024 |
| Mudanças de regra 2024 | Nenhuma é aplicada sem aprovação no `VALIDACAO-2024.md` | Homebrew aprovado prevalece |

## Correções aritméticas da ficha

Corrigidas porque são erro de conta, não regra da mesa. O valor antigo fica guardado em `character.json` no campo `valorOriginal`.

| Campo | Antes | Depois | Conta |
|---|---|---|---|
| Religião | +7 | +4 | INT +1 + prof +3. Campo `bonusExtra` existe caso o mestre tenha dado expertise |
| Enganação (Blefar) | +1 | −1 | CAR −1, sem proficiência |
| Persuasão | +2 | −1 | CAR −1, sem proficiência |
| Atuação | +2 | −1 | CAR −1, sem proficiência |
| Intimidação | ausente | −1 | Perícia faltando na tabela |
| Deslocamento | "30m" | 9 m | 30 pés = 9 m |
| Proficiência em armas | incluía "Armaduras Pesadas" | Armas Simples, Armas Marciais | Erro de cópia; armadura pesada já está em Armaduras |

Pontos que continuam em aberto (não mudei, só registrei): Iniciativa +4 com DES +1 só fecha com o talento Alerta 2024, que não aparece na ficha; "Humano Variante, Revivido" mistura regra 2014 com a linhagem Reborn.

## Unidades e nomes

- Distâncias em metros, 1,5 m por quadrado. Pés aparecem só no detalhe da magia.
- Nome da magia em português, com o nome original em inglês como subtítulo.

## Técnicas

| Tema | Decisão | Motivo |
|---|---|---|
| Pasta | `C:\dev\ehzra-hub`, fora do OneDrive | OneDrive trava `node_modules` e `.git`, e é da empresa |
| Front | Vite + TypeScript + React | Mais material para aprender e testar |
| Estilo | CSS com tokens, sem Tailwind | A identidade do original já é CSS |
| Validação | Zod, que também gera os tipos | Um formato escrito uma vez só |
| Estado | Log de eventos (event sourcing) no IndexedDB via Dexie | Desfazer, log, reverter nível e sync saem do mesmo mecanismo; PV e mana são contadores e last-write-wins perderia dano |
| Sync | Cloudflare: 1 Worker servindo app e API, D1, Access | Gratuito, mesma origem, sem tela de login |
| Extração | `data/extracted/` é cópia fiel do HTML; correções entram por `data/curation/` | Separar o que veio do original do que foi decidido depois |
| Validação 2024 na UI | Selo discreto no grimório e no detalhe, nunca no HUD de combate | A ferramenta não pode discutir com o mestre na mesa |
| Efeitos com duração | Descem ao avançar a rodada; em 0 viram "expirou?" e você dispensa | O mestre nem sempre conta rodadas |
| "Executar passo" | Abre o Conjurar já preenchido, nunca gasta sozinho | Plano de turno muda no meio do turno |
