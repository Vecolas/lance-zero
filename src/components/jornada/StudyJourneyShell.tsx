'use client'

/**
 * A casca da jornada de estudo — compartilhada por Aberturas e Finais.
 *
 * O QUE ELA COMPARTILHA: apresentação. Cabeçalho, trilho de progresso, área de
 * conteúdo, e a navegação voltar/continuar.
 *
 * O QUE ELA NÃO COMPARTILHA, e é a fronteira que o plano §158 e §161 cravam:
 * regra de domínio. Esta casca não sabe o que é repertório nem o que é
 * tablebase. Ela recebe as etapas prontas e renderiza o que o domínio mandar
 * como `children`. Um `GenericChessTrainer` que soubesse dos dois domínios
 * pioraria as duas experiências juntas na primeira condicional.
 *
 * O BOTÃO CONTINUAR é a peça mais importante daqui (plano §134): numa etapa
 * interativa ele só habilita quando a regra da etapa foi cumprida. Sem isso, a
 * sequência automática seria decorativa — o aluno atravessaria o treino final
 * sem cobrir nada e o app registraria uma jornada concluída que não aconteceu.
 */

import { useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  etapaCumprida,
  progressoDaJornada,
  type StudyJourney,
  type StudyStage,
} from '@/domain/jornada'
import type { ModoDeAprendizado } from '@/domain/roadmap/learning-target'
import { modoDaUrl } from '@/lib/training/modo-de-aprendizado'
import { useTraduzir } from '@/components/providers/LocaleProvider'
import type { ChaveDeMensagem } from '@/lib/i18n/mensagens'
import { StudyContentIndex } from './StudyContentIndex'
import { StudyStageHeader } from './StudyStageHeader'
import styles from './StudyJourneyShell.module.css'

/**
 * A CHAVE do aviso de cada modo. `aprender` não tem aviso: é o caso padrão, e
 * dizer "você está aprendendo" na tela de aprender é ruído que ensina a ignorar
 * avisos.
 */
const CHAVE_DO_AVISO: Record<Exclude<ModoDeAprendizado, 'aprender'>, ChaveDeMensagem> = {
  continuar: 'journey.modes.continue',
  revisar: 'journey.modes.review',
  reaprender: 'journey.modes.relearn',
}

export interface StudyJourneyShellProps {
  /** Nome do conteúdo: "Abertura Italiana", "Oposição". */
  /**
   * O nome do conteúdo, para leitor de tela.
   *
   * NÃO vira `h1` — a página já o renderiza no servidor. Ele fica aqui só como
   * rótulo do `nav`/`section`, para quem chega pelo trilho saber de que estudo
   * este progresso é.
   */
  titulo: string
  jornada: StudyJourney
  stages: readonly StudyStage[]
  /** O tabuleiro, quando a etapa tem um. Fica em cima no celular. */
  tabuleiro?: ReactNode
  /** O conteúdo da etapa atual. */
  children: ReactNode
  aoVoltarEtapa?: (stageId: string) => void
  aoContinuar?: () => void
  /**
   * Esconde a navegação de rodapé.
   *
   * O treino usa isto: enquanto uma rodada está ativa não pode haver "Continuar"
   * (plano §135), senão o aluno sai da rodada pelo caminho errado e o desfecho
   * nunca é registrado.
   */
  rodapeOculto?: boolean
  aoSair?: () => void
  /**
   * Abre o modo referência.
   *
   * Fica no CABEÇALHO e não no rodapé de propósito: consultar não é avançar, e
   * pô-lo ao lado de "Continuar" convidaria o aluno a usá-lo como se fosse o
   * próximo passo. Ver `ModoReferencia`.
   */
  aoRever?: () => void
}

