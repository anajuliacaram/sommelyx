alter table if exists public.ai_cache
  add column if not exists cache_scope text not null default 'global',
  add column if not exists user_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'ai_cache'
      and indexname = 'ai_cache_scope_user_endpoint_idx'
  ) then
    create index ai_cache_scope_user_endpoint_idx
      on public.ai_cache (cache_scope, user_id, endpoint, created_at desc);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'ai_cache'
      and indexname = 'ai_cache_scope_expiry_idx'
  ) then
    create index ai_cache_scope_expiry_idx
      on public.ai_cache (cache_scope, expires_at);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_cache'
      and policyname = 'service_role_ai_cache'
  ) then
    create policy "service_role_ai_cache" on public.ai_cache
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
