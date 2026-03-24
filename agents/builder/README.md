# Agent: Builder

**Purpose:** Build and deploy a production-ready static site for a given property slug.

**Inputs:**
- `data/properties/[slug].json` (complete, validated)
- Optimized media in `app/public/images/[slug]/`

**Outputs:**
- Production build in `app/dist/`
- Optionally deploys to Netlify/Vercel via CLI
- Build artifact saved to `outputs/[slug]/`

**Status:** Not yet implemented — placeholder for Phase 2.
