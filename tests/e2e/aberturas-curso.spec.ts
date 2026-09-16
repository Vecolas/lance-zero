import { expect, test } from '@playwright/test'

/**
 * A jornada da abertura, medida no navegador.
 *
 * ESTE ARQUIVO FOI REESCRITO, e vale registrar de quê para quê. Ele testava a
 * navegação por ABAS do curso antigo — "clique em Aprender", "clique em
 * Treinar", "clique em Planos". Aquelas asserções morreram com a tela, mas o
 * que elas PROTEGIAM continua valendo, e é isto que os testes abaixo afirmam
 * sobre a jornada:
 *
 *   - o treino não revela a resposta antes da tentativa;
 *   - o Explorer é enriquecimento SOB DEMANDA e não consulta a rede sozinho;
 *   - o catálogo filtra;
 *   - quem já conhece a abertura tem uma verificação curta;
 *   - dá para adotar a abertura no repertório;
 *   - os planos mostram a rota, inclusive em texto.
 *
 * Nenhuma capacidade foi perdida na migração — o plano §153 é explícito: migrar
 * o conteúdo para as etapas, não apagá-lo. Reescrever o teste para o novo
 * caminho é como isso fica provado, em vez de prometido.
 */

/**
 * Percorre a jornada até a etapa pedida.
 *
 * As etapas de leitura só pedem `Continuar →`. A PRÁTICA GUIADA não: ela exige
 * responder os itens previstos, e o `Continuar →` fica desabilitado até lá — o
 * que é justamente a regra que impede o aluno de cair no treino sem ter passado
 * pelo caminho. O ajudante responde, e é por isso que ele existe: sem ele, cada
 * teste reimplementaria essa travessia e uma das cópias ficaria para trás.
 */
async function irAteEtapa(page: import('@playwright/test').Page, titulo: RegExp) {
  for (let i = 0; i < 24; i += 1) {
    /*
      O ALVO É O `h1`, e não "qualquer texto na página". O trilho de progresso
      anuncia as etapas FUTURAS para leitor de tela ("Etapa 6: Planos e
      estruturas, ainda não aberta"), então um `getByText` solto casava com a
      etapa que ainda nem abriu e o ajudante parava cedo — levando o teste a
      afirmar sobre a tela errada.
    */
    const atual = await page
      .getByRole('heading', { level: 2 })
      .first()
      .innerText()
      .catch(() => '')
    if (titulo.test(atual)) return

    // Etapa que cobra resposta: escolhe uma opção e confirma.
    const opcoes = page.getByRole('list', { name: 'Lances possíveis' }).getByRole('button')
    if (
      (await opcoes.count()) > 0 &&
      (await opcoes
        .first()
        .isEnabled()
        .catch(() => false))
    ) {
      await opcoes.first().click()
      const confirmar = page.getByRole('button', { name: 'Continuar', exact: true })
      if ((await confirmar.count()) > 0) await confirmar.first().click()
      continue
    }

    const continuar = page.getByRole('button', { name: /Continuar →/ })
    if ((await continuar.count()) === 0) break
    if (await continuar.isDisabled()) break
    await continuar.click()
  }
}

test('a jornada abre pela visão e chega ao treino sem revelar a resposta', async ({ page }) => {
  await page.route('https://explorer.lichess.ovh/**', (route) => route.abort())
  await page.goto('/aberturas')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aberturas')
  await page.getByRole('link', { name: /Abertura Italiana/ }).click()

  // A jornada começa na VISÃO, e não num menu de abas.
  await expect(page.getByText('Etapa 1 de 9')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Visão e objetivo' })).toBeVisible()

  await irAteEtapa(page, /Treino final/)

  // O treino é o ÁPICE, e continua sem dicas.
  await expect(page.getByText('TREINO · sem dicas')).toBeVisible()

  /*
    E NÃO ENTREGA NADA ANTES DA TENTATIVA.

    A versão anterior desta asserção procurava o texto "Lance do repertório." e
    passava por sorte: a frase de instrução da própria tela ("Jogue o lance do
    repertório…") contém essa substring, então o teste media a instrução em vez
    do feedback — e no desktop passava só porque o computador ainda estava
    respondendo naquele instante.

    O que se afirma agora é o fato: antes de qualquer lance do aluno não existe
    desfecho de rodada na tela.
  */
  await expect(page.getByText('Rodada concluída')).toHaveCount(0)
  await expect(page.getByText('Rodada encerrada')).toHaveCount(0)
  await expect(page.getByText('FORA DO REPERTÓRIO')).toHaveCount(0)
})

test('o Explorer continua sendo enriquecimento sob demanda', async ({ page }) => {
  let consultas = 0
  await page.route('https://explorer.lichess.ovh/**', (route) => {
    consultas += 1
    return route.abort()
  })
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Melhores respostas do adversário/)

  await expect(page.getByText('O que o mundo joga (opcional)')).toBeVisible()
  // NADA foi à rede antes de o aluno pedir. É a regra do projeto sobre serviço
  // externo, e o teste existe porque "sob demanda" é fácil de quebrar sem que
  // nada apareça na tela.
  expect(consultas).toBe(0)

  await page.getByRole('button', { name: 'Consultar o explorador' }).click()
  await expect(page.getByText(/Não consegui falar com o explorador/)).toBeVisible()
  expect(consultas).toBe(1)
})

