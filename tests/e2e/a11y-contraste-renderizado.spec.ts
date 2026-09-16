/**
 * CONTRASTE MEDIDO NO QUE O NAVEGADOR PINTA.
 *
 * A DECISÃO: este portão não olha para token nenhum. Ele carrega a tela de
 * verdade, lê `getComputedStyle` de cada elemento com texto próprio, achata as
 * camadas de fundo até chegar numa cor opaca e só então calcula a razão de
 * contraste — com a MESMA função que os testes de unidade usam
 * (`src/lib/a11y/contrast.ts`), para não existirem duas verdades sobre o que é
 * 4,5:1.
 *
 * Por que isso não é redundante com `tests/unit/tokens.test.ts`: aquele teste
 * escolhe pares de cor à mão e confere os pares. Este descobre os pares. A
 * diferença apareceu na primeira execução — `--accent-text` passa sobre
 * `--bg-primary`, que é o par conferido lá, e REPROVA sobre `--bg-secondary` e
 * sobre `--accent-soft`, que são fundos que o app usa e ninguém tinha medido.
 *
 * O QUE ESTE PORTÃO NÃO PROVA — a lista completa está no cabeçalho de
 * `tests/e2e/util/a11y-medicao.ts` e vale a pena repetir o essencial:
 * varredura automatizada pega mais ou menos 30% dos problemas reais de
 * acessibilidade, e isto aqui é um pedaço desses 30%. Não houve leitor de
 * tela, não há checagem de ordem de foco, texto sobre gradiente é DESCARTADO
 * em vez de aprovado, e nenhum estado que exija interação é medido.
 *
 * Verde aqui quer dizer: "o contraste de texto medido nestas rotas, nestes dois
 * temas e nestas duas larguras passa em WCAG AA". Não quer dizer acessível.
 */

import { expect, test, type Page } from '@playwright/test'
import {
  coletarAmostras,
  descrever,
  excecaoDe,
  julgar,
  reprova,
  verificarExcecoesObsoletas,
  type AmostraDeTexto,
  type Julgamento,
} from './util/a11y-medicao'

/**
 * As duas larguras não são gosto: abaixo de 60rem o app troca a navegação
 * lateral pela barra inferior e os `clamp()` de tipografia mudam de tamanho —
 * ou seja, são composições DIFERENTES, com pares de cor diferentes.
 */
const LARGURAS = [
  { nome: '360', viewport: { width: 360, height: 740 } },
  { nome: 'desktop', viewport: { width: 1280, height: 800 } },
] as const

const TEMAS = ['light', 'dark'] as const

/**
 * Rotas varridas. Cobrem o ciclo do aluno e as telas que nasceram sem inspeção
 * visual nenhuma (`/endgames`, `/openings`, `/progress`).
 *
 * FICAM DE FORA, e é preciso dizer: `/debug/*` (ferramenta interna) e qualquer
 * estado que exija interação — puzzle resolvido, faixa de feedback, erro de
 * formulário, painel expandido. Isso é o buraco maior desta varredura.
 */
const ROTAS = [
  '/',
  '/dashboard',
  '/train',
  '/puzzles',
  '/calculate',
  '/endgames',
  '/openings',
  '/progress',
  '/lessons',
  '/games',
  '/onboarding',
  '/settings',
  '/licenses',
] as const

const PGN_REVISAO = `[Event "Contraste"]
[White "Alice"]
[Black "Bruno"]
[Result "1-0"]
[Date "2026.01.02"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`

/**
 * Espera a tela ASSENTAR antes de medir.
 *
 * O `h1` vem do servidor e aparece de imediato; o conteúdo que depende do banco
 * local aparece depois. Medir entre um e outro é medir o painel "Carregando",
 * não a tela — e o resultado passava a depender de quem estava mais rápido
 * naquele instante.
 *
 * Foi assim que o Roadmap atravessou esta varredura: ele pintava o título da
 * tela em `#102a43` sobre `#07131c` no modo escuro — 1.28:1, invisível — e o
 * portão ficava verde na minha máquina e vermelho no CI, sem que nada tivesse
 * mudado entre as duas execuções. Um portão que depende de sorte não é portão.
 *
 * `state-loading` é a classe do `StatePanel` de carregamento, e é a mesma em
 * toda tela porque ele é uma primitiva só.
 */
async function esperarAssentar(page: Page): Promise<void> {
  await expect(page.locator('[class*="state-loading"]')).toHaveCount(0, { timeout: 20_000 })
}

async function amostrasDa(
  page: Page,
  rota: string,
  tema: (typeof TEMAS)[number],
): Promise<AmostraDeTexto[]> {
  const cruas = await page.evaluate(coletarAmostras)
  expect(cruas.length, `${rota} [${tema}] não produziu amostra nenhuma`).toBeGreaterThan(0)
  return cruas.map((a) => ({ ...a, rota, tema }))
}

