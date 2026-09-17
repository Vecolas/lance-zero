'use client'

/**
 * Prática de uma habilidade.
 *
 * A REGRA QUE ESTA TELA CUMPRE, e que o produto inteiro violava: ela pergunta
 * o ESTÁGIO antes de decidir o que mostrar.
 *
 * - habilidade que ainda não pode ser cobrada sem apoio → a tela NÃO mostra
 *   exercício. Ela manda para a lição, e diz por quê;
 * - habilidade em `guided` → exercícios COM a escada de dicas;
 * - habilidade em `independent` ou acima → exercícios sem dica.
 *
 * Antes não havia essa bifurcação porque não havia estágio: a rota abria uma
 * posição e perguntava o melhor lance, para qualquer um, em qualquer ponto.
 *
 * DE ONDE VÊM OS EXERCÍCIOS: do catálogo de lições, que é conteúdo VERIFICADO —
 * cada posição passou pelo portão que confere legalidade, objetivo cumprido e
 * alternativa que de fato falha. Puxar de um banco não verificado aqui traria
 * de volta, por outra porta, o problema de cobrar o que não se conferiu.
 *
 * PONTO CEGO DECLARADO: por isso mesmo, só há prática para as habilidades que
 * já têm lição escrita. As outras caem no estado vazio honesto, que diz que a
 * lição ainda não existe — em vez de oferecer um exercício qualquer para não
 * deixar a tela em branco.
 */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useLanceNoTabuleiro } from '@/components/chess/useLanceNoTabuleiro'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import {
  feedbackGenerico,
  foiIndependente,
  nivelDeApoio,
  responderAoErro,
  visaoDaHabilidade,
  type VisaoDaHabilidade,
} from '@/domain/aprendizado'
import { acertou } from '@/domain/diagnostic'
import { julgarLanceDaLicao, type ExercicioPosicional } from '@/domain/exercicios'
import { getSkill } from '@/domain/skills/catalog'
import { parseUci } from '@/lib/chess'
import type { PromotionPiece, SquareName } from '@/lib/chess'
import { registrarTentativa } from '@/lib/training/registrar-tentativa'
import type { SkillId } from '@/domain/types'
import styles from './PraticaDeHabilidade.module.css'

interface Item {
  exercicio: ExercicioPosicional
  enunciado: string
  explicacao: string
  dicas: readonly { degrau: string; texto: string }[]
}

