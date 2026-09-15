const SHELL_CACHE = 'lancezero-shell-v1'
const RUNTIME_CACHE = 'lancezero-runtime-v1'
const SHELL = [
  '/',
  '/dashboard',
  '/puzzles',
  '/train',
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

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)))
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
