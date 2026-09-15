/**
 * Planner do "Hoje", versão 2.
 *
 * O QUE MUDOU, e é uma mudança de natureza e não de ajuste: o planner da V1
 * escolhia BLOCOS DE TEMPO por área ("Tática: 8 min"). A tela abria uma sessão
 * linear e, dentro dela, mostrava posições. Em nenhum ponto desse caminho
 * alguém perguntava se o aluno já tinha recebido o conceito — não havia onde
 * perguntar, porque não existia o conceito de estágio. O resultado era o
 * produto cobrando conhecimento que nunca ensinou.
 *
 * A V2 escolhe ATIVIDADES, e cada atividade declara o estágio que trabalha. A
 * pergunta passa a ser obrigatória porque `ESTAGIO_MINIMO_DO_TIPO` está no
 * caminho de toda seleção: não existe caminho que produza
 * `pratica-independente` para uma habilidade em `unseen`.
 *
 * AS DEZ REGRAS DURAS (plano §34), e onde cada uma é cumprida:
 *
 *  R1  unseen nunca gera prática independente  -> `tiposPermitidos`
 *  R2  nenhuma atividade depende de outra do MESMO plano -> `semDependenciaNoMesmoDia`
 *  R3  o plano não muda durante o dia          -> `@/domain/aprendizado/plano`, não aqui
 *  R4  concluir não é dominar                  -> `CompletionRule`, que não lê acerto
 *  R5  revisões vencidas têm prioridade        -> ordem de `candidatas`
 *  R6  erro de partida só vira prática independente se o conceito já é conhecido
 *                                              -> `tiposPermitidos`, no candidato de erro
 *  R7  poucos conceitos novos no mesmo dia     -> `maxConceitosNovosPorDia`
 *  R8  sem repetir demais a mesma habilidade   -> `maxAtividadesPorHabilidade`
 *  R9  respeita o orçamento                    -> `caberNoOrcamento`
 *  R10 todo card tem motivo explicável         -> `generatedReason`, obrigatório no tipo
 *
 * DETERMINÍSTICO. Mesmo contexto e mesma seed produzem o mesmo plano, sempre.
 * Nenhuma chamada a `Date.now`, `Math.random`, rede ou persistência acontece
 * aqui — `now` chega por parâmetro como na V1.
 */

import {
  ESTAGIO_MINIMO_DO_TIPO,
  ROTULO_DA_ATIVIDADE,
  PLANNER_VERSION,
  chaveDoDia,
  estagioAlcanca,
  ordemDoCurriculo,
  prerequisitosDe,
  progressoInicial,
  type ActivityDefinition,
  type ActivityKind,
  type DailyActivity,
  type PlanoDoDia,
  type SkillState,
} from '@/domain/aprendizado'
import { getSkill } from '@/domain/skills/catalog'
import type { ReviewCard, SkillId, SkillMastery, UserProfile } from '@/domain/types'
import { createRng } from './rng'
import { ladoPorExtenso, type DesvioDeRepertorio } from './aberturas'
import type { RecentGameError } from './planner'
import type { EndgameSkillState } from '@/domain/endgames'

/**
 * Parâmetros do planner.
 *
 * ATENÇÃO: HEURÍSTICAS DE PRODUTO para um jogador de ~1100. Nenhuma saiu de
 * dado. Recalibrar com telemetria.
 */
