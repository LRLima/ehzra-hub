/** Carrega e valida os JSON de regra. Se um arquivo estiver fora do formato, o app avisa em vez de quebrar em silêncio. */
import characterJson from '../../data/character.json';
import progressaoJson from '../../data/class-progression.json';
import homebrewJson from '../../data/homebrew-rules.json';
import spellsJson from '../../data/spells.json';
import featuresJson from '../../data/features.json';
import conditionsJson from '../../data/conditions-2024.json';
import strategiesJson from '../../data/strategies.json';
import loreJson from '../../data/lore.json';
import { z } from 'zod';
import {
  Character, ClassProgression, Conditions, Feature, HomebrewRules, Lore, Spell, Strategies, SCHEMA_VERSION,
} from './schemas';
import type { Regras } from './rules';

export function carregarRegras(): Regras {
  const strategies = Strategies.parse(strategiesJson);
  return {
    character: Character.parse(characterJson),
    progressao: ClassProgression.parse(progressaoJson),
    homebrew: HomebrewRules.parse(homebrewJson),
    magias: z.object({ schemaVersion: z.literal(SCHEMA_VERSION), magias: z.array(Spell) }).parse(spellsJson).magias,
    habilidades: z.object({ schemaVersion: z.literal(SCHEMA_VERSION), habilidades: z.array(Feature) }).parse(featuresJson).habilidades,
    condicoes: Conditions.parse(conditionsJson).condicoes,
    playbooks: strategies.playbooks,
  };
}

export const carregarLore = () => Lore.parse(loreJson);
export const carregarEstrategiasOriginais = () => Strategies.parse(strategiesJson).textoOriginal;
