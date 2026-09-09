# ADR-0002 — Stack inicial: Next.js, TypeScript, pnpm, CSS Modules

- **Estado:** aceito
- **Data:** 2026-09-09

## Contexto

O núcleo do produto precisa rodar no navegador do usuário (engine WASM,
persistência local) e não pode depender de backend nem de serviço pago. Ao mesmo
tempo, o app tem muitas telas, precisa de rotas reais e de bom desempenho de
carregamento: a landing não pode arrastar a engine junto.

## Decisão

- **Next.js 16 + React 19 + TypeScript**, App Router, pasta `src/`, alias `@/*`.
- **pnpm** como gerenciador, com lockfile versionado.
- **CSS Modules + custom properties**, sem framework de CSS e sem UI kit.
- **Vitest + Testing Library** para unidade e componente. Playwright entra na Fase 1.
- Sem biblioteca de estado global, sem ORM, sem analytics no MVP.

Os tokens de cor vivem em dois lugares espelhados: `src/app/tokens.css` para
consumo e `src/lib/design/tokens.ts` para lógica e testes. Um teste falha se os
dois divergirem.

## Alternativas consideradas

- **Vite + React Router**: mais leve, mas perde roteamento por arquivo, metadata
  e otimização de fonte prontos.
- **Tailwind**: rápido, mas empurra decisão visual para o markup e enfraquece o
  sistema de tokens que a marca exige.
- **TypeScript 7 (compilador nativo)**: já publicado como estável, mas sem
  garantia de paridade com o ecossistema ESLint/Next nesta versão. Reavaliar na
  Fase 2.

## Consequências

- Escrever CSS à mão custa mais no começo e paga em consistência de tokens.
- O Next é usado essencialmente como gerador estático: todas as rotas da Fase 0
  são pré-renderizadas.
- Nada impede um backend depois (Fase 12), mas ele não é premissa de nada.
