# Plugins oficiais complementares

Estas são capacidades genéricas úteis, mas propositalmente não duplicadas nas skills do LanceZero.

## security-guidance

```text
/plugin install security-guidance@claude-plugins-official
```

Uso:
- avisos durante edições;
- diff review;
- análise de vulnerabilidades;
- IDOR/auth bypass/XSS/SSRF/etc.

Ainda mantenha a skill `lancezero-security-review`, porque ela codifica as regras específicas de Clerk/Supabase/RLS e release gates do projeto.

## feature-dev

```text
/plugin install feature-dev@claude-plugins-official
```

Bom para features grandes e exploração arquitetural.

## frontend-design

```text
/plugin install frontend-design@claude-plugins-official
```

Combine com `lancezero-design-system`.
A skill do LanceZero define o que a marca permite; frontend-design melhora a execução.

## code-review

```text
/plugin install code-review@claude-plugins-official
```

Use em PRs não triviais.

## Playwright

```text
/plugin install playwright@claude-plugins-official
```

Plugin externo da Microsoft disponibilizado no marketplace oficial.

Útil para:
- E2E;
- screenshots;
- console/network;
- auth flows;
- regressões responsivas.

## Vercel

```text
/plugin install vercel@claude-plugins-official
```

Útil para:
- deploy;
- setup;
- logs.

A skill `lancezero-vercel-production` continua governando a política específica de environments, cache e segurança do projeto.

## Observação sobre excesso de plugins

Não instale pacotes enormes “porque talvez sejam úteis”.

Skills têm custo de roteamento/contexto. Prefira:
- poucas skills específicas;
- poucos plugins genéricos com função clara.