export const PLANNER_V2_CONFIG = {
  /**
   * Conceitos NOVOS no mesmo dia (regra R7).
   *
   * Dois. Três lições novas num dia é mais carga nova do que alguém consolida
   * numa sessão de 40 minutos, e o efeito de empilhar conceito novo é o aluno
   * sair sem nenhum deles.
   */
  maxConceitosNovosPorDia: 2,
  /** Atividades que podem tocar a MESMA habilidade num dia (regra R8). */
  maxAtividadesPorHabilidade: 2,
  /** Abaixo disso uma atividade não vale a troca de contexto. */
  minutosMinimosPorAtividade: 4,
  /** Teto de atividades por orçamento. Menos cards, menos troca de contexto. */
  atividadesPorOrcamento: { 20: 3, 40: 5, 60: 6 } satisfies Record<20 | 40 | 60, number>,
  /** Minutos estimados por item, por tipo. */
  minutosPorItem: {
    licao: 8,
    'pratica-guiada': 6,
    'pratica-independente': 6,
    revisao: 1.5,
    calculo: 8,
    'revisao-de-partida': 7,
    diagnostico: 5,
  } satisfies Record<ActivityKind, number>,
  /** Teto absoluto de revisões vencidas numa atividade de revisão. */
  maxCardsPorRevisao: 12,
  /**
   * Fatia MÁXIMA do dia que a revisão pode ocupar.
   *
   * EXISTE CONTRA UM DEFEITO CONCRETO: sem ela, uma fila grande de vencidos
   * consome o orçamento inteiro na primeira atividade, e o dia vira só revisão.
   * Num orçamento de 20 minutos, 17 cards de repertório davam 18 minutos e não
   * sobrava espaço nem para o desvio de repertório que aconteceu numa partida
   * real — a evidência mais forte que o produto tem. O aluno via um plano de um
   * card só, sem nada explicando por quê.
   *
   * A V1 resolvia isso repartindo o orçamento por PESO (`pesoRevisao: 0,35`).
   * A V2 escolhe atividades inteiras, então o equivalente é um teto — e o teto
   * decide também QUANTOS cards cabem, porque o número de itens é derivado
   * dele, não escrito à parte.
   *
   * HEURÍSTICA DE PRODUTO. 0,4 é "revisar é prioridade, mas um dia inteiro de
   * revisão não é um plano".
   */
  fatiaMaximaDaRevisao: 0.4,
  /** Janela, em dias, para um erro de partida ainda contar como recente. */
  janelaErrosRecentesDias: 14,
  /**
   * Peso da FRAQUEZA na ordem entre habilidades já praticáveis.
   *
   * Some `pesoDaFraqueza * (1 - mastery)` à prioridade, então uma habilidade
   * com maestria 0,2 passa à frente de uma com 0,9. Precisa ser maior que a
   * distância que o valor pedagógico cria (no máximo 5) para conseguir
   * reordenar de fato; 40 dá folga sem atravessar a fronteira entre categorias
   * de prioridade, que estão a 100 de distância.
   *
   * HEURÍSTICA DE PRODUTO, nunca calibrada.
   */
  pesoDaFraqueza: 40,
  /**
   * Quantas partidas com o mesmo desvio bastam para virar atividade.
   *
   * Uma. Herdado da V1 pelo mesmo motivo declarado lá: uma única vez em que o
   * aluno não jogou o próprio lance já é falha de recuperação.
   */
  minPartidasDeDesvio: 1,
} as const

export type PlannerV2Config = typeof PLANNER_V2_CONFIG

export interface PlannerV2Context {
  profile: UserProfile
  /** Estado de aprendizagem ANTES da geração. Ver R2 e o cabeçalho. */
  skillStates: SkillState[]
  /**
   * A MAESTRIA, que decide a ORDEM entre habilidades já praticáveis.
   *
   * O estágio decide o QUE pode ser oferecido; a maestria decide o QUE VEM
   * PRIMEIRO. São perguntas diferentes e por isso são dois campos: sem a
   * maestria aqui, todas as habilidades em `independent` valeriam o mesmo, e a
   * ordem cairia no currículo — o aluno treinaria eternamente o que já domina
   * porque veio antes no grafo.
   *
   * É também por onde a VERIFICAÇÃO DE RETENÇÃO entra. Quem chama passa a
   * maestria já ajustada por `aplicarRetencaoDePartida`: a habilidade que foi
   * treinada e NÃO voltou a falhar em partida sobe de maestria, e por isso
   * desce na fila. É o ciclo do produto fechando — e ele fecha aqui, na ordem,
   * não no estágio, porque não errar mais não é a mesma coisa que ter sido
   * ensinado.
   *
   * Opcional: lista vazia significa "sem medida", e sem medida a ordem é a do
   * currículo, que é o padrão honesto para quem ainda não tem histórico.
   */
  mastery?: readonly SkillMastery[]
  dueCards: ReviewCard[]
  recentGameErrors: RecentGameError[]
  /**
   * Vezes em que o aluno saiu do PRÓPRIO repertório em partida real, já
   * ordenadas por relevância (ver `./aberturas`).
   *
   * Continua sendo tratado como EVIDÊNCIA e não como currículo, igual à V1: é
   * algo que aconteceu no tabuleiro, numa linha que o próprio aluno escreveu.
   */
  desviosDeRepertorio?: readonly DesvioDeRepertorio[]
  /** Partidas importadas e ainda não revisadas pelo aluno. */
  partidasPorRevisar?: readonly { id: string; rotulo: string }[]
  endgameProgress?: readonly EndgameSkillState[]
  now: Date
}

