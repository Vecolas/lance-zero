'use client'

/**
 * A lição aberta, com endereço próprio.
 *
 * O QUE ESTE ARQUIVO SUBSTITUI: a lição era aberta DENTRO da biblioteca —
 * `BibliotecaDeLicoes` guardava um `abertaId` e trocava o próprio miolo pelo
 * player. O efeito prático era que a lição não existia como lugar: o link não se
 * compartilhava, o voltar do navegador saía da biblioteca inteira, e recarregar
 * jogava o aluno de volta na lista.
 *
 * Agora a lição é uma página, e este componente é a ponte entre ela e o player:
 * ele retoma o checkpoint, grava a cada etapa vencida, grava a evidência de
 * ensino quando a lição chega ao resumo, e devolve o aluno à biblioteca quando
 * ele sai.
 *
 * O CHECKPOINT É LIDO ANTES DE O PLAYER EXISTIR, e isso é uma restrição real e
 * não uma preferência: o índice inicial do player é estado inicial de `useState`,
 * então um valor que chegasse depois seria simplesmente ignorado. Montar o player
 * com zero e "corrigir" em seguida faria o aluno ver a etapa 1 piscar antes de
 * cair na etapa 6 — e, pior, o React só usa o inicializador uma vez.
 *
 * A GRAVAÇÃO DE ENSINO CONTINUA SENDO A MESMA, e continua sendo a única:
 * `registrarEnsino` é o que diz ao resto do app que aquela habilidade foi
 * ensinada. É de lá que saem o estado do card na biblioteca, a elegibilidade da
 * revisão e o "concluído" no Roadmap — um segundo lugar gravando isso seria a
 * segunda verdade sobre a mesma pergunta.
 */

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LicaoPlayer } from '@/components/lessons/LicaoPlayer'
import { useIdioma } from '@/components/providers/LocaleProvider'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { StatePanel } from '@/components/ui/primitives'
import { ETAPAS_DA_LICAO, type Licao } from '@/domain/lessons'
import { traduzirRota } from '@/lib/i18n/rotas'
import { registrarEnsino } from '@/lib/training/registrar-tentativa'

/**
 * O resultado da leitura do checkpoint.
 *
 * `lendo` É UM ESTADO DE VERDADE e não um detalhe: enquanto ele dura o player
 * não pode ser montado, porque montá-lo já fixa a etapa inicial. Sem esta
 * distinção o "retomar" funcionaria só quando o IndexedDB respondesse rápido o
 * bastante — que é a pior classe de defeito, a que passa na máquina de quem
 * escreveu.
 */
type Retomada = { fase: 'lendo' } | { fase: 'pronto'; etapaInicial: number }

/**
 * Começar do zero. É a resposta de quem nunca abriu — e também de quem abre sem
 * repositório disponível, que é o caso da navegação privada com IndexedDB
 * bloqueado. Não é erro: é uma lição sem checkpoint.
 */
const DO_COMECO: Retomada = { fase: 'pronto', etapaInicial: 0 }

export function LicaoAberta({ licao }: { licao: Licao }) {
  const { repo, profile, refresh } = useRepository()
  const { locale, t } = useIdioma()
  const router = useRouter()
  const [lido, setLido] = useState<Retomada | null>(null)

  /*
    O CASO "SEM REPOSITÓRIO" É DERIVADO, e não escrito por um efeito.

    A primeira versão chamava `setRetomada` em linha reta dentro do efeito para
    esse caso, e o lint do projeto reprovou com razão: escrever estado no corpo
    de um efeito provoca uma segunda renderização para produzir um valor que já
    dava para calcular na primeira. Sem repositório não há o que ler — a resposta
    não depende de nada assíncrono.
  */
  const retomada: Retomada = repo ? (lido ?? { fase: 'lendo' }) : DO_COMECO

  useEffect(() => {
    if (!repo) return
    let cancelado = false
    void repo
      .getLessonProgress(licao.id)
      .then((gravado) => {
        if (cancelado) return
        /*
          VERSÃO DIFERENTE, CHECKPOINT DESCARTADO.

          Uma lição reescrita pode ter outras etapas, em outra ordem. Retomar na
          etapa 7 de um conteúdo que mudou é retomar no lugar errado com cara de
          acerto. Recomeçar é honesto: o conteúdo é outro.
        */
        const valido = gravado && gravado.contentVersion === licao.versao
        setLido({ fase: 'pronto', etapaInicial: valido ? gravado.stepIndex : 0 })
      })
      .catch(() => {
        if (!cancelado) setLido(DO_COMECO)
      })
    return () => {
      cancelado = true
    }
  }, [repo, licao.id, licao.versao])

  if (retomada.fase === 'lendo') {
    return <StatePanel kind="loading" title={t('lessons.resuming')} />
  }

  return (
    <LicaoPlayer
      licao={licao}
      etapaInicial={retomada.etapaInicial}
      aoAvancar={(evento) => {
        /*
          O CHECKPOINT É GRAVADO A CADA ETAPA, e não só no fim.

          O índice gravado é o da PRÓXIMA etapa: o evento chega quando a etapa
          atual foi vencida, então retomar nela seria repetir o que o aluno
          acabou de fazer. `indexOf` do evento + 1 é a etapa que ele veria se não
          tivesse fechado a aba.
        */
        if (repo) {
          const proxima = Math.min(
            ETAPAS_DA_LICAO.indexOf(evento.etapa) + 1,
            ETAPAS_DA_LICAO.length - 1,
          )
          void repo
            .saveLessonProgress({
              lessonId: licao.id,
              stepIndex: proxima,
              contentVersion: licao.versao,
              updatedAt: new Date().toISOString(),
            })
            .catch(() => {
              // A lição continua utilizável sem checkpoint. O que se perde é
              // retomar depois, não a aula.
            })
        }

        if (evento.etapa !== 'resumo') return

        /*
          O MARCADOR DE REAPRENDIZADO, mantido do desenho anterior: quem chegou
          aqui vindo da fila de revisão precisa voltar para ela, e não para a
          biblioteca. Sem isso o aluno reaprende o conceito e perde a fila que o
          mandou reaprender.
        */
        if (typeof window !== 'undefined') {
          const chave = `lancezero-relearning:${profile?.id ?? 'local'}`
          try {
            const bruto = window.localStorage.getItem(chave)
            if (bruto)
              window.localStorage.setItem(
                chave,
                JSON.stringify({ ...JSON.parse(bruto), completed: true }),
              )
          } catch {
            // A lição continua concluída mesmo sem armazenamento.
          }
        }

        if (repo) void registrarEnsino(repo, licao.habilidade, new Date()).then(() => refresh())
      }}
      aoFechar={() => {
        if (typeof window !== 'undefined') {
          const chave = `lancezero-relearning:${profile?.id ?? 'local'}`
          try {
            const bruto = window.localStorage.getItem(chave)
            if (bruto && JSON.parse(bruto).completed === true) {
              router.push(traduzirRota('/train/revisao', locale))
              return
            }
          } catch {
            // Navegação normal da biblioteca.
          }
        }
        router.push(traduzirRota('/lessons', locale))
      }}
    />
  )
}
