/**
 * Verificação de retenção: depois de treinar, a habilidade voltou a falhar?
 *
 * É o passo 6–7 do Learning Loop do PEDAGOGY ("Aplicar" e "Reavaliar") e o
 * fecho que a promessa do produto anuncia. Até aqui o app sabia dizer o que o
 * aluno perde; não sabia dizer se parou de perder.
 *
 * Puro e determinístico: nenhuma chamada a `Date.now`, `Math.random`, rede ou
 * persistência. O relógio entra por parâmetro, os dados entram por parâmetro.
 *
 * Decisões que este arquivo carrega:
 *
 * 1. **A regra de "erro por habilidade, com a data certa" NÃO é reimplementada
 *    aqui.** Ela já tem dono: `errosRecentesDeAnalises`. Este módulo a chama
 *    por partida, para poder AGRUPAR por partida — que é a única coisa que ele
 *    precisa a mais. Uma segunda cópia da regra (filtro de severidade, filtro
 *    de precisão, data da PARTIDA e não da análise) divergiria da primeira no
 *    dia em que alguém girasse só uma, e divergiria em silêncio.
 *
 * 2. **A afirmação é assimétrica, e essa é a decisão central.** Basta UMA
 *    partida para dizer "voltou a falhar": um erro aconteceu, e isso é fato
 *    observado. Não basta uma partida para dizer "melhorou": ausência de erro
 *    numa partida é ausência de evidência, não evidência de ausência. Por isso
 *    o limiar de exposição trava só o lado positivo, e por isso a ordem dos
 *    testes em `julgar` importa — inverter os dois faria uma reincidência real
 *    ser reportada como "ainda não deu para saber".
 *
 * 3. **O denominador é PARTIDA ANALISADA, nunca partida importada.** Um jogo
 *    que ninguém analisou não diz nada sobre a habilidade; contá-lo como
 *    "passou sem erro" é transformar silêncio em aprovação — a forma mais
 *    direta de o app parabenizar o aluno por nada.
 *
 * 4. **PONTO CEGO DECLARADO: não sabemos quantas OPORTUNIDADES a habilidade
 *    teve.** `PositionAnalysis.skillIds` só é preenchido nos lances que o
 *    pipeline aprofundou, que são justamente os candidatos a erro; um lance
 *    CERTO em que o garfo estava disponível não deixa rastro nenhum. Então
 *    `nao-reincidiu` significa exatamente "não reincidiu nas N partidas
 *    analisadas depois do treino", e nunca "domina o padrão". Qualquer texto de
 *    interface construído sobre este veredito tem de respeitar esse limite.
 *
 * 5. **PONTO CEGO DECLARADO: análise interrompida no meio parece análise
 *    completa.** O pipeline pode abortar (`AnalysisAbortedError`) tendo gravado
 *    parte dos lances, e o que sobra no disco é indistinguível de uma partida
 *    limpa. O efeito é otimista — uma partida meio analisada pode entrar como
 *    "sem falha". Não há campo hoje que registre a completude da análise, e
 *    inventar um aqui seria decidir por outra camada.
 */

import { errosRecentesDeAnalises } from '@/domain/planning/erros-recentes'
import type {
  Game,
  PositionAnalysis,
  RetencaoDeHabilidade,
  ReviewCard,
  SkillId,
  VereditoDeRetencao,
} from '@/domain/types'
import { instanteDe } from '@/lib/tempo'

const MS_POR_DIA = 86_400_000

// -------------------------------------------------------------------- config

export interface RetencaoConfig {
  /**
   * Partidas analisadas necessárias para afirmar que a habilidade MELHOROU.
   *
   * HEURÍSTICA DE PRODUTO, e uma que **nunca foi calibrada com dado real** —
   * não há neste repositório nenhuma medição de quantas partidas bastam para o
   * sinal parar de ser ruído. O valor foi escolhido pelo argumento mais fraco
   * que existe: uma partida claramente não sustenta "você melhorou", então o
   * mínimo tem de ser maior que um. Recalibrar assim que houver telemetria de
   * reincidência real.
   *
   * Não trava o lado negativo. Ver decisão 2 no topo do arquivo.
   */
  minPartidasParaAfirmarMelhora: number
  /**
   * Folga, em dias, na janela repassada a `errosRecentesDeAnalises`.
   *
   * LIMITE DE DESIGN, não botão de ajuste. A janela daquela função é expressa
   * em DIAS e reconvertida para milissegundos lá dentro; o ida-e-volta em ponto
   * flutuante pode cair um fio de milissegundo do lado errado da borda. A folga
   * garante que quem decide o corte é o teste explícito daqui
   * (`jogadaEm > inicio`), e não um arredondamento invisível lá.
   */
  margemDaJanelaDias: number
}

