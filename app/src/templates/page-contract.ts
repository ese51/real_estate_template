export const CANONICAL_SECTION_ORDER = [
  'header',
  'hero',
  'gallery',
  'property-summary',
  'about',
  'features',
  'schools',
  'location',
  'floor-plans',
  'contact',
  'schedule-showing',
  'footer',
] as const;

export type CanonicalSectionId = (typeof CANONICAL_SECTION_ORDER)[number];
