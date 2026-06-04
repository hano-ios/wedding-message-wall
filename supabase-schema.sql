create extension if not exists pgcrypto with schema extensions;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id text not null check (char_length(trim(client_id)) between 1 and 120),
  nickname text not null check (char_length(trim(nickname)) between 1 and 12),
  message text not null check (char_length(trim(message)) between 1 and 120),
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.messages
add column if not exists client_id text;

update public.messages
set client_id = gen_random_uuid()::text
where client_id is null;

alter table public.messages
alter column client_id set not null;

create unique index if not exists messages_client_id_unique
on public.messages (client_id);

create unique index if not exists messages_nickname_unique
on public.messages (lower(trim(nickname)));

create table if not exists public.event_settings (
  id text primary key,
  is_open boolean not null default true,
  winner_nickname text,
  winner_message text,
  admin_passcode_hash text,
  winner_count integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.event_settings (id, is_open)
values ('main', true)
on conflict (id) do nothing;

alter table public.messages enable row level security;
alter table public.event_settings enable row level security;

drop policy if exists "guest can read visible messages" on public.messages;
create policy "guest can read visible messages"
on public.messages
for select
to anon, authenticated
using (is_visible = true);

drop policy if exists "guest can insert messages" on public.messages;
create policy "guest can insert messages"
on public.messages
for insert
to anon, authenticated
with check (
  char_length(trim(client_id)) between 1 and 120
  and
  is_visible = true
  and char_length(trim(nickname)) between 1 and 12
  and char_length(trim(message)) between 1 and 120
);

create or replace function public.upsert_guest_message(
  input_client_id text,
  input_nickname text,
  input_message text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_message public.messages;
begin
  if char_length(trim(input_client_id)) not between 1 and 120 then
    raise exception 'invalid client id';
  end if;

  if char_length(trim(input_nickname)) not between 1 and 12 then
    raise exception 'invalid nickname';
  end if;

  if char_length(trim(input_message)) not between 1 and 120 then
    raise exception 'invalid message';
  end if;

  insert into public.messages (client_id, nickname, message, is_visible)
  values (trim(input_client_id), trim(input_nickname), trim(input_message), true)
  on conflict (client_id)
  do update
  set nickname = excluded.nickname,
      message = excluded.message,
      is_visible = true
  returning * into saved_message;

  return saved_message;
end;
$$;

drop policy if exists "everyone can read event settings" on public.event_settings;
create policy "everyone can read event settings"
on public.event_settings
for select
to anon, authenticated
using (true);

drop policy if exists "authenticated admin can update settings" on public.event_settings;
drop policy if exists "authenticated admin can update settings" on public.event_settings;

create or replace function public.admin_check_passcode(input_passcode text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_settings
    where id = 'main'
      and admin_passcode_hash is not null
      and extensions.crypt(input_passcode, admin_passcode_hash) = admin_passcode_hash
  );
$$;

create or replace function public.admin_set_submission_open(input_passcode text, next_is_open boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_check_passcode(input_passcode) then
    raise exception 'invalid admin passcode';
  end if;

  update public.event_settings
  set is_open = next_is_open,
      updated_at = now()
  where id = 'main';
end;
$$;

create or replace function public.admin_set_winner(
  input_passcode text,
  winner_nickname_input text,
  winner_message_input text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_winner_count integer;
begin
  if not public.admin_check_passcode(input_passcode) then
    raise exception 'invalid admin passcode';
  end if;

  update public.event_settings
  set winner_nickname = winner_nickname_input,
      winner_message = winner_message_input,
      winner_count = winner_count + 1,
      updated_at = now()
  where id = 'main'
  returning winner_count into next_winner_count;

  return next_winner_count;
end;
$$;

grant execute on function public.admin_check_passcode(text) to anon, authenticated;
grant execute on function public.admin_set_submission_open(text, boolean) to anon, authenticated;
grant execute on function public.admin_set_winner(text, text, text) to anon, authenticated;
grant execute on function public.upsert_guest_message(text, text, text) to anon, authenticated;
