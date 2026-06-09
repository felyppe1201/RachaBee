-- TABLES
create table public.users (
  id uuid not null,
  name text not null,
  email text not null,
  avatar_url text null,
  created_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade
) tablespace pg_default;

create table public.groups (
  id uuid not null default gen_random_uuid(),
  name text not null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint groups_pkey primary key (id),
  constraint groups_created_by_fkey foreign key (created_by) references public.users (id) on delete set null
) tablespace pg_default;

create table public.group_members (
  id uuid not null default gen_random_uuid(),
  group_id uuid null,
  user_id uuid null,
  joined_at timestamp with time zone null default now(),
  constraint group_members_pkey primary key (id),
  constraint group_members_group_id_user_id_key unique (group_id, user_id),
  constraint group_members_group_id_fkey foreign key (group_id) references public.groups (id) on delete cascade,
  constraint group_members_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade
) tablespace pg_default;

create table public.expenses (
  id uuid not null default gen_random_uuid(),
  group_id uuid null,
  paid_by uuid null,
  amount numeric(10, 2) not null,
  description text not null,
  receipt_url text null,
  created_at timestamp with time zone null default now(),
  constraint expenses_pkey primary key (id),
  constraint expenses_group_id_fkey foreign key (group_id) references public.groups (id) on delete cascade,
  constraint expenses_paid_by_fkey foreign key (paid_by) references public.users (id) on delete set null
) tablespace pg_default;

create table public.payments (
  id uuid not null default gen_random_uuid(),
  expense_id uuid null,
  group_id uuid null,
  paid_by uuid null,
  amount numeric(10, 2) not null,
  description text not null,
  transfer_receipt_url text null,
  created_at timestamp with time zone null default now(),
  constraint payments_pkey primary key (id),
  constraint payments_expense_id_fkey foreign key (expense_id) references public.expenses (id) on delete cascade,
  constraint payments_group_id_fkey foreign key (group_id) references public.groups (id) on delete cascade,
  constraint payments_paid_by_fkey foreign key (paid_by) references public.users (id) on delete set null
) tablespace pg_default;

-- ============================================================
-- TRIGGER FUNCTION
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RPCs
-- ============================================================

