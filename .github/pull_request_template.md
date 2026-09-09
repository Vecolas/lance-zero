## O que muda

## Fase do roadmap

## Como verificar

## Checklist

> Ver `docs/CONVENCOES.md`. Verde local ANTES de abrir o PR — o CI é rede de
> segurança, não a primeira verificação.

- [ ] não foi feito commit direto na `main`
- [ ] `pnpm check` passa
- [ ] `pnpm test:e2e` passa
- [ ] `pnpm test:e2e:prod` e `pnpm security:check`, se mexeu em CSP, headers, engine ou build
- [ ] dívida descoberta no caminho virou issue
- [ ] estados de carregamento, erro e vazio
- [ ] mobile (360px) e zoom 200%
- [ ] foco de teclado e foco visível
- [ ] status não depende só de cor
- [ ] dependência nova documentada em `docs/LICENSES.md` e em `/licenses`
- [ ] docs/ADR atualizados se necessário
