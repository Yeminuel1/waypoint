-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)

create table if not exists shipments (
  id text primary key,
  sender text not null,
  origin text not null,
  recipient text not null,
  dest text not null,
  service text not null,
  stage integer not null default 0,
  created_at bigint not null,
  eta text,
  eta_timestamp bigint,
  stage_times jsonb not null default '{}'::jsonb,
  stage_labels jsonb not null default '{}'::jsonb,
  auto boolean not null default true
);

create table if not exists app_settings (
  id integer primary key default 1,
  stages jsonb not null,
  icon_keys jsonb not null
);

-- This is a public demo app with no real user accounts, so we allow the
-- anon key full access. Do NOT use this policy for an app with real
-- customer data — add proper auth-based policies instead.
alter table shipments enable row level security;
alter table app_settings enable row level security;

create policy "public read shipments" on shipments for select using (true);
create policy "public write shipments" on shipments for insert with check (true);
create policy "public update shipments" on shipments for update using (true);
create policy "public delete shipments" on shipments for delete using (true);

create policy "public read settings" on app_settings for select using (true);
create policy "public write settings" on app_settings for insert with check (true);
create policy "public update settings" on app_settings for update using (true);

-- Seed the settings row with the app's default stages so the first load
-- has something to read (App.jsx also has JS-side defaults as a fallback).
insert into app_settings (id, stages, icon_keys)
values (
  1,
  '["Label Created","Picked Up","In Transit","Out for Delivery","Customs Clearance","Delivered"]',
  '["Package","Truck","MapPin","Truck","ShieldCheck","CheckCircle2"]'
)
on conflict (id) do nothing;