test('o contraste de texto renderizado passa em WCAG AA nas telas principais', async ({ page }) => {
  test.slow()

  const julgamentos: Julgamento[] = []

  for (const tema of TEMAS) {
    await page.emulateMedia({ colorScheme: tema })
    for (const { viewport } of LARGURAS) {
      await page.setViewportSize(viewport)

      for (const rota of ROTAS) {
        await page.goto(rota)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
        await esperarAssentar(page)
        julgamentos.push(...(await amostrasDa(page, rota, tema)).map(julgar))
      }

      // A revisão de partida só existe depois de importar: é a quarta tela do
      // ciclo do aluno e ficaria fora da medição se dependesse só de `goto`.
      await page.goto('/games')
      await page.getByLabel('PGN', { exact: true }).fill(PGN_REVISAO)
      await page.getByRole('button', { name: 'Importar' }).click()
      await page.getByRole('link', { name: /Alice × Bruno/ }).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revisar partida', {
        timeout: 20_000,
      })
      julgamentos.push(...(await amostrasDa(page, '/games/[gameId]', tema)).map(julgar))
    }
  }

  // PORTÃO COM ZERO VERIFICAÇÕES TEM DE REPROVAR: se o coletor parar de achar
  // texto (um seletor quebrado, uma mudança de shell), a varredura ficaria
  // verde por vacuidade. O piso é grosseiro de propósito — afirma que HOUVE
  // medição, não quanta.
  expect(julgamentos.length, 'a varredura não mediu nada').toBeGreaterThan(500)

  const naoMedidas = julgamentos.filter((j) => j.razao === null)
  const reprovacoes = julgamentos.filter(reprova)
  const novas = reprovacoes.filter((j) => !excecaoDe(j))

  // Amostras descartadas por fundo com gradiente/imagem são RELATADAS, nunca
  // contadas como aprovadas. Se esse número disparar, a varredura virou fumaça.
  expect(
    naoMedidas.length,
    `amostras não mensuráveis demais:\n${naoMedidas.slice(0, 10).map(descrever).join('\n')}`,
  ).toBeLessThan(julgamentos.length * 0.05)

  const relatorio = novas.map(descrever).join('\n')
  expect(novas.length, `contraste abaixo de AA em ${novas.length} lugares:\n${relatorio}`).toBe(0)

  // Exceção que parou de reproduzir é peneira aberta: ela deixaria de proteger
  // um defeito conhecido e passaria a esconder um defeito novo parecido.
  const obsoletas = verificarExcecoesObsoletas(reprovacoes)
  expect(
    obsoletas,
    `exceções declaradas que não reproduzem mais — apague-as de EXCECOES_MEDIDAS:\n${obsoletas.join('\n')}`,
  ).toEqual([])
})

test('o portão morde: texto de baixo contraste injetado é reprovado', async ({ page }) => {
  // Sem este caso, um erro no achatamento de fundo (por exemplo devolver
  // sempre branco, ou parar na primeira camada transparente) deixaria a
  // varredura verde para sempre. Aqui a falha é FABRICADA, com um par de cores
  // cujo contraste é conhecido: #999999 sobre #FFFFFF = 2,85:1.
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  const antes = (await amostrasDa(page, '/dashboard', 'light'))
    .map(julgar)
    .filter(reprova)
    .filter((j) => !excecaoDe(j))
  expect(
    antes.map(descrever),
    'a tela já reprovava antes da injeção — o caso seguinte não provaria nada',
  ).toEqual([])

  await page.evaluate(() => {
    const vilao = document.createElement('p')
    vilao.style.color = '#999999'
    vilao.style.backgroundColor = '#ffffff'
    vilao.textContent = 'contraste fabricado'
    document.body.appendChild(vilao)
  })

  const depois = (await amostrasDa(page, '/dashboard', 'light')).map(julgar).filter(reprova)
  const pego = depois.find((j) => j.amostra.texto === 'contraste fabricado')
  expect(pego, 'o texto de baixo contraste injetado passou pela varredura').toBeDefined()
  expect(pego?.razao ?? 0).toBeGreaterThan(2.8)
  expect(pego?.razao ?? 0).toBeLessThan(2.9)
})

test('o portão morde: fundo semitransparente é composto, não ignorado', async ({ page }) => {
  // O caso que um achatamento ingênuo erra. O pai é preto; o filho tem fundo
  // branco a 10% — quase nada. Texto branco por cima é ilegível na prática, e
  // só quem COMPÕE as camadas enxerga isso: quem lê apenas a camada mais
  // próxima concluiria "branco sobre branco quase opaco" e aprovaria.
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  await page.evaluate(() => {
    const pai = document.createElement('div')
    pai.style.backgroundColor = '#000000'
    const filho = document.createElement('p')
    filho.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
    filho.style.color = '#ffffff'
    filho.textContent = 'camada fabricada'
    pai.appendChild(filho)
    document.body.appendChild(pai)
  })

  const j = (await amostrasDa(page, '/dashboard', 'light'))
    .map(julgar)
    .find((x) => x.amostra.texto === 'camada fabricada')

  expect(j, 'a amostra com fundo em camadas não foi colhida').toBeDefined()
  // 10% de branco sobre preto dá um cinza bem escuro: branco por cima passa
  // folgado. A afirmação aqui é a REGRA — o fundo composto tem de ser ESCURO,
  // não o branco da camada de cima — e não um número cravado.
  expect(j?.fundoHex).toBe('#1a1a1a')
  expect(j?.razao ?? 0).toBeGreaterThan(4.5)
})