const MS_POR_DIA = 86_400_000

/**
 * Os tipos de atividade que o estágio da habilidade PERMITE.
 *
 * É a regra R1 e a R6, num lugar só. Quem quiser furá-las tem de mexer aqui,
 * onde o teste olha, e não num `if` espalhado pelo gerador de candidatos.
 *
 * `precisaDeReensino` derruba tudo o que cobra: um card herdado da V1 volta a
 * ser lição antes de voltar a ser prova (plano §42, teste 7).
 */
export function tiposPermitidos(estado: SkillState): ActivityKind[] {
  return (Object.keys(ESTAGIO_MINIMO_DO_TIPO) as ActivityKind[]).filter((tipo) => {
    const minimo = ESTAGIO_MINIMO_DO_TIPO[tipo]
    if (!estagioAlcanca(estado.stage, minimo)) return false
    // `licao` e `diagnostico` exigem `unseen`, que todo estágio alcança —
    // então reensinar continua permitido, e só o que cobra é barrado.
    if (estado.precisaDeReensino && minimo !== 'unseen') return false
    return true
  })
}

/** Uma atividade candidata, antes da filtragem e do corte por orçamento. */
interface Candidata {
  definicao: Omit<ActivityDefinition, 'estimatedMinutes'>
  motivo: string
  /** Peso na ordenação. Maior entra primeiro. */
  prioridade: number
  /** Quantos itens a atividade tem. Decide os minutos. */
  itens: number
  /** A atividade apresenta conceito NOVO? Conta para a regra R7. */
  conceitoNovo: boolean
}

function estadoDe(contexto: PlannerV2Context, skillId: SkillId): SkillState | undefined {
  return contexto.skillStates.find((estado) => estado.skillId === skillId)
}

/**
 * Maestria 0..1 da habilidade.
 *
 * SEM MEDIDA DEVOLVE 0, e a escolha importa: 0 é "fraca", então a habilidade
 * nunca medida sobe na fila. É o comportamento certo — o produto prefere medir
 * a presumir, e a alternativa (devolver 1 e tratar o não medido como dominado)
 * é exatamente a presunção de domínio que o ADR-0011 existe para proibir.
 */
function masteryDe(contexto: PlannerV2Context, skillId: SkillId): number {
  const medida = contexto.mastery?.find((item) => item.skillId === skillId)
  if (medida === undefined || Number.isNaN(medida.mastery)) return 0
  return Math.min(1, Math.max(0, medida.mastery))
}

/**
 * Prioridades por origem (plano §11).
 *
 * Números e não uma lista ordenada porque candidatos da MESMA origem ainda
 * precisam se desempatar entre si — uma revisão com 12 cards vencidos vale mais
 * que uma com 1, e uma lista ordenada não tem onde guardar isso.
 */
const PRIORIDADE = {
  revisaoVencida: 1000,
  erroDePartida: 800,
  // O desvio de repertório fica ao lado do erro de partida, e não no rodízio:
  // é a mesma CLASSE de evidência — algo que aconteceu no tabuleiro numa linha
  // que o próprio aluno escreveu — e não uma fatia de currículo.
  desvioDeRepertorio: 750,
  reensino: 700,
  partidaPorRevisar: 600,
  habilidadeFracaConhecida: 500,
  proximoConceito: 400,
  calculo: 300,
} as const

/**
 * Todas as atividades que o contexto justifica, sem cortes.
 *
 * Só a JUSTIFICATIVA é avaliada aqui. Elegibilidade pedagógica, orçamento e
 * limites entram depois, para que cada etapa tenha uma pergunta só.
 */
