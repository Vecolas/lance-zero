# Clerk + Supabase RLS Reference

Current preferred integration is Supabase Third-Party Auth with Clerk, not the old shared JWT-secret/template workaround.

Conceptual policy:

```sql
alter table profiles enable row level security;

create policy "select own"
on profiles
for select
to authenticated
using (
  user_id = (select auth.jwt()->>'sub')
);
```

Use equivalent `with check` protection for insert/update.

## Important

- Integration does not automatically synchronize all Clerk user records into Supabase.
- Use webhook only for product data that actually needs synchronization.
- Never make the Supabase secret/service credential public.
- Test Data API access directly, not only through the application UI.

Official docs:
- https://clerk.com/docs/guides/development/integrations/databases/supabase
- https://supabase.com/docs/guides/auth/third-party/clerk
- https://supabase.com/docs/guides/database/postgres/row-level-security
