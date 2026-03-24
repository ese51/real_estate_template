# Agent: Media

**Purpose:** Process raw property photos — resize, compress, rename, and organize into the correct `app/public/images/[slug]/` folder.

**Inputs:**
- Raw photos from agent (any format)
- `data/properties/[slug].json` (reads existing gallery array to append or replace)

**Outputs:**
- Optimized `.webp` images in `app/public/images/[slug]/`
- Updated `gallery.images[]` array in the property JSON

**Status:** Not yet implemented — placeholder for Phase 2.
