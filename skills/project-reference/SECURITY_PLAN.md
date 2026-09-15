# LanceZero — Plano Completo de Segurança para Cadastro, Perfil e Dados de Usuário na Vercel

## Objetivo

Este documento define a arquitetura, requisitos, ameaças, controles, testes e etapas de implementação do sistema de cadastro e perfil do LanceZero hospedado na Vercel.

A prioridade máxima é:

- impedir acesso cruzado entre usuários;
- reduzir risco de vazamento de dados;
- impedir bypass de autenticação/autorização;
- proteger sessões e credenciais;
- limitar impacto de bugs;
- impedir exposição acidental de secrets;
- criar mecanismos de detecção e resposta;
- atender aos princípios de segurança e privacidade da LGPD.

Nenhuma aplicação conectada à internet pode honestamente garantir risco zero. O objetivo deve ser **defesa em profundidade**, de modo que uma falha isolada não permita acesso a dados de outra pessoa.

---

# 1. Conclusão de viabilidade

A implementação é **altamente viável** na Vercel.

Arquitetura recomendada:

```text
Browser
   │
   ▼
Vercel Edge Network
   │
   ├── TLS/HTTPS
   ├── DDoS mitigation
   ├── WAF
   ├── Rate limiting
   └── Abuse protection
   │
   ▼
Next.js 16.x
   │
   ├── Proxy (camada auxiliar)
   ├── Server Components
   ├── Server Actions
   ├── Route Handlers
   └── Data Access Layer
   │
   ├───────────────┐
   ▼               ▼
Clerk           Supabase
Auth/Session    PostgreSQL
   │               │
   └── JWT ───────►├── RLS
                   ├── Constraints
                   ├── Storage RLS
                   └── Audit data
```

## Stack recomendada

- Hosting: **Vercel**
- Framework: **Next.js 16.x estável**
- Language: **TypeScript**
- Authentication: **Clerk**
- Database: **Supabase PostgreSQL**
- Authorization: **Postgres Row Level Security**
- Avatar storage: **Supabase Storage**
- Runtime validation: **Zod**
- Edge protection: **Vercel WAF**
- Dependency security: Dependabot/Renovate + npm audit + OSV
- Secret scanning: GitHub Secret Scanning + Gitleaks
- E2E security: Playwright
- Dynamic security scan: OWASP ZAP em Preview

---

# 2. Por que Clerk + Supabase

A arquitetura separa responsabilidades.

## Clerk

Responsável por:

- cadastro;
- login;
- senha;
- email verification;
- sessões;
- proteção contra brute force;
- bot protection;
- recuperação de conta;
- OAuth;
- MFA quando habilitado;
- step-up/reverification;
- revogação de sessões.

## Supabase

Responsável por:

- perfil LanceZero;
- preferências;
- progresso;
- dados de treino;
- Storage;
- integridade do banco;
- autorização por linha via RLS.

## Vantagem fundamental

A autorização ocorre em mais de um nível:

```text
Browser
  ↓
Servidor verifica identidade
  ↓
Servidor verifica permissão
  ↓
Supabase verifica token
  ↓
PostgreSQL verifica RLS
```

Se uma rota for implementada incorretamente, a RLS continua podendo impedir acesso a dados de outro usuário.

---

# 3. Por que não criar autenticação própria

Não criar manualmente:

```text
users.password
password_hash
session_token
reset_token
refresh_token
```

Um sistema próprio exige resolver corretamente:

- Argon2/bcrypt;
- salt;
- reset de senha;
- expiration;
- replay;
- session fixation;
- refresh rotation;
- OAuth;
- CSRF;
- open redirect;
- MFA;
- recovery;
- brute force;
- credential stuffing;
- email enumeration;
- bot protection;
- breached passwords.

Para o LanceZero isso aumenta risco e manutenção sem benefício suficiente.

---

# 4. Alternativas avaliadas

## A. Clerk + Supabase + RLS

Segurança: **Muito alta**

Complexidade: média

Recomendação: **Principal**

---

## B. Supabase Auth + Supabase Database

Segurança: alta

Complexidade: baixa

Vantagem:
- uma plataforma;
- integração natural com RLS.

Desvantagem:
- gerenciamento SSR de tokens/cookies exige cuidado adicional;
- maior atenção a XSS e cache de sessão.

Boa alternativa se custo/simplicidade forem mais importantes.

---

## C. Clerk + PostgreSQL sem RLS

Segurança: alta se implementado perfeitamente.

Problema:

Toda consulta precisa lembrar:

```ts
where user_id = currentUser
```

Uma rota esquecida pode gerar IDOR.

Por isso o LanceZero deve preferir RLS.

---

# 5. Princípio de confiança

Considere todo dado vindo do browser como hostil.

Não confiar em:

```text
userId
ownerId
role
isAdmin
emailVerified
permissions
createdAt
plan
ratingVerified
```

enviados pelo cliente.

A fonte de identidade é sempre a sessão verificada.

---

# 6. Identificador de usuário

Usar o `sub` do Clerk.

Exemplo:

```text
user_2qA...
```

Não usar como chave de segurança:

- email;
- username;
- ID sequencial.

---

# 7. Minimização de dados

