'use client'

/**
 * Trocar a ideia de um lance pela ideia do aluno.
 *
 * POR QUE ESTE É O MÍNIMO ÚTIL. O produto promete repertório com IDEIA escrita,
 * não sequência decorada. Um repertório de fábrica com ideias de fábrica é o
 * repertório de outra pessoa: o aluno lê uma frase que ele não escolheu e nada
 * ali é dele. Trocar essa frase é a menor edição que muda o dono do repertório.
 * Arrastar, criar e apagar ramo é outra rodada, e esta tela não finge fazê-lo.
 *
 * DECISÃO 1 — O EDITOR NASCE FECHADO. A ideia é para LER; a tela de aberturas é
 * de estudo, não de redação. Um campo de texto aberto em cada um dos trinta e
 * poucos lances transformaria a leitura num formulário e empurraria as linhas
 * para fora da tela de 360px.
 *
 * DECISÃO 2 — CADA BOTÃO DIZ DE QUAL LANCE ELE É. "Editar" repetido trinta vezes
 * é uma lista de trinta destinos idênticos para quem navega por botão ou usa
 * leitor de tela. O nome acessível carrega o lance; o rótulo visível fica curto
 * porque ao lado dele o lance já está escrito.
 *
 * DECISÃO 3 — O RESULTADO É DITO EM TEXTO, com ícone, e nunca só por cor. Salvou
 * e falhou são os dois estados que o aluno precisa distinguir, e a região é
 * `role="status"` para que a mudança seja anunciada sem roubar o foco.
 *
 * DECISÃO 4 — O FOCO É CONDUZIDO NAS DUAS PONTAS: entra no campo ao abrir e
 * volta para o botão ao fechar. Sem a volta, o foco cai no `<body>` e quem
 * navega por teclado recomeça a lista do zero a cada ideia salva.
 *
 * DECISÃO 5 — SEM ONDE GRAVAR, NÃO HÁ BOTÃO. Quando o armazenamento local está
 * fora do ar, `salvar` não chega e o editor não aparece; quem explica isso é o
 * `RepertorioCard`, uma vez, em cima da lista. Um botão que abre um campo para
 * jogar o texto fora seria pior que nenhum botão.
 */

import { useCallback, useId, useRef, useState, type FormEvent } from 'react'
import type { AlvoDaIdeia } from '@/domain/repertoire'
import styles from './EditorDeIdeia.module.css'

/** O que a tela recebe de volta ao tentar gravar. */
export type ResultadoDeSalvar = { ok: true } | { ok: false; mensagem: string }

export type SalvarIdeia = (alvo: AlvoDaIdeia, ideia: string) => Promise<ResultadoDeSalvar>

export interface EditorDeIdeiaProps {
  alvo: AlvoDaIdeia
  /** O texto atual. Vazio quando o repertório tem conflito declarado. */
  ideia: string
  /** O lance com número, como já aparece na linha. Vai para o nome acessível. */
  rotulo: string
  salvar: SalvarIdeia
}

type Estado =
  | { fase: 'fechado' }
  | { fase: 'editando' }
  | { fase: 'salvando' }
  | { fase: 'erro'; mensagem: string }
  | { fase: 'salvo' }

export function EditorDeIdeia({ alvo, ideia, rotulo, salvar }: EditorDeIdeiaProps) {
  const [estado, setEstado] = useState<Estado>({ fase: 'fechado' })
  const [texto, setTexto] = useState(ideia)
  const campoId = useId()
  const ajudaId = useId()
  const botao = useRef<HTMLButtonElement | null>(null)
  const devolverFoco = useRef(false)

  /** Foca o campo assim que ele entra na árvore — ver DECISÃO 4. */
  const focarCampo = useCallback((campo: HTMLTextAreaElement | null) => {
    campo?.focus()
  }, [])

  /**
   * Guarda o botão e devolve o foco a ele quando o editor acabou de fechar.
   *
   * Focar dentro de `fechar()` não funciona e falha CALADO: naquele instante o
   * botão não está montado (quem está na tela é o formulário), então `ref.current`
   * é `null`, o `?.` engole a chamada e o foco cai no `<body>`. Quem navega por
   * teclado recomeça a lista do zero a cada ideia salva, e nada acusa.
   */
  const registrarBotao = useCallback((elemento: HTMLButtonElement | null) => {
    botao.current = elemento
    if (elemento !== null && devolverFoco.current) {
      devolverFoco.current = false
      elemento.focus()
    }
  }, [])

  function abrir() {
    // O campo parte SEMPRE do texto que está na tela, e não do último rascunho:
    // reabrir depois de cancelar tem de mostrar a ideia que vale, não a que o
    // aluno já decidiu descartar.
    setTexto(ideia)
    setEstado({ fase: 'editando' })
  }

  function fechar() {
    devolverFoco.current = true
    setEstado({ fase: 'fechado' })
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setEstado({ fase: 'salvando' })
    const resultado = await salvar(alvo, texto)
    if (resultado.ok) {
      devolverFoco.current = true
      setEstado({ fase: 'salvo' })
      return
    }
    setEstado({ fase: 'erro', mensagem: resultado.mensagem })
  }

  /**
   * "Editar" quando já há texto, "Escrever" quando não há.
   *
   * O nome acessível é montado com o MESMO verbo, e não escrito duas vezes: o
   * `aria-label` existe porque a computação do nome acessível cola os filhos sem
   * separador e "Editar a ideia" + " de 1. e4" viraria "Editar a ideiade 1. e4"
   * — um nome que o leitor de tela anuncia grudado. O rótulo visível continua
   * contido no nome acessível, como manda o critério "rótulo no nome".
   */
  const verbo = ideia.trim().length > 0 ? 'Editar' : 'Escrever'

  if (estado.fase === 'fechado' || estado.fase === 'salvo') {
    return (
      <div className={styles.linha}>
        <button
          ref={registrarBotao}
          type="button"
          className={styles.botao}
          onClick={abrir}
          aria-label={`${verbo} a ideia de ${rotulo}`}
        >
          {verbo} a ideia
        </button>
        {estado.fase === 'salvo' ? (
          <p className={styles.salvo} role="status">
            <span aria-hidden="true">✓</span> Ideia salva. Agora ela é sua.
          </p>
        ) : null}
      </div>
    )
  }

  const salvando = estado.fase === 'salvando'

  return (
    <form className={styles.formulario} onSubmit={enviar}>
      <label className={styles.rotulo} htmlFor={campoId}>
        A sua ideia para {rotulo}
      </label>
      <textarea
        id={campoId}
        ref={focarCampo}
        className={styles.campo}
        value={texto}
        rows={3}
        disabled={salvando}
        aria-describedby={ajudaId}
        onChange={(evento) => setTexto(evento.target.value)}
      />
      <p className={styles.ajuda} id={ajudaId}>
        Escreva com as suas palavras por que este lance é jogado. É a frase que volta para você
        depois de responder a revisão.
      </p>
      {estado.fase === 'erro' ? (
        <p className={styles.erro} role="status">
          <span aria-hidden="true">✕</span> {estado.mensagem}
        </p>
      ) : null}
      <div className={styles.acoes}>
        <button
          type="submit"
          className={styles.principal}
          disabled={salvando}
          aria-label={salvando ? `Salvando a ideia de ${rotulo}` : `Salvar a ideia de ${rotulo}`}
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          className={styles.botao}
          onClick={fechar}
          disabled={salvando}
          aria-label={`Cancelar a edição da ideia de ${rotulo}`}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
