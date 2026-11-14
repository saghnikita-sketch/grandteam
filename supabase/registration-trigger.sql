-- Run this once in Supabase SQL Editor after the initial schema.
-- Creates the public profile automatically when Supabase Auth creates a user.

create or replace function public.handle_grandteam_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_username text;
begin
  chosen_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, username, contact_email)
  values (
    new.id,
    chosen_username,
    nullif(new.raw_user_meta_data ->> 'contact_email', '')
  );

  return new;
end;
$$;

drop trigger if exists on_grandteam_auth_user_created on auth.users;
create trigger on_grandteam_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_grandteam_new_user();

-- Users may read all public profiles; they may only update their own.
-- Profile creation is performed by the trusted Auth trigger, not the browser.
