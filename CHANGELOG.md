# Changelog

## 0.5.0 (19/11/2026)

- Combos guiados na tela de Combate: fórmula colorida (A + B = dano), custo em selos, e uma barra que conduz passo a passo, perguntando se acertou antes de gastar o próximo recurso. Só aparecem os combos que existem no nível.
- Ações básicas no fim da aba Ação (Esquivar, Disparada, Desengajar, Ajudar, Esconder, Empurrar, Agarrar, Preparar, Usar objeto, Ataque de oportunidade), com a regra ao tocar.
- Cartões de magia compactos no celular: só ícones (ação, bônus, reação, concentração) e o que importa; sem a palavra do ciclo repetida.
- Botão Iniciar combate em gema vermelha com moldura de prata oxidada.

## 0.4.4 (19/11/2026)

- Truque Luz trocado por Chama Sagrada.

## 0.4.3 (19/11/2026)

- Revivificar saiu do grimório: o mestre não permite.

## 0.4.2 (19/11/2026)

- Corrigido: o app ficava com a tela preta em aparelhos com histórico de magias que saíram do grimório. Agora o histórico antigo mostra o nome dessas magias e nada quebra.
- Se algum erro acontecer ao abrir, o app mostra a mensagem e um botão de recarregar, em vez de uma tela preta.

## 0.4.1 (19/11/2026)

- O Manto Espiritual virou o Manto Espiritual do Ehzra: o dano extra vale para ataques corpo a corpo e à distância, e cresce 1d8 a cada dois ciclos acima do 3º. A Intenção Mortal saiu, porque fazia a mesma coisa só à distância.

## 0.4.0 (19/11/2026)

- Grimório revisto: saem Necropsia, Taxidermia de Ehzra, Batedores de Sarcófagos, Fio da Obediência, Despelar, Minguar Ossos, Bolsa de Ossos e Campeão do Túmulo. Ficam Lâmina Necrótica e Intenção Mortal.
- Magias novas homebrew: Ferida Aberta (Open Wounds), Ainda Não e Égide do Ocaso.
- Magias novas oficiais: Palavra Radiante, Imobilizar Pessoa, Auxílio, Revivificar, Lança de Prata de Laeral, Nova Sagrada, Horror Psíquico e Aura de Pureza.
- Subir para o nível 9 troca o Domínio da Morte pelo Domínio da Disciplina: entram Raio Sagrado, Expiação e Barreira Luminosa, e as magias de domínio da Disciplina. Saem Ceifador, Toque da Morte e Morte Inescapável.

## 0.3.3 (17/11/2026)

- Fumaça 50% mais rápida e mais densa perto das bordas, chegando ao preto na linha da tela.

## 0.3.2 (17/11/2026)

- Fumaça negra animada nas laterais, no desktop e no celular (mais estreita).

## 0.3.1 (17/11/2026)

- Epitáfio substitui o Avatar como habilidade de Inspiração, com botão que gasta a Inspiração e marca o alvo por uma rodada.
- Corrigido: a tela tremia no Combate ao rolar entre o personagem e a lista (a barra do topo empurrava o conteúdo). Agora ela flutua por cima.
- A barra compacta ganhou um retrato do Ehzra que reage a dano, cura e mana quando o palco está fora da tela.

## 0.3.0 (16/11/2026)

- Tela inicial com o Ehzra de corpo inteiro, frasco de vida e cristais de mana animados (dano, cura, gasto e recuperação).
- Paleta nas cores do personagem: preto, vinho, osso e o azul dos olhos para a mana.
- Opções separadas por categoria, cada uma com cor e cabeçalho: ataque físico, habilidades, truques e cada ciclo.
- Animação de uso ao atacar (corte) e ao conjurar (clarão na cor do ciclo).
- Relíquia sem estrelas, selo e ATK/DEF; novas ilustrações.

## 0.2.0 (29/09/2026)

- Aplicadas as decisões da validação 2024 (lista completa no topo do `VALIDACAO-2024.md`): curas dobradas, Aura de Vitalidade sem ação bônus, Orientação como ação, Restauração Menor como ação bônus, Canalizar Divindade com 3 usos, Centelha Divina, Repreender 2024, entre outras.
- Infligir Ferimentos recusado: mantém o texto da ficha e aparece com o selo "Ficha mantida".
- Batedores de Sarcófagos e Fio da Obediência no 2º ciclo; Intenção Mortal escalonando por ciclo.
- Corrigido: aprovar uma versão 2024 apagava o dano e as condições que ela não mudava (Guardiões Espirituais, Praga, Impor Maldição). Teste de regressão incluído.
- Playbook corpo a corpo atualizado para o novo escalonamento do Manto Espiritual.

## 0.1.0 (29/09/2026)

### Fase 0: dados
- Extração fiel do grimório original (45 magias, 8 habilidades, lore, Avatar, relíquia, diário, 3 imagens), com teste que garante que nenhum texto se perdeu.
- Curadoria das magias em campos estruturados (dano, cura, salvaguarda, escalonamento por nível e por ciclo, tags, origem).
- `VALIDACAO-2024.md` com status, diferença e fonte de cada magia e habilidade. Nada foi aplicado sem aprovação.
- Correções aritméticas da ficha (Religião, perícias de Carisma, Intimidação, deslocamento em metros).

### Fase 1 e 2: app
- Topo fixo com PV (teclado de dano e cura com prévia), PV temporário, cristais de mana e faixa de concentração com Quebrar.
- Combate: pílulas Ação, Bônus, Reação e Movimento; rodadas; efeitos que descem por rodada e avisam "expirou?"; recursos; mortos-vivos com Fio da Obediência e Campeão; tela sempre acesa.
- Testes e exploração: salvaguardas, perícias, percepção passiva, rituais.
- Cartão de magia com chips em ordem fixa, upcast, custo da Ceifadora e botão Conjurar que atualiza mana, concentração, efeito e log de uma vez.
- Avisos automáticos: teste de CON ao sofrer dano concentrado, Ala da Morte segurando em 1 PV, queda a 0 PV.
- Grimório com filtros; busca global (lupa ou Ctrl+K); glossário de condições 2024.
- Ficha completa, relíquia com timer de sintonia, habilidades com usos.
- Sessão: notas por sessão, inventário, ouro, log com desfazer e refazer.
- Avatar dos Quatro Túmulos com rolagem do d4; subida de nível com "O que você ganha", escolhas e reverter; playbooks com Executar passo; preparar magias; backup exportar e importar.
- PWA instalável e offline.
- 43 testes unitários e 7 cenários Playwright (celular e desktop).
