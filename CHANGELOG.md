# Changelog

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