Não coletar sem necessidade:

- CPF;
- endereço;
- telefone;
- nome civil;
- documento;
- data de nascimento completa;
- localização precisa.

Quanto menos dados pessoais o LanceZero possuir, menor o impacto de uma eventual violação.

---

# 8. Dados mantidos no Clerk

Preferencialmente manter apenas no provedor de identidade:

- email;
- email verified;
- senha;
- fatores MFA;
- sessões;
- passkeys;
- OAuth identities;
- recovery data.

Não duplicar email no banco LanceZero sem necessidade.

---

# 9. Tabela profiles

Sugestão:

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  username text unique,
  display_name text,
  avatar_path text,
  rating_estimate integer,
  rating_source text,
  profile_visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

# 10. Constraints

```sql
alter table profiles
add constraint profile_rating_range
check (
  rating_estimate is null
  or rating_estimate between 100 and 4000
);
```

Username recomendado:

```text
3–24 caracteres
A-Z / a-z
0-9
_
-
```

Reservar:

```text
admin
administrator
support
staff
moderator
lancezero
security
api
```

---

# 11. user_settings

Tabela privada:

```text
user_id
language
theme
board_theme
piece_theme
timezone
training_reminders
analytics_opt_in
```

---

# 12. linked_chess_accounts

Para futuro:

```text
provider
provider_username
provider_user_id
verified
connected_at
```

Nunca solicitar senha do Chess.com/Lichess.

Preferir:

- API pública;
- OAuth oficial;
- username público.

---

# 13. Dados proibidos no banco de perfil

Nunca armazenar em profiles:

```text
password
password_hash
session
refresh token
Clerk JWT completo
MFA secret
Supabase secret
Clerk secret
OAuth password
```

---

# 14. RLS obrigatória

Toda tabela que possua dados privados de usuário deve ter:

```sql
alter table profiles enable row level security;
```

Tabela nova contendo `user_id` sem RLS é **release blocker**.

---

# 15. RLS — SELECT

Com integração Clerk:

```sql
create policy "users_select_own_profile"
on profiles
for select
to authenticated
using (
  user_id = (select auth.jwt()->>'sub')
);
```

---

# 16. RLS — INSERT

```sql
create policy "users_insert_own_profile"
on profiles
for insert
to authenticated
with check (
  user_id = (select auth.jwt()->>'sub')
);
```

---

# 17. RLS — UPDATE

```sql
create policy "users_update_own_profile"
on profiles
for update
to authenticated
using (
  user_id = (select auth.jwt()->>'sub')
)
with check (
  user_id = (select auth.jwt()->>'sub')
);
```

---

# 18. DELETE

Não liberar delete de conta diretamente via cliente.

A exclusão deve passar por operação sensível no servidor.

---

# 19. Grants

RLS não substitui grants.

Princípio:

```text
anon:
somente dados realmente públicos

authenticated:
somente SELECT/INSERT/UPDATE necessários

secret/service role:
backend administrativo somente
```

---

# 20. Supabase Secret Key

A secret/service key pode contornar RLS.

Ela é um dos segredos mais críticos do projeto.

Regras:

```text
- server-side only
- Vercel Sensitive Env
- nunca NEXT_PUBLIC_
- nunca browser
- nunca log
- nunca Git
```

---

# 21. Separação de clientes

Criar:

```text
lib/supabase/user.ts
lib/supabase/admin.ts
```

`user.ts`:

```text
publishable key + Clerk JWT
```

respeita RLS.

`admin.ts`:

```text
Supabase secret
```

somente operações administrativas.

---

# 22. server-only

Arquivos com secrets:

```ts
import 'server-only'
```

Aplicar a:

```text
admin client
database admin helpers
audit helpers
security helpers
```

---

# 23. Data Access Layer

Estrutura:

```text
src/data/profile.ts
src/data/settings.ts
src/data/progress.ts
```

Server Components não devem consultar tabelas privadas de forma espalhada.

Usar funções específicas:

```text
getOwnProfile()
getPublicProfile()
updateOwnProfile()
```

---

# 24. DTOs

Nunca enviar a row inteira para Client Components.

Errado:

```ts
return profile
```

Correto:

```ts
return {
  username: profile.username,
  displayName: profile.display_name,
  avatarUrl: profile.avatar_path,
  ratingEstimate: profile.rating_estimate
}
```

---

# 25. Perfil público

Criar DTO específico:

```ts
type PublicProfile = {
  username: string
  displayName: string | null
  avatarUrl: string | null
  ratingEstimate: number | null
}
```

Não retornar:

```text
user_id
email
IP
internal flags
security data
moderation metadata
```

---

# 26. Server Actions

Toda Server Action deve ser tratada como endpoint público.

Estrutura:

```ts
'use server'

export async function updateProfile(input: unknown) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const parsed = UpdateProfileSchema.safeParse(input)

  if (!parsed.success) {
    throw new Error('Invalid input')
  }

  // update utilizando contexto autenticado
}
```

---

# 27. Nunca confiar em userId enviado pelo browser

Errado:

```ts
const userId = formData.get('userId')
```

Correto:

```ts
const { userId } = await auth()
```

---

# 28. IDOR / BOLA

