/**
 * Leitura dos sinais que as PARTIDAS REAIS dão ao treino.
 *
 * São dois, e nascem das mesmas linhas do banco:
 *
 * 1. **erro recente** — o que você errou nos últimos dias, que sobe a
 *    prioridade da habilidade;
 * 2. **retenção** — depois que a habilidade virou treino, ela voltou a falhar?
 *
 * A DECISÃO QUE ESTE ARQUIVO CARREGA: as duas telas que precisam disso
 * ("Treino de hoje" e "Progresso") leem AQUI, e não cada uma do seu jeito. A
 * versão anterior tinha a sequência de leituras escrita dentro de
 * `DailyPlanView`; copiá-la para a tela de progresso criaria duas janelas de
 * recência, dois tetos de leitura e duas bordas de data — e elas divergiriam
 * sem nada acusar, porque cada tela continuaria mostrando um número plausível.
 *
 * PONTO CEGO DECLARADO: a verificação de retenção só enxerga as partidas que
 * este carregamento traz, que são as da janela de recência e no máximo
 * `maxPartidasVarridas`. Uma habilidade treinada há mais tempo que essa janela é
 * julgada com menos partidas do que existem. O viés é sempre para MENOS
 * evidência (`sem-evidencia` / `evidencia-insuficiente`), nunca para afirmar
 * melhora que não houve — que é o lado seguro de errar.
 */

import {
  ERROS_RECENTES_CONFIG,
  errosRecentesDeAnalises,
  indexarPartidas,
  inicioDaJanela,
} from '@/domain/planning/erros-recentes'
import type { RecentGameError } from '@/domain/planning/planner'
import {
  instantesDeTreinoPorHabilidade,
  verificarRetencaoDeTreinos,
} from '@/domain/planning/retencao'
import type { RetencaoDeHabilidade, SkillId, TrainingRepository } from '@/domain/types'

export interface SinaisDePartida {
  recentGameErrors: RecentGameError[]
  retencoes: Map<SkillId, RetencaoDeHabilidade>
}

export async function carregarSinaisDePartida(
  repo: TrainingRepository,
  options: { agora: Date },
): Promise<SinaisDePartida> {
  const { agora } = options

  // Só partidas dentro da janela de recência interessam, e o repositório já
  // sabe filtrar por data: pedir tudo e descartar depois custaria leitura à toa.
  // O `Date` vai INTEIRO para `GameQuery.since`, sem virar texto no caminho:
  // desde a issue #57 o contrato é `Date`, e é isso que impede a outra ponta de
  // comparar como texto uma partida importada com deslocamento de fuso — ela
  // seria cortada aqui e aceita pelo domínio, sem exceção e sem log (issue #53).
  // Trocar isto por um recorte próprio ressuscita as duas.
  const desde = inicioDaJanela(agora)

  const [partidas, cards] = await Promise.all([
    repo.listGames({ since: desde, limit: ERROS_RECENTES_CONFIG.maxPartidasVarridas }),
    // Todos os cards, não só os vencidos: quem marca quando a habilidade "virou
    // treino" é a data de CRIAÇÃO do card, e um card já revisado não está
    // vencido hoje mas continua marcando o início da janela.
    repo.listReviewCards(),
  ])

  // As análises são lidas por partida (é o que o repositório oferece), então
  // isto é N leituras — COM TETO: `listGames` já veio limitado, e as partidas
  // vêm da mais recente para a mais antiga. Sem esse teto, quem importou mil
  // partidas pagaria mil leituras para abrir a tela.
  const analises = (
    await Promise.all(partidas.map((partida) => repo.listPositionAnalyses(partida.id)))
  ).flat()

  const partidasPorId = indexarPartidas(partidas)

  return {
    recentGameErrors: errosRecentesDeAnalises(analises, partidasPorId, { agora }),
    retencoes: verificarRetencaoDeTreinos(
      instantesDeTreinoPorHabilidade(cards),
      analises,
      partidasPorId,
      { agora },
    ),
  }
}
