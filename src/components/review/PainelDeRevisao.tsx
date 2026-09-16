'use client'

/**
 * A ABA REVISAR: a casa completa da revisão espaçada.
 *
 * O QUE ELA SUBSTITUI. A aba "Treinar" era um roteador — seis blocos, e cinco só
 * apontavam para outro lugar que já existia (a Biblioteca, o Roadmap, Partidas,
 * a landing). A revisão, que é um dos princípios inegociáveis do produto, era
 * uma linha dentro desse hub levando a uma fila sem contexto nenhum: o aluno via
 * uma posição e um botão.
 *
 * AS CINCO PERGUNTAS QUE ESTA TELA RESPONDE, e que não tinham resposta em lugar
 * nenhum do app:
 *
 * 1. o que venceu agora, e o que estou prestes a perder;
 * 2. o que vem, para o agendamento parar de parecer sorteio;
 * 3. de onde cada card veio — "erro de partida" só significa alguma coisa se a
 *    tela disser que aquele card nasceu de um lance que o aluno jogou;
 * 4. o que eu venho esquecendo. É o sinal mais acionável que o FSRS produz, e
 *    ele nunca apareceu: o aluno revisava a mesma coisa pela quarta vez sem o
 *    app dizer isso em voz alta;
 * 5. o que eu já revisei. O app gravava `ReviewLog` a cada revisão, com o
 *    desfecho, e NUNCA lia — o único leitor em produção era o backup.
 *
 * A FRONTEIRA COM AS TELAS VIZINHAS é regra de projeto e não gosto: o Roadmap
 * responde "o que eu sei" (estágio, maestria, retenção em partida) e o Hoje
 * responde "o que eu faço agora" (o plano do dia). Esta tela responde "como está
 * o meu agendamento", e não repete nenhuma das outras duas.
 *
 * NADA É CALCULADO AQUI. Todas as contas moram em `@/domain/review/agenda`, que
 * é puro e testado sem navegador — inclusive o recorte de dia no fuso do aluno,
 * que já mordeu este projeto uma vez.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useIdioma } from '@/components/providers/LocaleProvider'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { StatePanel } from '@/components/ui/primitives'
import { montarAgenda, type Agenda } from '@/domain/review/agenda'
import { isSkillStateReviewEligible } from '@/domain/roadmap'
import type { RecallOutcome } from '@/domain/roadmap'
import type { ReviewCardKind, SkillId } from '@/domain/types'
import type { ChaveDeMensagem } from '@/lib/i18n/mensagens'
import { traduzirRota } from '@/lib/i18n/rotas'
import styles from './PainelDeRevisao.module.css'

/**
 * Quantas sessões passadas mostrar.
 *
 * Cinco e não "todas": é histórico para o aluno reconhecer o próprio ritmo, não
 * um registro de auditoria. E é o número que vira `limit` na leitura — o
 * contrato do repositório só aceitou o histórico com teto.
 */
const SESSOES_NO_HISTORICO = 5

/**
 * A ordem em que os desfechos são lidos.
 *
 * Fixa, e do melhor para o pior. Ordenar por quantidade faria a mesma sessão
 * aparecer com a ordem trocada a cada leitura, e o aluno perderia a única
 * âncora que ele tem para comparar um dia com o outro.
 */
const ORDEM_DOS_DESFECHOS: readonly RecallOutcome[] = [
  'recalled',
  'recalled-with-hint',
  'failed',
  'declared-forgotten',
  'relearned',
  'voluntary-relearn',
]

type Estado = { fase: 'lendo' } | { fase: 'pronto'; agenda: Agenda } | { fase: 'erro' }

