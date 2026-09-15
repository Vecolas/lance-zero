---
name: lancezero-security-review
description: Use for any LanceZero task involving authentication, authorization, user-owned data, API routes, Server Actions, uploads, cookies, cache, redirects, external fetches, secrets, admin behavior, webhooks, logs, security headers, dependencies, or security review. Also trigger when asked to check bypasses, data leaks, IDOR/BOLA, XSS, CSRF, SSRF, SQL injection, session issues, or production hardening.
version: 1.0.0
---

# LanceZero Security Review

## Security posture

Assume all browser-controlled values are attacker-controlled.

Security is defense in depth:

```text
Vercel edge
→ verified session
→ server-side authorization
→ strict validation
→ narrow DAL
→ Supabase token validation
→ PostgreSQL RLS
→ minimal response
```

A UI guard is never authorization.

## Mandatory checks for a mutation

Every mutation must:

1. authenticate from verified session;
2. validate runtime input with strict schema;
3. derive ownership server-side;
4. authorize the operation;
5. execute with least privilege;
6. return a minimal DTO;
7. avoid leaking secrets/PII through logs or errors.

## Cross-user access

IDOR/BOLA is a release blocker.

Never trust:
- `userId` in body;
- `ownerId`;
- `role`;
- hidden form fields;
- query params that assert ownership.

Derive current user from auth, then let RLS validate row ownership again.

## Next.js boundary rule

Do not rely only on `proxy.ts`/middleware for authorization. Recent Next.js security releases have included proxy/middleware bypass classes.

Authenticate and authorize close to the data mutation/read.

## Secrets

Never place server secrets under `NEXT_PUBLIC_`.

Critical:
- Clerk secret;
- Supabase secret/service credentials;
- webhook signing secret;
- database direct credentials.

Use server-only modules and Vercel Sensitive Environment Variables.

## XSS

- never render user-controlled raw HTML;
- sanitize Markdown if added;
- do not accept user SVG avatars;
- prefer JPEG/PNG/WebP re-encoding;
- keep CSP restrictive.

## SSRF

Do not implement arbitrary URL fetchers.

If remote fetching is required:
- allowlist hosts;
- HTTPS only;
- block private/loopback/link-local targets;
- validate redirects;
- cap response size/time.

## Cache

Never place authenticated/private user data in shared public caches.

Review:
- Server Components;
- route cache;
- CDN headers;
- `use cache`;
- revalidation tags.

If uncertain, prefer no shared cache for private data.

## Logging

Never log:
- cookies;
- Authorization header;
- full JWT;
- password;
- refresh/session tokens;
- secret keys.

Use request IDs and pseudonymous actor IDs where useful.

## Release gate

For every user-owned feature, test Alice/Bob isolation through:
- UI;
- direct route;
- Server Action;
- Data API;
- Storage;
- cache.

Any private cross-user read/write blocks release.

## When not to use

Do not trigger only for static marketing copy or isolated non-security styling.

For concrete Clerk/Supabase schema/RLS implementation, also use `lancezero-auth-data`.