function candidatas(contexto: PlannerV2Context, config: PlannerV2Config): Candidata[] {
  const lista: Candidata[] = []
  const agora = contexto.now.getTime()

  // --- 1. Revisões vencidas (R5) ---------------------------------------
  // Só entram cards cuja habilidade PODE ser cobrada. Um card vencido de
  // habilidade em reensino não vira revisão: ele vira lição, logo abaixo. É o
  // teste 7 do plano, e é o ponto em que o FSRS deixa de mandar sozinho.
  const vencidos = contexto.dueCards
    .filter((card) => {
      const quando = Date.parse(card.dueAt)
      if (Number.isNaN(quando) || quando > agora) return false
      return card.skillIds.every((skillId) => {
        const estado = estadoDe(contexto, skillId)
        return estado === undefined || !estado.precisaDeReensino
      })
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id))
    // O teto é o MENOR entre o limite absoluto e o que a fatia do dia comporta.
    // Derivar o número de cards do tempo — em vez de escrever os dois — é o que
    // impede a atividade de prometer 12 itens num dia que só tem espaço para 5.
    .slice(
      0,
      Math.max(
        1,
        Math.min(
          config.maxCardsPorRevisao,
          Math.floor(
            (contexto.profile.dailyBudgetMinutes * config.fatiaMaximaDaRevisao) /
              config.minutosPorItem.revisao,
          ),
        ),
      ),
    )

  if (vencidos.length > 0) {
    const habilidades = [...new Set(vencidos.flatMap((card) => card.skillIds))]
    lista.push({
      definicao: {
        id: 'revisao-vencida',
        kind: 'revisao',
        title: 'Revisões vencidas',
        description: `${vencidos.length} ${vencidos.length === 1 ? 'item' : 'itens'} para retomar.`,
        skillIds: habilidades,
        pedagogicalStage: 'review',
        contentVersion: 1,
        completionRule: { tipo: 'itens', total: vencidos.length },
        href: '/train/revisao',
      },
      motivo:
        `${vencidos.length} ${vencidos.length === 1 ? 'revisão venceu' : 'revisões venceram'}. ` +
        'Retomar o que já foi treinado vem antes de conteúdo novo.',
      prioridade: PRIORIDADE.revisaoVencida + vencidos.length,
      itens: vencidos.length,
      conceitoNovo: false,
    })
  }

  // --- 2. Habilidade que devolveu erro em partida real ------------------
  const limiteRecente = agora - config.janelaErrosRecentesDias * MS_POR_DIA
  const pesoPorSkill = new Map<SkillId, number>()
  for (const erro of contexto.recentGameErrors) {
    const quando = Date.parse(erro.ocorridoEm)
    if (Number.isNaN(quando) || quando < limiteRecente) continue
    const peso = erro.severity === 'erro-grave' ? 2 : erro.severity === 'erro' ? 1 : 0.5
    pesoPorSkill.set(erro.skillId, (pesoPorSkill.get(erro.skillId) ?? 0) + peso)
  }

  const errosOrdenados = [...pesoPorSkill.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )

  for (const [skillId, peso] of errosOrdenados) {
    const estado = estadoDe(contexto, skillId)
    const rotulo = getSkill(skillId).label
    const permitidos = estado ? tiposPermitidos(estado) : ['licao' as ActivityKind]

    // A BIFURCAÇÃO QUE É O CORAÇÃO DO PLANO (§12): o MESMO erro de partida
    // gera ENSINO ou PRÁTICA conforme o estágio. Antes ele gerava sempre uma
    // posição com "qual é o melhor lance?", inclusive para quem nunca tinha
    // ouvido falar do tema.
    const kind: ActivityKind = permitidos.includes('pratica-independente')
      ? 'pratica-independente'
      : permitidos.includes('pratica-guiada')
        ? 'pratica-guiada'
        : 'licao'

    lista.push({
      definicao: {
        id: `erro-${skillId}`,
        kind,
        title: `${ROTULO_DA_ATIVIDADE[kind]}: ${rotulo}`,
        description:
          kind === 'licao'
            ? 'O conceito por trás do erro que apareceu nas suas partidas.'
            : 'Treino da habilidade que falhou nas suas partidas recentes.',
        skillIds: [skillId],
        pedagogicalStage: estado?.stage ?? 'unseen',
        contentVersion: 1,
        completionRule: { tipo: kind === 'licao' ? 'etapas' : 'itens', total: 4 },
        href: kind === 'licao' ? `/lessons/${skillId}` : `/train/pratica/${skillId}`,
      },
      motivo:
        kind === 'licao'
          ? `Suas partidas recentes falharam em ${rotulo.toLocaleLowerCase('pt-BR')}, e o ` +
            'LanceZero ainda não te mostrou esse conceito. Ensinar vem antes de cobrar.'
          : `Suas partidas recentes falharam em ${rotulo.toLocaleLowerCase('pt-BR')}.`,
      prioridade: PRIORIDADE.erroDePartida + peso,
      itens: 4,
      conceitoNovo: kind === 'licao' && (estado?.stage ?? 'unseen') === 'unseen',
    })
  }

  // --- 3. Reensino: card em revisão de tema que nunca foi ensinado -------
  for (const estado of contexto.skillStates) {
    if (!estado.precisaDeReensino) continue
    const rotulo = getSkill(estado.skillId).label
    lista.push({
      definicao: {
        id: `reensino-${estado.skillId}`,
        kind: 'licao',
        title: `${ROTULO_DA_ATIVIDADE.licao}: ${rotulo}`,
        description: 'O conceito por trás de um tema que você já vinha treinando.',
        skillIds: [estado.skillId],
        pedagogicalStage: estado.stage,
        contentVersion: 1,
        completionRule: { tipo: 'etapas', total: 4 },
        href: `/lessons/${estado.skillId}`,
      },
      motivo:
        `Você já vinha revisando ${rotulo.toLocaleLowerCase('pt-BR')}, mas o LanceZero nunca ` +
        'chegou a te explicar o conceito. Isto fecha essa lacuna antes da próxima revisão.',
      prioridade: PRIORIDADE.reensino,
      itens: 4,
      conceitoNovo: false,
    })
  }

  // --- 3b. Desvio do PRÓPRIO repertório numa partida real ---------------
  //     Só DESVIO entra; lacuna é conteúdo a escrever, não treino a fazer
  //     (ver `./aberturas`). A linha já está escrita: isto é treino, não
  //     conteúdo novo — e por isso não conta como conceito novo do dia.
  const desvio = (contexto.desviosDeRepertorio ?? []).find(
    (item) => item.partidas >= config.minPartidasDeDesvio,
  )
  if (desvio) {
    const lado = ladoPorExtenso(desvio.lado)
    const habilidades = desvio.habilidades.length > 0 ? [...desvio.habilidades] : []
    // A atividade é de PRÁTICA e não de lição: o aluno escreveu a linha, então
    // o conceito não é novo para ele. Mas ela ainda passa pelo estágio — se a
    // habilidade declarada nunca foi ensinada, vira lição como qualquer outra.
    const estado = habilidades[0] ? estadoDe(contexto, habilidades[0]) : undefined
    const kind: ActivityKind =
      estado === undefined || tiposPermitidos(estado).includes('pratica-independente')
        ? 'pratica-independente'
        : tiposPermitidos(estado).includes('pratica-guiada')
          ? 'pratica-guiada'
          : 'licao'

    lista.push({
      definicao: {
        id: `abertura-${desvio.lado}-${desvio.sanJogado}`,
        kind,
        title: `Abertura: seu repertório de ${lado}`,
        description: 'A linha que você escreveu, e o lance que saiu dela.',
        skillIds: habilidades,
        pedagogicalStage: estado?.stage ?? 'introduced',
        contentVersion: 1,
        completionRule: { tipo: 'itens', total: 3 },
        href: '/aberturas',
      },
      // O lance PRESCRITO não aparece aqui de propósito: a mesma posição vira
      // card de repertório, e dizer a resposta no plano responderia o card
      // antes da pergunta.
      motivo:
        `Em ${desvio.partidas} ${desvio.partidas === 1 ? 'partida recente' : 'partidas recentes'} ` +
        `você jogou ${desvio.sanJogado} numa posição do seu repertório de ${lado}, que prevê ` +
        'outro lance ali. A linha já está escrita: isto é treino, não conteúdo novo.',
      prioridade: PRIORIDADE.desvioDeRepertorio,
      itens: 3,
      conceitoNovo: false,
    })
  }

  // --- 4. Partida importada e ainda não revisada ------------------------
  const porRevisar = contexto.partidasPorRevisar ?? []
  if (porRevisar.length > 0) {
    const partida = porRevisar[0]
    lista.push({
      definicao: {
        id: `revisao-de-partida-${partida.id}`,
        kind: 'revisao-de-partida',
        title: 'Revise sua partida',
        description: partida.rotulo,
        skillIds: [],
        pedagogicalStage: 'introduced',
        contentVersion: 1,
        completionRule: { tipo: 'momentos-criticos', total: 3 },
        href: `/games/${partida.id}`,
      },
      motivo:
        'Você importou esta partida e ainda não passou por ela. A revisão começa por você, ' +
        'sem a engine à vista.',
      prioridade: PRIORIDADE.partidaPorRevisar,
      itens: 3,
      conceitoNovo: false,
    })
  }

  // --- 5. Currículo: o próximo conceito cujos pré-requisitos já fecharam -
  //     E prática das habilidades já conhecidas porém fracas.
  const skillDoFinal: Partial<Record<string, SkillId>> = {
    opposition: 'endgame.king-pawn-opposition',
    'rule-of-square': 'endgame.rule-of-square',
    'king-pawn': 'endgame.king-pawn-opposition',
    'queen-mate': 'endgame.basic-mates',
    'rook-mate': 'endgame.basic-mates',
    'passed-pawn': 'endgame.passed-pawn',
    lucena: 'endgame.rook-endgames',
    philidor: 'endgame.rook-endgames',
  }
  for (const progresso of contexto.endgameProgress ?? []) {
    const skillId = skillDoFinal[progresso.endgameId]
    const weak = [progresso.recognition, progresso.principleSelection, progresso.calculation, progresso.conversion, progresso.defense].some((value) => value < 0.5)
    if (!skillId || !weak || estadoDe(contexto, skillId)?.stage === 'unseen') continue
    lista.push({ definicao: { id: `final-${progresso.endgameId}`, kind: 'pratica-guiada', title: `Praticar final: ${progresso.endgameId}`, description: 'Reforce a competência mais fraca em uma posição equivalente.', skillIds: [skillId], pedagogicalStage: 'guided', contentVersion: 1, completionRule: { tipo: 'itens', total: 1 }, href: `/finais/${progresso.endgameId}` }, motivo: 'Seu progresso mostra uma competência de final que precisa de reforço.', prioridade: PRIORIDADE.habilidadeFracaConhecida + 5, itens: 1, conceitoNovo: false })
  }

  for (const skillId of ordemDoCurriculo()) {
    const estado = estadoDe(contexto, skillId)
    const rotulo = getSkill(skillId).label
    const minusculo = rotulo.toLocaleLowerCase('pt-BR')

    if (estado === undefined || estado.stage === 'unseen') {
      // Só oferece o conceito se os pré-requisitos JÁ estavam satisfeitos
      // antes da geração. É a regra R2 vista pelo outro lado: a lição de
      // cravada não pode depender da lição de peça pendurada estar no mesmo
      // plano.
      const prontos = prerequisitosDe(skillId).every((pai) => {
        const paiEstado = estadoDe(contexto, pai)
        return paiEstado !== undefined && estagioAlcanca(paiEstado.stage, 'guided')
      })
      if (!prontos) continue

      lista.push({
        definicao: {
          id: `curriculo-${skillId}`,
          kind: 'licao',
          title: `${ROTULO_DA_ATIVIDADE.licao}: ${rotulo}`,
          description: getSkill(skillId).description,
          skillIds: [skillId],
          pedagogicalStage: 'unseen',
          contentVersion: 1,
          completionRule: { tipo: 'etapas', total: 4 },
          href: `/lessons/${skillId}`,
        },
        motivo: `Este é o próximo fundamento do seu currículo: ${minusculo}.`,
        prioridade: PRIORIDADE.proximoConceito + getSkill(skillId).pedagogicalValue,
        itens: 4,
        conceitoNovo: true,
      })
      continue
    }

    // Já conhecida: pratica no degrau em que ela está, e nunca acima.
    const permitidos = tiposPermitidos(estado)
    const kind: ActivityKind = permitidos.includes('pratica-independente')
      ? 'pratica-independente'
      : 'pratica-guiada'

    lista.push({
      definicao: {
        id: `pratica-${skillId}`,
        kind,
        title: `${ROTULO_DA_ATIVIDADE[kind]}: ${rotulo}`,
        description: getSkill(skillId).description,
        skillIds: [skillId],
        pedagogicalStage: estado.stage,
        contentVersion: 1,
        completionRule: { tipo: 'itens', total: 4 },
        href: `/train/pratica/${skillId}`,
      },
      motivo:
        kind === 'pratica-guiada'
          ? `Você viu ${minusculo} recentemente. Este treino ainda vem com apoio.`
          : `Você já resolveu ${minusculo} sem ajuda. Este treino confirma que se sustenta.`,
      // A FRAQUEZA manda na ordem aqui, e é o que impede o aluno de treinar
      // eternamente o que já domina só porque veio antes no grafo. Sem maestria
      // medida o termo é zero, e a ordem cai no currículo — o padrão honesto
      // para quem ainda não tem histórico.
      prioridade:
        PRIORIDADE.habilidadeFracaConhecida +
        getSkill(skillId).pedagogicalValue +
        config.pesoDaFraqueza * (1 - masteryDe(contexto, skillId)),
      itens: 4,
      conceitoNovo: false,
    })
  }

  return lista
}