export function PraticaDeHabilidade({ skillId }: { skillId: SkillId }) {
  const { status, repo, erro, revision } = useRepository()
  const [visao, setVisao] = useState<VisaoDaHabilidade | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const agora = new Date()
        const { carregarSkillStates } = await import('@/lib/training/plano-do-dia')
        const [estados, mastery] = await Promise.all([
          carregarSkillStates(repo, agora),
          repo.getSkillMastery(),
        ])
        const estado = estados.find((item) => item.skillId === skillId)
        if (!estado) return
        const porId = new Map(mastery.map((item) => [item.skillId, item]))
        if (!cancelado) setVisao(visaoDaHabilidade(estado, porId.get(skillId)))
      } catch (e) {
        if (!cancelado) {
          setFalha(e instanceof Error ? e.message : 'Não consegui ler seus dados locais.')
        }
      }
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [repo, skillId, revision])

  const licao = CATALOGO_DE_LICOES.find((item) => item.habilidade === skillId) ?? null

  // Com apoio ou sem apoio, conforme o degrau. A escolha é do estágio, não da
  // tela: é exatamente isso que `podeCobrarSemApoio` decide.
  const itens = useMemo<Item[]>(() => {
    if (!licao || !visao) return []
    return visao.podeCobrarSemApoio
      ? licao.recuperacao.map((e) => ({
          exercicio: e,
          enunciado: e.enunciado,
          explicacao: e.explicacao,
          dicas: [],
        }))
      : licao.guiada.map((e) => ({
          exercicio: e,
          enunciado: e.enunciado,
          explicacao: e.explicacao,
          dicas: e.dicas,
        }))
  }, [licao, visao])

  if (status === 'carregando') return <p className={styles.state}>Abrindo seus dados locais…</p>

  if (status === 'erro' || falha) {
    return (
      <p className={`${styles.state} ${styles.error}`} role="alert">
        {falha ?? erro}
      </p>
    )
  }

  if (!visao) return <p className={styles.state}>Lendo seu progresso…</p>

  const rotulo = getSkill(skillId).label

  if (!licao) {
    return (
      <p className={styles.state}>
        Ainda não há lição escrita para {rotulo.toLocaleLowerCase('pt-BR')}, e o LanceZero não cobra
        o que não ensinou. <Link href="/roadmap">Voltar ao roadmap</Link>
      </p>
    )
  }

  // A PORTA QUE FECHA A DÍVIDA: sem estágio suficiente, não há exercício.
  if (visao.stage === 'unseen' || visao.precisaDeReensino) {
    return (
      <div className={styles.state}>
        <p>
          {visao.precisaDeReensino
            ? `Você já vinha revisando ${rotulo.toLocaleLowerCase('pt-BR')}, mas o LanceZero nunca chegou a te explicar o conceito.`
            : `O LanceZero ainda não te mostrou ${rotulo.toLocaleLowerCase('pt-BR')}.`}{' '}
          Cobrar agora seria te pedir para adivinhar, e adivinhar não ensina.
        </p>
        <Link className={styles.primario} href={`/lessons/${skillId}`}>
          Aprender {rotulo.toLocaleLowerCase('pt-BR')}
        </Link>
      </div>
    )
  }

  if (indice >= itens.length) {
    return (
      <div className={styles.state} role="status">
        <p>
          Prática concluída. Como você foi aqui muda a prioridade do seu plano, mas não decide
          sozinho se a habilidade está firme — isso o LanceZero mede ao longo do tempo e nas suas
          partidas.
        </p>
        <Link className={styles.primario} href="/dashboard">
          Voltar para o Hoje
        </Link>
      </div>
    )
  }

  const item = itens[indice]

  return (
    <>
      <p className={styles.contexto}>
        {visao.podeCobrarSemApoio
          ? 'Sem dicas: você já resolveu isto com apoio antes.'
          : 'Com dicas disponíveis: você viu este conceito há pouco, e retirar o apoio agora seria cedo.'}{' '}
        Item {indice + 1} de {itens.length}.
      </p>
      <ItemDePratica
        key={item.exercicio.id}
        item={item}
        aoConcluir={async (resultado) => {
          if (repo) {
            await registrarTentativa(repo, {
              skillId,
              acertou: resultado.acertou,
              apoio: resultado.apoio,
              guiada: !visao.podeCobrarSemApoio,
              agora: new Date(),
            })
          }
          setIndice((n) => n + 1)
        }}
      />
    </>
  )
}

