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

-- TRIGGER FUNCTION
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

-- RPC: criar grupo + inserir criador como membro em uma transação
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

-- RLS
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