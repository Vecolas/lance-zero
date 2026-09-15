---
name: lancezero-auth-data
description: Use when implementing or modifying LanceZero signup, sign-in, onboarding, profile, sessions, Clerk, Supabase, PostgreSQL schema, Row Level Security, avatar Storage, account deletion/export, webhooks, synced user data, or user privacy settings.
version: 1.0.0
---

# LanceZero Auth + Data

## Approved architecture

Use:

```text
Clerk
→ session token
→ Supabase third-party auth
→ PostgreSQL RLS
```

Do not build password/session infrastructure manually.

## Identity

Use Clerk `sub`/user ID as the external authenticated identity.

Do not use:
- email as ownership key;
- username as ownership key;
- client-provided user ID as authority.

## Data split

Prefer keeping authentication data in Clerk:
- email;
- password;
- verification;
- MFA;
- session;
- recovery.

Keep product data in Supabase:
- profile;
- preferences;
- progress;
- synchronized training data;
- consent records;
- account lifecycle records.

Minimize duplication.

## RLS

Every user-owned table must:
- enable RLS;
- have explicit read/write policies;
- compare row ownership against verified token identity;
- be covered by Alice/Bob tests.

Do not create a user-owned table and “add RLS later”.

## Supabase clients

Maintain two clear classes of client:

### User-context client
Uses public/publishable configuration + authenticated token.
Must respect RLS.

### Admin client
Uses secret/service privileges.
Must be `server-only`, narrowly scoped, and never imported into Client Components.

Prefer user-context operations whenever possible.

## Profile API

Create separate public/private DTOs.

Public profile must not expose:
- email;
- auth provider internals;
- Clerk user ID unless truly needed;
- security/audit metadata.

## Avatar

Accept only safe raster formats.
Generate server-controlled path such as:

```text
<user-id>/<uuid>.webp
```

Apply Storage ownership policies.

## Lifecycle

Sensitive actions:
- email/security change;
- data export;
- account deletion.

Require reverification/step-up when supported.

Account deletion across Clerk + Supabase must be retryable and track partial failure.

## Webhooks

Verify signatures.
Make processing idempotent.
Do not trust webhook JSON without cryptographic verification.

## When not to use

Do not use for anonymous local-only IndexedDB work unless it is being connected to account sync.
For broader threats and HTTP/browser security, pair with `lancezero-security-review`.
