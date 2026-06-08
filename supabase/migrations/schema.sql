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

-- RPC: criar grupo + inserir criador como membro
create function public.create_group(group_name text)
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

-- RPC: balance global do usuário autenticado
create function public."ActualGlobalBalance"()
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
      on gm.group_id = e.group_id
      and gm.user_id = uid
      and gm.joined_at <= e.created_at
    where e.paid_by != uid
    and not exists (
      select 1 from payments p
      where p.expense_id = e.id and p.paid_by = uid
    )
  loop
    select count(*) into total_members
    from group_members
    where group_id = exp.group_id and joined_at <=