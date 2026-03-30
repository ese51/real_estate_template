import type {
  HiveMindListingPayload,
  ListingAgentPayload,
  ResolvedImage,
  TemplateDefinition,
} from '../types';

type Nullable<T> = T | null | undefined;

function isNonEmptyString(value: Nullable<string>): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeSiteTemplate(value: Nullable<string>): 'classic' | 'modern' | 'bold' | 'lifestyle' | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'classic' || normalized === 'modern' || normalized === 'bold' || normalized === 'lifestyle'
    ? normalized
    : undefined;
}

function assertRequiredString(value: unknown, fieldName: string): string {
  const normalizedValue = typeof value === 'string' ? value : undefined;
  if (!isNonEmptyString(normalizedValue)) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return normalizedValue.trim();
}

function parseRequiredNumber(value: unknown, fieldName: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric field: ${fieldName}`);
  }
  return parsed;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatWholeNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

function inferDescriptionHtml(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error('Missing required field: description');
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  return looksLikeHtml ? trimmed : plainTextToHtml(trimmed);
}

function deriveSiteDescription(args: {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  priceDisplay: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  description: string;
}): string {
  const base = `${args.address} — ${args.city}, ${args.state} ${args.postalCode}. ${args.bedrooms} bedrooms, ${args.bathrooms} baths, ${formatWholeNumber(args.squareFeet)} sq ft. Listed at ${args.priceDisplay}.`;
  const summary = stripHtml(args.description);
  if (!summary) {
    return base;
  }

  return `${base} ${summary}`.slice(0, 300);
}

function normalizeBrokerage(input: HiveMindListingPayload['brokerage']): string | undefined {
  if (typeof input === 'string' && input.trim()) {
    return input.trim();
  }
  if (input && typeof input === 'object' && isNonEmptyString(input.name)) {
    return input.name.trim();
  }
  return undefined;
}

function normalizeAgent(
  input: HiveMindListingPayload['listing_agent'],
  fallbackBrokerage?: string,
  explicitAgentImage?: string | null
): {
  name: string;
  title: string;
  phone: string;
  email: string;
  brokerage?: string;
  license?: string;
  imageSource?: string;
} {
  if (typeof input === 'string' && input.trim()) {
    return {
      name: input.trim(),
      title: 'Listing Agent',
      phone: '',
      email: '',
      brokerage: fallbackBrokerage,
      imageSource: explicitAgentImage ?? undefined,
    };
  }

  const agentObject = (input && typeof input === 'object' ? input : {}) as ListingAgentPayload;
  const imageSource = [
    explicitAgentImage,
    agentObject.image_url,
    agentObject.photo_url,
    agentObject.photo,
    agentObject.image,
  ].find(isNonEmptyString);

  return {
    name: agentObject.name?.trim() || 'Listing Agent',
    title: agentObject.title?.trim() || 'Listing Agent',
    phone: agentObject.phone?.trim() || '',
    email: agentObject.email?.trim() || '',
    brokerage: fallbackBrokerage,
    license: agentObject.license?.trim() || undefined,
    imageSource,
  };
}

function buildFeatureItems(payload: {
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  priceDisplay: string;
  sourceUrl?: string | null;
}): string[] {
  const items = [
    `${payload.bedrooms} bedrooms`,
    `${payload.bathrooms} bathrooms`,
    `${formatWholeNumber(payload.squareFeet)} sq ft`,
    `Listed at ${payload.priceDisplay}`,
  ];

  if (isNonEmptyString(payload.sourceUrl)) {
    items.push(`Source listing available at ${payload.sourceUrl.trim()}`);
  }

  return items;
}

function mapPayloadToPropertyData(
  payload: HiveMindListingPayload,
  slug: string,
  listingImages: ResolvedImage[],
  agentImagePublicPath?: string
): Record<string, unknown> {
  const address = assertRequiredString(payload.address, 'address');
  const city = assertRequiredString(payload.city, 'city');
  const state = assertRequiredString(payload.state, 'state');
  const postalCode = assertRequiredString(payload.postal_code, 'postal_code');
  const descriptionHtml = inferDescriptionHtml(payload.description);
  const price = parseRequiredNumber(payload.price, 'price');
  const bedrooms = parseRequiredNumber(payload.bedrooms, 'bedrooms');
  const bathrooms = parseRequiredNumber(payload.bathrooms, 'bathrooms');
  const squareFeet = parseRequiredNumber(payload.square_feet, 'square_feet');
  const brokerage = normalizeBrokerage(payload.brokerage);
  const agent = normalizeAgent(payload.listing_agent, brokerage, payload.agent_image_url);
  const fullAddress = `${address}, ${city}, ${state} ${postalCode}`;
  const priceDisplay = formatPrice(price);
  const firstImage = listingImages[0];

  return {
    meta: {
      slug,
      site_title: `${address} — ${city}, ${state} ${postalCode}`,
      site_description: deriveSiteDescription({
        address,
        city,
        state,
        postalCode,
        priceDisplay,
        bedrooms,
        bathrooms,
        squareFeet,
        description: descriptionHtml,
      }),
      og_image: firstImage?.publicPath,
      template: normalizeSiteTemplate(payload.site_template),
    },
    address: {
      street: address,
      city,
      state,
      zip: postalCode,
      full: fullAddress,
    },
    price,
    price_display: priceDisplay,
    status: 'For Sale',
    tagline: `${bedrooms}-bedroom home in ${city}, ${state}.`,
    description: descriptionHtml,
    stats: {
      beds: bedrooms,
      baths: bathrooms,
      sqft: squareFeet,
    },
    gallery: {
      hero_image: firstImage?.publicPath ?? '',
      images: listingImages.map((image, index) => ({
        url: image.publicPath,
        alt: `${address} photo ${index + 1}`,
        caption: index === 0 ? 'Primary listing image' : undefined,
      })),
    },
    features: [
      {
        category: 'Listing Overview',
        items: buildFeatureItems({
          bedrooms,
          bathrooms,
          squareFeet,
          priceDisplay,
          sourceUrl: payload.source_url,
        }),
      },
    ],
    schools: [],
    location: {
      lat: 0,
      lng: 0,
      neighborhood: city,
      highlights: isNonEmptyString(payload.source_url)
        ? [`Source listing: ${payload.source_url.trim()}`]
        : [`${city}, ${state} ${postalCode}`],
    },
    floor_plans: [],
    agent: {
      name: agent.name,
      title: agent.title,
      phone: agent.phone,
      email: agent.email,
      photo: agentImagePublicPath,
      brokerage: agent.brokerage,
      license: agent.license,
    },
    schedule_showing: {
      enabled: false,
    },
  };
}

export const realEstateTemplateDefinition: TemplateDefinition = {
  id: 'real-estate-template',
  label: 'Real Estate Template',
  is_default: true,
  payload_requirements: {
    required_fields: [
      'address',
      'city',
      'state',
      'postal_code',
      'price',
      'bedrooms',
      'bathrooms',
      'square_feet',
      'description',
      'image_urls',
    ],
    optional_fields: [
      'listing_agent',
      'brokerage',
      'source_url',
      'artifact_folder_path',
      'agent_image_url',
      'site_template',
    ],
    image_expectations: {
      min_listing_images: 1,
      supports_agent_image: true,
      notes: 'Listing images are copied into app/public/images/[slug]/. Agent image is optional.',
    },
  },
  output_behavior: {
    route_path: (slug) => `/${slug}`,
    artifact_entries: [
      {
        from: (_appDir, distDir, slug) => `${distDir}/${slug}`,
        to: '.',
      },
      {
        from: (_appDir, distDir) => `${distDir}/_astro`,
        to: '_astro',
      },
      {
        from: (_appDir, distDir) => `${distDir}/images`,
        to: 'images',
      },
      {
        from: (_appDir, distDir) => `${distDir}/favicon.svg`,
        to: 'favicon.svg',
      },
    ],
  },
  map_payload_to_template_data: ({ payload, slug, listingImages, agentImagePublicPath }) =>
    mapPayloadToPropertyData(payload, slug, listingImages, agentImagePublicPath),
};