export const RETENCAO_CONFIG: RetencaoConfig = {
  minPartidasParaAfirmarMelhora: 2,
  margemDaJanelaDias: 1,
}

// ------------------------------------------------------------------ veredito

/**
 * Traduz as contagens em veredito.
 *
 * A ORDEM DOS TESTES É A REGRA, não estilo: reincidência é decidida antes do
 * limiar de exposição. Ver decisão 2 no topo do arquivo.
 */
function julgar(
  partidasVerificadas: number,
  falhas: number,
  config: RetencaoConfig,
): VereditoDeRetencao {
  if (partidasVerificadas <= 0) return 'sem-evidencia'
  if (falhas > 0) return 'voltou-a-falhar'
  if (partidasVerificadas < config.minPartidasParaAfirmarMelhora) return 'evidencia-insuficiente'
  return 'nao-reincidiu'
}

// ------------------------------------------------------------- agrupamento

/**
 * Agrupa análises por partida.
 *
 * Existe para a chamada a `errosRecentesDeAnalises` poder ser feita PARTIDA A
 * PARTIDA: só assim dá para saber em quantas partidas distintas a habilidade
 * falhou, que é o numerador honesto. `RecentGameError` não carrega `gameId`, e
 * usar a data como identidade de partida seria inventar uma chave.
 */
function agruparPorPartida(analises: readonly PositionAnalysis[]): Map<string, PositionAnalysis[]> {
  const grupos = new Map<string, PositionAnalysis[]>()
  for (const analise of analises) {
    const atual = grupos.get(analise.gameId)
    if (atual) atual.push(analise)
    else grupos.set(analise.gameId, [analise])
  }
  return grupos
}

// ---------------------------------------------------------------- verificação

export interface RetencaoOptions {
  /** Relógio injetado. */
  agora: Date
  config?: RetencaoConfig
}

/**
 * Verifica uma habilidade.
 *
 * `treinadaEm` é o instante em que a habilidade virou treino — na prática, a
 * criação do card de revisão. Só partidas jogadas ESTRITAMENTE depois desse
 * instante contam: a partida que gerou o treino foi jogada antes dele, e
 * deixá-la entrar faria a própria origem do card ser lida como reincidência.
 *
 * Data ilegível é recusada em voz alta. Devolver `sem-evidencia` para um
 * `treinadaEm` corrompido esconderia um bug de quem chama atrás do estado que
 * significa "tudo normal, só falta jogar".
 */
export function verificarRetencao(
  skillId: SkillId,
  treinadaEm: string,
  analises: readonly PositionAnalysis[],
  partidasPorId: ReadonlyMap<string, Game>,
  { agora, config = RETENCAO_CONFIG }: RetencaoOptions,
): RetencaoDeHabilidade {
  const inicio = instanteDe(treinadaEm)
  if (inicio === null) {
    throw new Error(
      `Instante de treino ilegível para ${skillId}: ${JSON.stringify(treinadaEm)}. ` +
        'Sem data de início não há "depois do treino" para verificar.',
    )
  }

  const agoraMs = agora.getTime()
  // A janela repassada é DERIVADA do intervalo que interessa, não um segundo
  // número escolhido à mão: um valor próprio aqui divergiria de `inicio`.
  const janelaDias = (agoraMs - inicio) / MS_POR_DIA + config.margemDaJanelaDias

  let partidasVerificadas = 0
  let partidasComFalha = 0
  let falhas = 0
  let ultimaFalhaMs: number | null = null
  let ultimaFalhaEm: string | null = null

  for (const [gameId, analisesDoJogo] of agruparPorPartida(analises)) {
    // Análise órfã: sem a partida não há data confiável. Mesmo ponto cego
    // declarado em `erros-recentes`, e pelo mesmo motivo.
    const partida = partidasPorId.get(gameId)
    if (!partida) continue

    const jogadaEm = instanteDe(partida.playedAt)
    if (jogadaEm === null) continue
    // Estritamente depois: ver o comentário da função.
    if (jogadaEm <= inicio) continue
    // Partida "do futuro" (relógio torto, importação ruim) não é evidência de
    // nada e, aceita, só serviria para inflar o denominador.
    if (jogadaEm > agoraMs) continue

    partidasVerificadas += 1

    const errosDoJogo = errosRecentesDeAnalises(analisesDoJogo, new Map([[gameId, partida]]), {
      agora,
      janelaDias,
    }).filter((erro) => erro.skillId === skillId)

    if (errosDoJogo.length === 0) continue

    partidasComFalha += 1
    falhas += errosDoJogo.length
    if (ultimaFalhaMs === null || jogadaEm > ultimaFalhaMs) {
      ultimaFalhaMs = jogadaEm
      ultimaFalhaEm = partida.playedAt
    }
  }

  return {
    skillId,
    veredito: julgar(partidasVerificadas, falhas, config),
    treinadaEm,
    partidasVerificadas,
    partidasComFalha,
    falhas,
    ultimaFalhaEm,
  }
}