-- create_group | cria grupo e insere criador como membro
create or replace function public.create_group(group_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group public.groups;
begin
  insert into public.groups (name, created_by)
  values (group_name, auth.uid())
  returning * into new_group;

  insert into public.group_members (group_id, user_id)
  values (new_group.id, auth.uid());

  return new_group;
end;
$$;

-- get_user_by_uuid | retorna nome e avatar de qualquer usuario
create or replace function public.get_user_by_uuid(user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'id', u.id,
    'name', u.name,
    'avatar_url', u.avatar_url
  ) into result
  from users u
  where u.id = user_id;

  return result;
end;
$$;

-- JoinGroupByGroupUUID | usuario autenticado entra no grupo
create or replace function public."JoinGroupByGroupUUID"(group_id uuid, creator_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if not exists (select 1 from groups g where g.id = group_id and g.created_by = creator_id) then
    return json_build_object('success', false, 'message', 'Grupo nao encontrado ou criador invalido');
  end if;

  if exists (select 1 from group_members gm where gm.group_id = "JoinGroupByGroupUUID".group_id and gm.user_id = uid) then
    return json_build_object('success', false, 'message', 'Usuario ja e membro do grupo');
  end if;

  insert into group_members (group_id, user_id)
  values (group_id, uid);

  return json_build_object('success', true, 'message', 'Entrou no grupo com sucesso');
end;
$$;

-- LeaveGroupByGroupUUID | usuario autenticado sai do grupo
create or replace function public."LeaveGroupByGroupUUID"(group_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if exists (select 1 from groups g where g.id = group_id and g.created_by = uid) then
    return json_build_object('success', false, 'message', 'Criador nao pode sair do grupo. Use DeleteGroupByGroupUUID');
  end if;

  if not exists (select 1 from group_members gm where gm.group_id = "LeaveGroupByGroupUUID".group_id and gm.user_id = uid) then
    return json_build_object('success', false, 'message', 'Usuario nao e membro do grupo');
  end if;

  delete from group_members gm
  where gm.group_id = "LeaveGroupByGroupUUID".group_id
  and gm.user_id = uid;

  return json_build_object('success', true, 'message', 'Saiu do grupo com sucesso');
end;
$$;

-- DeleteGroupByGroupUUID | apenas o criador pode deletar o grupo
create or replace function public."DeleteGroupByGroupUUID"(group_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if not exists (select 1 from groups g where g.id = group_id and g.created_by = uid) then
    return json_build_object('success', false, 'message', 'Apenas o criador pode deletar o grupo');
  end if;

  delete from payments p where p.group_id = "DeleteGroupByGroupUUID".group_id;
  delete from expenses e where e.group_id = "DeleteGroupByGroupUUID".group_id;
  delete from group_members gm where gm.group_id = "DeleteGroupByGroupUUID".group_id;
  delete from groups g where g.id = "DeleteGroupByGroupUUID".group_id;

  return json_build_object('success', true, 'message', 'Grupo deletado com sucesso');
end;
$$;

-- GetGroups | todos os grupos do usuario autenticado
create or replace function public."GetGroups"()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result json;
begin
  select json_agg(
    json_build_object(
      'id', g.id,
      'name', g.name,
      'created_by', g.created_by,
      'created_at', g.created_at
    )
  ) into result
  from groups g
  inner join group_members gm on gm.group_id = g.id
  where gm.user_id = uid;

  return coalesce(result, '[]'::json);
end;
$$;

-- GetGroupInfoByUUID | dados completos do grupo
create or replace function public."GetGroupInfoByUUID"(group_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  group_data json;
  members_data json;
  expenses_data json;
begin
  select json_build_object(
    'id', g.id,
    'name', g.name,
    'created_by', g.created_by,
    'created_at', g.created_at
  ) into group_data
  from groups g where g.id = "GetGroupInfoByUUID".group_id;

  select json_agg(
    json_build_object(
      'user_id', u.id,
      'name', u.name,
      'avatar_url', u.avatar_url,
      'joined_at', gm.joined_at,
      'devendo', (
        select coalesce(sum(e.amount / nullif((
          select count(*) from group_members gm2
          where gm2.group_id = e.group_id and gm2.joined_at <= e.created_at
        ), 0)), 0)
        from expenses e
        inner join group_members gm3
          on gm3.group_id = e.group_id and gm3.user_id = u.id and gm3.joined_at <= e.created_at
        where e.group_id = "GetGroupInfoByUUID".group_id
        and e.paid_by != u.id
        and not exists (
          select 1 from payments p where p.expense_id = e.id and p.paid_by = u.id
        )
      ),
      'areceber', (
        select coalesce(sum(
          (e.amount / nullif((
            select count(*) from group_members gm4
            where gm4.group_id = e.group_id and gm4.joined_at <= e.created_at
          ), 0)) *
          ((select count(*) from group_members gm5
            where gm5.group_id = e.group_id and gm5.joined_at <= e.created_at) - 1 -
           (select count(*) from payments p2
            inner join group_members gm6 on gm6.user_id = p2.paid_by and gm6.group_id = e.group_id
            where p2.expense_id = e.id and p2.paid_by != u.id and gm6.joined_at <= e.created_at))
        ), 0)
        from expenses e
        where e.group_id = "GetGroupInfoByUUID".group_id and e.paid_by = u.id
      )
    )
  ) into members_data
  from users u
  inner join group_members gm on gm.user_id = u.id
  where gm.group_id = "GetGroupInfoByUUID".group_id;

  select json_agg(
    json_build_object(
      'id', e.id,
      'description', e.description,
      'amount', e.amount,
      'paid_by', e.paid_by,
      'created_at', e.created_at,
      'receipt_url', e.receipt_url,
      'total_members', (
        select count(*) from group_members gm7
        where gm7.group_id = e.group_id and gm7.joined_at <= e.created_at
      ),
      'val_por_participante', (
        e.amount / nullif((
          select count(*) from group_members gm8
          where gm8.group_id = e.group_id and gm8.joined_at <= e.created_at
        ), 0)
      ),
      'payments_feitos', (
        select count(*) from payments p3 where p3.expense_id = e.id
      ),
      'payments_faltantes', (
        (select count(*) from group_members gm9
         where gm9.group_id = e.group_id and gm9.joined_at <= e.created_at) - 1 -
        (select count(*) from payments p4 where p4.expense_id = e.id)
      )
    )
  ) into expenses_data
  from expenses e
  where e.group_id = "GetGroupInfoByUUID".group_id;

  return json_build_object(
    'group', group_data,
    'members', coalesce(members_data, '[]'::json),
    'expenses', coalesce(expenses_data, '[]'::json)
  );
end;
$$;

-- ActualGlobalBalance | balance global do usuario autenticado
create or replace function public."ActualGlobalBalance"()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  devendo numeric := 0;
  areceber numeric := 0;
  exp record;
  total_members integer;
  members_who_paid integer;
  share numeric;
begin
  for exp in
    select e.id, e.amount, e.paid_by, e.group_id, e.created_at
    from expenses e
    inner join group_members gm
      on gm.group_id = e.group_id and gm.user_id = uid and gm.joined_at <= e.created_at
    where e.paid_by != uid
    and not exists (select 1 from payments p where p.expense_id = e.id and p.paid_by = uid)
  loop
    select count(*) into total_members from group_members
    where group_id = exp.group_id and joined_at <= exp.created_at;

    if total_members > 0 then
      devendo := devendo + (exp.amount / total_members);
    end if;
  end loop;

  for exp in
    select e.id, e.amount, e.group_id, e.created_at
    from expenses e where e.paid_by = uid
  loop
    select count(*) into total_members from group_members
    where group_id = exp.group_id and joined_at <= exp.created_at;

    select count(*) into members_who_paid
    from payments p
    inner join group_members gm on gm.user_id = p.paid_by and gm.group_id = exp.group_id
    where p.expense_id = exp.id and p.paid_by != uid and gm.joined_at <= exp.created_at;

    if total_members > 1 then
      share := exp.amount / total_members;
      areceber := areceber + (share * ((total_members - 1) - members_who_paid));
    end if;
  end loop;

  return json_build_object('devendo', devendo, 'areceber', areceber);
end;
$$;

-- ActualBalanceByGroupUUID | balance do usuario em um grupo especifico
create or replace function public."ActualBalanceByGroupUUID"(group_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  devendo numeric := 0;
  areceber numeric := 0;
  exp record;
  total_members integer;
  members_who_paid integer;
  share numeric;
begin
  for exp in
    select e.id, e.amount, e.paid_by, e.group_id, e.created_at
    from expenses e
    inner join group_members gm
      on gm.group_id = e.group_id and gm.user_id = uid and gm.joined_at <= e.created_at
    where e.group_id = "ActualBalanceByGroupUUID".group_id
    and e.paid_by != uid
    and not exists (select 1 from payments p where p.expense_id = e.id and p.paid_by = uid)
  loop
    select count(*) into total_members from group_members
    where group_id = exp.group_id and joined_at <= exp.created_at;

    if total_members > 0 then
      devendo := devendo + (exp.amount / total_members);
    end if;
  end loop;

  for exp in
    select e.id, e.amount, e.group_id, e.created_at
    from expenses e
    where e.paid_by = uid and e.group_id = "ActualBalanceByGroupUUID".group_id
  loop
    select count(*) into total_members from group_members
    where group_id = exp.group_id and joined_at <= exp.created_at;

    select count(*) into members_who_paid
    from payments p
    inner join group_members gm on gm.user_id = p.paid_by and gm.group_id = exp.group_id
    where p.expense_id = exp.id and p.paid_by != uid and gm.joined_at <= exp.created_at;

    if total_members > 1 then
      share := exp.amount / total_members;
      areceber := areceber + (share * ((total_members - 1) - members_who_paid));
    end if;
  end loop;

  return json_build_object('devendo', devendo, 'areceber', areceber);
end;
$$;

-- GetValForExpenseUUID | valor por participante de uma expense
create or replace function public."GetValForExpenseUUID"(expense_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  exp record;
  total_members integer;
  val_por_participante numeric;
begin
  select e.id, e.amount, e.group_id, e.created_at into exp
  from expenses e where e.id = "GetValForExpenseUUID".expense_id;

  select count(*) into total_members
  from group_members
  where group_id = exp.group_id and joined_at <= exp.created_at;

  val_por_participante := case when total_members > 0 then exp.amount / total_members else 0 end;

  return json_build_object(
    'expense_id', exp.id,
    'total', exp.amount,
    'total_members', total_members,
    'val_por_participante', val_por_participante
  );
end;
$$;

-- GetActivity | expenses e payments do usuario autenticado
create or replace function public."GetActivity"()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  expenses_data json;
  payments_data json;
begin
  select json_agg(
    json_build_object(
      'id', e.id,
      'description', e.description,
      'amount', e.amount,
      'group_id', e.group_id,
      'paid_by', e.paid_by,
      'receipt_url', e.receipt_url,
      'created_at', e.created_at,
      'val_por_participante', (
        e.amount / nullif((
          select count(*) from group_members gm
          where gm.group_id = e.group_id and gm.joined_at <= e.created_at
        ), 0)
      ),
      'payments_feitos', (
        select count(*) from payments p where p.expense_id = e.id
      ),
      'payments_faltantes', (
        (select count(*) from group_members gm2
         where gm2.group_id = e.group_id and gm2.joined_at <= e.created_at) - 1 -
        (select count(*) from payments p2 where p2.expense_id = e.id)
      )
    )
  ) into expenses_data
  from expenses e
  inner join group_members gm3 on gm3.group_id = e.group_id and gm3.user_id = uid
  where e.paid_by = uid;

  select json_agg(
    json_build_object(
      'id', p.id,
      'expense_id', p.expense_id,
      'group_id', p.group_id,
      'amount', p.amount,
      'description', p.description,
      'transfer_receipt_url', p.transfer_receipt_url,
      'created_at', p.created_at
    )
  ) into payments_data
  from payments p
  where p.paid_by = uid;

  return json_build_object(
    'expenses', coalesce(expenses_data, '[]'::json),
    'payments', coalesce(payments_data, '[]'::json)
  );
end;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;

-- POLICIES: users
create policy "users_select" on public.users
  for select using (auth.uid() = id);

create policy "users_insert" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- POLICIES: groups
create policy "groups_select_creator" on public.groups
  for select using (created_by = (select auth.uid()));

create policy "groups_select_member" on public.groups
  for select using (
    id in (
      select group_id from public.group_members
      where user_id = (select auth.uid())
    )
  );

create policy "groups_insert" on public.groups
  for insert with check (auth.uid() = created_by);

create policy "groups_delete_creator" on public.groups
  for delete using (created_by = (select auth.uid()));

-- POLICIES: group_members
create policy "group_members_select" on public.group_members
  for select using (
    group_id in (
      select group_id from public.group_members
      where user_id = (select auth.uid())
    )
  );

create policy "group_members_insert_creator" on public.group_members
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.created_by = (select auth.uid())
    )
  );

create policy "group_members_insert_by_member" on public.group_members
  for insert with check (
    user_id = (select auth.uid())
    and group_id in (
      select group_id from public.group_members
      where user_id = (select auth.uid())
    )
  );

create policy "group_members_delete_self" on public.group_members
  for delete using (user_id = (select auth.uid()));

-- POLICIES: expenses
create policy "expenses_select" on public.expenses
  for select using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = expenses.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "expenses_insert" on public.expenses
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = expenses.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- POLICIES: payments
create policy "payments_select" on public.payments
  for select using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = payments.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "payments_insert" on public.payments
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = payments.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "payments_update" on public.payments
  for update using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = payments.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "payments_delete" on public.payments
  for delete using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = payments.group_id
      and group_members.user_id = auth.uid()
    )
  );

-- POLICIES: storage
create policy "avatars_insert" on storage.objects
  for insert with check (bucket_id = 'avatars');

create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');