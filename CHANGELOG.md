# Changelog

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
