/**
 * O que a BIBLIOTECA precisa saber de uma lição para desenhar um card.
 *
 * POR QUE UM MODELO PRÓPRIO, e não passar a `Licao` inteira para o card: a lição
 * carrega o conteúdo pedagógico completo — cinco exercícios, linhas em UCI,
 * raciocínio passo a passo, chaves de correção. O card usa uma fração disso, e
 * quem lê o componente hoje precisa adivinhar qual fração. Um modelo explícito
 * diz o que a listagem depende, e é ele que muda quando a listagem mudar.
 *
 * O PREVIEW É A DECISÃO CENTRAL DESTE ARQUIVO. A biblioteca era uma lista de
 * títulos: o aluno lia "A peça que ninguém está defendendo" e só sabia do que se
 * tratava depois de abrir. Com a posição do exemplo resolvido no card, ele
 * RECONHECE o tema antes de clicar — que é o que uma biblioteca de xadrez deveria
 * ter feito desde o começo.
 *
 * A POSIÇÃO DO PREVIEW É A DO EXEMPLO RESOLVIDO, e não uma escolhida à mão. Ela
 * é a posição que a lição usa para ensinar o conceito — a mais representativa que
 * existe, por construção. Escolher outra exigiria um campo novo no conteúdo, que
 * alguém teria de preencher para doze lições e esquecer na décima terceira.
 *
 * NADA AQUI É TEXTO DE TELA. Os rótulos de estado e os verbos dos botões moram no
 * dicionário de mensagens; este módulo devolve a ESCOLHA, como o resto do
 * domínio. É o que permite o card existir em português e em inglês sem duas
 * versões dele.
 */

import type { SkillId } from '@/domain/types'
import { estimarMinutos, ETAPAS_DA_LICAO, type Licao } from './schema'

/**
 * O estado do aluno naquela lição.
 *
 * É o MESMO vocabulário do Roadmap, de propósito: o aluno vê "Em andamento" nos
 * dois lugares e é a mesma coisa. Dois vocabulários para o mesmo estado é como se
 * cria a sensação de que o app discorda de si mesmo.
 */
export type EstadoDaLicao = 'disponivel' | 'em-andamento' | 'concluida' | 'revisar' | 'reaprender'

/** O verbo do botão. O texto vem do dicionário; aqui fica a escolha. */
export type AcaoDaLicao = 'aprender' | 'continuar' | 'rever' | 'revisar' | 'reaprender'

/**
 * A prévia visual do card.
 *
 * `mini-tabuleiro` é o caso normal e o preferido. `sem-posicao` existe para uma
 * lição puramente conceitual — nenhuma das doze é hoje, e por isso a variante é
 * uma porta e não um caminho: se alguém escrever uma, o card degrada para o
 * visual de conceito em vez de mostrar um tabuleiro que não diz nada.
 */
export type PreviaDaLicao =
  { tipo: 'mini-tabuleiro'; fen: string; orientacao: 'w' | 'b' } | { tipo: 'sem-posicao' }

export interface CardDeLicao {
  lessonId: string
  titulo: string
  /** Uma ou duas frases: o que a lição ensina. É o `objetivo` da lição. */
  descricao: string
  habilidade: SkillId
  estado: EstadoDaLicao
  acao: AcaoDaLicao
  totalDeEtapas: number
  /** Etapas já vencidas nesta lição. Zero quando ela nunca foi aberta. */
  etapasVencidas: number
  minutos: number
  previa: PreviaDaLicao
}

/**
 * De onde sai o estado.
 *
 * ENTRA PRONTO, e não é lido aqui: o estado mora no `SkillState`, que é
 * persistência, e este módulo é domínio puro. Quem monta a biblioteca lê o
 * repositório uma vez e passa o resultado — em vez de cada card consultar por
 * conta própria, que é como uma listagem de doze itens vira doze leituras.
 */
export interface ProgressoDaLicao {
  /** A habilidade já foi ensinada ao menos uma vez. */
  ensinada: boolean
  /** O app recomenda reaprender: ela voltou a falhar em partida. */
  precisaDeReensino: boolean
  /** Há card de revisão vencido para esta habilidade. */
  revisaoVencida: boolean
  /** Etapas vencidas de um checkpoint gravado, se houver. */
  etapasVencidas?: number
}

const SEM_PROGRESSO: ProgressoDaLicao = {
  ensinada: false,
  precisaDeReensino: false,
  revisaoVencida: false,
}

/**
 * O estado, decidido em UM lugar.
 *
 * A ORDEM DAS PERGUNTAS É A REGRA. Reaprender vem antes de concluída porque uma
 * lição que voltou a falhar em partida não é "concluída" na prática — dizer que é
 * seria o app insistindo num registro que a partida já desmentiu. Revisar vem
 * depois: ele é o ciclo normal de quem aprendeu e está mantendo.
 */
export function estadoDaLicao(progresso: ProgressoDaLicao): EstadoDaLicao {
  if (progresso.precisaDeReensino) return 'reaprender'
  if (progresso.ensinada) return progresso.revisaoVencida ? 'revisar' : 'concluida'
  if ((progresso.etapasVencidas ?? 0) > 0) return 'em-andamento'
  return 'disponivel'
}

/** O verbo que cada estado pede. Um estado, uma ação. */
export const ACAO_DO_ESTADO: Record<EstadoDaLicao, AcaoDaLicao> = {
  disponivel: 'aprender',
  'em-andamento': 'continuar',
  concluida: 'rever',
  revisar: 'revisar',
  reaprender: 'reaprender',
}

export function cardDeLicao(
  licao: Licao,
  progresso: ProgressoDaLicao = SEM_PROGRESSO,
): CardDeLicao {
  const estado = estadoDaLicao(progresso)
  return {
    lessonId: licao.id,
    titulo: licao.titulo,
    descricao: licao.objetivo,
    habilidade: licao.habilidade,
    estado,
    acao: ACAO_DO_ESTADO[estado],
    totalDeEtapas: ETAPAS_DA_LICAO.length,
    // Lição concluída conta todas: quem a venceu passou por elas.
    etapasVencidas:
      progresso.etapasVencidas ??
      (estado === 'concluida' || estado === 'revisar' ? ETAPAS_DA_LICAO.length : 0),
    minutos: estimarMinutos(licao),
    previa: {
      tipo: 'mini-tabuleiro',
      fen: licao.exemploResolvido.fen,
      orientacao: licao.exemploResolvido.ladoDoAluno,
    },
  }
}
