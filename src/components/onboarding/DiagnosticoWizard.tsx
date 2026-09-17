'use client'

/**
 * Diagnóstico de entrada: da porta ao primeiro exercício em poucos minutos.
 *
 * DECISÕES QUE ESTA TELA CARREGA:
 *
 * 1. **Sem conta.** Tudo é gravado no armazenamento local pelo repositório. A
 *    tela não conhece IndexedDB, só o contrato.
 *
 * 2. **A resposta é um BOTÃO, não um arrasto.** O tabuleiro está aqui para ser
 *    lido; a escolha é entre lances legais em notação. Isto é acessibilidade,
 *    não preguiça: é a primeira tela do produto, precisa funcionar em 360 px,
 *    no teclado e em leitor de tela.
 *
 * 3. **Nenhum retorno item a item.** Um diagnóstico é MEDIÇÃO, não treino:
 *    dizer "errou" na terceira posição muda a forma de responder a quarta e
 *    contamina o que estamos medindo. As explicações aparecem no fim, e só das
 *    posições erradas — o aluno sai sabendo por quê, sem que a medição pague.
 *
 * 4. **O resultado é uma FAIXA.** Uma dúzia e meia de posições não sustentam
 *    "seu rating é 1147". O número exato existe só para o planner; a tela
 *    mostra o intervalo e diz quantas habilidades ficaram sem medição.
 *
 * 5. **Sem parabéns, sem confete, sem sequência de dias.** O tom é o do resto
 *    do produto: analítico e calmo.
 */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { BANCO_DE_DIAGNOSTICO } from '@/content/diagnostic'
import {
  acertou,
  estimarDiagnostico,
  masteryInicial,
  montarPrimeiraSemana,
  perfilDoDiagnostico,
  type EstimativaDeDiagnostico,
  type RespostaDeDiagnostico,
} from '@/domain/diagnostic'
import { julgarLanceDaLicao } from '@/domain/exercicios'
import { useLanceNoTabuleiro } from '@/components/chess/useLanceNoTabuleiro'
import type { PromotionPiece, SquareName } from '@/lib/chess'
import { BUDGET_OPTIONS, type BudgetMinutes } from '@/domain/profile'
import { getSkill } from '@/domain/skills/catalog'
import type { SkillMastery, UserProfile } from '@/domain/types'
import styles from './DiagnosticoWizard.module.css'

type Etapa = 'inicio' | 'itens' | 'resultado'

/*
  `notacoesDe` e `opcoesDe` SAÍRAM com a lista de múltipla escolha.

  Elas montavam os rótulos dos botões de lance. A resposta passou a ser jogada
  no tabuleiro, e manter o gerador convidaria alguém a reintroduzir a lista.
*/

interface ResultadoPronto {
  estimativa: EstimativaDeDiagnostico
  mastery: SkillMastery[]
  perfil: UserProfile
}

