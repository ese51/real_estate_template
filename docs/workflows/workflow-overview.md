# Workflow Overview

This document describes the intended end-to-end workflow for launching a single-property site using this template engine.

---

## Current State (Phase 1 — Template Foundation)

The template renders from a single JSON file. All steps below are manual.

---

## Full Pipeline (Phase 2+ — Automated)

```
New Property Request
       │
       ▼
  [Intake Agent]
  • Collect address, specs, agent info
  • Scaffold property JSON file
  • Create image folder
       │
       ▼
  [Media Agent]
  • Accept raw photos from agent
  • Resize + compress to .webp
  • Organize into /public/images/[slug]/
  • Update gallery[] in JSON
       │
       ▼
  [Content Agent]
  • Read property JSON
  • Generate tagline, description, feature bullets
  • Write back to JSON
       │
       ▼
  [Builder Agent]
  • Validate JSON against schema
  • Update index.astro import to point to [slug].json
  • Run `astro build`
  • Output to outputs/[slug]/
       │
       ▼
  [Deploy]
  • Push to Netlify/Vercel via CLI
  • Get live URL
       │
       ▼
  [Outreach Agent]
  • Generate social captions
  • Draft email announcement
  • Create sharing card
       │
       ▼
  [Jarvis — Orchestrator]
  • Coordinates all agents above
  • Handles errors and retries
  • Sends status summary to client
```

---

## Manual Workflow (Phase 1)

Until agents are built, follow these steps:

### 1. Create property data file
```bash
cp data/properties/6032-28th-arlington.json data/properties/[new-slug].json
# Edit all [PLACEHOLDER] values
```

### 2. Add property images
```bash
# Copy optimized .webp images to:
app/public/images/[new-slug]/
```

### 3. Update page import
```astro
# In app/src/pages/index.astro, change:
import rawData from '@data/properties/[new-slug].json';
```

### 4. Run locally
```bash
cd app
npm install
npm run dev
```

### 5. Build + deploy
```bash
npm run build
# Deploy app/dist/ to Netlify, Vercel, or any static host
```

---

## Deployment Options

| Host | Method | Notes |
|------|--------|-------|
| Netlify | Drag & drop `dist/` or CLI | Free tier supports custom domains |
| Vercel | `vercel --prod` from `app/` | Zero config for Astro |
| GitHub Pages | GitHub Actions workflow | Requires `base` config in astro.config.mjs |
| Cloudflare Pages | Git push trigger | Fast global CDN |

---

## Future: Multi-Property Support

The engine is designed to support multiple properties. Future patterns include:

- **Dynamic routing**: `app/src/pages/[slug].astro` iterates over all JSON files
- **Index page**: `app/src/pages/index.astro` lists all properties
- **Per-property deploys**: Each property gets its own Netlify site with a custom domain

This is deliberately not built yet — the template stays minimal until the workflow is validated.