/**
 * A candidata pode entrar ao lado das já escolhidas, sem criar dependência
 * dentro do mesmo dia?
 *
 * CHECA OS DOIS SENTIDOS, e tem de checar: a ordem de prioridade põe prática
 * (500+) antes de conceito novo (400+), então o caso comum é o DEPENDENTE ser
 * escolhido primeiro e a lição do pré-requisito chegar depois. Uma checagem que
 * só olhasse "dependo de alguém que já está no plano" deixaria esse par passar
 * inteiro — e foi o que aconteceu na primeira versão, pega por um teste que
 * varria o grafo em vez de um par escolhido a dedo.
 *
 * `revisao` é isenta: o FSRS só agenda o que já foi adquirido, e o caso do card
 * que cobra tema nunca ensinado é tratado antes, por `precisaDeReensino`.
 */
function podeEntrarCom(candidata: Candidata, escolhidas: readonly Candidata[]): boolean {
  if (candidata.definicao.kind === 'revisao') return true

  const conflita = (novas: readonly SkillId[], cobradas: readonly SkillId[]): boolean =>
    cobradas.some(
      (skillId) =>
        novas.includes(skillId) || prerequisitosDe(skillId).some((pai) => novas.includes(pai)),
    )

  if (candidata.conceitoNovo) {
    // Ela é a LIÇÃO. Conflita se alguma das já escolhidas cobra a habilidade
    // que esta lição apresenta, ou algo que depende dela diretamente.
    return !escolhidas.some(
      (outra) =>
        outra.definicao.kind !== 'revisao' &&
        !outra.conceitoNovo &&
        conflita(candidata.definicao.skillIds, outra.definicao.skillIds),
    )
  }

  // Ela COBRA. Conflita se alguma lição já escolhida apresenta a habilidade
  // dela, ou um pré-requisito direto dela.
  const apresentadasHoje = escolhidas
    .filter((outra) => outra.conceitoNovo)
    .flatMap((outra) => outra.definicao.skillIds)

  return !conflita(apresentadasHoje, candidata.definicao.skillIds)
}

