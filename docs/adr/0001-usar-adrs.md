# ADR-0001 — Usar ADRs para decisões arquiteturais

- **Estado:** aceito
- **Data:** 2026-09-09

## Contexto

O LanceZero é construído em fases longas, com decisões que se pagam ou se cobram
muito depois: licença da engine, formato dos dados persistidos, fronteira entre
domínio e UI. Sem registro, a próxima sessão de trabalho reabre discussões já
resolvidas ou, pior, contradiz silenciosamente uma decisão anterior.

## Decisão

Registrar decisões arquiteturais como ADRs numerados em `docs/adr/`, no formato
contexto → decisão → consequências. Em caso de conflito entre implementação e
documentação, **o ADR mais recente e explícito vence**: a feature afetada para e
a divergência é documentada.

## Consequências

- Cada mudança de arquitetura carrega o custo de escrever um ADR curto.
- `CLAUDE.md` e `docs/PRODUCT.md` continuam sendo a visão geral; o ADR guarda o
  porquê de cada escolha pontual.
- ADRs não são reescritos: são substituídos por outro ADR.
