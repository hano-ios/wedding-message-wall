update public.event_settings
set admin_passcode_hash = extensions.crypt(
  'thankutaewon',
  extensions.gen_salt('bf')
)
where id = 'main';

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.event_settings;