export function DiagnosticoWizard() {
  const { status, repo, profile, erro, saveProfile } = useRepository()
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [orcamento, setOrcamento] = useState<BudgetMinutes>(40)
  const [ratingInformado, setRatingInformado] = useState('')
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<RespostaDeDiagnostico[]>([])
  const [comecouEm, setComecouEm] = useState<number>(0)
  const [gravacao, setGravacao] = useState<'pendente' | 'gravado' | 'falhou'>('pendente')
  const [falha, setFalha] = useState<string | null>(null)
  /**
   * Instante em que o aluno respondeu a última posição.
   *
   * Fica em estado, e não é lido de `new Date()` dentro do cálculo, porque o
   * resultado é REDERIVADO a cada renderização: com o relógio lido lá dentro,
   * duas renderizações do mesmo diagnóstico produziriam maestrias com
   * `lastSeenAt` diferentes. O relógio entra uma vez, no evento que o justifica.
   */
  const [terminadoEm, setTerminadoEm] = useState<Date | null>(null)

  const item = BANCO_DE_DIAGNOSTICO[indice]

  const resultado = useMemo<ResultadoPronto | null>(() => {
    if (etapa !== 'resultado' || !profile || !terminadoEm) return null
    const informado = Number.parseInt(ratingInformado, 10)
    const estimativa = estimarDiagnostico(BANCO_DE_DIAGNOSTICO, respostas, {
      ratingInformado: Number.isFinite(informado) ? informado : null,
    })
    return {
      estimativa,
      mastery: masteryInicial(BANCO_DE_DIAGNOSTICO, respostas, terminadoEm),
      perfil: perfilDoDiagnostico(profile, { estimativa, orcamento }),
    }
  }, [etapa, profile, respostas, ratingInformado, orcamento, terminadoEm])

  const semana = useMemo(() => {
    if (!resultado || !terminadoEm) return null
    return montarPrimeiraSemana({
      profile: resultado.perfil,
      mastery: resultado.mastery,
      inicio: terminadoEm,
    })
  }, [resultado, terminadoEm])

  /**
   * Grava assim que o resultado existe: quem chegou até aqui não deve perder o
   * perfil por fechar a aba. O estado da gravação aparece na tela — silêncio
   * aqui seria o aluno achando que salvou.
   *
   * A TRAVA É UM `ref`, e isso não é preferência de estilo. Gravar o perfil faz
   * o provedor devolver um `profile` novo; `resultado` é derivado dele, então a
   * própria gravação muda a dependência deste efeito. Com uma trava em estado —
   * que só chega na renderização seguinte — o efeito reentrava antes de a trava
   * valer e gravava em laço. O `ref` fecha a porta no mesmo tique.
   *
   * Isto foi encontrado pelo e2e, não pelos testes de unidade: no jsdom o
   * `profile` do contexto não muda, e o laço não existia.
   */
  const gravando = useRef(false)
  useEffect(() => {
    if (!resultado || !repo || gravando.current) return
    gravando.current = true
    async function gravar() {
      if (!resultado || !repo) return
      try {
        await saveProfile(resultado.perfil)
        await repo.saveSkillMastery(resultado.mastery)
        setGravacao('gravado')
      } catch (e) {
        // Libera a trava: falha de gravação tem de poder ser tentada de novo.
        gravando.current = false
        setGravacao('falhou')
        setFalha(e instanceof Error ? e.message : 'Não consegui gravar no seu navegador.')
      }
    }
    void gravar()
  }, [resultado, repo, saveProfile])

  const responder = useCallback(
    (lanceEscolhido: string) => {
      setRespostas((atual) => [
        ...atual,
        {
          itemId: BANCO_DE_DIAGNOSTICO[indice].id,
          lanceEscolhido,
          thinkTimeMs: Math.max(0, Date.now() - comecouEm),
        },
      ])
      if (indice + 1 >= BANCO_DE_DIAGNOSTICO.length) {
        setTerminadoEm(new Date())
        setEtapa('resultado')
      } else {
        setIndice(indice + 1)
        setComecouEm(Date.now())
      }
    },
    [indice, comecouEm],
  )

  /*
    O ARRASTE E O CLIQUE ENTRAM PELA MESMA PORTA.

    `tentar` é chamada pelos dois caminhos e devolve `false` quando não houve
    lance — é isso que faz a peça voltar para a casa de origem no arraste e o
    clique não virar resposta. Lance ilegal não diz nada sobre o que o aluno
    sabe, então não é registrado.
  */
  const tentar = useCallback(
    (origem: SquareName, destino: SquareName, promocao?: PromotionPiece) => {
      const atual = BANCO_DE_DIAGNOSTICO[indice]
      if (!atual) return false
      const veredito = julgarLanceDaLicao(atual, origem, destino, promocao)
      if (veredito.tipo === 'ilegal') return false
      responder(veredito.uci)
      return true
    },
    [indice, responder],
  )

  const lance = useLanceNoTabuleiro({
    fen: BANCO_DE_DIAGNOSTICO[indice]?.fen ?? '',
    ativo: etapa === 'itens',
    aoTentar: tentar,
  })

  if (status === 'carregando') {
    return <p className={styles.state}>Abrindo seus dados locais…</p>
  }
  if (status === 'erro') {
    return (
      <p className={`${styles.state} ${styles.error}`} role="alert">
        {erro}
      </p>
    )
  }

  if (etapa === 'inicio') {
    return (
      <section className={styles.painel} aria-labelledby="diagnostico-inicio">
        <h2 id="diagnostico-inicio" className={styles.titulo}>
          Antes de começar
        </h2>
        <p className={styles.texto}>
          São {BANCO_DE_DIAGNOSTICO.length} posições. Em cada uma você escolhe um lance entre as
          opções. Não há retorno durante o teste — ele serve para medir, não para treinar; as
          explicações vêm no fim. Nada é enviado para lugar nenhum: o resultado fica neste
          navegador.
        </p>

        <fieldset className={styles.grupo}>
          <legend className={styles.legenda}>Quanto tempo você tem por dia?</legend>
          <div className={styles.opcoesCurtas} role="group" aria-label="Minutos por dia">
            {BUDGET_OPTIONS.map((minutos) => (
              <button
                key={minutos}
                type="button"
                className={styles.escolha}
                aria-pressed={orcamento === minutos}
                onClick={() => setOrcamento(minutos)}
              >
                {minutos} min
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.grupo}>
          <label className={styles.legenda} htmlFor="rating-informado">
            Seu rating, se você souber (opcional)
          </label>
          <input
            id="rating-informado"
            className={styles.campo}
            type="number"
            inputMode="numeric"
            min={400}
            max={2400}
            step={10}
            value={ratingInformado}
            onChange={(evento) => setRatingInformado(evento.target.value)}
            placeholder="Ex.: 1100"
          />
          <p className={styles.ajuda}>
            Usamos como ponto de partida. Se as suas respostas discordarem dele, as respostas
            mandam.
          </p>
        </div>

        <button
          type="button"
          className={styles.primario}
          onClick={() => {
            setEtapa('itens')
            setComecouEm(Date.now())
          }}
        >
          Começar o diagnóstico
        </button>
      </section>
    )
  }

  if (etapa === 'itens' && item) {
    return (
      <section className={styles.layout} aria-labelledby="diagnostico-posicao">
        <div className={styles.tabuleiro}>
          {/*
            O DIAGNÓSTICO TAMBÉM SE RESPONDE NO TABULEIRO.

            Ele media o que o aluno reconhece entre três notações — e dá para
            acertar um garfo lendo `Nxe5` sem localizar o cavalo. Como o
            resultado calibra a primeira semana inteira, medir a coisa errada
            aqui contamina tudo que vem depois.

            SEM VEREDITO, como já era: o diagnóstico não diz certo nem errado
            durante as respostas (ver o cabeçalho do arquivo). O lance é
            registrado e a próxima posição entra.
          */}
          <ChessBoardView
            fen={item.fen}
            orientation={item.ladoDoAluno}
            interactive
            selected={lance.selecionada}
            targets={lance.destinos}
            onMove={tentar}
            onSquareClick={lance.aoClicarNaCasa}
          />
        </div>
        <div className={styles.painel}>
          <p className={styles.progresso}>
            Posição {indice + 1} de {BANCO_DE_DIAGNOSTICO.length}
          </p>
          <h2 id="diagnostico-posicao" className={styles.titulo}>
            {item.enunciado}
          </h2>
          <p className={styles.ajuda}>
            {item.ladoDoAluno === 'w' ? 'Brancas' : 'Pretas'} jogam. Jogue o lance no tabuleiro.
          </p>
        </div>
      </section>
    )
  }

  if (!resultado || !semana) {
    return <p className={styles.state}>Calculando o seu ponto de partida…</p>
  }

  const { estimativa } = resultado
  const erradas = BANCO_DE_DIAGNOSTICO.filter((candidato) => {
    const resposta = respostas.find((r) => r.itemId === candidato.id)
    return resposta !== undefined && !acertou(candidato, resposta.lanceEscolhido)
  })

  return (
    <section className={styles.resultado} aria-labelledby="diagnostico-resultado">
      <h2 id="diagnostico-resultado" className={styles.titulo}>
        Seu ponto de partida
      </h2>

      <p className={styles.faixa}>
        Faixa estimada: <strong>{estimativa.faixaDeRating.minimo}</strong> a{' '}
        <strong>{estimativa.faixaDeRating.maximo}</strong>
      </p>
      <p className={styles.texto}>
        {estimativa.acertos} de {estimativa.respondidos} posições. Uma faixa, e não um número:{' '}
        {estimativa.respondidos} posições não sustentam mais precisão que isso. Ela vai se estreitar
        conforme você treinar e importar partidas.
      </p>

      <h3 className={styles.subtitulo}>O que o diagnóstico viu</h3>
      <ul className={styles.evidencias}>
        {estimativa.porHabilidade.map((evidencia) => (
          <li key={evidencia.skillId} className={styles.evidencia}>
            <span className={styles.evidenciaNome}>{getSkill(evidencia.skillId).label}</span>
            <span className={styles.evidenciaContagem}>
              {evidencia.acertos} de {evidencia.itens}
            </span>
          </li>
        ))}
      </ul>

      <h3 className={styles.subtitulo}>O que ele não mediu</h3>
      <p className={styles.texto}>
        {estimativa.naoMedidas.length} habilidades ficaram sem nenhuma posição:{' '}
        {estimativa.naoMedidas
          .map((id) => getSkill(id).label.toLocaleLowerCase('pt-BR'))
          .join(', ')}
        . Elas entram no seu plano como assunto a medir, não como assunto resolvido.
      </p>

      {erradas.length > 0 && (
        <>
          <h3 className={styles.subtitulo}>As posições que não saíram</h3>
          <ul className={styles.explicacoes}>
            {erradas.map((errada) => (
              <li key={errada.id} className={styles.explicacao}>
                <span className={styles.explicacaoTema}>{getSkill(errada.skillId).label}</span>
                <p className={styles.texto}>{errada.explicacao}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className={styles.subtitulo}>Sua primeira semana</h3>
      <ol className={styles.semana}>
        {semana.dias.map((dia, posicao) => (
          <li key={dia.data} className={styles.dia}>
            <span className={styles.diaTitulo}>
              Dia {posicao + 1} · {dia.plano.totalMinutes} min
            </span>
            <span className={styles.diaBlocos}>
              {dia.plano.blocks.map((bloco) => bloco.title).join(' · ')}
            </span>
          </li>
        ))}
      </ol>

      <p
        className={gravacao === 'falhou' ? `${styles.aviso} ${styles.error}` : styles.aviso}
        role="status"
      >
        {gravacao === 'gravado' && '✓ Perfil salvo neste navegador, sem conta.'}
        {gravacao === 'pendente' && '… Salvando no seu navegador.'}
        {gravacao === 'falhou' && `✕ Não consegui salvar: ${falha}`}
      </p>

      <Link href="/dashboard" className={styles.primario}>
        Ir para o treino de hoje
      </Link>
    </section>
  )
}
