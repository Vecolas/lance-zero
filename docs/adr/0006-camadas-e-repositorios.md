# ADR-0006 — Domínio puro, persistência e serviços atrás de interfaces

- **Estado:** aceito
- **Data:** 2026-09-09

## Contexto

A parte valiosa do LanceZero é lógica: modelo de habilidades, planner,
classificador de severidade, detectores de motivo, agendamento FSRS. Essa lógica
precisa ser testável sem DOM, sem IndexedDB e sem rede. Se nascer dentro de
componentes React ou chamando `indexedDB` diretamente, fica impossível de
verificar e cara de evoluir.

## Decisão

- `src/domain/**` é TypeScript puro e não importa componente nem hook de React.
  Componentes podem chamar serviços de domínio; o contrário nunca.
- A persistência fica atrás de `TrainingRepository`. Páginas e componentes não
  falam com IndexedDB.
- Serviços externos ficam atrás de adapters: `OpeningExplorerProvider`,
  `TablebaseProvider`, `GameImportProvider`. Nenhuma URL de terceiro espalhada
  por componentes.
- O planner é puro e determinístico: `buildDailyPlan(context, seed)` devolve o
  mesmo plano para as mesmas entradas, para poder ser testado.

## Consequências

- Mais arquivos e mais indireção no começo.
- Testes de domínio rodam em milissegundos, sem jsdom.
- Trocar IndexedDB por outra persistência, ou acrescentar sync na Fase 12, não
  toca a UI.