function ItemDePratica({
  item,
  aoConcluir,
}: {
  item: Item
  aoConcluir: (resultado: { acertou: boolean; apoio: ReturnType<typeof nivelDeApoio> }) => void
}) {
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [erros, setErros] = useState(0)
  const [dicasAbertas, setDicasAbertas] = useState(0)
  const [revelou, setRevelou] = useState(false)
  /** O último arraste que não era lance. Discreto, e some no lance seguinte. */
  const [recusa, setRecusa] = useState<string | null>(null)

  /*
    A SOLUÇÃO DESENHADA NO TABULEIRO, e não escrita como "Rxc6". Um aluno que lê
    a notação aprende a notação; um que vê as duas casas acesas aprende o lance.
  */
  const casasDaSolucao = useMemo(() => {
    const chave = item.exercicio.lancesAceitos[0]
    const lance = chave ? parseUci(chave) : null
    return lance ? [lance.from, lance.to] : []
  }, [item.exercicio.lancesAceitos])

  const certo = escolhido !== null && acertou(item.exercicio, escolhido)
  const apoio = nivelDeApoio(dicasAbertas, revelou)
  const resposta = erros > 0 && !certo ? responderAoErro(erros, dicasAbertas) : null
  const mostrarSolucao =
    revelou || resposta?.acao === 'mostrar-solucao' || resposta?.acao === 'trocar-posicao'
  const feedback = feedbackGenerico()

  /**
   * O aluno soltou uma peça.
   *
   * Devolve `false` quando não houve lance: é o que faz o tabuleiro devolver a
   * peça à origem em vez de aceitá-la. Ver `julgarLanceDaLicao` — legalidade e
   * pedagogia são duas perguntas, e só a segunda conta como erro.
   */
  function soltar(origem: SquareName, destino: SquareName, promocao?: PromotionPiece): boolean {
    if (certo || mostrarSolucao) return false

    const veredito = julgarLanceDaLicao(item.exercicio, origem, destino, promocao)
    if (veredito.tipo === 'ilegal') {
      setRecusa(`${origem}${destino}`)
      return false
    }

    setRecusa(null)
    escolher(veredito.uci)
    return true
  }

  function escolher(uci: string) {
    setEscolhido(uci)
    if (acertou(item.exercicio, uci)) return
    const proximo = erros + 1
    setErros(proximo)
    const reacao = responderAoErro(proximo, dicasAbertas)
    if (reacao.acao === 'dica' && item.dicas.length > 0) {
      setDicasAbertas((n) => Math.min(n + 1, item.dicas.length))
    }
    if (reacao.acao === 'mostrar-solucao' || reacao.acao === 'trocar-posicao') setRevelou(true)
  }

  /* Clique em duas casas, a outra porta da mesma resposta. */
  const lance = useLanceNoTabuleiro({
    fen: item.exercicio.fen,
    ativo: !certo && !mostrarSolucao,
    aoTentar: (origem, destino) => soltar(origem, destino),
  })

  return (
    <div className={styles.comTabuleiro}>
      <div className={styles.tabuleiro}>
        {/*
          O TABULEIRO É A ÚNICA FORMA DE RESPONDER — a mesma regra da lição.

          Aqui havia `[Rxc6] [Rxd5] [Qxd4]`, e com três strings na tela o aluno
          não resolve a posição: ele lê e escolhe. Prática independente com
          múltipla escolha mede reconhecimento de string, não de padrão.
        */}
        <ChessBoardView
          fen={item.exercicio.fen}
          orientation={item.exercicio.ladoDoAluno}
          interactive={!certo && !mostrarSolucao}
          selected={lance.selecionada}
          targets={lance.destinos}
          onMove={soltar}
          onSquareClick={lance.aoClicarNaCasa}
          onIllegalMove={(origem, destino) => setRecusa(`${origem}${destino}`)}
          lastMove={mostrarSolucao ? casasDaSolucao : undefined}
        />
      </div>
      <div className={styles.aoLado}>
        <p className={styles.texto}>{item.enunciado}</p>
        {escolhido === null && !mostrarSolucao ? (
          <p className={styles.nota}>Jogue o lance no tabuleiro.</p>
        ) : null}

        {/* Lance ilegal não é erro conceitual: é um gesto que não virou lance. */}
        {recusa !== null && escolhido === null ? (
          <p className={styles.nota} role="status" data-testid="recusa-do-lance">
            Esse lance não é legal nesta posição.
          </p>
        ) : null}

        {dicasAbertas > 0 ? (
          <ol className={styles.dicas} aria-label="Dicas abertas">
            {item.dicas.slice(0, dicasAbertas).map((dica) => (
              <li key={dica.degrau}>{dica.texto}</li>
            ))}
          </ol>
        ) : null}

        {item.dicas.length > dicasAbertas && !certo && !mostrarSolucao ? (
          <button
            type="button"
            className={styles.ghost}
            onClick={() => setDicasAbertas((n) => n + 1)}
          >
            Abrir uma dica
          </button>
        ) : null}

        {escolhido !== null ? (
          <div className={styles.veredito} role="status">
            <p className={certo ? styles.acertou : styles.errou}>
              {certo ? '✓ Cumpriu o objetivo.' : '✕ Não cumpre o objetivo.'}
            </p>
            {certo || mostrarSolucao ? (
              <p className={styles.texto}>{item.explicacao}</p>
            ) : (
              <>
                <p className={styles.texto}>{feedback.oQueAconteceu}</p>
                <p className={styles.nota}>{feedback.porQueParecia}</p>
                <p className={styles.pergunta}>{feedback.perguntaQueEvitaria}</p>
              </>
            )}
            {certo || mostrarSolucao ? (
              <button
                type="button"
                className={styles.primario}
                onClick={() => aoConcluir({ acertou: certo, apoio })}
              >
                Continuar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { foiIndependente }
