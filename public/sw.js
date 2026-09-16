/*
  A VERSÃO DO CACHE SOBE JUNTO COM A LISTA.

  `/train` virou `/revisao` quando a aba deixou de ser um hub. Trocar a lista sem
  subir a versão seria a pior falha possível aqui: o worker instalado continuaria
  servindo a casca antiga do cache, o app pareceria inteiro, e a aba que o
  cabeçalho anuncia simplesmente não existiria — offline e sem nenhum erro.

  A versão é o único sinal que o worker tem de que a casca mudou.
*/
const SHELL_CACHE = 'lancezero-shell-v2'
const RUNTIME_CACHE = 'lancezero-runtime-v1'
const SHELL = [
  '/',
  '/dashboard',
  '/puzzles',
  '/revisao',
  '/calculate',
  '/endgames',
  '/openings',
  '/progress',
  '/lessons',
  '/games',
  '/onboarding',
  '/settings',
  '/licenses',
  '/offline.html',
  '/manifest.webmanifest',
  '/marca/lancezero-icon.png',
]

function mesmaOrigem(request) {
  return new URL(request.url).origin === self.location.origin
}

function podeGuardarAsset(request) {
  const url = new URL(request.url)
  return (
    url.pathname.startsWith('/_next/static/') ||
    ['script', 'style', 'image', 'font'].includes(request.destination)
  )
}

function ePayloadDoNext(request) {
  return request.headers.get('RSC') === '1' || new URL(request.url).searchParams.has('_rsc')
}

async function guardarResposta(request, resposta) {
  if (!resposta.ok) return resposta
  const cache = await caches.open(RUNTIME_CACHE)
  await cache.put(request, resposta.clone())
  return resposta
}

/**
 * Os assets que cada página do shell precisa para HIDRATAR.
 *
 * GUARDAR SÓ O HTML NÃO ENTREGA A PROMESSA. `SHELL` lista treze rotas e diz que
 * elas continuam utilizáveis sem rede; só que o HTML sozinho não roda. Sem a
 * rede, o documento de `/puzzles` era servido do cache, o Next pedia os chunks
 * dele, o pedido falhava e o aluno via a página de erro — depois de o app ter
 * prometido que aquela rota funcionava offline.
 *
 * O cache de execução (`podeGuardarAsset`) não resolve: ele só guarda o que já
 * foi buscado, então só a rota JÁ VISITADA funcionava. A promessa era das treze.
 *
 * Os endereços saem do próprio HTML recém-guardado. São imutáveis (o nome do
 * arquivo carrega o hash do conteúdo), então guardá-los na instalação é guardar
 * exatamente a versão que aquele HTML espera.
 *
 * FALHA DE UM NÃO DERRUBA A INSTALAÇÃO. `cache.addAll` é tudo-ou-nada: um único
 * endereço que não responda deixaria o worker sem instalar e o app sem offline
 * nenhum. Aqui cada um vai por conta própria, e o que falhar volta pelo cache de
 * execução na primeira visita com rede.
 */
async function guardarAssetsDoShell(cache) {
  const paginas = SHELL.filter((rota) => !rota.includes('.'))
  const enderecos = new Set()

  for (const rota of paginas) {
    const guardada = await cache.match(rota)
    if (!guardada) continue
    const html = await guardada.clone().text()
    for (const [, endereco] of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
      enderecos.add(endereco.replace(/&amp;/g, '&'))
    }
  }

  await Promise.all([...enderecos].map((endereco) => cache.add(endereco).catch(() => {})))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(async (cache) => {
        await cache.addAll(SHELL)
        await guardarAssetsDoShell(cache)
      })
      // Sem shell o app continua funcionando com rede; falhar a instalação aqui
      // só tiraria a chance de tentar de novo na próxima visita.
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      ),
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !mesmaOrigem(request)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resposta) => guardarResposta(request, resposta))
        .catch(async () => {
          const runtime = await caches.match(request)
          return runtime ?? (await caches.match('/')) ?? (await caches.match('/offline.html'))
        }),
    )
    return
  }

  if (!podeGuardarAsset(request) && !ePayloadDoNext(request)) return

  event.respondWith(
    caches.match(request).then((guardada) => {
      if (guardada) return guardada
      return fetch(request).then((resposta) => guardarResposta(request, resposta))
    }),
  )
})
