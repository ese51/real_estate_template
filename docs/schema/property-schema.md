# Property Data Schema

**File location:** `data/properties/[slug].json`
**Type definition:** `app/src/types/property.ts`

Each property site is driven entirely by one JSON file. The schema is validated via TypeScript types at build time.

---

## Top-Level Structure

```json
{
  "meta": { ... },
  "address": { ... },
  "price": 2495000,
  "price_display": "$2,495,000",
  "status": "For Sale",
  "tagline": "...",
  "description": "<p>HTML allowed</p>",
  "stats": { ... },
  "gallery": { ... },
  "features": [ ... ],
  "schools": [ ... ],        // OPTIONAL — omit to hide Schools section
  "location": { ... },
  "floor_plans": [ ... ],    // OPTIONAL — omit to hide Floor Plans section
  "agent": { ... },
  "schedule_showing": { ... }
}
```

---

## `meta`

| Field | Type | Description |
|-------|------|-------------|
| `slug` | string | URL-safe identifier. Also used for image folder naming. |
| `site_title` | string | Browser `<title>` tag. |
| `site_description` | string | Meta description for SEO/sharing. |
| `og_image` | string? | Path to social share image, relative to `/public`. |

---

## `address`

| Field | Type | Description |
|-------|------|-------------|
| `street` | string | e.g. `"6032 28th St N"` |
| `city` | string | e.g. `"Arlington"` |
| `state` | string | 2-letter abbreviation |
| `zip` | string | 5-digit ZIP |
| `full` | string | Pre-formatted full address for display |

---

## `price` / `price_display` / `status`

- `price`: raw number (e.g. `2495000`) — used for sorting/filtering in future
- `price_display`: formatted string (e.g. `"$2,495,000"`) — rendered directly
- `status`: one of `"For Sale"` | `"Under Contract"` | `"Sold"` | `"Coming Soon"`

---

## `stats`

| Field | Type | Example |
|-------|------|---------|
| `beds` | number | `5` |
| `baths` | number | `4.5` |
| `sqft` | number | `6200` |
| `lot_size` | string | `"0.35 acres"` |
| `year_built` | number | `2019` |
| `garage` | string | `"2-car attached"` |
| `style` | string | `"Colonial"` |

---

## `gallery`

```json
"gallery": {
  "hero_image": "/images/[slug]/front1.webp",
  "images": [
    {
      "url": "/images/[slug]/living-room.webp",
      "alt": "Open living room with fireplace",
      "caption": "Optional caption shown on hover"
    }
  ]
}
```

All image paths are relative to `/public`. The Media agent will populate and optimize these.

---

## `features`

Array of categorized feature lists:

```json
"features": [
  {
    "category": "Interior",
    "items": ["Hardwood floors throughout", "10-ft ceilings"]
  },
  {
    "category": "Kitchen",
    "items": ["Quartz countertops", "Wolf range"]
  }
]
```

---

## `schools` (OPTIONAL)

Omit this key entirely (or set to `[]`) to hide the Schools section.

```json
"schools": [
  {
    "name": "Discovery Elementary",
    "level": "Elementary",
    "district": "Arlington Public Schools",
    "rating": 9,
    "distance": "0.4 mi"
  }
]
```

`level` must be: `"Elementary"` | `"Middle"` | `"High"`

---

## `location`

```json
"location": {
  "lat": 38.8821,
  "lng": -77.1023,
  "neighborhood": "North Arlington",
  "highlights": [
    "Minutes to DC via GW Parkway",
    "Walkable to Westover Village shops"
  ]
}
```

`lat`/`lng` are used for future map embed integration.

---

## `floor_plans` (OPTIONAL)

Omit this key entirely (or set to `[]`) to hide the Floor Plans section.

```json
"floor_plans": [
  {
    "name": "Main Level",
    "image": "/images/[slug]/floorplan-main.webp",
    "description": "Optional short description"
  }
]
```

---

## `agent`

```json
"agent": {
  "name": "Jane Smith",
  "title": "Licensed Real Estate Agent",
  "phone": "(703) 555-0100",
  "email": "jane@brokerage.com",
  "photo": "/images/agents/jane-smith.jpg",
  "brokerage": "Premier Realty Group",
  "license": "VA-0123456"
}
```

---

## `schedule_showing`

```json
"schedule_showing": {
  "enabled": true,            // set false to hide the entire section
  "calendly_url": "https://calendly.com/...",  // set to use Calendly embed
  "contact_form": true        // fallback if no calendly_url
}
```

If `enabled: false`, the Schedule a Showing section is completely hidden and the nav link is removed.
If `calendly_url` is set, it takes priority over `contact_form`.

---

## Conditional Rendering Rules

| Section | Condition |
|---------|-----------|
| Schools | `schools` key exists AND `schools.length > 0` |
| Floor Plans | `floor_plans` key exists AND `floor_plans.length > 0` |
| Schedule a Showing | `schedule_showing.enabled === true` |
| Nav "Schedule a Tour" link | `schedule_showing.enabled === true` |

---

## Image Organization

```
app/public/images/
  [slug]/
    front1.webp
    front2.webp
    living-room.webp
    kitchen.webp
    ...
  agents/
    [agent-slug].jpg
```

Naming convention: lowercase, hyphens, `.webp` for property photos, `.jpg` for agent headshots.
