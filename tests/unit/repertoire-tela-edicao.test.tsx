/**
 * Portão da EDIÇÃO da ideia na tela de aberturas.
 *
 * `repertoire-tela.test.tsx` cobra que a tela DESENHA o repertório. Este arquivo
 * cobra a outra metade, que é a que faltava: que o aluno consegue trocar a ideia
 * de um lance pela dele, que o que ele escreveu FICA gravado, e que a tela para
 * de fingir que o repertório de fábrica é o dele.
 *
 * 1. A TELA DIZ DE QUEM SÃO AS IDEIAS. Sem essa frase, um repertório de fábrica
 *    desenhado com capricho se passa pelo do aluno — que é exatamente o defeito
 *    que este trabalho veio fechar, e que nenhum teste de "o texto aparece"
 *    pegaria.
 *
 * 2. A EDIÇÃO PASSA PELO REPOSITÓRIO. A asserção final é sobre o que está
 *    GRAVADO, e não só sobre o que está na tela: uma tela que mostrasse o texto
 *    novo sem gravar passaria num teste que só olhasse pixels, e o aluno
 *    descobriria a perda no dia seguinte.
 *
 * 3. RECUSA É DITA COM TEXTO. Ideia em branco não é salva, e o motivo aparece —
 *    não some em silêncio nem fecha o formulário fingindo sucesso.
 *
 * 4. SEM ONDE GRAVAR, NÃO HÁ BOTÃO, e há explicação. Um botão que abre um campo
 *    para jogar o texto fora é pior que nenhum botão.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que a rota `/openings` monta no navegador, que o
 * CSS não esconde o formulário, e que os ids de card sobrevivem à edição — este
 * último é `repertoire-edicao.test.ts`, e é lá que a mutação mora.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INDICE_ECO, REPERTORIO_BRANCAS, REPERTORIO_PRETAS } from '@/content/openings'
import { construirRepertorio } from '@/domain/repertoire'
import { arvoreLegivel, todosOsRamos } from '@/components/openings/arvore-legivel'
import { lanceComNumero } from '@/components/openings/textos'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

const { OpeningsWorkbench } = await import('@/components/openings/OpeningsWorkbench')

const AGORA = new Date('2026-05-04T08:00:00.000Z')
const IDEIA_DO_ALUNO = 'Eu abro assim porque é o começo que eu entendo até o fim.'

/** O primeiro lance do repertório de brancas, como o botão o nomeia. */
const PRIMEIRO_SAN = REPERTORIO_BRANCAS.linhas[0].lances[0].san
const ROTULO_DO_PRIMEIRO = `1. ${PRIMEIRO_SAN}`

async function montar(repo: MemoryTrainingRepository | null, status = 'pronto') {
  contexto.valor = { repo, status, erro: repo ? null : 'acesso negado', revision: 0 }
  await act(async () => {
    render(<OpeningsWorkbench agora={() => AGORA} />)
  })
}

function secaoDe(titulo: string): HTMLElement {
  return screen.getByRole('region', { name: titulo })
}

/** O botão de editar a ideia daquele lance, dentro daquele repertório. */
function botaoDeEditar(secao: HTMLElement, rotulo: string): HTMLElement {
  return within(secao).getByRole('button', { name: `Editar a ideia de ${rotulo}` })
}

beforeEach(() => {
  contexto.valor = null
})

describe('a tela diz de quem são as ideias', () => {
  it('sem nada gravado, avisa que o repertório é o que veio com o app', async () => {
    await montar(new MemoryTrainingRepository())
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)
    expect(within(brancas).getByText(/ainda é o que veio com o app/)).toBeVisible()
  })

  it('depois de o aluno escrever, o cartão passa a dizer que o repertório é dele', async () => {
    const repo = new MemoryTrainingRepository()
    await montar(repo)
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    await userEvent.click(botaoDeEditar(brancas, ROTULO_DO_PRIMEIRO))
    await userEvent.clear(screen.getByRole('textbox', { name: /A sua ideia para/ }))
    await userEvent.type(screen.getByRole('textbox', { name: /A sua ideia para/ }), IDEIA_DO_ALUNO)
    await userEvent.click(screen.getByRole('button', { name: /^Salvar a ideia de/ }))

    await waitFor(() => {
      expect(
        within(secaoDe(REPERTORIO_BRANCAS.titulo)).getByText(/Este repertório é seu/),
      ).toBeVisible()
    })
    // O OUTRO repertório continua sendo o de fábrica: editar um não pode
    // carimbar o outro como "seu".
    expect(
      within(secaoDe(REPERTORIO_PRETAS.titulo)).getByText(/ainda é o que veio com o app/),
    ).toBeVisible()
  })
})

