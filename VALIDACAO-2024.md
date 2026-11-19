# Validação das regras 2024

Cada magia e habilidade do grimório conferida contra o Livro do Jogador 2024 (SRD 5.2). **Nada aqui foi aplicado ainda.** O app usa o texto da ficha até você aprovar cada item.

Legenda: ✅ 2024 ok · ⚠️ mudou em 2024 · 📜 legado 2014 · 🜏 homebrew

**Como aprovar:** me responda com os números que você aceita (ex.: "aprovo M4, M5, M7; H2 não"). Os itens que você não aprovar ficam como estão, com o selo 📜 ou 🜏.

Fonte principal: [dnd2024.wikidot.com](https://dnd2024.wikidot.com), que reproduz o PHB 2024. Links por item abaixo. Tabela da classe: [Clérigo 2024](https://dnd2024.wikidot.com/cleric:main).

## Decisões (29/09/2026)

| Decisão | Itens |
|---|---|
| **Aprovados (versão 2024 em uso)** | M1, M2, M5, M9, M10, M12, M16, M20, M21, M23, M24, M25, M29, M31, M32, M33, M36, M40; H1, H2, H3, H10 |
| **Recusado (vale a ficha)** | M8 Infligir Ferimentos: segue como ataque corpo a corpo de 3d10, e o combo com Toque da Morte continua |
| **Ciclo corrigido** | M14 Batedores de Sarcófagos e M15 Fio da Obediência passam para o 2º ciclo |
| **Alinhado** | M37 Intenção Mortal cresce por ciclo como o Manto (+1d8 a cada 2 ciclos acima do 3º) |
| **Mantidos como estão** | M3, M4, M7, M11, M13, M17 a M19, M22, M27, M28, M30, M34, M35, M38, M39, M41 a M45; H4, H5, H8, H9 |
| **Não adicionar** | H12 Golpe Divino do domínio (conflita com Conjurador Potente) |
| **Pendentes** | M6 e M26 (sem texto no grimório); H6, H7, H11; F1 a F5 |

Para mudar uma decisão: edite `aprovacoes2024` ou `recusadas2024` em `data/character.json` e rode `npm run build-data`.

## Resumo

| Status | Quantidade |
|---|---|
| ✅ Bate com 2024 | 14 |
| ⚠️ Mudou em 2024 | 18 |
| 📜 Legado 2014 | 3 |
| 🜏 Homebrew | 10 (2 sem texto) |
| **Total** | **45** |

**Os três pontos que mais afetam o jogo:**
1. **Infligir Ferimentos (M8)** virou salvaguarda de CON em 2024. Isso quebra o combo Infligir + Toque da Morte da estratégia "Descarga de dano", porque Toque da Morte exige **acertar um ataque corpo a corpo**. Se aprovar a versão 2024, o combo passa a ser com a Ceifadora (ataque de arma) em vez da magia.
2. **Curas dobraram** em 2024 (M9, M10, M33). Adotar deixa o Ehzra bem mais forte como suporte.
3. **Aura de Vitalidade (M29)** agora cura sozinha no início do seu turno, sem gastar ação bônus. Isso libera a ação bônus para Manto Espiritual ou Palavra Curativa.

## Magias

| # | Magia (original) | Ciclo | Status | O que mudou / observação | Recomendação |
|---|---|---|---|---|---|
| M1 | Soar os Mortos (Toll the Dead) | truque | ⚠️ | É **oficial** no PHB 2024, não homebrew. A ficha tem escalonamento errado no 11º ("3d8 e 2d12", "psíquico e necrótico"). Correto: 2d8/2d12 no 5º, **3d8/3d12** no 11º, 4d8/4d12 no 17º, sempre necrótico. [fonte](https://dnd2024.wikidot.com/spell:toll-the-dead) | Corrigir escalonamento |
| M2 | Orientação (Guidance) | truque | ⚠️ | **Ação**, não ação bônus. Você escolhe uma **perícia**; o alvo soma 1d4 em qualquer teste dela enquanto durar (conc., 1 min). [fonte](https://dnd2024.wikidot.com/spell:guidance) | Adotar 2024 |
| M3 | Luz (Light) | truque | ✅ | Luz forte em 6 m, fraca por mais 6 m. Componente material: vagalume ou musgo. [fonte](https://dnd2024.wikidot.com/spell:light) | Nada a fazer |
| M4 | Lâmina Necrótica | truque | 🜏 | Reflavor necrótico de Booming Blade (Tasha). Escalonamento coerente com o original. | Manter |
| M5 | Salve o Moribundo (Spare the Dying) | truque | ⚠️ | Oficial. Alcance **4,5 m**, dobra no 5º/11º/17º: no nível 8 são **9 m**, não toque. O alvo fica Estável. [fonte](https://dnd2024.wikidot.com/spell:spare-the-dying) | Adotar 2024 |
| M6 | Necropsia | truque | 🜏 | **Sem texto** no grimório. | Você escreve o texto |
| M7 | Cerimônia (Ceremony) | 1º | 📜 | Xanathar, não existe no PHB 2024. Consome 25 po de pó de prata. | Manter como legado |
| M8 | Infligir Ferimentos (Inflict Wounds) | 1º | ⚠️ | **Salvaguarda de CON, 2d10 necrótico, metade no sucesso**, +1d10 por ciclo. A ficha usa o texto 2014 (ataque corpo a corpo, 3d10). Ver ponto 1 do resumo. [fonte](https://dnd2024.wikidot.com/spell:inflict-wounds) | Decisão sua (afeta combo) |
| M9 | Curar Ferimentos (Cure Wounds) | 1º | ⚠️ | **2d8** + SAB, **+2d8** por ciclo (era 1d8/+1d8). Escola: Abjuração. [fonte](https://dnd2024.wikidot.com/spell:cure-wounds) | Adotar 2024 |
| M10 | Palavra Curativa (Healing Word) | 1º | ⚠️ | **2d4** + SAB, **+2d4** por ciclo (era 1d4/+1d4). 18 m, ação bônus. [fonte](https://dnd2024.wikidot.com/spell:healing-word) | Adotar 2024 |
| M11 | Santuário (Sanctuary) | 1º | ✅ | 9 m, ação bônus, 1 min. | Nada a fazer |
| M12 | Raio da Doença (Ray of Sickness) | 1º | ⚠️ | **Sem salvaguarda**: no acerto, 2d8 veneno **e** Envenenado até o fim do seu próximo turno. Fora da lista de Clérigo (vem do Domínio da Morte). [fonte](https://dnd2024.wikidot.com/spell:ray-of-sickness) | Adotar 2024 |
| M13 | Vitalidade Falsa (False Life) | 1º | ✅ | 2d4+4 PV temporários, +5 por ciclo. Vem do Domínio. [fonte](https://dnd2024.wikidot.com/spell:false-life) | Nada a fazer |
| M14 | Batedores de Sarcófagos | 1º | 🜏 | A nota original diz que é de **2º ciclo**. | Confirmar ciclo (1º ou 2º) |
| M15 | Fio da Obediência | 1º | 🜏 | A nota original diz que é de **2º ciclo**. | Confirmar ciclo (1º ou 2º) |
| M16 | Comando (Command) | 1º | ⚠️ | Só **5 ordens fixas**: Aproxime-se, Solte, Fuja, Rasteje, Pare. Duração instantânea, +1 alvo por ciclo acima do 1º. A regra de "ordem contraditória perde a ação" não existe mais. [fonte](https://dnd2024.wikidot.com/spell:command) | Adotar 2024 |
| M17 | Escudo da Fé (Shield of Faith) | 1º | ✅ | +2 CA, conc. 10 min, ação bônus. | Nada a fazer |
| M18 | Proteção contra o Bem e o Mal | 1º | ✅ | Material: água benta de 25 po, consumida. [fonte](https://dnd2024.wikidot.com/spell:protection-from-evil-and-good) | Nada a fazer |
| M19 | Acalmar Emoções (Calm Emotions) | 2º | ✅ | Salvaguarda de CAR, esfera de 6 m. [fonte](https://dnd2024.wikidot.com/spell:calm-emotions) | Nada a fazer |
| M20 | Restauração Menor (Lesser Restoration) | 2º | ⚠️ | **Ação bônus**. Remove Cego, Surdo, Paralisado ou Envenenado; não cura mais "doença". [fonte](https://dnd2024.wikidot.com/spell:lesser-restoration) | Adotar 2024 |
| M21 | Oração de Cura (Prayer of Healing) | 2º | ⚠️ | Até **5** criaturas; cada uma ganha os benefícios de um **descanso curto + 2d8 PV**, 1 vez por descanso longo, +1d8 por ciclo. Não é ritual. [fonte](https://dnd2024.wikidot.com/spell:prayer-of-healing) | Adotar 2024 |
| M22 | Silêncio (Silence) | 2º | ✅ | Esfera de 6 m, conc. 10 min, ritual. | Nada a fazer |
| M23 | Cegueira e Surdez (Blindness/Deafness) | 2º | ⚠️ | Alcance **36 m** (a ficha tem 9 m). Sem concentração, CON repetida no fim de cada turno. [fonte](https://dnd2024.wikidot.com/spell:blindness-deafness) | Adotar 2024 |
| M24 | Raio do Enfraquecimento (Ray of Enfeeblement) | 2º | ⚠️ | **Não tem mais ataque; é salvaguarda de CON.** Na falha: desvantagem em testes d20 de FOR e **−1d8** em toda rolagem de dano. No sucesso: desvantagem no próximo ataque. [fonte](https://dnd2024.wikidot.com/spell:ray-of-enfeeblement) | Adotar 2024 |
| M25 | Repouso Gentil (Gentle Repose) | 2º | ⚠️ | Regra ok (ritual, 10 dias), mas a ficha diz que **prende a alma** e que é pré-requisito de Falar com os Mortos. Em 2024 ele só impede virar morto-vivo e pausa o prazo de ressurreição. [fonte](https://dnd2024.wikidot.com/spell:gentle-repose) | Decisão sua (pode ser reflavor aprovado) |
| M26 | Taxidermia de Ehzra | 2º | 🜏 | **Sem texto** no grimório. | Você escreve o texto |
| M27 | Animar Morto (Animate Dead) | 3º | ✅ | Igual. Sempre preparada pela Ceifadora. | Nada a fazer |
| M28 | Falar com os Mortos (Speak with Dead) | 3º | ✅ | Igual. | Nada a fazer |
| M29 | Aura de Vitalidade (Aura of Vitality) | 3º | ⚠️ | Emanação de 9 m, só V. Cura **2d6 ao criar e no início de cada turno seu**, sem gastar ação bônus. Escola: Abjuração. [fonte](https://dnd2024.wikidot.com/spell:aura-of-vitality) | Adotar 2024 |
| M30 | Dissipar Magia (Dispel Magic) | 3º | ✅ | Igual. | Nada a fazer |
| M31 | Guardiões Espirituais (Spirit Guardians) | 3º | ⚠️ | Deslocamento **pela metade**. Dano (3d8, SAB, metade no sucesso) quando a área entra no espaço da criatura, quando ela entra ou quando **termina** o turno ali; 1 vez por turno. Escola: Conjuração. [fonte](https://dnd2024.wikidot.com/spell:spirit-guardians) | Adotar 2024 |
| M32 | Manto Espiritual (Spirit Shroud) | 3º | 📜 | Tasha, fora do PHB 2024. Escalonamento é por **ciclo** (+1d8 a cada 2 ciclos acima do 3º), não por nível de personagem como está na ficha. | Corrigir escalonamento |
| M33 | Palavra Curativa em Massa (Mass Healing Word) | 3º | ⚠️ | **2d4** + SAB (era 1d4), +1d4 por ciclo. | Adotar 2024 |
| M34 | Transferência de Vida (Life Transference) | 3º | 📜 | Xanathar. Você sofre 4d8 necrótico (não reduzível) e cura o dobro. Sempre preparada pela Ceifadora. | Manter como legado |
| M35 | Toque Vampírico (Vampiric Touch) | 3º | ✅ | 3d6, cura metade. Vem do Domínio. Na ficha, alcance "Eu" vira "Pessoal". [fonte](https://dnd2024.wikidot.com/spell:vampiric-touch) | Só corrigir o alcance |
| M36 | Impor Maldição (Bestow Curse) | 3º | ⚠️ | Opção 1 cobre **testes e salvaguardas** do atributo. Opção 3: falha em SAB no início do turno **força a ação Esquivar** (não "perde a ação"). Duração: 4º = 10 min com conc.; 5º e 6º = 8 h **sem** conc.; 7º e 8º = 24 h; 9º = até ser dissipada. A ficha inverte isso. [fonte](https://dnd2024.wikidot.com/spell:bestow-curse) | Adotar 2024 |
| M37 | Intenção Mortal | 3º | 🜏 | Variante à distância do Manto Espiritual. Mesmo problema de escalonamento (M32). | Alinhar com M32 |
| M38 | Guardião da Fé (Guardian of Faith) | 4º | ✅ | Igual. | Nada a fazer |
| M39 | Banimento (Banishment) | 4º | ✅ | Igual. | Nada a fazer |
| M40 | Praga (Blight) | 4º | ⚠️ | 2024 **não tem** a exceção para mortos-vivos e constructos. Criatura Planta **falha automaticamente**, sem "dano máximo". Vem do Domínio. [fonte](https://dnd2024.wikidot.com/spell:blight) | Adotar 2024 |
| M41 | Ala da Morte (Death Ward) | 4º | ✅ | Igual. Sempre preparada pela Ceifadora. | Nada a fazer |
| M42 | Campeão do Túmulo | 5º | 🜏 | **Não dá para conjurar no nível 8** (não há espaço de 5º, e a mana só libera o 5º ciclo no 9). | Deixar bloqueada até o nível 9 |
| M43 | Despelar | truque | 🜏 | Grimório extra. | Manter |
| M44 | Bolsa de Ossos | 1º | 🜏 | Grimório extra. | Manter |
| M45 | Minguar Ossos | 2º | 🜏 | Grimório extra. | Manter |

### Magias preparadas: a conta não fecha

No nível 8, o Clérigo 2024 tem **4 truques e 12 magias preparadas**. Por cima disso vêm as magias do Domínio da Morte (sempre preparadas, 8 até o 4º ciclo) e as 4 da Ceifadora.

- **Truques:** a ficha tem 6: 4 de classe + 2 do antecedente Acólito (Iniciado em Magia). Confirmado pelo Lucas em 19/11/2026. Em 19/11/2026 a Luz foi trocada pela Chama Sagrada e a Lâmina Necrótica deu lugar à Taumaturgia. Como nenhum vem do Ceifador, a troca para o Domínio da Disciplina no nível 9 não tira truque; o 5º truque de classe chega no nível 10.
- **Magias com ciclo:** a ficha tem 29 que não são do Domínio nem da Ceifadora. O limite é 12.
- **Proposta:** o app mostra todas no grimório, e você marca quais estão preparadas hoje com um contador "x/12". Até você escolher, todas aparecem como preparadas com um aviso.

## Habilidades

| # | Habilidade | Status | Observação | Recomendação |
|---|---|---|---|---|
| H1 | Canalizar Divindade | ⚠️ | No nível 8 são **3 usos**; 1 volta no descanso curto e todos no longo. A ficha diz "2 por descanso longo". | Adotar 2024 |
| H2 | Centelha Divina (Divine Spark) | ⚠️ ausente | Opção de Canalizar Divindade do Clérigo 2024: ação, 9 m, 1d8 + SAB de cura **ou** dano necrótico/radiante com salvaguarda de CON (metade no sucesso). 2d8 a partir do nível 7. | Adicionar |
| H3 | Repreender Mortos-Vivos (Turn Undead) | ⚠️ | Em 2024, na falha o morto-vivo fica **Amedrontado e Incapacitado** por 1 min. A ficha usa o texto 2014 ("repelidos"). | Adotar 2024 |
| H4 | Queimar os Mortos-Vivos (Sear Undead) | ✅ | Nd8 radiante, N = mod. de SAB (5d8). | Nada a fazer |
| H5 | Conjurador de Feitiços Potente | ✅ | É a opção Potent Spellcasting de Golpes Abençoados (nível 7): +5 no dano de truque de Clérigo. | Nada a fazer |
| H6 | Conjurador de Guerra (War Caster) | ⚠️ | A reação dispara quando uma criatura **sai do seu alcance**, não "provoca ataque de oportunidade". Faltam na ficha: componente somático com as mãos ocupadas, e o **+1 em INT, SAB ou CAR** (SAB 20 já no máximo). [fonte](https://dnd2024.wikidot.com/feat:war-caster) | Corrigir o texto |
| H7 | Ceifador (Reaper) | 📜 | Domínio da Morte 2014. Vale para truque de **necromancia** de alvo único: ele passa a mirar **duas criaturas a até 1,5 m uma da outra**, cada uma com sua salvaguarda. A ficha diz "causar o mesmo dano a um segundo inimigo". | Corrigir o texto, manter legado |
| H8 | Toque da Morte (Touch of Death) | 📜 | 5 + 2 × nível = **21** no nível 8. Exige acertar ataque corpo a corpo. Usa 1 Canalizar Divindade. | Manter legado |
| H9 | Morte Inescapável (Inescapable Destruction) | 📜 | Texto fiel ao 2014. | Manter legado |
| H10 | Natureza Imortal | 📜 | Traço da linhagem Reborn (Van Richten). Texto incompleto: vantagem em **salvaguardas** contra doença e envenenamento, resistência a veneno, vantagem em salvaguardas contra morte, não precisa comer, beber, respirar nem dormir. | Completar o texto |
| H11 | Ordem Divina: Protetor | ⚠️ ausente | Não aparece na ficha, mas explica armas marciais e armadura pesada. | Adicionar |
| H12 | Golpe Divino do Domínio (nível 8, 2014) | 📜 | Conflita com Golpes Abençoados 2024 (você já escolheu Potente). | Não adicionar |

## Ficha

As correções aritméticas já estão aprovadas e registradas no `DECISIONS.md` (Religião +4, Carisma −1, Intimidação, 9 m, linha de Armas). Pendências que dependem de você ou do mestre:

| # | Ponto | Observação |
|---|---|---|
| F1 | Iniciativa +4 | Com DES +1 só fecha com o talento Alerta 2024 (soma a proficiência). Tem Alerta? |
| F2 | Raça | "Humano Variante" é regra 2014 e Reborn substitui a raça. Proposta: Humano 2024 com a linhagem Reborn como homebrew aprovado. O Humano 2024 dá Inspiração Heroica a cada descanso longo, o que explica o "+1 Inspiração". |
| F3 | Seis perícias proficientes | Acólito dá 2, Clérigo dá 2, Humano (Habilidoso) dá 1 = 5. Sobra uma (Percepção ou Atletismo). |
| F4 | Idiomas | 2024: Comum + 2. Abissal é idioma raro e precisa de aval do mestre; falta um. |
| F5 | Mana no diário | O diário registra 34, 38, 40 e 46. Com a tabela do DMG, o máximo no nível 8 é 44. Os valores antigos ficam só como histórico. |

## Nível 9 (para conferir o assistente de subida)

Ganhos oficiais do 8 para o 9: proficiência +4 (CD 17, ataque +9, perícias e salvaguardas proficientes +1), espaço de 5º ciclo, **14** magias preparadas, nenhuma habilidade nova de classe. Pela tabela do DMG, a mana vai de 44 para 57. Toque da Morte vai para 23. PV: +5 (média do d8) + 2 (CON) = +7, ou rolagem. Libera as magias de domínio de 5º ciclo (Concha Antivida, Névoa Mortal) e o Campeão do Túmulo.
