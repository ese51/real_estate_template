# Agent: Content

**Purpose:** Generate marketing copy for the property — tagline, description, feature bullets — using structured data as input.

**Inputs:**
- `data/properties/[slug].json` (reads stats, features, location)
- Optional: style guide or tone preferences from agent

**Outputs:**
- `property.tagline` — short punchy hero headline
- `property.description` — full HTML marketing description
- `property.features[].items[]` — polished feature bullets per category

**Status:** Not yet implemented — placeholder for Phase 2.
