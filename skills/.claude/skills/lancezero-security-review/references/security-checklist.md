# Security Checklist

## Auth/AuthZ
- session verified server-side
- ownership derived from session
- RLS enabled on user-owned tables
- privileged operations require stronger verification
- no role assertion from client

## Input
- Zod `.strict()` or equivalent
- length/range limits
- enum/allowlist for dynamic fields
- upload type + magic bytes + size

## Output
- public/private DTOs separate
- no `select('*')` into Client Components
- no email/internal IDs in public profile

## Browser
- CSP
- no user SVG
- no raw HTML
- safe redirect allowlist
- same-origin API unless intentionally public

## Infrastructure
- Preview not connected to production DB/auth
- production secrets environment-scoped
- security patches applied quickly
- dependency + secret scans enabled

## Incident readiness
- session revoke
- secret rotation
- feature kill switch
- rollback
- audit trail
