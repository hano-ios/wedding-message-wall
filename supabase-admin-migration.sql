create extension if not exists pgcrypto with schema extensions;

alter table public.event_settings
add column if not exists admin_passcode_hash text;

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