describe('a ideia que o aluno escreve é gravada', () => {
  it('o texto novo aparece na tela E fica no repositório', async () => {
    const repo = new MemoryTrainingRepository()
    await montar(repo)
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    const ideiaDeFabrica = REPERTORIO_BRANCAS.linhas[0].lances[0].ideia
    expect(ideiaDeFabrica, 'o conteúdo perdeu a ideia do primeiro lance').toBeTruthy()
    expect(within(brancas).getByText(ideiaDeFabrica as string)).toBeVisible()

    await userEvent.click(botaoDeEditar(brancas, ROTULO_DO_PRIMEIRO))
    const campo = screen.getByRole('textbox', { name: /A sua ideia para/ })
    await userEvent.clear(campo)
    await userEvent.type(campo, IDEIA_DO_ALUNO)
    await userEvent.click(screen.getByRole('button', { name: /^Salvar a ideia de/ }))

    // 1. A tela releu e mostra o texto do aluno no lugar do nosso.
    await waitFor(() => {
      expect(within(secaoDe(REPERTORIO_BRANCAS.titulo)).getByText(IDEIA_DO_ALUNO)).toBeVisible()
    })
    expect(screen.queryByText(ideiaDeFabrica as string)).toBeNull()

    // 2. E, o que importa mais, está GRAVADO.
    const gravados = await repo.listRepertorios()
    expect(gravados).toHaveLength(1)
    expect(gravados[0].definicao.id).toBe(REPERTORIO_BRANCAS.id)
    expect(JSON.stringify(gravados[0].definicao)).toContain(IDEIA_DO_ALUNO)
    expect(gravados[0].atualizadoEm).toBe(AGORA.toISOString())
  })

  it('o campo nasce com a ideia atual, e cancelar não grava nada', async () => {
    const repo = new MemoryTrainingRepository()
    await montar(repo)
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    await userEvent.click(botaoDeEditar(brancas, ROTULO_DO_PRIMEIRO))
    const campo = screen.getByRole('textbox', { name: /A sua ideia para/ })
    expect(campo).toHaveValue(REPERTORIO_BRANCAS.linhas[0].lances[0].ideia)

    await userEvent.type(campo, ' rascunho descartado')
    await userEvent.click(screen.getByRole('button', { name: /^Cancelar/ }))

    expect(await repo.listRepertorios()).toEqual([])
    expect(screen.queryByText(/rascunho descartado/)).toBeNull()
  })

  it('ideia em branco é recusada COM MOTIVO, e nada é gravado', async () => {
    const repo = new MemoryTrainingRepository()
    await montar(repo)
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    await userEvent.click(botaoDeEditar(brancas, ROTULO_DO_PRIMEIRO))
    await userEvent.clear(screen.getByRole('textbox', { name: /A sua ideia para/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Salvar a ideia de/ }))

    expect(await screen.findByText(/Escreva a ideia antes de salvar/)).toBeVisible()
    expect(await repo.listRepertorios()).toEqual([])
  })

  it('gravação que falha é dita, e não vira um "salvo" mentiroso', async () => {
    const repo = new MemoryTrainingRepository()
    vi.spyOn(repo, 'saveRepertorio').mockRejectedValue(new Error('banco fechado'))
    await montar(repo)
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    await userEvent.click(botaoDeEditar(brancas, ROTULO_DO_PRIMEIRO))
    const campo = screen.getByRole('textbox', { name: /A sua ideia para/ })
    await userEvent.clear(campo)
    await userEvent.type(campo, IDEIA_DO_ALUNO)
    await userEvent.click(screen.getByRole('button', { name: /^Salvar a ideia de/ }))

    expect(await screen.findByText(/banco fechado/)).toBeVisible()
    expect(screen.queryByText(/Ideia salva/)).toBeNull()
  })
})

describe('sem onde gravar, não há botão — e há explicação', () => {
  it('armazenamento fora do ar tira o editor e diz por quê', async () => {
    await montar(null, 'erro')

    expect(await screen.findByRole('heading', { name: REPERTORIO_BRANCAS.titulo })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Editar a ideia de/ })).toBeNull()
    expect(screen.getAllByText(/Não dá para editar as ideias agora/).length).toBeGreaterThan(0)
  })
})

describe('acessibilidade da edição', () => {
  it('cada botão diz de QUAL lance ele é', async () => {
    await montar(new MemoryTrainingRepository())
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    // A varredura sai da FONTE: os rótulos que a própria árvore desenha. Uma
    // lista escrita aqui continuaria verde no dia em que um lance novo entrasse
    // no conteúdo sem botão nenhum ao lado.
    const rotulos = todosOsRamos(
      arvoreLegivel(construirRepertorio(REPERTORIO_BRANCAS, { indiceEco: INDICE_ECO })),
    ).map((ramo) => lanceComNumero(ramo.nivel, ramo.san))
    expect(rotulos.length).toBeGreaterThan(3)

    for (const rotulo of rotulos) {
      expect(
        within(brancas).getAllByRole('button', { name: `Editar a ideia de ${rotulo}` }).length,
        `nenhum botão para ${rotulo}`,
      ).toBeGreaterThan(0)
    }

    // E nenhum botão se chama só "Editar a ideia": trinta destinos idênticos são
    // trinta destinos inúteis para quem navega por leitor de tela. O nome exato
    // não casa com nenhum dos que carregam o lance.
    expect(within(brancas).queryAllByRole('button', { name: 'Editar a ideia' })).toEqual([])
  })

  it('o foco entra no campo ao abrir e volta ao botão ao cancelar', async () => {
    await montar(new MemoryTrainingRepository())
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)
    const botao = botaoDeEditar(brancas, ROTULO_DO_PRIMEIRO)

    await userEvent.click(botao)
    expect(screen.getByRole('textbox', { name: /A sua ideia para/ })).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: /^Cancelar/ }))
    expect(botaoDeEditar(secaoDe(REPERTORIO_BRANCAS.titulo), ROTULO_DO_PRIMEIRO)).toHaveFocus()
  })

  it('o resultado é anunciado com TEXTO, e não só com cor', async () => {
    const repo = new MemoryTrainingRepository()
    await montar(repo)
    const brancas = secaoDe(REPERTORIO_BRANCAS.titulo)

    await userEvent.click(botaoDeEditar(brancas, ROTULO_DO_PRIMEIRO))
    const campo = screen.getByRole('textbox', { name: /A sua ideia para/ })
    await userEvent.clear(campo)
    await userEvent.type(campo, IDEIA_DO_ALUNO)
    await userEvent.click(screen.getByRole('button', { name: /^Salvar a ideia de/ }))

    const status = await screen.findByText(/Ideia salva/)
    expect(status).toBeVisible()
    expect(status.closest('[role="status"]')).not.toBeNull()
  })
})