Exemplo de ataque:

```http
PATCH /api/profile/user_A
```

Atacante troca para:

```text
user_B
```

Proteções:

```text
1. servidor ignora ownerId vindo do browser
2. identidade vem da sessão
3. RLS confere JWT.sub
```

---

# 29. Teste obrigatório Alice/Bob

Criar duas contas:

```text
Alice
Bob
```

Alice deve tentar:

- consultar Bob;
- editar Bob;
- excluir Bob;
- acessar settings Bob;
- acessar progresso Bob;
- acessar storage privado Bob;
- enviar user_id Bob em ações.

Todos os testes devem falhar.

Isso deve fazer parte do CI.

---

# 30. Proxy / Middleware

O `proxy.ts` pode:

- redirecionar usuário não autenticado;
- adicionar headers;
- reduzir chamadas desnecessárias.

Mas **não pode ser a única autorização**.

Cada Server Action, Route Handler e DAL verifica novamente.

---

# 31. Por que não confiar apenas no Proxy

Next.js recebeu vulnerabilidades em 2026 relacionadas a bypass de middleware/proxy.

Por isso:

```text
Proxy = defesa auxiliar

Servidor + RLS = fronteira real
```

---

# 32. Versão do Next.js

Não usar:

```text
canary
RC
beta
```

em produção.

Em setembro de 2026 a documentação lista Next.js **16.3.4** como versão atual.

A atualização de segurança de agosto de 2026 exigiu pelo menos 16.3.3 no ramo 16.3.

Regra:

```text
production = latest stable Active LTS patch
```

---

# 33. Política de atualização

Vulnerabilidade crítica:

```text
não espera sprint
não espera próxima feature
```

Executar:

```text
patch
test
deploy
```

imediatamente.

---

# 34. Dependências

Automatizar PRs para:

```text
next
react
@clerk/*
@supabase/*
zod
```

Usar Dependabot ou Renovate.

---

# 35. Supply chain

CI:

```bash
npm ci
npm audit
npx osv-scanner .
```

Adicionar Gitleaks.

Lockfile deve ser commitado.

---

# 36. Secret scanning

Bloquear commit/CI contendo:

```text
CLERK_SECRET_KEY
SUPABASE_SECRET_KEY
DATABASE_URL
WEBHOOK_SECRET
private keys
```

Ferramentas:

- GitHub Secret Scanning;
- Gitleaks;
- TruffleHog opcional.

---

# 37. Ambientes Vercel

Separar:

```text
Development
Preview
Production
```

---

# 38. Produção nunca em Preview

Usar:

```text
Production:
Clerk PROD
Supabase PROD

Preview:
Clerk DEV
Supabase STAGING
```

Uma PR nunca deve receber secrets ou banco real de produção.

---

# 39. Vercel Deployment Protection

Ativar proteção dos Preview Deployments:

```text
Settings
→ Deployment Protection
→ Vercel Authentication
```

Preview público aumenta risco de exposição de funcionalidades não finalizadas.

---

# 40. Environment Variables

Segredos:

```text
CLERK_SECRET_KEY
SUPABASE_SECRET_KEY
CLERK_WEBHOOK_SECRET
CRON_SECRET
```

devem ser Vercel **Sensitive Environment Variables**.

---

# 41. NEXT_PUBLIC_

Somente valores realmente públicos:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Nunca:

```text
NEXT_PUBLIC_CLERK_SECRET_KEY
NEXT_PUBLIC_SUPABASE_SECRET_KEY
```

---

# 42. Segurança das contas administrativas

Ativar MFA/passkeys em:

- Vercel;
- GitHub;
- Clerk Dashboard;
- Supabase Dashboard;
- registrador do domínio.

Aplicar least privilege.

---

# 43. GitHub

Configurar:

```text
branch protection
PR review
required checks
no force push main
secret scanning
2FA
```

---

# 44. Fluxo de cadastro

```text
Criar conta
   ↓
Clerk
   ↓
Email verification
   ↓
Sessão
   ↓
Onboarding
   ↓
Server Action
   ↓
RLS
   ↓
profiles
   ↓
Dashboard
```

---

# 45. Email verification

Exigir antes de recursos como:

- perfil público;
- conexões externas;
- exportação;
- ações sociais futuras.

---

# 46. Bot protection

Ativar proteção de bots do Clerk.

Vercel WAF protege APIs da aplicação.

---

# 47. Brute force e credential stuffing

Defesa:

```text
Clerk protections
+
bot protection
+
WAF
+
rate limiting
+
MFA
+
session/device controls
```

---

# 48. MFA

Usuário comum:

```text
opcional/recomendado
```

Admin/moderação:

```text
obrigatório
```

---

# 49. Step-up authentication

Exigir revalidação recente antes de:

- mudar email;
- mudar senha;
- mudar MFA;
- excluir conta;
- exportar dados;
- ação admin.

---

# 50. Session policy

Sugestão inicial:

```text
idle timeout: ~7 dias
max session: ~30 dias
```

Ajustar após UX.

Admins devem ter políticas mais curtas.

---

# 51. Revogação

Tela:

```text
/settings/security
```

Oferecer:

- sair;
- revogar outras sessões;
- segurança da conta;
- MFA;
- atividades quando suportado.

---

# 52. XSS

XSS deve ser considerado vulnerabilidade crítica.

Nunca usar conteúdo de usuário com:

```tsx
dangerouslySetInnerHTML
```

sem sanitização rigorosa.

---

# 53. Username e display name

Renderizar como texto.

Username:

- charset restrito;
- limite;
- nenhum HTML.

Display name:
- Unicode permitido;
- limite pequeno;
- escapar normalmente.

---

# 54. Markdown futuro

Se permitir:

```text
bio
comentário
estudo compartilhado
```

usar Markdown sanitizado com allowlist.

Não aceitar HTML arbitrário.

---

# 55. Avatar

Aceitar somente:

```text
JPEG
PNG
WEBP
```

Não aceitar SVG de usuário.

---

# 56. Validação de avatar

Verificar:

- MIME;
- magic bytes;
- extensão;
- tamanho;
- dimensões.

Sugestão:

```text
máximo 2 MB
máximo 2048x2048
```

---

# 57. Reencode

Fluxo ideal:

```text
decode
→ resize se necessário
→ reencode
→ strip EXIF
→ storage
```

---

# 58. Nome de arquivo

Nunca confiar no filename original.

Usar:

```text
/<user_id>/<randomUUID>.webp
```

---

# 59. Storage RLS

Usuário só pode alterar objetos de seu próprio prefixo.

---

# 60. CSP

Implementar Content Security Policy.

Base conceitual:

```text
default-src 'self';
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
form-action 'self';
```

Adicionar explicitamente apenas origens necessárias para:

- Clerk;
- Supabase;
- imagens;
- WebSocket;
- Stockfish worker.

---

# 61. Stockfish e CSP

Como o LanceZero usa Web Worker/WASM:

pode ser necessário:

```text
worker-src 'self' blob:
```

e eventualmente:

```text
'wasm-unsafe-eval'
```

Somente se a implementação realmente exigir.

Nunca liberar:

```text
script-src *
```

---

# 62. CSP rollout

Primeiro:

```text
Content-Security-Policy-Report-Only
```

Corrigir violações.

Depois:

```text
Content-Security-Policy
```

---

# 63. Headers

Adicionar:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

# 64. HSTS

Depois que todo domínio/subdomínio estiver confirmado em HTTPS:

```text
Strict-Transport-Security:
max-age=31536000; includeSubDomains
```

`preload` somente após avaliação do domínio inteiro.

---

# 65. CSRF

Regras:

- mutações nunca via GET;
- usar Server Actions corretamente;
- autenticar novamente dentro da Action;
- Route Handlers sensíveis validam Origin;
- não habilitar CORS desnecessariamente.

---

# 66. CORS

Se a API é only same-origin:

não liberar CORS público.

Nunca:

```text
Access-Control-Allow-Origin: *
```

com credenciais.

---

# 67. Open redirect

Nunca aceitar arbitrariamente:

```text
redirect=https://evil.com
```

Usar caminhos relativos internos ou allowlist.

---

# 68. SQL injection

Usar SDK/queries parametrizadas.

Nunca montar SQL com concatenação de input.

---

# 69. Mass assignment

Atacante pode enviar:

```json
{
  "displayName": "x",
  "role": "admin",
  "verified": true
}
```

Zod deve rejeitar campos extras.

---

# 70. Zod

```ts
const UpdateProfileSchema = z.object({
  username: z.string()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9_-]+$/),

  displayName: z.string()
    .trim()
    .min(1)
    .max(40),

  ratingEstimate: z.number()
    .int()
    .min(100)
    .max(4000)
    .nullable()
}).strict()
```

---

# 71. SSRF

Não criar:

```text
/api/fetch?url=<qualquer coisa>
```

Se no futuro for necessário fetch remoto:

- HTTPS somente;
- allowlist de host;
- bloquear localhost;
- bloquear IP privado;
- bloquear metadata endpoints;
- validar redirects.

---

# 72. Webhooks Clerk

Verificar assinatura criptográfica.

Não confiar apenas na URL.

Guardar webhook secret como Sensitive Env.

---

# 73. Idempotência de webhook

Registrar `event_id` único.

Webhook repetido:

```text
não deve duplicar operação
```

---

# 74. Exclusão de conta

Fluxo:

```text
1. usuário pede exclusão
2. step-up/reverification
3. confirmação explícita
4. deletion_request
5. excluir dados Supabase
6. excluir Storage
7. revogar conexões
8. excluir identidade Clerk
9. manter apenas registro mínimo legal/auditável
```

---

# 75. Falha parcial de exclusão

Como envolve dois fornecedores, criar:

```text
deletion_requests
status
attempt_count
last_error
```

Não considerar concluído até todas as partes terminarem.

---

# 76. Exportação de dados

Criar:

```text
/settings/privacy
→ Exportar meus dados
```

Exigir step-up.

Gerar JSON/ZIP temporário.

---

# 77. Export file

Nunca deixar URL pública permanente.

Usar URL assinada e curta expiração.

---

# 78. Privacy by default

Novo profile:

```text
private
```

Perfil público apenas com escolha explícita.

---

# 79. Email

