---
name: lancezero-vercel-production
description: Use when configuring or debugging LanceZero deployment on Vercel, Next.js production behavior, Preview/Production environments, environment variables, cache, headers, CDN, security headers, WASM/Worker assets, logs, observability, domains, deployment protection, or production incidents.
version: 1.0.0
---

# LanceZero Vercel Production

## Environment isolation

Keep:

```text
Development
Preview
Production
```

separate.

Preview must not use:
- production Supabase project;
- production Clerk instance;
- production secrets.

Protect Preview deployments when they contain non-public work.

## Secrets

Use Vercel environment scope and Sensitive variables for server secrets.

Never infer safety from the variable name alone.
Verify no server secret is referenced from Client Components.

## Next.js security

Keep Next.js and React security patches current.

Do not use Proxy/middleware as the only authorization layer.

## Cache

Classify data before caching:

### Public/static
Brand assets, versioned Stockfish assets, public docs.

### User-private
Profile settings, progress, account/security state.

Private data must not be shared across users at CDN/framework cache level.

When uncertain, prefer dynamic/no-store until isolation is proven.

## Stockfish assets

Serve versioned static JS/WASM efficiently.
Load lazily.
Verify content type and Worker path.

MVP single-thread avoids global cross-origin isolation requirements.

If multi-thread is added, evaluate COOP/COEP impacts before rollout.

## Headers

Maintain:
- CSP;
- nosniff;
- Referrer-Policy;
- frame protections;
- Permissions-Policy;
- HSTS after domain readiness.

Roll CSP through Report-Only before enforcing when introducing it to an existing app.

## Deployment

Before production:
1. tests green;
2. security gates green;
3. migrations reviewed;
4. env scopes checked;
5. Preview behavior verified;
6. rollback plan known.

## Observability

Monitor at minimum:
- 5xx;
- auth failures;
- 403/429 trends;
- DB failures;
- webhook failures;
- deployment regressions.

Do not put secrets/PII in logs.

## When not to use

Do not use for purely local React component implementation.
Use `lancezero-security-review` for threat analysis and `lancezero-stockfish-browser` for engine internals.