// ------------------------------------------------------- instantes de treino

/**
 * Quando cada habilidade virou treino, a partir dos cards de revisão.
 *
 * Decisões:
 *
 * 1. **O instante é o do card MAIS RECENTE daquela habilidade, não o do
 *    primeiro.** A pergunta do produto é "desde a última vez que trabalhei
 *    isto, voltou a falhar?". Com o primeiro card a janela nunca reiniciaria, e
 *    um erro de um ano atrás manteria o veredito em `voltou-a-falhar` para
 *    sempre — o efeito deixaria de ser reversível, que é justamente o que ele
 *    precisa ser.
 *
 * 2. **Revisar o card NÃO reinicia a janela; só criar um card reinicia.** Se
 *    cada revisão empurrasse `treinadaEm` para frente, uma habilidade em
 *    revisão ativa ficaria presa em `sem-evidencia` para sempre — a verificação
 *    nunca teria partidas depois do "treino" para olhar, e o recurso existiria
 *    sem nunca responder nada.
 *
 * 3. **A comparação é por INSTANTE, nunca por texto.** `createdAt` pode chegar
 *    de backup restaurado com deslocamento (`-03:00`), e aí a ordem alfabética
 *    e a ordem cronológica discordam sem que nada falhe. É a mesma decisão que
 *    `src/lib/tempo.ts` existe para ter um dono só.
 */
export function instantesDeTreinoPorHabilidade(cards: readonly ReviewCard[]): Map<SkillId, string> {
  const maisRecente = new Map<SkillId, { iso: string; ms: number }>()

  for (const card of cards) {
    const criadoEm = instanteDe(card.createdAt)
    // Card com data ilegível não vira início de janela: não dá para saber o que
    // é "depois" dele. Some da conta, e some para o lado seguro — a habilidade
    // fica sem veredito em vez de ganhar um veredito inventado.
    if (criadoEm === null) continue

    for (const skillId of card.skillIds) {
      const atual = maisRecente.get(skillId)
      if (!atual || criadoEm > atual.ms) {
        maisRecente.set(skillId, { iso: card.createdAt, ms: criadoEm })
      }
    }
  }

  const resultado = new Map<SkillId, string>()
  for (const [skillId, quando] of maisRecente) resultado.set(skillId, quando.iso)
  return resultado
}

/**
 * Verifica todas as habilidades que já viraram treino.
 *
 * Habilidade que nunca virou treino simplesmente não aparece no resultado — não
 * há "depois do treino" para ela, e devolver `sem-evidencia` seria afirmar que
 * a verificação rodou quando ela nem tinha o que verificar.
 */
export function verificarRetencaoDeTreinos(
  treinos: ReadonlyMap<SkillId, string>,
  analises: readonly PositionAnalysis[],
  partidasPorId: ReadonlyMap<string, Game>,
  options: RetencaoOptions,
): Map<SkillId, RetencaoDeHabilidade> {
  const resultado = new Map<SkillId, RetencaoDeHabilidade>()
  for (const [skillId, treinadaEm] of treinos) {
    resultado.set(skillId, verificarRetencao(skillId, treinadaEm, analises, partidasPorId, options))
  }
  return resultado
}
