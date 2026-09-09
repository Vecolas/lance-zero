# ADR-0008 — Contas com Clerk + Supabase e autorização no banco por RLS

- **Estado:** aceito
- **Data:** 2026-09-09
- **Altera:** ADR-0003 (MVP local-first) — não o revoga
- **Fonte:** `LanceZero_Plano_Seguranca_Cadastro_Perfil_Vercel.md`

## Contexto

O ADR-0003 decidiu que conta e sincronização eram Fase 12, e só depois de
validar o loop pedagógico com jogadores reais. O roadmap ainda tem as Fases 8 a
11 (finais, aberturas, diagnóstico, PWA) por fazer.

O produto decidiu antecipar a camada de conta e perfil, com um plano de
segurança próprio e detalhado.

## Divergência registrada

Antecipar contas contraria a ordem do roadmap e a condição do ADR-0003. Fica
registrado, com o custo assumido:

- o loop pedagógico ainda **não** foi validado com jogadores reais, então a
  camada de conta é construída sem saber se o produto que ela protege é o certo;
- Fases 8 a 11 continuam abertas e agora disputam prioridade;
- Clerk e Supabase são serviços externos com plano gratuito hoje. Preço e limite
  podem mudar, e isso passa a ser um risco operacional que antes não existia.

A decisão é do produto. Este ADR existe para que ninguém precise redescobrir o
motivo depois.

## O que NÃO muda

O princípio 9 do `CLAUDE.md` continua valendo integralmente, e o próprio plano
de segurança o reforça (seções 124 e 125):

- **o núcleo continua funcionando sem conta.** Treino, puzzles, revisão
  espaçada, importação de PGN e análise seguem em IndexedDB;
- **o Stockfish continua no navegador.** Menos custo, menos dado trafegado,
  melhor privacidade;
- **conta é opcional.** Quem não criar conta não perde nenhuma funcionalidade do
  núcleo.

Se em algum momento uma funcionalidade do núcleo passar a exigir conta, este ADR
foi violado.

## Decisão

Arquitetura em camadas, com autenticação e autorização separadas:

```text
Vercel → Next.js → Clerk (sessão) → Data Access Layer → Supabase → RLS
```

O ponto central é **defesa em profundidade**: o servidor nunca confia no
`userId` que vem do navegador. A identidade sai da sessão do Clerk; o Postgres
confere de novo, comparando `user_id` com `auth.jwt()->>'sub'` na policy de RLS.
Uma rota implementada errado não é suficiente para vazar dado de outro usuário.

Regras que passam a ser invioláveis:

1. **Nunca desabilitar RLS**, nem "temporariamente". Tabela nova com `user_id`
   sem RLS é release blocker.
2. **Nunca confiar em identificador vindo do frontend.**
3. **Não criar autenticação própria.** Sem senha, sem sessão caseira.
4. **A secret key do Supabase contorna RLS**: server-side apenas, marcada como
   Sensitive Environment Variable, nunca com prefixo `NEXT_PUBLIC_`.
5. **Não confiar apenas no proxy/middleware.** Autenticação e autorização são
   verificadas de novo na Server Action ou Route Handler, e outra vez no banco.
6. **Preview nunca aponta para o banco de produção.**
7. **Não usar `select('*')` para devolver linha ao navegador**: a saída passa por
   DTO explícito.

## Consequências

- Passa a existir código de servidor num projeto que era só cliente. A fronteira
  fica em `server-only`, para import de servidor no cliente falhar no build.
- O teste Alice/Bob de acesso cruzado vira **release blocker**: se um único dado
  privado atravessar entre contas, a release para.
- CSP entra em modo report-only primeiro. O Stockfish usa WebAssembly e Web
  Worker, então a política precisa de `worker-src 'self' blob:` e provavelmente
  `'wasm-unsafe-eval'` — sem nunca liberar `script-src *`.
- Surge dependência de disponibilidade externa. Em falha de autenticação o
  comportamento é **fail closed**: serviço de auth que não responde nega, nunca
  permite.
- Nada aqui promete que "os dados nunca vazam". O que a arquitetura garante é
  que um erro isolado não basta, que o dado sensível é minimizado, e que
  tentativa de acesso cruzado é testada automaticamente antes de cada release.
