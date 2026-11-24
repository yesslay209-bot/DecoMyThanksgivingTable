-- DecoThanks: shared Thanksgiving tables + thank-you cards.
-- Paste this whole file into Supabase → SQL Editor → Run. It is safe to re-run.
--
-- How access works:
--   * Anyone with a table's link can see the table and leave a card.
--   * Only the table's host can change it, read its cards or remove cards: either the
--     browser that created it (it holds the secret edit key, stored here only as a hash)
--     or, if they chose to sign in, their account on any device.

create extension if not exists pgcrypto;

create table if not exists public.shared_tables (
  id uuid primary key default gen_random_uuid(),
  arrangement jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shared_tables add column if not exists host_name text;
-- Each table's edit key is stored only as a SHA-256 hash. The browser that created
-- the table keeps the real key, so even full database access can't edit tables.
alter table public.shared_tables add column if not exists edit_token_hash bytea;
-- Upgrade from earlier versions of this file, which stored the key in plain text.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'shared_tables' and column_name = 'edit_token') then
    update public.shared_tables
       set edit_token_hash = sha256(convert_to(edit_token::text, 'UTF8'))
     where edit_token_hash is null and edit_token is not null;
    alter table public.shared_tables drop column edit_token;
  end if;
end;
$$;
-- Hosts opt in to the public leaderboard.
alter table public.shared_tables add column if not exists listed boolean not null default false;
-- Optional sign-in: a table can belong to an account, so its host can edit it and read
-- cards from any device. Never exposed to other people (not in the column grants below).
alter table public.shared_tables add column if not exists owner_id uuid references auth.users(id) on delete set null;
create index if not exists shared_tables_owner_idx on public.shared_tables(owner_id);

create table if not exists public.thank_you_cards (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.shared_tables(id) on delete cascade,
  message text not null,
  sender_name text,
  anonymous boolean not null default true,
  food_asset text,
  created_at timestamptz not null default now()
);
create index if not exists thank_you_cards_table_id_idx on public.thank_you_cards(table_id, created_at);

alter table public.thank_you_cards drop constraint if exists thank_you_cards_message_len;
alter table public.thank_you_cards add constraint thank_you_cards_message_len
  check (char_length(btrim(message)) between 1 and 600) not valid;
alter table public.thank_you_cards drop constraint if exists thank_you_cards_name_len;
alter table public.thank_you_cards add constraint thank_you_cards_name_len
  check (sender_name is null or char_length(sender_name) <= 60) not valid;
alter table public.thank_you_cards drop constraint if exists thank_you_cards_food_len;
alter table public.thank_you_cards add constraint thank_you_cards_food_len
  check (food_asset is null or char_length(food_asset) <= 200) not valid;

alter table public.shared_tables enable row level security;
alter table public.thank_you_cards enable row level security;

-- Policies (dropped first so this script can be re-run).
drop policy if exists "Anyone can read shared tables" on public.shared_tables;
drop policy if exists "Anyone can create shared tables" on public.shared_tables;
drop policy if exists "Anyone can update shared tables" on public.shared_tables;
drop policy if exists "Anyone can read thank-you cards" on public.thank_you_cards;
drop policy if exists "Anyone can send thank-you cards" on public.thank_you_cards;

create policy "Anyone can read shared tables"
  on public.shared_tables for select using (true);
create policy "Anyone can read thank-you cards"
  on public.thank_you_cards for select using (true);
create policy "Anyone can send thank-you cards"
  on public.thank_you_cards for insert with check (true);

-- Never expose the key hash, and route all table writes through the functions below.
revoke all on public.shared_tables from anon, authenticated;
grant select (id, host_name, arrangement, listed, created_at, updated_at) on public.shared_tables to anon, authenticated;
-- Cards are private to the table's host: anyone can see that a card exists (sticker,
-- time) but not its message or who wrote it. The host reads full cards through get_cards().
revoke all on public.thank_you_cards from anon, authenticated;
grant select (id, table_id, food_asset, created_at) on public.thank_you_cards to anon, authenticated;
grant insert (table_id, message, sender_name, anonymous, food_asset) on public.thank_you_cards to anon, authenticated;

-- Who may manage a table: whoever holds its edit key, or its signed-in owner.
create or replace function public.can_edit_table(p_id uuid, p_token uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shared_tables t
     where t.id = p_id
       and ((p_token is not null and t.edit_token_hash = sha256(convert_to(p_token::text, 'UTF8')))
         or (auth.uid() is not null and t.owner_id = auth.uid()))
  );
$$;

-- Older signatures from earlier versions of this file.
drop function if exists public.create_table(text, jsonb);
drop function if exists public.update_table(uuid, uuid, text, jsonb);

create or replace function public.create_table(p_host_name text, p_arrangement jsonb, p_listed boolean default false)
returns table (id uuid, edit_token uuid)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_token uuid := gen_random_uuid();
  v_id uuid;
