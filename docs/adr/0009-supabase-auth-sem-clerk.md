# ADR-0009 — Supabase Auth no lugar do Clerk, e sincronização como documento único

- **Estado:** aceito
- **Data:** 2026-09-09
- **Substitui:** a escolha de autenticação do ADR-0008. O restante do ADR-0008 continua valendo.

## Contexto

O ADR-0008 adotou Clerk + Supabase + RLS, seguindo a alternativa A da seção 4 do plano de
segurança. Depois disso ficou claro que **não há capital para investir**, e o levantamento
de custo mostrou onde o dinheiro apareceria:

| Item              | Onde      | Custo                    |
| ----------------- | --------- | ------------------------ |
| MFA               | seção 48  | Clerk Pro, US$ 25/mês    |
| Backup automático | seção 116 | Supabase Pro, US$ 25/mês |

O requisito passou a ser explícito: sincronizar progresso entre aparelhos, para poucos
usuários, **totalmente de graça**.

## Decisão

Adotar a **alternativa B da seção 4 do próprio plano** — Supabase Auth + Supabase Database
— que o documento já classificava como "boa alternativa se custo/simplicidade forem mais
importantes". O Clerk sai.

Nada precisou ser desinstalado: o Clerk nunca chegou a entrar no `package.json`.

### Consequências para a autorização

As policies deixam de usar a ponte do Clerk e passam a usar o mecanismo nativo:

```sql
-- antes (Clerk):  user_id text,  user_id = (select auth.jwt()->>'sub')
-- agora (Supabase Auth): user_id uuid references auth.users(id),
--                        user_id = (select auth.uid())
```

Isso é mais simples, não menos seguro: a identidade continua vindo do token verificado, e
o Postgres continua sendo a segunda barreira. **Defesa em profundidade não foi abandonada.**

### MFA

Sai do escopo, com justificativa e não como corte cego. Com **login social**, o segundo
fator é do provedor de identidade: quem entra com Google já passou pelo 2FA do Google,
pela detecção de login suspeito e pela verificação de dispositivo deles.

Ganho colateral: **sem senha no sistema, credential stuffing e brute force de senha
deixam de existir** — as seções 46 e 47 perdem boa parte do objeto. Menos superfície de
ataque, não apenas menos custo.

### Backup

O plano gratuito não tem backup automático, e a seção 116 exige backup. A operação passa
a ser nossa: `pg_dump` semanal por GitHub Actions, **cifrado**, guardado como artefato e
nunca commitado. Failure domain diferente do Supabase, custo zero. O runbook de restauração
fica em `docs/OPERACAO.md` — backup que ninguém sabe restaurar não é backup.

## Sincronização: um documento por usuário

O servidor guarda **uma linha por usuário** com o estado inteiro em `jsonb`, em vez de
tabelas normalizadas por entidade.

Por quê:

1. **O trabalho já está feito.** `exportBackup`/`importBackup` já serializam todo o
   progresso e já têm teste de round-trip provando que IDs e estado do FSRS sobrevivem.
2. **Menos superfície de ataque.** Uma tabela, uma policy, uma linha por dono. A
   possibilidade de IDOR encolhe para quase nada, e o teste Alice/Bob fica trivial de
   escrever — e continua sendo release blocker.
3. **O núcleo continua local-first.** O servidor é cópia, nunca fonte da verdade. Sem
   rede, sem conta ou com o Supabase fora do ar, o app funciona inteiro.

### O custo dessa escolha, declarado

**Última escrita vence.** Não há merge fino por coleção. Quem treinar em dois aparelhos
sem sincronizar entre as sessões pode perder a sessão mais antiga.

Isso é decisão consciente, não descuido. Merge por coleção estava disponível e foi
recusado por complexidade. A UI precisa avisar quando a cópia remota é mais nova que a
local, em vez de sobrescrever em silêncio — se ela não avisar, esta decisão vira um bug.

## Consequências

- Um fornecedor a menos.
- Custo de US$ 0 por tempo indeterminado, para a escala de poucos usuários.
- Duas limitações do plano gratuito viram trabalho de operação: pausa por inatividade
  (contornada por cron) e ausência de backup (contornada por `pg_dump` cifrado).
- Se um dia houver capital, migrar para Supabase Pro resolve backup e pausa sem tocar em
  uma linha de código de aplicação.
- Tudo o que já foi construído sobrevive: CSP, headers, Data Access Layer, DTOs, Zod
  `.strict()`, `check-rls.mjs`, hardening do PGN. Nada disso era específico do Clerk.