export function StudyJourneyShell({
  titulo,
  jornada,
  stages,
  tabuleiro,
  children,
  aoVoltarEtapa,
  aoContinuar,
  rodapeOculto,
  aoSair,
  aoRever,
}: StudyJourneyShellProps) {
  const t = useTraduzir()
  /*
    O modo vem da URL, e é lido com `useSyncExternalStore`.

    A tentação é `useState` + efeito, e ela está errada nos dois sentidos: no
    servidor não existe `window.location.search`, então ler no render divergiria
    da hidratação; e escrever estado dentro de um efeito provoca a renderização
    extra que o lint do projeto proíbe, com razão.

    `useSyncExternalStore` responde exatamente a essa pergunta — o React usa o
    retorno do servidor para o HTML e o do cliente depois da hidratação, sem
    divergência e sem efeito. A URL não muda sem navegação, então não há nada a
    assinar: a inscrição devolve um cancelamento que não faz nada.
  */
  /** O Mapa do estudo está aberto? Estado de tela, nada de domínio. */
  const [mapaAberto, setMapaAberto] = useState(false)

  const modo = useSyncExternalStore(
    () => () => {},
    modoDaUrl,
    () => null,
  )

  const stage = stages.find((item) => item.id === jornada.currentStageId) ?? stages[0]
  if (!stage) return null

  const progresso = progressoDaJornada(jornada, stages)
  const indice = stages.findIndex((item) => item.id === stage.id)
  const anterior = indice > 0 ? stages[indice - 1] : null

  // Leitura avança pelo próprio ato de continuar; as demais precisam da regra.
  const podeContinuar = stage.regra.tipo === 'leitura' || etapaCumprida(jornada, stage)

  return (
    <div className={styles.pagina} aria-label={`Estudo de ${titulo}`}>
      <header className={styles.cabecalho}>
        {/*
          O `h1` NÃO MORA AQUI, e a ausência é a correção.

          Ele é o nome do conteúdo ("Abertura Italiana") e é renderizado pela
          PÁGINA, no servidor. Duas razões, e a segunda foi um defeito real:

          1. um `h1` que muda a cada Continuar tira da página a identidade do que
             está sendo estudado — quem navega por cabeçalhos perde a âncora;
          2. a jornada só existe depois de ler o IndexedDB. Com o `h1` aqui, a
             página ficava SEM cabeçalho nenhum até a hidratação, e o contrato
             ARIA do projeto reprovou — corretamente. Identidade de página não
             pode depender de leitura de banco local.

          A etapa é uma seção DENTRO do estudo, e por isso é `h2`.
        */}
        {/*
          UMA ETAPA POR VEZ. O nome, a posição e o Mapa vivem no cabeçalho de
          etapa; a faixa com os dez rótulos saiu. Ver `StudyStageHeader`.
        */}
        <StudyStageHeader
          jornada={jornada}
          stages={stages}
          stage={stage}
          aoAbrirMapa={aoVoltarEtapa ? () => setMapaAberto(true) : undefined}
        />
        {/*
          A CONTAGEM POR EXTENSO CONTINUA, e continua sendo `role="status"`.

          O cabeçalho escreve "Reconhecer — 2/10", que é compacto e visual. Esta
          linha é o que um leitor de tela ANUNCIA quando a etapa troca: sem ela,
          avançar seria silencioso para quem não vê a tela.
        */}
        <p className={styles.leitorDeTela} role="status">
          {t('journey.stageOf', { current: progresso.atual, total: progresso.total })}
        </p>
        {/*
          O MODO COM QUE O ALUNO CHEGOU, quando não é o padrão.

          "Reaprender" e "Aprender" abrem o MESMO conteúdo — é isso que faz o
          deep link ser um só. Sem esta linha, quem pediu para rever o que
          esqueceu recebia a aula de estreia sem nenhum sinal de que o app tinha
          entendido o pedido: nada errava, e mesmo assim a resposta não era a que
          foi pedida.
        */}
        {modo && modo !== 'aprender' ? (
          <p className={styles.modo} data-testid="modo-de-aprendizado">
            {t(CHAVE_DO_AVISO[modo])}
          </p>
        ) : null}
        {aoRever ? (
          <button type="button" className={styles.rever} onClick={aoRever}>
            Rever conteúdo
          </button>
        ) : null}
      </header>

      {/*
        O MAPA É O ÚNICO LUGAR QUE MOSTRA TUDO AO MESMO TEMPO, e é pedido.

        `aoVoltarEtapa` ausente significa que a tela não deixa navegar entre
        etapas — aí não há mapa para abrir, em vez de um mapa que não leva a
        lugar nenhum.
      */}
      {mapaAberto && aoVoltarEtapa ? (
        <StudyContentIndex
          jornada={jornada}
          stages={stages}
          aoEscolher={(stageId) => {
            setMapaAberto(false)
            aoVoltarEtapa(stageId)
          }}
          aoFechar={() => setMapaAberto(false)}
        />
      ) : null}

      {/*
        DUAS COLUNAS SÓ QUANDO HÁ TABULEIRO NO SLOT.

        A regra era incondicional, e o efeito era invisível até alguém medir: sem
        `tabuleiro`, a área continuava com duas colunas e o painel ocupava só a
        primeira — a segunda ficava reservada e vazia. As jornadas de Aberturas e
        Finais desenham o tabuleiro DENTRO do conteúdo, então elas caíam
        exatamente nesse caso, e o tabuleiro delas herdava uma fração de uma
        fração: 312 px numa tela de 1440.
      */}
      <div className={tabuleiro ? `${styles.area} ${styles.areaComTabuleiro}` : styles.area}>
        {tabuleiro ? <div className={styles.tabuleiro}>{tabuleiro}</div> : null}
        {/*
          O ALVO MENSURÁVEL SÓ EXISTE QUANDO ESTE PAINEL É, DE FATO, A COLUNA DE
          INSTRUÇÃO — ou seja, quando o tabuleiro veio pelo slot.

          Sem a condição, este `div` carregaria o mesmo id da coluna interna da
          `MesaDeEstudo` e a envolveria: o portão visual mediria o contêiner (que
          começa na borda esquerda e contém o próprio tabuleiro) e concluiria que
          a instrução está embaixo. Foi o que aconteceu na primeira versão do
          teste, e o falso positivo era indistinguível do defeito real.
        */}
        <div className={styles.painel} data-testid={tabuleiro ? 'instrucao-do-estudo' : undefined}>
          {children}
        </div>
      </div>

      {rodapeOculto ? null : (
        <footer className={styles.rodape}>
          {anterior && aoVoltarEtapa ? (
            <button
              type="button"
              className={styles.secundario}
              onClick={() => aoVoltarEtapa(anterior.id)}
            >
              ← {anterior.rotuloCurto}
            </button>
          ) : (
            <span />
          )}

          <div className={styles.direita}>
            {aoSair ? (
              <button type="button" className={styles.discreto} onClick={aoSair}>
                Sair
              </button>
            ) : null}
            {aoContinuar ? (
              <button
                type="button"
                className={styles.primario}
                onClick={aoContinuar}
                disabled={!podeContinuar}
              >
                Continuar →
              </button>
            ) : null}
          </div>
        </footer>
      )}

      {!podeContinuar && aoContinuar ? (
        <p className={styles.pendente}>{textoDoPendente(stage, jornada)}</p>
      ) : null}
    </div>
  )
}

/**
 * Por que o Continuar está desabilitado.
 *
 * Um botão inerte sem explicação é a forma mais rápida de o aluno achar que o
 * app travou. A frase é derivada da REGRA da etapa, então uma regra nova entra
 * aqui em vez de aparecer como silêncio.
 */
function textoDoPendente(stage: StudyStage, jornada: StudyJourney): string {
  switch (stage.regra.tipo) {
    case 'leitura':
      return ''
    case 'itens': {
      const feitos = jornada.itensRespondidos[stage.id]?.length ?? 0
      return `Faltam ${stage.regra.total - feitos} de ${stage.regra.total} exercícios para seguir.`
    }
    case 'cobertura': {
      const cobertos = new Set(jornada.alvosCobertos[stage.id] ?? [])
      const faltando = stage.regra.alvosExigidos.filter((alvo) => !cobertos.has(alvo)).length
      return `Faltam ${faltando} ${faltando === 1 ? 'linha' : 'linhas'} para concluir o treino.`
    }
  }
}
