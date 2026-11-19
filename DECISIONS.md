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
| Desfazer no toast | Só a ação mais recente mostra "Desfazer"; as antigas se desfazem pelo Log | Dois botões iguais empilhados desfaziam a ação errada (achado pelo teste) |
| Topo fixo | Altura medida em tempo real; o conteúdo desce junto quando a faixa de concentração aparece | A faixa cobria o botão Descansar (achado pelo teste) |
| Sync | Troca de eventos por cursor (`seq` do D1), `INSERT OR IGNORE` por id, lotes de 200 | Idempotente: rede caindo no meio não duplica nem perde |
| Login expirado | `fetch` com `redirect: 'manual'`; redirect vira "Entrar de novo", que navega para `/api/entrar` (fora do cache do service worker) | O PWA nunca guarda a tela de login como se fosse dado |
| Dono dos eventos | E-mail do JWT do Access, conferido com as chaves públicas do time | Defesa em profundidade além do próprio Access |
| Playwright local | Usa o Edge instalado (`channel: 'msedge'`); no CI usa o Chromium do Playwright | Evita baixar 170 MB de navegador no PC da empresa |
| Tamanho do JS | ~236 KB gzip num pacote só | Aceitável para PWA que baixa uma vez; dividir o código é melhoria futura |
| Fontes | Self-host via @fontsource | Google Fonts quebra offline e vaza dados |
| Categorias | Cor por tipo: aço (físico), ouro (habilidade), jade (truque) e uma cor por ciclo. O ouro saiu do resto da interface | Separar de relance o que custa mana do que não custa |
| Palco | Na tela inicial, vida e mana ficam ao lado da figura; a barra compacta do topo só aparece quando o palco sai da tela ou em outras abas | Pedido do Lucas em 16/11/2026 |
| Fundo | Textura verde-azulada (img/fundo.webp) sob um véu de 62% a 80% de preto; neutros puxados para o verde-azulado. Truque passou de jade para lima, para não se confundir com o fundo | Pedido do Lucas em 17/11/2026. Contraste conferido com scripts/contraste.mjs |
| Fumaça nas margens | Fumaça negra procedural (scripts/gerar-fumaca.ts) em duas camadas que sobem devagar; larga no desktop, faixa de 58 px no celular; parada com movimento reduzido. A imagem enviada não foi usada por ter marca d'água e licença do banco de imagens | Pedido do Lucas em 17/11/2026 |
| Troca de domínio | No nível 9, o Domínio da Morte dá lugar ao Domínio da Disciplina (World of Warcraft), com o texto normal por enquanto. Habilidades têm faixa de nível (nivelMin/nivelMax) e magias de domínio têm dominioDesde/dominioAte; fora da faixa viram magia comum da lista ou somem | Pedido do Lucas em 19/11/2026, depois das simulações de grupo |
| Magias que saem do grimório | Ficam no extraído (fiel ao original) e são filtradas no build por _removidas; links do texto original para elas viram texto simples | Não perder o registro do original |
| Magias novas | data/curation/spells-novas.json, escritas inteiras e validadas pelo mesmo Zod | Não existem no HTML original |
| Ressurreição | Revivificar fora do grimório: o mestre não permite | Pedido do Lucas em 19/11/2026 |
| Combos | Guiados passo a passo; cada passo abre a ficha normal e nada é gasto sozinho. Perguntas como "acertou?" decidem o próximo gasto. O combo em andamento fica numa barra na tela de Combate, porque as fichas se fecham ao conjurar | Pedido do Lucas em 19/11/2026; mesma regra do "Executar passo" dos playbooks |
| Cor da mana | Verde-água (#6fe8d0), a cor das almas do palco; antes era o azul dos olhos do Ehzra. Contraste conferido com scripts/contraste.mjs | Pedido do Lucas em 19/11/2026 |
| Sem invocações | Mortos-vivos e o exército saem: ficam para trás na campanha | Pedido do Lucas em 19/11/2026 |
| Combos em camadas | Rotina (quase de graça, toda luta), médio (uma vez por luta) e feito (recurso escasso). Só uma concentração por vez, a dos Guardiões; combos que disputam a concentração saíram | Pedido do Lucas em 19/11/2026: ser útil gastando pouco e decisivo gastando muito |
| Tema | Só escuro por enquanto | Pedido do prompt ("escuro como padrão"); tema claro fica para depois |
