// Returns a property image for a lat/lng: Street View if imagery exists,
// otherwise a satellite Static Map. Uses the server-side Google Maps key so it
// never reaches the browser; the fetched image is cached in the public
// property-images storage bucket and the stable public URL is returned.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { lat, lng, placeId } = await req.json();
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return json({ error: 'lat and lng are required numbers' }, 400);
    }

    const key = Deno.env.get('GOOGLE_MAPS_SERVER_KEY');
    if (!key) return json({ error: 'GOOGLE_MAPS_SERVER_KEY is not configured' }, 500);

    const location = `${lat},${lng}`;

    // Metadata requests are free — confirm imagery exists before billing an image request
    const metaRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${location}&source=outdoor&key=${key}`
    );
    const meta = await metaRes.json();
    const hasStreetView = meta.status === 'OK';

    const imageUrl = hasStreetView
      ? `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${location}&source=outdoor&key=${key}`
      : `https://maps.googleapis.com/maps/api/staticmap?center=${location}&zoom=18&size=640x400&maptype=satellite&markers=color:red%7C${location}&key=${key}`;

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return json({ error: `Google image request failed (${imgRes.status})` }, 502);
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const safeId =
      (placeId && String(placeId).replace(/[^A-Za-z0-9_-]/g, '')) ||
      `${lat}_${lng}`.replace(/\./g, 'p').replace(/-/g, 'm');
    const path = `${safeId}_${hasStreetView ? 'sv' : 'map'}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) return json({ error: `Storage upload failed: ${uploadError.message}` }, 500);

    const { data: pub } = supabase.storage.from('property-images').getPublicUrl(path);
    return json({ url: pub.publicUrl, source: hasStreetView ? 'streetview' : 'staticmap' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