export function PainelDeRevisao() {
  const { locale, t } = useIdioma()
  const { repo, revision, status, erro } = useRepository()
  const [estado, setEstado] = useState<Estado>({ fase: 'lendo' })

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    /*
      UMA leitura para a tela inteira, e os três pedidos juntos.

      `listReviewCards` e não `getDueCards`: a previsão depende do FUTURO, e uma
      tela que lesse só os vencidos não teria como dizer o que vem amanhã.
    */
    void Promise.all([
      repo.listReviewCards(),
      repo.listReviewLogs(SESSOES_NO_HISTORICO * 40),
      repo.getSkillStates(),
    ])
      .then(([cards, logs, estados]) => {
        if (cancelado) return
        /*
          O MESMO PREDICADO DA FILA, e é o ponto.

          `TreinoHub` contava `getDueCards().length` cru enquanto a sessão
          filtrava por elegibilidade: a tela podia prometer 3 e a fila abrir com
          1. `isSkillStateReviewEligible` é a função que a própria sessão usa.
        */
        const ensinadas = new Set<SkillId>(
          estados.filter(isSkillStateReviewEligible).map((e) => e.skillId as SkillId),
        )
        setEstado({
          fase: 'pronto',
          agenda: montarAgenda({
            cards,
            logs,
            habilidadesEnsinadas: ensinadas,
            agora: new Date(),
            maximoDeSessoes: SESSOES_NO_HISTORICO,
          }),
        })
      })
      .catch(() => {
        if (!cancelado) setEstado({ fase: 'erro' })
      })

    return () => {
      cancelado = true
    }
  }, [repo, revision])

  if (status === 'erro') {
    return (
      <StatePanel kind="error" title={t('errors.genericTitle')} description={erro ?? undefined} />
    )
  }
  if (estado.fase === 'erro') {
    return <StatePanel kind="error" title={t('errors.genericTitle')} />
  }
  if (estado.fase === 'lendo') {
    return <StatePanel kind="loading" title={t('review.title')} />
  }

  const { agenda } = estado
  const vencidas = agenda.vencidas.length
  const sessao = traduzirRota('/revisao/sessao', locale)

  return (
    <div className={styles.painel}>
      {/* 1 — O ESTADO AGORA, E A AÇÃO */}
      <section className={styles.agora} aria-labelledby="revisao-agora">
        <h2 id="revisao-agora" className={styles.agoraTitulo}>
          {vencidas === 0 ? t('review.dueNone') : t('review.dueCount', { n: vencidas })}
        </h2>

        {/*
          O BOTÃO CONTINUA VISÍVEL QUANDO NÃO HÁ NADA A FAZER.

          Escondê-lo faria a tela parecer quebrada — o aluno chega na aba de
          revisar e não encontra como revisar. Desabilitado com o motivo ao lado,
          ele ENSINA a regra: antecipar não ajuda, e é por isso que o app não
          deixa.
        */}
        {vencidas === 0 ? (
          <>
            <span className={styles.botaoInerte} aria-disabled="true">
              {t('review.start')}
            </span>
            <p className={styles.motivo}>{t('review.emptyWhy')}</p>
          </>
        ) : (
          <Link className={styles.botao} href={sessao}>
            {t('review.start')} →
          </Link>
        )}

        {agenda.contagem.atrasado > 0 ? (
          <p className={styles.atraso}>
            <span aria-hidden="true">▲</span>{' '}
            {t('review.overdueWarning', { n: agenda.contagem.atrasado })}
          </p>
        ) : null}
      </section>

      {/* 2 — O QUE VEM */}
      <section className={styles.bloco} aria-labelledby="revisao-vem">
        <h2 id="revisao-vem" className={styles.blocoTitulo}>
          {t('review.upcomingTitle')}
        </h2>
        <p className={styles.blocoAjuda}>{t('review.upcomingHelp')}</p>
        {agenda.contagem.hoje +
          agenda.contagem.amanha +
          agenda.contagem.seteDias +
          agenda.contagem.depois ===
        0 ? (
          <p className={styles.vazio}>{t('review.upcomingEmpty')}</p>
        ) : (
          <dl className={styles.faixas}>
            <Faixa rotulo={t('review.today')} valor={agenda.contagem.hoje} />
            <Faixa rotulo={t('review.tomorrow')} valor={agenda.contagem.amanha} />
            <Faixa rotulo={t('review.sevenDays')} valor={agenda.contagem.seteDias} />
            <Faixa rotulo={t('review.later')} valor={agenda.contagem.depois} />
          </dl>
        )}
      </section>

      {/* 3 — DE ONDE VEM */}
      <section className={styles.bloco} aria-labelledby="revisao-origem">
        <h2 id="revisao-origem" className={styles.blocoTitulo}>
          {t('review.originTitle')}
        </h2>
        <p className={styles.blocoAjuda}>{t('review.originHelp')}</p>
        {agenda.origens.length === 0 ? (
          <p className={styles.vazio}>{t('review.upcomingEmpty')}</p>
        ) : (
          <ul className={styles.origens}>
            {agenda.origens.map((origem) => (
              <li key={origem.kind} className={styles.origem}>
                <span className={styles.origemNome}>{rotuloDoKind(origem.kind, t)}</span>
                <span className={styles.origemNumero}>
                  {t('review.originCount', { total: origem.total, vencidos: origem.vencidos })}
                </span>
                <p className={styles.origemAjuda}>{ajudaDoKind(origem.kind, t)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4 — VOLTANDO A CAIR */}
      <section className={styles.bloco} aria-labelledby="revisao-caindo">
        <h2 id="revisao-caindo" className={styles.blocoTitulo}>
          {t('review.lapsingTitle')}
        </h2>
        {agenda.reincidentes.length === 0 ? (
          <p className={styles.vazio}>{t('review.lapsingEmpty')}</p>
        ) : (
          <>
            <p className={styles.blocoAjuda}>{t('review.lapsingHelp')}</p>
            <ul className={styles.reincidentes}>
              {agenda.reincidentes.map((item) => (
                <li key={item.cardId} className={styles.reincidente}>
                  <span className={styles.reincidenteTexto}>{item.prompt}</span>
                  {/*
                    O estado nunca é só cor: símbolo, texto e cor saem juntos —
                    a regra do CLAUDE.md vale aqui como em qualquer etiqueta.
                  */}
                  <span className={styles.reincidenteMarca}>
                    <span aria-hidden="true">{item.reaprendendo ? '↻' : '△'}</span>{' '}
                    {item.reaprendendo
                      ? t('review.relearning')
                      : t('review.lapses', { n: item.lapses })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 5 — JÁ REVISADO */}
      <section className={styles.bloco} aria-labelledby="revisao-historico">
        <h2 id="revisao-historico" className={styles.blocoTitulo}>
          {t('review.historyTitle')}
        </h2>
        {agenda.historico.length === 0 ? (
          <p className={styles.vazio}>{t('review.historyEmpty')}</p>
        ) : (
          <>
            <p className={styles.blocoAjuda}>{t('review.historyHelp')}</p>
            <ul className={styles.historico}>
              {agenda.historico.map((sessaoPassada) => (
                <li key={sessaoPassada.dia} className={styles.sessao}>
                  <span className={styles.sessaoDia}>
                    {new Date(sessaoPassada.terminadaEm).toLocaleDateString(locale)}
                  </span>
                  <span className={styles.sessaoTotal}>
                    {t('review.historyItems', { n: sessaoPassada.total })}
                  </span>
                  <span className={styles.sessaoDesfechos}>
                    {ORDEM_DOS_DESFECHOS.filter((d) => sessaoPassada.porDesfecho[d])
                      .map(
                        (d) =>
                          `${sessaoPassada.porDesfecho[d]} ${t(`review.outcomes.${d}` as ChaveDeMensagem)}`,
                      )
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 6 — COMO A REVISÃO FUNCIONA */}
      <section className={styles.regra} aria-labelledby="revisao-como">
        <h2 id="revisao-como" className={styles.blocoTitulo}>
          {t('review.howTitle')}
        </h2>
        <p className={styles.regraTexto}>{t('review.howBody')}</p>
      </section>
    </div>
  )
}

function Faixa({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className={styles.faixa}>
      <dt className={styles.faixaRotulo}>{rotulo}</dt>
      <dd className={styles.faixaValor}>{valor}</dd>
    </div>
  )
}

/*
  O NOME E A FRASE DE CADA ORIGEM saem do dicionário, pelo id do kind.

  O `Record` explícito existe para o TypeScript cobrar um kind novo: uma união
  com cinco valores e um acesso por template string aceitaria qualquer coisa, e o
  kind sem tradução apareceria como chave crua na tela do aluno.
*/
const CHAVE_DO_KIND: Record<ReviewCardKind, ChaveDeMensagem> = {
  'posicao-exata': 'review.kinds.posicao-exata',
  'erro-de-partida': 'review.kinds.erro-de-partida',
  final: 'review.kinds.final',
  conceito: 'review.kinds.conceito',
  repertorio: 'review.kinds.repertorio',
}

const AJUDA_DO_KIND: Record<ReviewCardKind, ChaveDeMensagem> = {
  'posicao-exata': 'review.kinds.posicao-exataHelp',
  'erro-de-partida': 'review.kinds.erro-de-partidaHelp',
  final: 'review.kinds.finalHelp',
  conceito: 'review.kinds.conceitoHelp',
  repertorio: 'review.kinds.repertorioHelp',
}

type Tradutor = ReturnType<typeof useIdioma>['t']

function rotuloDoKind(kind: ReviewCardKind, t: Tradutor): string {
  return t(CHAVE_DO_KIND[kind])
}

function ajudaDoKind(kind: ReviewCardKind, t: Tradutor): string {
  return t(AJUDA_DO_KIND[kind])
}