Nunca expor email em perfil público.

---

# 80. Enumeração de conta

Em recuperação:

usar mensagem genérica:

```text
Se existir uma conta associada ao email,
você receberá as instruções.
```

---

# 81. Rate limits sugeridos

```text
profile update:
10/min/user

username availability:
30/min/IP

avatar upload:
5/10min/user

data export:
2/hour/user

delete request:
3/day/user
```

Ajustar após telemetria.

---

# 82. Vercel WAF

Criar regras para:

```text
/api/*
```

Primeiro em modo de observação quando possível.

Depois:

```text
rate limit
challenge
deny
```

---

# 83. Rotas falsas comuns

Bloquear scanners buscando:

```text
/.env
/.git
/wp-admin
/phpmyadmin
```

---

# 84. DDoS

Vercel fornece mitigação de DDoS.

Isso não substitui controle de abuso em endpoints caros.

---

# 85. Cache — regra crítica

Nunca compartilhar cache de dados personalizados entre usuários.

Não cachear publicamente:

```text
profile privado
settings
training progress
security
export
```

---

# 86. Next.js caching

Para dados autenticados:

preferir:

```text
no-store
```

Não utilizar `use cache` sem design explícito de isolamento por usuário.

---

# 87. Auth pages e ISR

Não usar ISR para páginas que carregam dados privados ou renovam sessão.

---

# 88. Error handling

Usuário:

```text
Não foi possível concluir a operação.
Código: <request-id>
```

Servidor:

```text
stack
request id
error code
```

Nunca devolver:

- SQL;
- JWT;
- secrets;
- stack;
- paths internos.

---

# 89. Logs

Nunca:

```ts
console.log(headers)
console.log(cookies)
console.log(session)
console.log(token)
```

---

# 90. Logs mínimos

Exemplo:

```json
{
  "event": "profile_update",
  "requestId": "...",
  "actorHash": "...",
  "success": true,
  "timestamp": "..."
}
```

---

# 91. Admin

Evitar painel admin no MVP.

Menos interface privilegiada = menos superfície de ataque.

---

# 92. Admin futuro

Exigir:

```text
auth
+
admin role verificada
+
MFA
+
reverification recente
```

---

# 93. Nunca admin pelo frontend

Nunca:

```text
localStorage.isAdmin
?admin=true
email suffix no client
```

---

# 94. Testes de RLS

Para cada tabela:

```text
anon
Alice
Bob
admin
```

Testar:

```text
SELECT
INSERT
UPDATE
DELETE
```

---

# 95. Matriz base

| Operação | anon | próprio | outro usuário |
|---|---:|---:|---:|
| SELECT profile privado | não | sim | não |
| INSERT profile | não | sim | não |
| UPDATE profile | não | sim | não |
| DELETE direto | não | não | não |
| SELECT settings | não | sim | não |
| UPDATE settings | não | sim | não |

---

# 96. Security E2E

Criar:

```text
tests/security/auth.spec.ts
tests/security/idor.spec.ts
tests/security/xss.spec.ts
tests/security/csrf.spec.ts
tests/security/storage.spec.ts
tests/security/cache-isolation.spec.ts
tests/security/admin.spec.ts
```

---

# 97. Tentativas de bypass

Testar:

- URL direta;
- fetch manual;
- Server Action chamada diretamente;
- userId alterado;
- body com role admin;
- JWT expirado;
- sessão ausente;
- Origin externo;
- método incorreto;
- content type incorreto;
- payload gigante.

---

# 98. XSS tests

Entradas:

```html
<script>alert(1)</script>
<img src=x onerror=alert(1)>
"><svg/onload=alert(1)>
```

Resultado:

- texto escapado;
- ou input rejeitado;
- nunca execução.

---

# 99. SQLi tests

```text
' OR 1=1 --
"; DROP TABLE profiles; --
```

Não devem alterar comportamento.

---

# 100. Race condition

Duas contas tentam mesmo username simultaneamente.

A garantia vem do:

```text
UNIQUE constraint
```

não apenas de uma consulta de disponibilidade anterior.

---

# 101. Path traversal upload

Input:

```text
../../secret
```

deve ser irrelevante porque servidor gera o caminho.

---

# 102. Oversized upload

Rejeitar antes de processamento caro.

---

# 103. OWASP ZAP

Executar contra Vercel Preview protegido/autorizado.

Usar:

- spider;
- passive scan;
- active scan controlado.

Não lançar active scan destrutivo contra produção.

---

# 104. CI de segurança

Pipeline:

```text
lint
typecheck
unit tests
RLS tests
integration tests
security E2E
npm audit
OSV scan
secret scan
build
```

---

# 105. Release blockers

Bloquear merge/deploy se houver:

```text
cross-user access
RLS regression
secret encontrado
critical exploitable dependency
auth bypass
stored XSS
```

---

# 106. Pentest

Antes do lançamento público:

realizar revisão focada em:

- AuthN;
- AuthZ;
- IDOR;
- RLS;
- XSS;
- CSRF;
- upload;
- cache;
- webhooks;
- session;
- admin.

Idealmente com segunda pessoa/ferramenta independente.

---

# 107. LGPD