begin
  insert into public.shared_tables (host_name, arrangement, listed, edit_token_hash, owner_id)
  values (left(nullif(btrim(p_host_name), ''), 60), coalesce(p_arrangement, '{}'::jsonb), coalesce(p_listed, false),
          sha256(convert_to(v_token::text, 'UTF8')), auth.uid())
  returning shared_tables.id into v_id;
  return query select v_id, v_token;
end;
$$;

create or replace function public.update_table(p_id uuid, p_token uuid, p_host_name text, p_arrangement jsonb, p_listed boolean default null)
returns boolean
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.shared_tables
       set host_name = left(nullif(btrim(p_host_name), ''), 60),
           arrangement = coalesce(p_arrangement, '{}'::jsonb),
           listed = coalesce(p_listed, shared_tables.listed),
           updated_at = now()
     where shared_tables.id = p_id
       and public.can_edit_table(p_id, p_token)
    returning 1
  )
  select exists (select 1 from updated);
$$;

-- Public leaderboard: only tables whose hosts opted in.
create or replace function public.leaderboard(p_limit int default 25)
returns table (id uuid, host_name text, card_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.host_name, count(c.id) as card_count
    from public.shared_tables t
    left join public.thank_you_cards c on c.table_id = t.id
   where t.listed
   group by t.id
   order by count(c.id) desc, t.created_at asc
   limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

create or replace function public.delete_card(p_table_id uuid, p_token uuid, p_card_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.thank_you_cards c
     using public.shared_tables t
     where c.id = p_card_id
       and c.table_id = p_table_id
       and t.id = p_table_id
       and public.can_edit_table(p_table_id, p_token)
    returning 1
  )
  select exists (select 1 from deleted);
$$;

-- The host reads their cards with the table's key (stored only as a hash).
create or replace function public.get_cards(p_table_id uuid, p_token uuid)
returns table (id uuid, message text, sender_name text, anonymous boolean, food_asset text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.message, case when c.anonymous then null else c.sender_name end, c.anonymous, c.food_asset, c.created_at
    from public.thank_you_cards c
    join public.shared_tables t on t.id = c.table_id
   where c.table_id = p_table_id
     and public.can_edit_table(p_table_id, p_token)
   order by c.created_at;
$$;

revoke all on function public.create_table(text, jsonb, boolean) from public;
revoke all on function public.update_table(uuid, uuid, text, jsonb, boolean) from public;
revoke all on function public.leaderboard(int) from public;
revoke all on function public.delete_card(uuid, uuid, uuid) from public;
grant execute on function public.create_table(text, jsonb, boolean) to anon, authenticated;
grant execute on function public.update_table(uuid, uuid, text, jsonb, boolean) to anon, authenticated;
grant execute on function public.leaderboard(int) to anon, authenticated;
revoke all on function public.get_cards(uuid, uuid) from public;
grant execute on function public.get_cards(uuid, uuid) to anon, authenticated;
grant execute on function public.delete_card(uuid, uuid, uuid) to anon, authenticated;

-- Signed-in hosts: link a table they hold the key for, and list their tables.
create or replace function public.claim_table(p_id uuid, p_token uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with claimed as (
    update public.shared_tables
       set owner_id = auth.uid()
     where auth.uid() is not null
       and shared_tables.id = p_id
       and shared_tables.edit_token_hash = sha256(convert_to(p_token::text, 'UTF8'))
       and (shared_tables.owner_id is null or shared_tables.owner_id = auth.uid())
    returning 1
  )
  select exists (select 1 from claimed);
$$;

create or replace function public.my_tables()
returns table (id uuid, host_name text, listed boolean, updated_at timestamptz, card_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.host_name, t.listed, t.updated_at, count(c.id)
    from public.shared_tables t
    left join public.thank_you_cards c on c.table_id = t.id
   where auth.uid() is not null and t.owner_id = auth.uid()
   group by t.id
   order by t.updated_at desc;
$$;

revoke all on function public.can_edit_table(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_table(uuid, uuid) from public;
revoke all on function public.my_tables() from public;
grant execute on function public.claim_table(uuid, uuid) to authenticated;
grant execute on function public.my_tables() to authenticated;

-- Basic flood protection: at most 20 new cards per table per minute.
create or replace function public.limit_card_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.thank_you_cards
       where table_id = new.table_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Too many cards right now. Please try again in a minute.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- A trigger function, not part of the public API: nobody may call it directly.
revoke all on function public.limit_card_rate() from public, anon, authenticated;

drop trigger if exists thank_you_cards_rate_limit on public.thank_you_cards;
create trigger thank_you_cards_rate_limit
  before insert on public.thank_you_cards
  for each row execute function public.limit_card_rate();

-- Make Supabase's API pick up the new functions and columns immediately.
notify pgrst, 'reload schema';
