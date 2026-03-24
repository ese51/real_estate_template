// ─────────────────────────────────────────────────────────────────────────────
// PropertyData — the canonical schema for a single-property site
// All fields marked optional (?) are conditional rendering triggers in the UI
// ─────────────────────────────────────────────────────────────────────────────

export interface PropertyMeta {
  slug: string;              // used for URL, image folders, output filenames
  site_title: string;        // <title> tag
  site_description: string;  // meta description
  og_image?: string;         // social share image path (relative to /public)
}

export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  full: string;              // pre-formatted: "6032 28th St N, Arlington, VA 22207"
}

export interface PropertyStats {
  beds: number;
  baths: number;
  sqft: number;
  lot_size: string;          // e.g. "0.35 acres" or "15,000 sq ft"
  year_built: number;
  garage: string;            // e.g. "2-car attached"
  style: string;             // e.g. "Colonial", "Contemporary"
}

export interface GalleryImage {
  url: string;               // path relative to /public
  alt: string;
  caption?: string;
}

export interface FeatureCategory {
  category: string;          // e.g. "Interior", "Exterior", "Systems"
  items: string[];
}

export interface SchoolInfo {
  name: string;
  level: 'Elementary' | 'Middle' | 'High';
  district: string;
  rating?: number;           // 1–10 if available
  distance?: string;         // e.g. "0.4 mi"
}

export interface FloorPlan {
  name: string;              // e.g. "Main Level", "Upper Level"
  image: string;             // path relative to /public
  description?: string;
}

export interface AgentInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
  photo?: string;
  brokerage?: string;
  license?: string;
  demo_disclaimer?: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  neighborhood: string;
  highlights: string[];      // walkable to X, near Y, etc.
}

export interface ScheduleShowingConfig {
  enabled: boolean;
  calendly_url?: string;     // if using Calendly embed
  contact_form?: boolean;    // fallback: show a simple contact form
}

export interface PropertyData {
  meta: PropertyMeta;
  address: PropertyAddress;
  price: number;
  price_display: string;     // e.g. "$2,495,000" — pre-formatted for display
  status: 'For Sale' | 'Under Contract' | 'Sold' | 'Coming Soon';
  tagline: string;           // short punchy headline for hero
  description: string;       // full marketing description (supports HTML)
  stats: PropertyStats;
  gallery: {
    hero_image: string;      // path to the primary hero image
    images: GalleryImage[];
  };
  features: FeatureCategory[];
  schools?: SchoolInfo[];    // omit or empty array = Schools section hidden
  location: LocationData;
  floor_plans?: FloorPlan[]; // omit or empty array = Floor Plans section hidden
  agent: AgentInfo;
  schedule_showing: ScheduleShowingConfig;
}
