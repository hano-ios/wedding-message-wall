create extension if not exists pgcrypto with schema extensions;

alter table public.messages
add column if not exists client_id text;

update public.messages
set client_id = gen_random_uuid()::text
where client_id is null;

alter table public.messages
alter column client_id set not null;

alter table public.messages
add column if not exists is_winner boolean not null default false;

alter table public.messages
add column if not exists winner_prize_tier text;

alter table public.messages
add column if not exists winner_selected_at timestamptz;

create unique index if not exists messages_client_id_unique
on public.messages (client_id);

create unique index if not exists messages_nickname_unique
on public.messages (lower(trim(nickname)));

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

alter table public.event_settings
add column if not exists admin_passcode_hash text;

alter table public.event_settings
add column if not exists winner_prize_tier text;

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
  winner_message_input text,
  winner_prize_tier_input text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_winner_count integer;
  selected_nickname text;
  selected_message text;
begin
  if not public.admin_check_passcode(input_passcode) then
    raise exception 'invalid admin passcode';
  end if;

  if winner_prize_tier_input not in ('1st', '2nd', '3rd') then
    raise exception 'invalid winner prize tier';
  end if;

  update public.messages
  set is_winner = true,
      winner_prize_tier = winner_prize_tier_input,
      winner_selected_at = now()
  where lower(trim(nickname)) = lower(trim(winner_nickname_input))
    and message = winner_message_input
    and is_visible = true
    and is_winner = false
  returning nickname, message into selected_nickname, selected_message;

  if selected_nickname is null or selected_message is null then
    raise exception 'winner already selected or message not found';
  end if;

  update public.event_settings
  set winner_nickname = selected_nickname,
      winner_message = selected_message,
      winner_prize_tier = winner_prize_tier_input,
      winner_count = winner_count + 1,
      updated_at = now()
  where id = 'main'
  returning winner_count into next_winner_count;

  return next_winner_count;
end;
$$;

create or replace function public.admin_reset_winners(input_passcode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_check_passcode(input_passcode) then
    raise exception 'invalid admin passcode';
  end if;

  update public.messages
  set is_winner = false,
      winner_prize_tier = null,
      winner_selected_at = null
  where is_winner = true;

  update public.event_settings
  set winner_nickname = null,
      winner_message = null,
      winner_prize_tier = null,
      winner_count = 0,
      updated_at = now()
  where id = 'main';
end;
$$;

create or replace function public.admin_replace_winner(
  input_passcode text,
  previous_winner_nickname_input text,
  previous_winner_message_input text,
  next_winner_nickname_input text,
  next_winner_message_input text,
  winner_prize_tier_input text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_winner_count integer;
  previous_nickname text;
  next_nickname text;
  next_message text;
begin
  if not public.admin_check_passcode(input_passcode) then
    raise exception 'invalid admin passcode';
  end if;

  if winner_prize_tier_input not in ('1st', '2nd', '3rd') then
    raise exception 'invalid winner prize tier';
  end if;

  update public.messages
  set is_winner = false,
      winner_prize_tier = null,
      winner_selected_at = null
  where lower(trim(nickname)) = lower(trim(previous_winner_nickname_input))
    and message = previous_winner_message_input
    and is_visible = true
    and is_winner = true
  returning nickname into previous_nickname;

  if previous_nickname is null then
    raise exception 'previous winner not found';
  end if;

  update public.messages
  set is_winner = true,
      winner_prize_tier = winner_prize_tier_input,
      winner_selected_at = now()
  where lower(trim(nickname)) = lower(trim(next_winner_nickname_input))
    and message = next_winner_message_input
    and is_visible = true
    and is_winner = false
  returning nickname, message into next_nickname, next_message;

  if next_nickname is null or next_message is null then
    raise exception 'replacement winner already selected or message not found';
  end if;

  update public.event_settings
  set winner_nickname = next_nickname,
      winner_message = next_message,
      winner_prize_tier = winner_prize_tier_input,
      updated_at = now()
  where id = 'main'
  returning winner_count into current_winner_count;

  return current_winner_count;
end;
$$;

grant execute on function public.admin_check_passcode(text) to anon, authenticated;
grant execute on function public.admin_replace_winner(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_reset_winners(text) to anon, authenticated;
grant execute on function public.admin_set_submission_open(text, boolean) to anon, authenticated;
grant execute on function public.admin_set_winner(text, text, text, text) to anon, authenticated;
grant execute on function public.upsert_guest_message(text, text, text) to anon, authenticated;
