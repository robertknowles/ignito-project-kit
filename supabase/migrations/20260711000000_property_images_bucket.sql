-- Public bucket for cached Street View / satellite property images.
-- Written only by the property-image edge function (service role); read via
-- public URLs, so no object-level policies are needed.
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;