O art. 46 da LGPD exige medidas técnicas e administrativas capazes de proteger os dados contra acesso não autorizado e situações acidentais ou ilícitas.

Segurança deve existir desde o design.

---

# 108. Política de privacidade

Deve informar:

- dados coletados;
- finalidade;
- base legal;
- retenção;
- fornecedores;
- direitos;
- contato;
- transferências internacionais aplicáveis.

---

# 109. Data map

Criar:

```text
docs/PRIVACY_DATA_MAP.md
```

Campos:

```text
dado
finalidade
local
retenção
acesso
base legal
```

---

# 110. Consent records

Tabela opcional:

```text
user_id
consent_type
policy_version
accepted_at
revoked_at
```

Separar marketing de termos essenciais.

---

# 111. Direitos do usuário

Planejar:

- acessar dados;
- corrigir;
- exportar;
- excluir;
- alterar privacidade.

---

# 112. Incidente de segurança

Regulamentação da ANPD prevê comunicação em **3 dias úteis** para incidentes que cumpram os critérios de risco/dano relevante.

Manter procedimento documentado.

---

# 113. Incident response

Criar:

```text
docs/SECURITY_INCIDENT.md
```

Fluxo:

```text
detect
classify
contain
revoke
investigate
preserve evidence
patch
assess LGPD
notify if required
postmortem
```

---

# 114. Capacidades de contenção

Deve ser possível:

- revogar sessões Clerk;
- bloquear usuário;
- rotacionar Clerk secret;
- rotacionar Supabase secret;
- ativar Vercel Challenge Mode;
- bloquear IP;
- desabilitar endpoint;
- rollback de deploy;
- revogar webhook secret.

---

# 115. Secret leak

Se um secret entrar no Git:

não basta apagar o commit.

Fazer:

```text
rotate
invalidate
review logs
remove from history if necessary
```

---

# 116. Backup

Para produção, preferir plano de banco com backup automático.

Supabase Pro atualmente oferece backups diários com retenção.

Testar restore periodicamente.

---

# 117. Restore

Backup nunca testado não deve ser considerado recuperação garantida.

Executar restore em ambiente isolado.

---

# 118. Dados reais em desenvolvimento

Nunca copiar DB real para development.

Usar dados sintéticos.

---

# 119. Email transacional

Configurar:

```text
SPF
DKIM
DMARC
```

Usar domínio oficial.

---

# 120. OAuth redirects

Allowlist exata.

Produção só aceita callbacks de produção.

Não aceitar qualquer `*.vercel.app` na configuração de produção sem necessidade.

---

# 121. Custo / viabilidade

Em setembro de 2026:

- Vercel tem Hobby gratuito e Pro a partir de ~US$20/mês;
- Clerk Hobby cobre até 50.000 usuários retidos por app;
- Supabase Free cobre até 50.000 MAU e 500 MB de DB;
- Supabase Pro parte de ~US$25/mês e inclui backups automáticos.

Preços e limites podem mudar.

MVP é financeiramente viável.

Para usuários reais em produção, considerar Supabase Pro por backup/operação.

---

# 122. Disponibilidade

Em falha de Auth:

```text
fail closed
```

Nunca:

```text
serviço de auth não respondeu → permitir
```

---

# 123. User experience degradada

Se Supabase estiver indisponível:

- não corromper estado;
- exibir erro recuperável;
- não assumir sucesso;
- permitir retry seguro.

---

# 124. Dados de xadrez local-first

Manter Stockfish no navegador sempre que possível.

Benefício:

- menos custo;
- menos dados enviados;
- melhor privacidade.

---

# 125. PGN

PGN importado é input não confiável.

Limitar:

- tamanho;
- número de partidas;
- comentários;
- caracteres.

Comentários PGN devem ser renderizados como texto.

---

# 126. Profile URLs

Exemplo:

```text
/u/vecola
```

Dados privados nunca devem ser buscados e “escondidos visualmente”.

Se não é público, não enviar ao client.

---

# 127. Ocultar não é autorizar

Errado:

```tsx
{isOwner ? <Email>{profile.email}</Email> : null}
```

se `profile.email` já foi enviado ao browser.

O DTO deve excluir o email antes.

---

# 128. Unicode

Para username do MVP:

ASCII restrito reduz phishing por homoglyph.

Display name pode usar Unicode.

---

# 129. Views do Postgres

Revisar views cuidadosamente.

Preferir `security_invoker` quando aplicável.

Views podem criar vazamento se bypassarem o comportamento esperado de RLS.

---

# 130. SECURITY DEFINER

Evitar functions `SECURITY DEFINER`.

Se necessário:

- revisão manual;
- search_path fixo;
- grants mínimos.

---

# 131. Migrations

Toda mudança de:

```text
RLS
grant
view
function
```

exige revisão de segurança.

Versionar migrations.

---

# 132. PR checklist

Adicionar template:

```text
[ ] Trata dado de usuário?
[ ] RLS existe?
[ ] Authorization existe no server?
[ ] Input validado?
[ ] DTO mínimo?
[ ] Cache revisado?
[ ] Logs revisados?
[ ] Security test?
```

---

# 133. CLAUDE.md — regra de segurança

Adicionar:

