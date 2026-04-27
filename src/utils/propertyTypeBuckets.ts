/**
 * Display-layer property type consolidation.
 *
 * Underlying data model keeps 8 templates (units-apartments, villas-townhouses,
 * houses-regional, metro-houses, duplexes, small-blocks-3-4-units,
 * larger-blocks-10-20-units, commercial-property).
 *
 * The dashboard property-card dropdown shows a tighter set of buckets — the
 * BA picks a bucket; we map back to a canonical underlying template when
 * writing changes. Bucket-to-bucket changes are what trigger an AI re-plan.
 */

export type PropertyBucket =
  | 'Metro Houses'
  | 'Regional Houses'
  | 'Units / Townhouses'
  | 'Yield Specialists'
  | 'Commercial';

export const PROPERTY_BUCKETS: PropertyBucket[] = [
  'Metro Houses',
  'Regional Houses',
  'Units / Townhouses',
  'Yield Specialists',
  'Commercial',
];

/**
 * Map an underlying property title (as produced by the AI / templates) to
 * its display bucket. Falls back to "Units / Townhouses" for unknowns so
 * the dropdown always has a selected value.
 */
export const getBucketForPropertyType = (propertyType: string): PropertyBucket => {
  const t = propertyType.toLowerCase();

  if (t.includes('metro') && t.includes('house')) return 'Metro Houses';
  if (t.includes('regional') && t.includes('house')) return 'Regional Houses';
  if (t.includes('house')) return 'Regional Houses'; // generic houses → regional
  if (t.includes('unit') || t.includes('apartment') || t.includes('villa') || t.includes('townhouse')) {
    return 'Units / Townhouses';
  }
  if (t.includes('duplex') || t.includes('block') || t.includes('dual occ') || t.includes('granny')) {
    return 'Yield Specialists';
  }
  if (t.includes('commercial') || t.includes('retail') || t.includes('office') || t.includes('industrial')) {
    return 'Commercial';
  }
  return 'Units / Townhouses';
};

/**
 * Canonical underlying property type to write when the BA picks a bucket.
 * Matches the keys present in src/data/property-defaults.json.
 */
export const getCanonicalTypeForBucket = (bucket: PropertyBucket): string => {
  switch (bucket) {
    case 'Metro Houses':
      return 'Metro Houses';
    case 'Regional Houses':
      return 'Houses (Regional)';
    case 'Units / Townhouses':
      return 'Units / Apartments';
    case 'Yield Specialists':
      return 'Duplexes';
    case 'Commercial':
      return 'Commercial Property';
  }
};
