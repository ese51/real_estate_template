export interface ListingAgentPayload {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  image_url?: string;
  photo?: string;
  photo_url?: string;
  image?: string;
  license?: string;
}

export interface HiveMindListingPayload {
  address: string;
  city: string;
  state: string;
  postal_code: string;
  price: number | string;
  bedrooms: number | string;
  bathrooms: number | string;
  square_feet: number | string;
  listing_agent?: string | ListingAgentPayload | null;
  brokerage?: string | { name?: string } | null;
  description: string;
  image_urls: string[];
  source_url?: string | null;
  artifact_folder_path?: string | null;
  slug?: string | null;
  agent_image_url?: string | null;
  site_template?: string | null;
  /** When true, commits the property JSON + images and pushes to GitHub so Netlify redeploys. */
  publish?: boolean | null;
}

export interface BuildSiteResult {
  slug: string;
  template_id: string;
  dist_dir: string;
  route_path: string;
  files_written: string[];
  /** Populated when publish=true and the git push succeeded. */
  published?: boolean;
  commit_hash?: string;
  public_url?: string;
}

export interface ResolvedImage {
  source: string;
  destinationFileName: string;
  publicPath: string;
  diskPath: string;
}

export interface TemplatePayloadRequirements {
  required_fields: Array<keyof HiveMindListingPayload>;
  optional_fields: Array<keyof HiveMindListingPayload>;
  image_expectations: {
    min_listing_images: number;
    supports_agent_image: boolean;
    notes?: string;
  };
}

export interface TemplateOutputBehavior {
  route_path: (slug: string) => string;
  artifact_entries: Array<{
    from: (appDir: string, distDir: string, slug: string) => string;
    to: string;
  }>;
}

export interface TemplatePaths {
  app_dir: string;
  properties_dir: string;
  listing_images_dir: string;
  agent_images_dir: string;
  dist_dir: string;
}

export interface TemplateMapperContext {
  payload: HiveMindListingPayload;
  slug: string;
  listingImages: ResolvedImage[];
  agentImagePublicPath?: string;
}

export interface TemplateDefinition {
  id: string;
  label: string;
  is_default?: boolean;
  payload_requirements: TemplatePayloadRequirements;
  output_behavior: TemplateOutputBehavior;
  map_payload_to_template_data: (context: TemplateMapperContext) => Record<string, unknown>;
}