```text
SECURITY IS A HARD REQUIREMENT.

Never trust ownership identifiers supplied by the browser.

Always derive the current user from the verified authentication session.

Every user-owned Supabase table must use RLS.

Every mutation must:
1. authenticate
2. validate
3. authorize
4. execute
5. return the minimum required DTO

Never expose Supabase secret/service credentials to client code.

Never rely only on Next.js proxy/middleware for authorization.

Never return entire private DB records to Client Components.

Never log cookies, JWTs, Authorization headers, passwords or secrets.

Never publicly cache authenticated user data.

Cross-user access is always a release blocker.
```

---

# 134. CLAUDE.md — proibições

```text
DO NOT:
- implement custom password storage
- trust client userId
- disable RLS for convenience
- expose service role
- use select('*') as client DTO
- use production DB in Preview
- accept SVG avatar
- accept arbitrary remote URLs
- use GET for mutation
- hide private data only with CSS/UI
```

---

# 135. Fase 0 — baseline

1. atualizar Next.js;
2. proteger Preview;
3. separar environments;
4. MFA nos dashboards;
5. secret scanning;
6. security headers;
7. WAF básico;
8. CI security.

Definition of Done:

```text
Latest stable Next.js
No production secret in Preview
Preview protected
No secret in Git
Security CI green
```

---

# 136. Fase 1 — Clerk

1. Clerk Development;
2. Clerk Production;
3. sign-up;
4. sign-in;
5. email verification;
6. bot protection;
7. redirect allowlist;
8. session handling;
9. security settings.

---

# 137. Fase 2 — Supabase

1. staging project;
2. production project;
3. native Clerk third-party auth integration;
4. schema migrations;
5. profiles;
6. settings;
7. storage;
8. RLS;
9. grants.

---

# 138. Fase 3 — RLS tests

Criar Alice e Bob.

Não avançar até:

```text
0 cross-user reads
0 cross-user writes
0 cross-user storage access
```

---

# 139. Fase 4 — DAL

Criar módulos server-only.

Nenhum acesso privado fora da DAL sem justificativa.

---

# 140. Fase 5 — onboarding

```text
sign-up
→ verify
→ onboarding
→ profile
→ dashboard
```

---

# 141. Fase 6 — profile

Implementar:

- username;
- display name;
- rating;
- visibility.

---

# 142. Fase 7 — avatar

- JPEG/PNG/WebP;
- size limit;
- magic byte;
- reencode;
- storage RLS;
- random path.

---

# 143. Fase 8 — security settings

- sessions;
- MFA;
- password/account controls via Clerk;
- reverification;
- logout-all.

---

# 144. Fase 9 — privacy

- profile visibility;
- data export;
- delete;
- consent history;
- privacy page.

---

# 145. Fase 10 — WAF hardening

Observar antes.

Depois ativar:

- rate limits;
- deny;
- challenge.

---

# 146. Fase 11 — CSP

```text
Report Only
→ fix
→ enforce
```

---

# 147. Fase 12 — security suite

Executar:

- IDOR;
- XSS;
- SQLi;
- CSRF;
- upload;
- JWT;
- cache;
- webhook;
- admin.

---

# 148. Fase 13 — launch gate

Só liberar se todos os checklists abaixo estiverem verdes.

---

# 149. Checklist Auth

```text
[ ] Clerk PROD
[ ] Email verification
[ ] Bot protection
[ ] Redirect allowlist
[ ] Session revoke
[ ] Admin MFA
[ ] Sensitive actions reverified
```

---

# 150. Checklist DB

```text
[ ] RLS em todas user tables
[ ] Grants mínimos
[ ] Constraints
[ ] Migrations
[ ] No service key client
[ ] Backup
[ ] Restore test
```

---

# 151. Checklist App

```text
[ ] Server Actions auth
[ ] Route Handlers auth
[ ] DAL
[ ] Zod strict
[ ] DTO mínimo
[ ] server-only
[ ] Private data no-store
```

---

# 152. Checklist Vercel

```text
[ ] Preview protected
[ ] Separate Preview DB/Auth
[ ] Sensitive envs
[ ] WAF
[ ] Rate limiting
[ ] HTTPS
[ ] Security headers
[ ] Production secrets production-only
```

---

# 153. Checklist XSS

```text
[ ] No unsafe user HTML
[ ] CSP
[ ] No SVG upload
[ ] Markdown sanitized
[ ] User text escaped
```

---

# 154. Checklist Account Takeover

```text
[ ] Brute force protection
[ ] Bot protection
[ ] Verified email
[ ] Admin MFA
[ ] Session revocation
[ ] Reverification
```

---

# 155. Checklist Privacy

```text
[ ] Privacy Policy
[ ] Terms
[ ] Data map
[ ] Export
[ ] Delete
[ ] Retention policy
[ ] Incident response
```

---

# 156. Definition of Secure Done

Uma feature de usuário somente está pronta quando possuir:

```text
Authentication        ✓
Authorization         ✓
RLS                   ✓
Input validation      ✓
Output minimization   ✓
Cache review          ✓
Log review            ✓
Security tests        ✓
```

---

# 157. Métricas

Monitorar:

```text
401
403
429
WAF denies
bot challenges
failed auth
webhook failures
5xx
profile update failure
DB errors
```

