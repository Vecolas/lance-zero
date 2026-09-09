/**
 * A verificação de retenção entra no modelo de habilidades.
 *
 * `planning/retencao` responde "voltou a falhar?"; este arquivo traduz essa
 * resposta em um número 0..1 e a aplica sobre a maestria — **derivando na
 * leitura, nunca gravando**. É o lado do modelo do passo 7 do Learning Loop
 * ("Reavaliar — o erro voltou? A prioridade sobe ou cai").
 *
 * Puro: sem relógio, sem persistência, sem React.
 *
 * Decisões que este arquivo carrega:
 *
 * 1. **`null` é um resultado, não um erro.** Sem base para afirmar, a função
 *    devolve `null` e a maestria volta intacta. Devolver 1 ("presumido bom") ou
 *    0 ("presumido ruim") para uma habilidade sem partida depois do treino
 *    seria inventar evidência — nos dois sentidos, e o sentido otimista é o pior
 *    porque produz elogio sem base.
 *
 * 2. **Quem decide se há base é o VEREDITO, por tabela.** A regra já foi tomada
 *    em `julgar`; repeti-la aqui como `if (partidasVerificadas < min)` criaria
 *    uma segunda cópia do limiar, e as duas divergiriam no dia em que alguém
 *    girasse só uma. A tabela é um `Record` sobre a união: quando um veredito
 *    novo nascer, o compilador exige a linha, em vez de o caso novo escorrer
 *    silenciosamente pelo `else`.
 *
 * 3. **O ajuste sobe E desce.** `nao-reincidiu` empurra a maestria para cima
 *    (a habilidade cai na fila do planner); `voltou-a-falhar` puxa para baixo.
 *    A reincidência DEPOIS do treino é evidência mais forte que uma primeira
 *    falha, e é isso que o PEDAGOGY chama de reavaliar.
 *
 *    RISCO DECLARADO: o mesmo lance errado também alimenta `pesoErroDePartida`
 *    no planner, por `erros-recentes`. Os dois caminhos medem coisas diferentes
 *    (recência/severidade lá, reincidência pós-treino aqui) mas nascem do mesmo
 *    evento, então há sobreposição. Nenhum dos dois pesos foi calibrado; se a
 *    telemetria mostrar habilidade reincidente monopolizando o plano, é aqui e
 *    em `PLANNER_CONFIG.pesoErroDePartida` que se mexe — não em mais um terceiro
 *    lugar.
 *
 * 4. **Nada é persistido.** O efeito é temporário e reversível por construção:
 *    a verificação é recalculada das análises a cada leitura. Ver
 *    `masteryComRetencaoDePartida`.
 */

import { MASTERY_CONFIG, masteryComRetencaoDePartida, type MasteryConfig } from './mastery'
import type {
  RetencaoDeHabilidade,
  SkillId,
  SkillMastery,
  VereditoDeRetencao,
} from '@/domain/types'

/**
 * Vereditos que autorizam afirmar um número.
 *
 * Fonte única da regra "há base para afirmar". Exportada para o teste poder
 * varrer a TABELA em vez de uma lista escrita à mão — lista não acusa o
 * veredito que nunca entrou nela.
 */
export const AFIRMA_NUMERO: Record<VereditoDeRetencao, boolean> = {
  'sem-evidencia': false,
  'evidencia-insuficiente': false,
  'voltou-a-falhar': true,
  'nao-reincidiu': true,
}

function clamp01(valor: number): number {
  if (Number.isNaN(valor)) return 0
  if (valor < 0) return 0
  if (valor > 1) return 1
  return valor
}

/**
 * Acurácia de retenção medida em PARTIDA, 0..1, ou `null` sem base.
 *
 * O denominador é PARTIDA ANALISADA depois do treino, não "vez em que a
 * habilidade estava em jogo" — este último não é observável com o dado que
 * guardamos. Ver o ponto cego 4 de `planning/retencao`.
 */
export function acuraciaDeRetencaoEmPartida(retencao: RetencaoDeHabilidade): number | null {
  if (!AFIRMA_NUMERO[retencao.veredito]) return null
  // Guarda contra veredito e contagem discordarem (só aconteceria se alguém
  // montasse o objeto à mão). Dividir por zero devolveria NaN, que se propaga
  // por comparações sem nunca falhar — o defeito silencioso que `instanteDe`
  // existe para evitar do outro lado.
  if (retencao.partidasVerificadas <= 0) return null
  return clamp01(1 - retencao.partidasComFalha / retencao.partidasVerificadas)
}

/**
 * Aplica a verificação sobre uma lista de maestrias.
 *
 * Devolve uma lista NOVA e não muta a entrada: quem chama continua com o estado
 * persistido intacto ao lado da visão ajustada. Habilidade sem verificação, ou
 * com verificação sem base, atravessa como o MESMO objeto.
 */
export function aplicarRetencaoDePartida(
  mastery: readonly SkillMastery[],
  retencoes: ReadonlyMap<SkillId, RetencaoDeHabilidade>,
  config: MasteryConfig = MASTERY_CONFIG,
): SkillMastery[] {
  return mastery.map((estado) => {
    const retencao = retencoes.get(estado.skillId)
    if (!retencao) return estado
    return masteryComRetencaoDePartida(estado, acuraciaDeRetencaoEmPartida(retencao), config)
  })
}
