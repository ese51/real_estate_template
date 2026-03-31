# Template Selection Guide

Internal reference for choosing the right site presentation for a listing.

The real estate template system supports four visual variants on the same shared page contract:

- `classic`
- `modern`
- `bold`
- `lifestyle`

All four use the same:

- property schema
- section inventory
- section order
- conditional rendering behavior

Only presentation changes.

## Quick Picks

`classic`
- Best for luxury, legacy, traditional, or estate-style listings.
- Good fit for agents whose branding leans elegant, formal, and timeless.
- Choose this when the property itself already carries a strong sense of prestige and you want the site to feel refined rather than trendy.

`modern`
- Best for new construction, high-spec renovations, modern architecture, and agents who want a clean product-page feel.
- Good fit for listings where fast scanability, clarity, and conversion are the priority.
- Choose this when the listing should feel efficient, polished, and contemporary.

`bold`
- Best for architecturally striking homes, design-forward listings, and agents who want a memorable, high-contrast presentation.
- Good fit for standout properties where visual differentiation matters.
- Choose this when you want strong personality without changing the shared content structure.

`lifestyle`
- Best for aspirational homes, neighborhood-driven listings, family-oriented properties, and agents who sell the feeling of living somewhere.
- Good fit for listings where place, atmosphere, and livability matter as much as raw specs.
- Choose this when the story is about daily life, setting, and experience.

## Simple Decision Guide

Choose `classic` when:
- the property is formal, traditional, or estate-oriented
- the agent brand is luxury-forward and conservative

Choose `modern` when:
- the listing needs the clearest spec/CTA hierarchy
- the property is contemporary or benefits from a product-style presentation

Choose `bold` when:
- the property needs a strong graphic identity
- the agent wants something memorable and more aggressive visually

Choose `lifestyle` when:
- the listing should emphasize how it feels to live there
- neighborhood, routine, and atmosphere are part of the sales story

## How To Select A Template

Use the existing property JSON field:

```json
"meta": {
  "template": "modern"
}
```

Supported values:

- `classic`
- `modern`
- `bold`
- `lifestyle`

If omitted, the site defaults to `classic`.

If you are generating through the builder, use the existing payload field:

```json
{
  "site_template": "lifestyle"
}
```

## Internal Demo Listing

For side-by-side review and sales demos, the repo includes one representative listing rendered in all four templates:

- `/1615nwakefield`
- `/1615nwakefield-modern`
- `/1615nwakefield-bold`
- `/1615nwakefield-lifestyle`

These four routes use the same listing content so visual differences are template-driven, not data-driven.