Criar alertas para anomalias.

---

# 158. Transferência internacional

Vercel, Clerk e Supabase podem envolver processamento fora do Brasil conforme região/configuração.

Antes do lançamento:

- revisar DPA;
- revisar subprocessadores;
- registrar fornecedores;
- revisar mecanismo de transferência;
- refletir na Privacy Policy.

---

# 159. Crianças e adolescentes

Se o produto não for inicialmente desenhado para menores:

definir claramente a política de idade.

Se futuramente houver foco em menores:

fazer nova revisão específica de LGPD.

Não coletar data de nascimento completa sem necessidade.

---

# 160. Risco final mais importante

O maior risco prático do sistema é:

```text
uma conta conseguir ler dados de outra conta
```

A arquitetura proposta combate isso em três lugares:

```text
server auth
server authorization
database RLS
```

---

# 161. Cenários de bypass

## Frontend guard removido

Servidor bloqueia.

## API chamada manualmente

Servidor bloqueia.

## userId trocado

Servidor usa sessão.

## rota possui bug

RLS ainda bloqueia linha de outro usuário.

## Supabase Data API chamada diretamente

RLS ainda se aplica.

## Publishable key descoberta

Ela é pública por design; RLS continua protegendo.

## Supabase secret key descoberta

Incidente crítico.

Por isso secret isolation e rotation são obrigatórios.

---

# 162. Arquitetura de defesa final

```text
Atacante
   │
   ▼
Vercel WAF
   │
   ▼
Clerk
   │
   ▼
Server auth
   │
   ▼
Zod
   │
   ▼
DAL
   │
   ▼
Supabase JWT validation
   │
   ▼
Postgres RLS
   │
   ▼
Dados
```

---

# 163. Regra definitiva

> A aplicação identifica o usuário, mas o banco também precisa provar que aquele usuário pode acessar aquela linha.

---

# 164. Release blocker definitivo

Antes de produção:

1. criar Alice;
2. criar Bob;
3. autenticar Alice;
4. tentar acessar Bob por:
   - página;
   - URL;
   - API;
   - Server Action;
   - Supabase;
   - Storage;
   - cache;
5. repetir Bob → Alice.

Se qualquer dado privado atravessar:

```text
RELEASE BLOCKED
```

---

# 165. Fontes principais

## Next.js

Next.js Data Security  
https://nextjs.org/docs/app/guides/data-security

Next.js Security Model  
https://nextjs.org/blog/security-nextjs-server-components-actions

Next.js Support Policy  
https://nextjs.org/support-policy

Next.js current documentation  
https://nextjs.org/docs

Next.js blog/security releases  
https://nextjs.org/blog

Vercel — Next.js May 2026 Security Release  
https://vercel.com/changelog/next-js-may-2026-security-release

---

## Vercel

Security  
https://vercel.com/security

Web Application Firewall  
https://vercel.com/security/web-application-firewall

Bot Management  
https://vercel.com/security/bot-management

Deployment Protection  
https://vercel.com/kb/deployment-protection

Sensitive Environment Variables  
https://vercel.com/academy/optimize-your-vercel-account/sensitive-env-vars

Pricing  
https://vercel.com/pricing

---

## Clerk

Security overview  
https://clerk.com/docs/guides/secure/overview

Protecting Next.js resources  
https://clerk.com/docs/nextjs/guides/secure/protect-content

Bot protection  
https://clerk.com/docs/guides/secure/bot-protection

Session options  
https://clerk.com/docs/guides/secure/session-options

Clerk + Supabase  
https://clerk.com/docs/guides/development/integrations/databases/supabase

Pricing  
https://clerk.com/pricing

---

## Supabase

Clerk Third-Party Auth  
https://supabase.com/docs/guides/auth/third-party/clerk

Third-party authentication  
https://supabase.com/docs/guides/auth/third-party/overview

Row Level Security  
https://supabase.com/docs/guides/database/postgres/row-level-security

Secure Data  
https://supabase.com/docs/guides/database/secure-data

JWT  
https://supabase.com/docs/guides/auth/jwts

MFA  
https://supabase.com/docs/guides/auth/auth-mfa

Rate limits  
https://supabase.com/docs/guides/auth/rate-limits

Pricing  
https://supabase.com/pricing

---

## OWASP

Authentication Cheat Sheet  
https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

Session Management Cheat Sheet  
https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

OWASP Cheat Sheet Series  
https://cheatsheetseries.owasp.org/

---

## LGPD / ANPD

Lei nº 13.709/2018 — LGPD  
https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

ANPD — Guia de Segurança da Informação  
https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte

ANPD — Comunicação de Incidente de Segurança  
https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis

Regulamentações ANPD  
https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd

---

# 166. Nota

Este documento é um plano técnico de segurança e privacy-by-design.

Não substitui:

- pentest profissional;
- auditoria independente;
- assessoria jurídica;
- revisão contratual dos fornecedores;
- avaliação formal de proteção de dados quando aplicável.

Para o LanceZero, entretanto, esta arquitetura fornece uma base de segurança muito superior a um sistema típico de cadastro baseado apenas em middleware e checks de frontend.