/**
 * O CATÁLOGO FILTRA POR LADO E POR NÍVEL — e só.
 *
 * Havia três seletores: primeiro lance, nível e status. Os dois que saíram
 * respondiam perguntas que o card já responde — o primeiro lance está no
 * mini-tabuleiro e o status vem escrito dentro do card. Três peneiras para seis
 * aberturas é mais peneira que conteúdo.
 *
 * E eles moravam numa SEGUNDA fileira, puxada para cima por uma margem negativa
 * para parecer a mesma linha dos botões. Quando os botões quebravam, as duas se
 * sobrepunham: texto por cima de texto.
 */
test('o catálogo filtra por lado e por nível, na mesma fileira', async ({ page }) => {
  await page.goto('/aberturas')
  await expect(page.getByRole('link', { name: /Abertura Italiana/ })).toBeVisible()

  // O lado: botões, visíveis o tempo todo.
  await page.getByRole('button', { name: 'Pretas', exact: true }).click()
  await expect(page.getByRole('link', { name: /Defesa Caro-Kann/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Abertura Italiana/ })).toBeHidden()

  // O nível: atrás do ícone de filtro, no fim da MESMA fileira.
  await page.getByRole('button', { name: 'Todas', exact: true }).click()
  await page.getByRole('button', { name: /Filtrar por nível/ }).click()
  await page.getByRole('button', { name: 'Avançada' }).click()
  await expect(page.getByText(/Nenhuma abertura corresponde aos filtros/)).toBeVisible()
})

test('o filtro de nível avisa que está ativo, e não só por cor', async ({ page }) => {
  await page.goto('/aberturas')
  const botao = page.getByRole('button', { name: /Filtrar por nível/ })

  await botao.click()
  await page.getByRole('button', { name: 'Iniciante' }).click()

  // O rótulo acessível passa a dizer QUAL nível está em vigor. Sem isso, quem
  // não vê o ponto no canto do botão não tem como saber que há filtro ligado.
  await expect(page.getByRole('button', { name: 'Filtrar por nível: Iniciante' })).toBeVisible()
})

test('o menu do filtro fecha com Escape e devolve o foco', async ({ page }) => {
  await page.goto('/aberturas')
  const botao = page.getByRole('button', { name: /Filtrar por nível/ })

  await botao.click()
  await expect(page.getByRole('group', { name: 'Nível' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('group', { name: 'Nível' })).toBeHidden()
  // O foco VOLTA ao botão: fechar e largar o foco no nada faz a navegação por
  // teclado recomeçar do topo da página.
  await expect(botao).toBeFocused()
})

test('quem já conhece a abertura recebe uma verificação curta, e não um atalho', async ({
  page,
}) => {
  await page.goto('/aberturas/italiana')

  await page.getByRole('button', { name: 'Já conheço' }).click()
  await expect(page.getByText('DIAGNÓSTICO')).toBeVisible()
  await expect(page.getByText(/Qual decisão você tomaria/)).toBeVisible()

  await page.getByRole('button', { name: 'e4', exact: true }).click()
  await expect(page.getByText(/Você reconheceu a decisão do repertório/)).toBeVisible()

  // E MESMO ASSIM o treino continua exigindo a demonstração: "já conheço" não
  // é porta de fuga. Quem superestima o próprio nível cairia no treino sem o
  // repertório e concluiria que o app está errado.
  await expect(page.getByText(/o treino final continua exigindo a demonstração/i)).toBeVisible()
})

test('o aluno pode adotar a abertura no próprio repertório', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Jogar pelos dois lados/)

  await page.getByRole('button', { name: 'Adicionar ao meu repertório' }).click()
  await expect(page.getByRole('button', { name: 'Repertório ativo' })).toBeVisible()
})

test('os planos mostram a rota também em texto', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Planos e estruturas/)

  // Rota em TEXTO, e não só como seta no tabuleiro: informação que só existe
  // como desenho some para quem usa leitor de tela.
  await expect(page.getByText('Rota visual: d3 → d4')).toBeVisible()
  await expect(page.getByText('Ruptura d4')).toBeVisible()
})
