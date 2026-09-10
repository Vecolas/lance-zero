/**
 * Leitura dos sinais que as PARTIDAS REAIS dão ao treino.
 *
 * São três, e nascem das mesmas linhas do banco:
 *
 * 1. **erro recente** — o que você errou nos últimos dias, que sobe a
 *    prioridade da habilidade;
 * 2. **retenção** — depois que a habilidade virou treino, ela voltou a falhar?
 * 3. **desvio de repertório** — você saiu da linha que você mesmo escreveu.
 *
 * O terceiro entrou AQUI, e não numa leitura própria, por decisão de contrato:
 * ele precisa exatamente das mesmas partidas que os outros dois. Uma segunda
 * leitura com janela e teto próprios foi como nasceu a issue #53 — dois
 * recortes de data que concordam até o dia em que alguém gira um deles, e a
 * divergência aparece como um plano diferente do que a configuração diz, sem
 * erro nenhum no caminho.
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
 *
 * O MESMO PONTO CEGO VALE PARA O DESVIO, e o lado errado dele também é o
 * seguro: um desvio antigo demais some da contagem, e o produto deixa de propor
 * um treino que talvez coubesse. O contrário — inflar a contagem com partidas
 * de meses atrás — faria o plano de hoje tratar como urgente uma linha que o
 * aluno já corrigiu.
 */

import { desviosDeRepertorios, type DesvioDeRepertorio } from '@/domain/planning/aberturas'
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
import { repertoriosDoAluno } from './repertorio-no-treino'

export interface SinaisDePartida {
  recentGameErrors: RecentGameError[]
  retencoes: Map<SkillId, RetencaoDeHabilidade>
  /** Já ordenados por relevância. Ver `@/domain/planning/aberturas`. */
  desviosDeRepertorio: DesvioDeRepertorio[]
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

  // O repertório passou a vir do REPOSITÓRIO, e não do conteúdo de fábrica: o
  // que vale é o que o aluno editou, com a semente preenchendo o resto. Por
  // isso a leitura é assíncrona agora.
  const { arvores } = await repertoriosDoAluno(repo)

  return {
    recentGameErrors: errosRecentesDeAnalises(analises, partidasPorId, { agora }),
    // As MESMAS partidas dos outros dois sinais. O repertório não abre leitura
    // própria: se um dia ele precisar de mais partidas que os erros recentes, o
    // lugar de mudar é a janela acima, para todo mundo de uma vez.
    desviosDeRepertorio: desviosDeRepertorios(arvores, partidas),
    retencoes: verificarRetencaoDeTreinos(
      instantesDeTreinoPorHabilidade(cards),
      analises,
      partidasPorId,
      { agora },
    ),
  }
}