/** Minutos da atividade: itens × custo do tipo, com piso. */
function minutosDe(candidata: Candidata, config: PlannerV2Config): number {
  const porItem = config.minutosPorItem[candidata.definicao.kind]
  const bruto =
    candidata.definicao.kind === 'revisao'
      ? candidata.itens * porItem
      : Math.max(porItem, candidata.itens * (porItem / 4))
  return Math.max(config.minutosMinimosPorAtividade, Math.round(bruto))
}

/**
 * Monta o plano do dia.
 *
 * `seed` entra no embaralhamento do DESEMPATE, não na ordem: duas candidatas
 * com a mesma prioridade trocam de lugar entre dias, e o resto da ordem é
 * estável. Sem isso o aluno veria exatamente a mesma lista todo dia; com a seed
 * na ordem inteira, o plano seria aleatório e a prioridade, decorativa.
 */
export function buildDailyPlanV2(
  contexto: PlannerV2Context,
  seed: number | string,
  config: PlannerV2Config = PLANNER_V2_CONFIG,
): PlanoDoDia {
  const rng = createRng(seed)
  const orcamento = contexto.profile.dailyBudgetMinutes
  const vagas = Math.max(1, config.atividadesPorOrcamento[orcamento])

  // O jitter é consumido em ordem FIXA sobre a lista bruta, antes de qualquer
  // filtro: assim ele depende só da seed, e não do que foi filtrado.
  const brutas = candidatas(contexto, config)
  const comJitter = brutas.map((candidata) => ({ candidata, jitter: rng.next() }))

  const ordenadas = comJitter
    .sort(
      (a, b) =>
        b.candidata.prioridade - a.candidata.prioridade ||
        a.jitter - b.jitter ||
        a.candidata.definicao.id.localeCompare(b.candidata.definicao.id),
    )
    .map((item) => item.candidata)

  const escolhidas: Candidata[] = []
  const porHabilidade = new Map<SkillId, number>()
  const jaEscolhidas = new Set<string>()
  let conceitosNovos = 0
  let minutosUsados = 0

  for (const candidata of ordenadas) {
    if (escolhidas.length >= vagas) break
    if (jaEscolhidas.has(candidata.definicao.id)) continue

    // R2: a checagem acontece contra o que JÁ FOI ESCOLHIDO, e não contra a
    // lista inteira de candidatos.
    //
    // ERA O CONTRÁRIO, e o defeito era exatamente o tipo que este projeto
    // chama de falso verde: `semDependenciaNoMesmoDia` rodava sobre TODOS os
    // candidatos, então uma lição de currículo que nunca entraria no plano —
    // cortada depois por orçamento ou por vaga — ainda assim marcava a sua
    // habilidade como "apresentada hoje" e derrubava outras atividades. O aluno
    // perdia o card do desvio de repertório por causa de uma aula que ele não
    // ia receber. Nenhum erro, nenhum aviso: só um plano menor.
    if (!podeEntrarCom(candidata, escolhidas)) continue

    // R7: conceitos novos por dia.
    if (candidata.conceitoNovo && conceitosNovos >= config.maxConceitosNovosPorDia) continue

    // R8: repetição da mesma habilidade.
    const estouraHabilidade = candidata.definicao.skillIds.some(
      (skillId) => (porHabilidade.get(skillId) ?? 0) >= config.maxAtividadesPorHabilidade,
    )
    if (estouraHabilidade) continue

    // R9: orçamento.
    const minutos = minutosDe(candidata, config)
    if (minutosUsados + minutos > orcamento) continue

    escolhidas.push(candidata)
    jaEscolhidas.add(candidata.definicao.id)
    minutosUsados += minutos
    if (candidata.conceitoNovo) conceitosNovos += 1
    for (const skillId of candidata.definicao.skillIds) {
      porHabilidade.set(skillId, (porHabilidade.get(skillId) ?? 0) + 1)
    }
  }

  const dateKey = chaveDoDia(contexto.now)
  const geradoEm = contexto.now.toISOString()

  const activities: DailyActivity[] = escolhidas.map((candidata) => ({
    id: `${dateKey}/${candidata.definicao.id}`,
    dateKey,
    definition: {
      ...candidata.definicao,
      estimatedMinutes: minutosDe(candidata, config),
    },
    status: 'pendente',
    generatedReason: candidata.motivo,
    createdAt: geradoEm,
    startedAt: null,
    completedAt: null,
    progress: progressoInicial(contexto.now),
  }))

  return {
    dateKey,
    activities,
    generatedAt: geradoEm,
    plannerVersion: PLANNER_VERSION,
    seed: String(seed),
  }
}
