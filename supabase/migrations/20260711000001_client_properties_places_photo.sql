-- Google Places metadata + cached Street View photo for portal properties
alter table public.client_properties
  add column if not exists photo_url text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists place_id text;
