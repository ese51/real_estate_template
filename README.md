# Real Estate Template Engine

A reusable luxury single-property website engine. Each listing is driven entirely by a JSON file — no hardcoded content in the template. Add a JSON file and an image folder to generate a new property site automatically.

**Stack:** Astro 4 · SCSS · TypeScript · JSON data

---

## Repo Structure

```
.
├── netlify.toml                      Netlify build config (base: app/)
│
├── app/                              Astro web application
│   ├── src/
│   │   ├── data/
│   │   │   └── properties/           One JSON file per listing
│   │   │       └── 1615-n-wakefield-arlington.json
│   │   ├── components/               One .astro file per section
│   │   │   ├── Header.astro
│   │   │   ├── Hero.astro
│   │   │   ├── Gallery.astro
│   │   │   ├── PropertySummary.astro
│   │   │   ├── About.astro
│   │   │   ├── Features.astro
│   │   │   ├── Schools.astro          (conditional)
│   │   │   ├── Location.astro
│   │   │   ├── FloorPlans.astro       (conditional)
│   │   │   ├── Contact.astro
│   │   │   ├── ScheduleShowing.astro  (conditional)
│   │   │   └── Footer.astro
│   │   ├── layouts/
│   │   │   └── PropertyLayout.astro   HTML shell + meta/OG tags
│   │   ├── pages/
│   │   │   ├── index.astro            / (Wakefield demo)
│   │   │   └── [slug].astro           /[slug] — one page per JSON
│   │   ├── styles/
│   │   │   ├── global.scss            Reset, typography, layout utilities
│   │   │   └── _variables.scss        Design tokens (colors, spacing, type)
│   │   └── types/
│   │       └── property.ts            TypeScript interface for property JSON
│   ├── public/
│   │   └── images/                    One folder per listing slug
│   │       └── 1615-n-wakefield-arlington/
│   ├── astro.config.mjs
│   ├── package.json
│   └── tsconfig.json
│
├── data/                              Local editing copies of property JSON
├── agents/                            Future automation agent stubs
└── docs/                              Schema reference and workflow docs
```

---

## Running Locally

```bash
cd app
npm install
npm run dev
# → http://localhost:4321
```

```bash
npm run build    # production build → app/dist/
npm run preview  # preview the build locally
```

---

## Adding a New Listing

Two steps. No code changes required.

**1. Add the data file**

Create `app/src/data/properties/[your-slug].json` using the existing Wakefield file as a reference. The filename becomes the URL slug.

**2. Add the images**

Create `app/public/images/[your-slug]/` and add the listing's photos. Image paths in the JSON should match `your-slug` exactly.

That's it. The next `npm run build` generates `/{your-slug}` automatically.

---

## Routes

| URL | Source |
|-----|--------|
| `/` | `src/pages/index.astro` → Wakefield demo |
| `/1615-n-wakefield-arlington` | `src/pages/[slug].astro` → auto-generated |
| `/[any-future-slug]` | `src/pages/[slug].astro` → auto-generated |

---

## Conditional Sections

These sections only render when their data is present:

| Section | Condition |
|---------|-----------|
| Schools | `schools` array is non-empty |
| Floor Plans | `floor_plans` array is non-empty |
| Schedule a Showing | `schedule_showing.enabled === true` |

---

## Deployment (Netlify)

`netlify.toml` at the repo root handles all build configuration:

```toml
[build]
  base    = "app"
  command = "npm run build"
  publish = "dist"
```

No manual Netlify settings needed beyond connecting the repo.

---

## Design System

Tokens live in `app/src/styles/_variables.scss`.

- **Colors:** deep navy `#1a1a2e`, warm gold `#b8975a`, off-white `#f9f8f5`
- **Fonts:** Playfair Display (headings) + Inter (body) via Google Fonts
- **Breakpoints:** `$bp-sm: 480px`, `$bp-md: 768px`, `$bp-lg: 1024px`
