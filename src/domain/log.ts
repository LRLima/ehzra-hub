/** Transforma eventos em frases do log ("Conjurou Guardiões Espirituais (3º, 5 mana)"). */
import type { Envelope } from './events';
import { type Regras, magia } from './rules';

export function descrever(r: Regras, env: Envelope, todos: Envelope[] = []): string {
  const e = env.e;
  switch (e.t) {
    case 'dano': return `Recebeu ${e.valor} de dano`;
    case 'cura': return `Recuperou ${e.valor} PV`;
    case 'pvTemp': return `Ganhou ${e.valor} PV temporários`;
    case 'conjurar': {
      const s = magia(r, e.magia);
      const ciclo = e.ciclo === 0 ? 'truque' : `${e.ciclo}º, ${e.custo} mana${e.viaCeifadora ? ' pela Ceifadora' : ''}`;
      return `Conjurou ${s.nome} (${ciclo})`;
    }
    case 'quebrarConcentracao': return 'Perdeu a concentração';
    case 'efeitoAdd': return `Efeito ativo: ${e.efeito.nome}`;
    case 'efeitoRemover': return `Efeito encerrado: ${e.efeito}`;
    case 'iniciarCombate': return 'Combate iniciado';
    case 'encerrarCombate': return 'Combate encerrado';
    case 'proximaRodada': return 'Próxima rodada';
    case 'usarTurno': return `Marcou ${{ acao: 'ação', acaoBonus: 'ação bônus', reacao: 'reação', movimento: 'movimento' }[e.parte]}`;
    case 'usarRecurso': {
      const nome = r.habilidades.find((f) => (f.recurso ?? f.id) === e.recurso)?.nome ?? e.recurso;
      return e.qtd > 0 ? `Usou ${nome}` : `Devolveu um uso de ${nome}`;
    }
    case 'inspiracao': return e.delta > 0 ? 'Ganhou Inspiração' : 'Gastou Inspiração';
    case 'mana': return e.delta > 0 ? `Recuperou ${e.delta} de mana` : `Gastou ${-e.delta} de mana`;
    case 'descanso': return e.tipo === 'longo' ? 'Descanso longo' : `Descanso curto${e.pvDadosDeVida ? ` (+${e.pvDadosDeVida} PV)` : ''}`;
    case 'condicao': return `${e.ativa ? 'Ficou' : 'Deixou de ficar'} ${e.condicao}`;
    case 'exaustao': return `Exaustão ${e.delta > 0 ? '+' : ''}${e.delta}`;
    case 'avatar': {
      const a = r.homebrew.avatar.aspectos[e.d4 - 1];
      return `Avatar dos Quatro Túmulos: ${a.nome} (d4 = ${e.d4})`;
    }
    case 'tocarFoice': return 'Tocou a Ceifadora (sintonia renovada)';
    case 'mortoVivoAdd': return `Novo morto-vivo: ${e.mv.nome}`;
    case 'mortoVivoAtualizar': return `Morto-vivo atualizado (${e.id})`;
    case 'mortoVivoRemover': return `Morto-vivo removido (${e.id})`;
    case 'inventarioAdd': return `Inventário: +${e.item.qtd} ${e.item.nome}`;
    case 'inventarioQtd': return `Inventário: ${e.delta > 0 ? '+' : ''}${e.delta} (${e.id})`;
    case 'inventarioRemover': return `Inventário: removeu ${e.id}`;
    case 'ouro': return `Ouro ${e.delta > 0 ? '+' : ''}${e.delta} PO`;
    case 'novaSessao': return `Nova sessão: ${e.nome}`;
    case 'nota': return 'Notas da sessão editadas';
    case 'preparar': return `${e.preparada ? 'Preparou' : 'Despreparou'} ${magia(r, e.magia).nome}`;
    case 'definirPreparadas': return `Preparou ${e.magias.length} magias${e.origem ? ` (${e.origem})` : ''}`;
    case 'subirNivel': return `Subiu para o nível ${e.para} (+${e.pvGanho} PV)${e.preparadas ? ' e trocou as preparadas' : ''}`;
    case 'desfazer': {
      const alvo = todos.find((x) => x.id === e.alvo);
      return `Desfez: ${alvo ? descrever(r, alvo, todos) : 'ação'}`;
    }
  }
}
