/**
 * Decide o idioma de cada requisição e reescreve para a árvore real.
 *
 * DUAS COISAS ACONTECEM AQUI, e é importante que sejam duas:
 *
 * 1. REESCRITA, NÃO REDIRECIONAMENTO. `/aberturas` continua `/aberturas` na barra
 *    do navegador e chega ao Next como `/pt-BR/aberturas`. As URLs de hoje estão
 *    em links, favoritos e no índice de busca — redirecioná-las para
 *    `/pt-BR/aberturas` quebraria todas de uma vez, por nada.
 *
 * 2. NOMES DE SEÇÃO EM INGLÊS VIRAM A ÁRVORE PORTUGUESA. As pastas em `src/app`
 *    continuam com os nomes de hoje (`aberturas`, `finais`), e um pedido
 *    `/en/openings/italiana` é reescrito para `/en/aberturas/italiana`. A
 *    alternativa seria duplicar vinte e seis rotas, uma cópia por idioma — e a
 *    segunda cópia começaria a divergir da primeira no primeiro conserto.
 *
 * O QUE NÃO SE FAZ AQUI: sobrepor o idioma que a URL já disse. Se a pessoa pediu
 * `/en/...`, ela recebe inglês mesmo com o cookie em português — e se pediu
 * `/aberturas`, recebe português mesmo com o navegador em inglês. URL é a
 * intenção mais forte que existe, e ignorá-la é o que faz link compartilhado
 * abrir no idioma de quem recebeu em vez do idioma de quem mandou.
 *
 * PRIMEIRA VISITA NÃO É REDIRECIONADA, e a preferência só decide na RAIZ, que é
 * o único endereço que não diz nada — nem seção, nem idioma. Mesmo lá é
 * reescrita, não redirecionamento: a barra do navegador continua mostrando o que
 * a pessoa digitou.
 */

import { NextResponse, type NextRequest } from 'next/server'
import {
  COOKIE_DO_LOCALE,
  DEFAULT_LOCALE,
  localeDoCaminho,
  normalizarLocale,
  type AppLocale,
} from '@/lib/i18n/locales'
import { caminhoInterno } from '@/lib/i18n/rotas'

/**
 * Extensões de arquivo servido: ícones, manifesto, service worker, engine WASM.
 *
 * A LISTA É EXPLÍCITA, e a versão anterior era "qualquer coisa com ponto no
 * fim". O problema é que id de habilidade TEM PONTO — `tactics.fork`,
 * `endgame.opposition`. `/pratica/tactics.fork` era lido como pedido de
 * arquivo, saía do caminho do proxy, chegava ao Next sem o segmento de idioma e
 * respondia 404. Vinte e duas rotas de prática de uma vez.
 *
 * Heurística que adivinha "isto parece um arquivo" erra quando o produto usa
 * ponto no identificador. Nomear as extensões que existem de verdade não erra.
 *
 * `html` ESTÁ NA LISTA porque `public/offline.html` é servido como arquivo. Ele
 * ficou de fora na primeira versão e o efeito foi o pior possível: o proxy
 * reescrevia `/offline.html` para `/pt-BR/offline.html`, que não existe, e a
 * página que o service worker mostra quando a rede cai virava um 404. O app
 * parecia inteiro até o aluno ficar sem conexão — exatamente quando a tela de
 * offline é a única coisa que importa. Nenhuma rota do app termina em `.html`.
 */
const EXTENSOES_DE_ARQUIVO =
  /\.(?:js|mjs|css|map|json|webmanifest|html|xml|txt|wasm|ico|png|jpg|jpeg|gif|svg|webp|avif|woff2?|ttf|otf)$/i

function ehArquivoEstatico(pathname: string): boolean {
  return EXTENSOES_DE_ARQUIVO.test(pathname)
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  /*
    Arquivo servido passa direto. O `sw.js` em especial PRECISA ser servido do
    escopo raiz para controlar o site inteiro; reescrevê-lo para dentro de um
    idioma quebraria o modo offline.
  */
  if (ehArquivoEstatico(pathname)) return NextResponse.next()

  /*
    A PRECEDÊNCIA, e cada linha dela custou um teste vermelho:

      1. idioma explícito na URL          — `/en/...`
      2. CAMINHO SEM PREFIXO É PORTUGUÊS  — `/aberturas` é uma URL portuguesa
      3. só na RAIZ, o cookie decide      — escolha explícita de quem já escolheu
      4. padrão: pt-BR

    O PASSO 2 parece óbvio e não era o que estava escrito. A primeira versão
    deixava a preferência decidir em QUALQUER caminho sem prefixo, e o efeito foi
    imediato: um navegador em inglês abria `/aberturas/italiana` e recebia a
    página em inglês. A URL existente, que está em links e favoritos, deixava de
    significar o que significava.

    `/aberturas` NÃO é um endereço neutro — é o endereço português. O inglês dele
    é `/en/openings`.

    O `ACCEPT-LANGUAGE` NÃO ENTRA, e é decisão, não esquecimento. O plano o lista
    como possível e diz que não é bloqueador (§48). Ele foi retirado por duas
    razões concretas:

    - o público deste produto é brasileiro, e navegador configurado em inglês é
      comum no Brasil. Mandar essa pessoa para a versão inglesa de um produto cujo
      CONTEÚDO está em português entrega uma experiência pior do que a que ela
      teria sem negociação nenhuma;
    - `pt-BR` é o padrão declarado. Deixar um cabeçalho que ninguém ajustou
      conscientemente sobrepor o padrão é trocar o idioma de quem não pediu.

    Quem quer inglês tem duas formas de dizer isso, e as duas são explícitas: o
    endereço `/en/...` e o seletor, que grava o cookie.
  */
  const daUrl = localeDoCaminho(pathname)
  const doCookie = pathname === '/' ? request.cookies.get(COOKIE_DO_LOCALE)?.value : undefined

  const locale: AppLocale =
    daUrl ?? (doCookie ? normalizarLocale(doCookie) : null) ?? DEFAULT_LOCALE

  const destino = request.nextUrl.clone()
  destino.pathname = caminhoInterno(pathname, locale)

  // Nada a fazer quando o caminho já é o interno — evita reescrever em círculo.
  if (destino.pathname === pathname) return NextResponse.next()

  destino.search = search
  return NextResponse.rewrite(destino)
}

export const config = {
  /*
    O matcher tira do caminho só o que ele consegue expressar com segurança:

    - `_next` — artefatos do próprio framework;
    - `api`   — contrato de dados, não tem idioma na URL.

    OS ARQUIVOS ESTÁTICOS SÃO FILTRADOS NO CÓDIGO, em `ehArquivoEstatico`, e não
    aqui. A razão é que o matcher do Next não é uma expressão regular comum: ele
    passa por `path-to-regexp`, e uma alternância com grupo não-capturante
    (`(?:js|css|…)`) não se comporta como se espera — o manifesto e o service
    worker deixaram de ser servidos, e o modo offline caiu junto.

    Manter a decisão em JavaScript custa uma passagem do proxy por requisição de
    arquivo e me dá uma expressão que eu consigo ler e testar.
  */
  matcher: ['/((?!_next|api).*)'],
}
