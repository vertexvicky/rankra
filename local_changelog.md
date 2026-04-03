# TNEA Cutoff Explorer — Local Changelog

---

## [v0.3] — 2026-04-03 (in progress)

### Fixed
- Desktop district dropdown was clipped by `overflow-x: auto` on parent row — moved district button into its own non-scrolling row with `overflow: visible`
- Community chips X-overflow on mobile — changed to `flex-wrap: wrap` so chips fold to next line instead of scrolling
- Desktop college name cut off with `…` — changed to 2-line clamp so full name wraps properly
- Grid column widths now auto-expand as fewer communities are selected (CSS `minmax` + `fr` units fill the container)
- `↓ Show vacant seats` blinking CTA added to every row (desktop bottom-left, mobile bottom-right); opacity pulses 100%→60% over 2 s

### Added
- Seat availability shown in every desktop row (inside institute cell: `filled/total` with color pill)
- "Filter by District" label replacing "District" on the district button
- "Sort by" label added before the sort dropdown (replaced the confusing "for" word)
- `ALL` community chip already added in v0.2
- Blinking `↓ Show vacant seats` text in each result row/card

### Changed
- Sort option labels updated: "Cutoff ↓" → "Cutoff: High → Low", etc.
- Community filter dropdown native `<select>` replaced with better-styled `custom-select`
- Filter bar row structure: Search → Years → District (own row) → Community chips (wrap) → Cutoff + Sort

---

## [v0.2] — 2026-04-03

### Fixed
- Replaced dual-thumb slider with two numeric inputs + "to" label for cutoff range
- Duplicate district button removed (was rendering twice)
- Star (★) was always shown on OC — now follows user-selected primary community
- Mobile year tabs clipped on right edge — moved to `overflow-x: auto` scroll row with no tab shrink
- Loading overlay (z-index 9999) was blocking the community gate dialog (z-index 1000) — gate now hides overlay before appearing

### Added
- Community gate shown on ALL devices on first visit (was previously mobile-only)
- `ALL` community chip to toggle all communities at once
- Seat availability badge on mobile cards with subtle pulse animation
- Multi-community inline display when more than one community chip is active on mobile
- Service Worker registration is now non-blocking (`await` removed)

### Changed
- Filter bar rows restructured to horizontal-scroll rows to prevent overflow
- Desktop layout switched from `<table>` to CSS Grid rows for correct overflow behavior
- Sorting always uses user-selected primary community

---

## [v0.1] — 2026-04-03

### Initial Build
- Created `index.html`, `style.css`, `script.js`, `sw.js`
- Data: 6 JSON files (2020–2025), ~3,474 records/year
- Search: prefix Trie (college name, abbreviation, branch, code)
- District normalization map for spelling variants
- Chunked rendering (60 records/batch) via IntersectionObserver
- Light / Dark mode with system preference detection
- Service Worker cache-first strategy for all JSON assets
- Expandable drawer for seat details and address
- Mobile-first CSS with separate card list view
