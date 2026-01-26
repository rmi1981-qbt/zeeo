-- Enable PostGIS extension for geospatial queries
create extension if not exists postgis;

-- Create the condominiums table
create table public.condominiums (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  -- Store the perimeter as a GEOGRAPHY polygon (SRID 4326/WGS84)
  perimeter geography(POLYGON, 4326) not null,
  created_at timestamptz default now()
);

-- Index for fast spatial queries (inside/intersects)
create index condominiums_perimeter_idx on public.condominiums using GIST (perimeter);

-- Security Policies (RLS)
alter table public.condominiums enable row level security;

-- Allow anyone to READ (SELECT) condominiums (public map)
create policy "Allow public read access"
  on public.condominiums for select
  using (true);

-- Allow authenticated users (or public for MVP if desired) to INSERT
-- For this MVP, we will allow public insert to make testing easier, 
-- but in production this should be restricted to 'authenticated' role.
create policy "Allow public insert for MVP"
  on public.condominiums for insert
  with check (true);
