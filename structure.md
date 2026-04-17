# Rankra Ecosystem — Complete Technical Reference

> **Audience:** New developers, DevOps, Product Managers, and anyone maintaining this codebase.
> **Goal:** After reading this document, any engineer must be able to understand every file, every function, every variable, and every design decision without looking at the source code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Full Directory Tree](#2-full-directory-tree)
3. [Root-Level Files](#3-root-level-files)
4. [/api — Version Control](#4-api--version-control)
5. [/public/shared/css — Design System](#5-publicsharedcss--design-system)
6. [/public/shared/js — Core Utilities](#6-publicsharedjs--core-utilities)
7. [/public/shared/components/dummy-ad — Ad Component](#7-publicsharedcomponentsdummy-ad--ad-component)
8. [/public/assets — Media and Data](#8-publicassets--media-and-data)
9. [/public/assets — Brand Assets](#9-publicassets--brand-assets)
10. [/public/tnea/cutoff — TNEA Application](#10-publictneacutoff--tnea-application)
    - [index.html](#1001-tnea-cutoff-indexhtml)
    - [tnea-config.js](#1002-tnea-cutoff-tnea-configjs)
    - [tnea.css](#1003-tnea-cutoff-tneacss)
    - [tnea.js — Full Function Reference](#1004-tnea-cutoff-tneajs)
11. [Data Schema Reference](#11-data-schema-reference)
12. [Data Security Pipeline](#12-data-security-pipeline)
13. [Monetization & Ad Engine](#13-monetization--ad-engine)
14. [localStorage Keys Reference](#14-localstorage-keys-reference)
15. [Developer Runbooks](#15-developer-runbooks)

---

## 1. Project Overview

**Rankra** is a multi-product educational data platform. The architecture follows a **Shared-Core-Modular** pattern:

- A single **shared layer** (`/shared/`) provides CSS design tokens, reusable UI components, and JS utilities that are product-agnostic and shared across all apps.
- Individual **product apps** (currently only `tnea/cutoff/`) have their own logic, config, and app-specific CSS while importing from the shared layer.
- A **data tier** (`/assets/db/`) holds compressed, encrypted binary data files. No raw JSON is ever exposed to the public.
- A lightweight **versioning API** (`/api/update.json`) manages client-side cache invalidation.

The UI is built using **pure HTML, CSS, and vanilla ES Modules** — no bundler, no framework, no npm runtime dependency.

---

## 2. Full Directory Tree

```
rankra/
├── .agents/                    ← AI assistant internal state (git-ignored)
├── .git/                       ← Git version control metadata
├── .gitignore                  ← Files excluded from git tracking
├── .vscode/                    ← VS Code editor settings (git-ignored)
├── api/
│   └── update.json             ← App/data revision tracker for cache busting
├── brain/                      ← AI assistant scratch space (git-ignored)
├── implementation_plan.md      ← Historical planning document
├── local_changelog.md          ← Detailed changelog with uncommitted tracking
├── public/
│   ├── assets/
│   │   ├── db/
│   │   │   └── tnea/
│   │   │       └── cutoff/
│   │   │           ├── 0202.gzip   ← Encrypted+gzipped data for year 2020
│   │   │           ├── 1202.gzip   ← Encrypted+gzipped data for year 2021
│   │   │           ├── 2202.gzip   ← Encrypted+gzipped data for year 2022
│   │   │           ├── 3202.gzip   ← Encrypted+gzipped data for year 2023
│   │   │           └── 4202.gzip   ← Encrypted+gzipped data for year 2024
│   │   ├── engineering/
│   │   │   └── tnea/
│   │   │       └── cutoff/
│   │   │           └── tnea100.png ← TNEA brand logo used in header + portal
│   │   ├── rankra_favicon30.png    ← Browser tab favicon (30px)
│   │   ├── rankra_logo.png         ← Full-size logo for portal page
│   │   └── rankra_logo50.png       ← 50px logo used in app headers
│   ├── index.html              ← Ecosystem portal / landing page
│   ├── shared/
│   │   ├── components/
│   │   │   └── dummy-ad/
│   │   │       ├── dummy-ad.css    ← Styles for the ad simulator widget
│   │   │       └── dummy-ad.js     ← Ad mockup generator function
│   │   ├── css/
│   │   │   ├── animations.css      ← All @keyframes animations
│   │   │   ├── components.css      ← Reusable UI component styles
│   │   │   ├── layout.css          ← Header, filter bar, and page structure
│   │   │   ├── reset.css           ← Browser defaults reset + base typography
│   │   │   └── tokens.css          ← CSS variables (colors, spacing, themes)
│   │   └── js/
│   │       ├── ad-engine.js        ← Ad injection utilities
│   │       ├── sw-register.js      ← Service Worker registration + cache revision
│   │       ├── theme.js            ← Dark/light mode toggle utility
│   │       ├── trie.js             ← Prefix-tree for O(n) real-time search
│   │       └── utils.js            ← DOM helpers and string utilities
│   └── tnea/
│       └── cutoff/
│           ├── index.html          ← TNEA Cutoff app entry point
│           ├── tnea-config.js      ← App configuration (years, communities, seat keys)
│           ├── tnea.css            ← App-specific styles (cutoff table, year tabs)
│           └── tnea.js             ← Main application logic engine (769 lines)
└── structure.md                ← This document
```

---

## 3. Root-Level Files

### `.gitignore`
Excludes files from git version control to keep the repository clean:
- `.venv/`, `venv/`, `__pycache__/` — Python virtual environments (unused, included for safety)
- `.vscode/` — Editor-specific settings that vary per developer
- `.DS_Store`, `Thumbs.db` — macOS/Windows OS artifacts
- `node_modules/` — npm packages (none currently installed, included for safety)
- `*.log` — Log files
- `.agents/` — AI assistant internal context files
- `.fiveserver.config.js` — Local dev server config (not to be committed)

---

### `index.html` (Root Portal)
The **ecosystem landing page**. It is the top-level entry point at the root URL. It serves as a visual portal that links to all available Rankra apps.

**Key elements:**
- **Inline `<script>` (lines 4–10):** Runs before anything else to unregister any stale Service Workers using `navigator.serviceWorker.getRegistrations()`. This is a clean-up mechanism to prevent outdated SW caches from serving broken content after deployments.
- **CSS Links:** Loads `tokens.css`, `reset.css`, `animations.css`, `components.css` from shared layer. These set up the design system.
- **Inline `<style>` (lines 19–106):** Page-specific layout: `.hero` for the logo+title, `.apps-grid` for the responsive card grid, `.app-card` for clickable app tiles. Uses `var(--...)` tokens for theming.
- **Theme toggle button (line 111):** An `icon-btn` with ID `theme-toggle`. Contains two inline SVG icons—`#icon-sun` and `#icon-moon`—which are toggled by `theme.js`.
- **`.hero` div (lines 129–133):** Displays the `rankra_logo.png` (120px), `<h1>Rankra Ecosystem</h1>`, and a subtitle paragraph.
- **`.apps-grid` div (lines 135–142):** A CSS Grid that auto-fits cards. Currently has one app card linking to `./tnea/cutoff/`. Each card contains: app icon, app name, description, and an "Open App" pill badge.
- **Inline `<script type="module">` (lines 144–156):** Imports `applyTheme` from `theme.js`. On `DOMContentLoaded`, reads the `rankra-theme` key from `localStorage`. If `'dark'` or if the system prefers dark, calls `applyTheme('dark')`. Attaches click handler to `theme-toggle` button to toggle between light and dark.

---

### `local_changelog.md`
A developer-facing changelog file. Critical for team coordination because it tracks **uncommitted changes separately** from released versions.

**Format:**
- `## v0.4.1 (Uncommitted)` — all in-progress changes that haven't been pushed/released
- `## [v0.4] — date (released)` — stable releases

**Rule:** Every AI-assisted change is appended to the uncommitted section without modifying previous uncommitted entries unless a change directly reverses or conflicts with one.

---

### `structure.md`
This document. Provides the complete technical reference for the entire codebase.

---

### `implementation_plan.md`
A historical planning document from earlier architecture phases. Documents the rationale behind the migration from a monolith to the modular Rankra ecosystem structure. Not actively maintained but kept as institutional memory.

---

## 4. /api — Version Control

### `api/update.json`
A JSON file served as an API endpoint. It is fetched by the client to detect when the app or data has been updated.

```json
{
  "app_revision": 48,
  "data_revision": 2,
  "apps": { "tnea": { "data_revision": 2 } }
}
```

**Fields:**
- `app_revision` — Incremented whenever a JS, CSS, or HTML file changes. When the client detects a mismatch with its stored value (`rankra-app-revision` in localStorage), it wipes all browser caches and forces a fresh load.
- `data_revision` — Incremented when the data files (`.gzip`) are regenerated. Can be used to trigger data re-fetches.
- `apps.tnea.data_revision` — Per-app data revision for granular cache targeting.

**Background Caching (`localStorage` key: `tnea_db_cutoffmark_cached`):**
The app implements a silent background pre-caching system. After the primary year (usually 2025) is loaded and rendered, the app waits for a short duration and then silently downloads all other configured years from `TNEA_CONFIG.years`. This ensures that switching between years is instantaneous. The `tnea_db_cutoffmark_cached` key stores a comma-separated list of years currently available in the browser's HTTP cache. The app uses `{ cache: 'no-cache' }` for all data fetches, forcing the browser to validate every file with the server (via ETags) before using the local copy, ensuring perfect data freshness.

**Consumed by:** `sw-register.js` → `checkRevision()` function and `tnea.js` → `preCacheAllYears()`.

**Rule for developers:** Every time you deploy, bump `app_revision` by 1. Every time you re-encrypt the data files, bump `data_revision` by 1.

---

## 5. /public/shared/css — Design System

All CSS files are loaded in strict order via `<link>` tags. The order matters:
1. `tokens.css` → defines the variables
2. `reset.css` → applies base rules that use those variables
3. `animations.css` → keyframes that can be referenced by any later CSS
4. `components.css` → component classes
5. `layout.css` → structural layout that uses component classes

---

### `public/shared/css/tokens.css`
Defines the entire **Design Token System** using CSS Custom Properties (variables) on `:root` and `body.dark`.

**Light Mode Tokens (`:root`):**
| Variable | Value | Purpose |
|---|---|---|
| `--accent` | `#2563EB` | Primary brand blue for buttons, active states |
| `--accent-hover` | `#1D4ED8` | Darker blue for hover states |
| `--accent-soft` | `#EFF6FF` | Very light blue for active pill backgrounds |
| `--bg-primary` | `#F8F9FB` | Page background |
| `--bg-card` | `#FFFFFF` | Card surfaces |
| `--bg-elevated` | `#FFFFFF` | Header, filter bar — elevated above bg-primary |
| `--bg-hover` | `#F1F5FF` | Hover state backgrounds |
| `--text-primary` | `#0f172a` | Main body text |
| `--text-secondary` | `#475569` | Labels, secondary info |
| `--text-muted` | `#000000` | Least important text |
| `--border` | `#e2e8f0` | Default border color |
| `--border-strong` | `#cbd5e1` | Stronger borders (e.g., address divider) |
| `--green` / `--green-bg` | Colors | Seat filled badge |
| `--amber` / `--amber-bg` | Colors | Partially filled seat badge |
| `--red` / `--red-bg` | Colors | Vacant/unfilled seat badge |
| `--shadow-sm` | 1px soft shadow | Subtle elevation for headers |
| `--shadow-md` | 4px richer shadow | Dropdowns, modal cards |
| `--radius` | `10px` | Standard border radius |
| `--radius-lg` | `16px` | Large radius for modals, cards |
| `--header-h` | `50px` | Sticky header height. Used to offset sticky filter bar (`top: var(--header-h)`) |
| `--t` | `0.15s ease` | Universal transition shorthand |

**Dark Mode Tokens (`body.dark`):** All the same variable names are redefined. Dark mode uses muted, deep grays for backgrounds and slightly brighter blues.

---

### `public/shared/css/reset.css`
Normalizes browser defaults so the app looks consistent across all browsers.

**What it does:**
- `box-sizing: border-box` on `*` — padding doesn't add to element width
- `margin: 0; padding: 0` on all elements — removes browser default spacing
- `html { font-size: 14px; overflow: hidden; }` — sets the base `rem` unit; `overflow: hidden` on `html` with `overflow-y: auto` on `body` creates a single scroll container
- `body { font-family: 'Inter'; overflow-y: auto; scrollbar-width: none; }` — uses Inter font, hides scrollbar on all devices
- `@media (min-width: 768px)` — hides webkit scrollbar on desktop
- `button { cursor: pointer; border: none; background: none; font: inherit; }` — resets all buttons to unstyled
- `input, select { font: inherit; }` — forces inputs to use the body's Inter font
- `svg { display: block; flex-shrink: 0; }` — prevents inline SVG spacing issues
- `.hidden { display: none !important; }` — universal hidden utility class
- `.desktop-view` / `.mobile-view` — responsive visibility toggles; at ≤767px, desktop-view is hidden and mobile-view is shown

---

### `public/shared/css/animations.css`
Contains all `@keyframes` definitions. Referenced by both CSS classes and inline styles.

| Animation Name | What it does | Used by |
|---|---|---|
| `fadeScale` | Scale from 0.95→1 + fade in | Community gate modal, sort dropdown |
| `slideUp` | Translate up 20px + fade in | District bottom sheet (mobile), apps grid on portal |
| `fadeDown` | Translate down -6px + fade in | Filter bar `filter-bar--hidden` reset, district dropdown |
| `expandDown` | max-height 0→600px + fade in | Previously used for drawer expansion |
| `gentlePulse` | Opacity 65%→100% cycle | Seat availability badges |
| `spin` | Full 360° rotation | Loading spinner |
| `blinkOpacity` | Opacity 100%→40% cycle | `card-hint` "Seat allocation info" text |
| `bounceY` | translateY 0→-5px→-3px→0 | "Load More" button continuous vertical bounce |

---

### `public/shared/css/layout.css`
Handles all structural layout: the sticky header, the sticky filter bar, the filter rows inside the bar, and responsive adjustments.

**`.site-header`** — `position: sticky; top: 0; z-index: 500;` height is `var(--header-h)` (50px). Has `box-shadow: var(--shadow-sm)`. Always visible at the top of the viewport.

**`.header-left`** — Flex container with `align-items: flex-end` (baseline-aligns logos). Holds `rankra_logo50.png`, the "TNEA cutoff" title, and `tnea100.png`.

**`.header-title`** — The text "TNEA cutoff". Font size 0.97rem, font-weight 800.

**`.header-export-btn`** — The "Share" button. `margin-left: auto` pushes it to the right side of the header. Has border, border-radius, hover accent color effect.

**`.icon-btn`** — 34×34px clickable icon container with hover background. Used for the theme toggle button.

**`.filter-bar`** — `position: sticky; top: var(--header-h); z-index: 400;` — sticks just below the header. Has `transition: transform 0.25s ease, opacity 0.25s ease` for the hide-on-scroll animation. `will-change: transform` is a GPU optimization hint.

**`.filter-bar--hidden`** — Applied by JS when scrolling down. Uses `transform: translateY(-110%)` to push the bar off screen upward. `opacity: 0; pointer-events: none` prevents invisible clicks.

**`.frow`** — Each row inside the filter bar. `display: flex; padding: 1px 0; min-height: 32px;`. The `min-height: 32px` ensures no row collapses below a usable touch target even when padding is minimal. `border-bottom: 1px solid var(--border)`.

**`.frow:last-child`** — Removes the bottom border from the last row.

**`.frow-scroll`** — The year tabs row. Added `overflow-x: auto; scrollbar-width: none;` for horizontal scroll on small screens without showing a scrollbar.

**`.frow-district`** — District filter row. Uses `overflow: visible; position: relative;` to allow the dropdown to render below without being clipped.

**`.frow-comms`** — Community chips row (if present). Allows wrapping.

**`.frow-bottom`** — Last row with cutoff inputs and result count. `flex-wrap: wrap; gap: 6px; padding: 1px 0;`

**Responsive breakpoints:**
- `@media (max-width: 767px)` — Reduces filter bar padding, hides `.sort-label`, reduces cutoff input width
- `@media (min-width: 651px)` — Increases card padding, font sizes for desktop. Filter bar gets `padding: 0 20px`

---

### `public/shared/css/components.css`
All reusable UI component styles. This is the largest CSS file.

**Skeleton Loading:** Replaced the full-screen loading overlay. Uses `.skeleton-box` with the `shimmer` animation to provide immediate visual feedback while data loads.

**Overlay / Gate:** `.overlay-full` is `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center`. Used for both the community gate and the vignette ad overlay. `.overlay-backdrop` is a translucent dark background with `backdrop-filter: blur(3px)`.

**Community Gate:** `.gate-sheet` is the modal card. `.gate-chips` is a flex-wrap grid of community selection buttons. `.gate-chip.selected` shows `border-color: var(--accent); background: var(--accent-soft)`. `.gate-continue` is a full-width primary button.

**District Bottom Sheet (Mobile):** `.sheet-content` is positioned at the bottom with `align-self: flex-end`. Height is `85vh`. Contains a search input, scrollable list, and footer with clear/apply buttons. On very small screens (`<449px`), the sheet-close and sheet-footer are repositioned into the header row to save space.

**Search Box:** `.search-box` is a flex container with a border and focus ring. `.search-icon` is an absolutely positioned SVG at left. `.search-input` fills the width with `padding: 5px 32px` (leaving room for the icon on left and clear button on right). `.search-clear` is a small `×` button that appears when there is text.

**District Dropdown:** `.district-dropdown` is `position: absolute; top: calc(100% + 6px); z-index: 600`. Has a search input, scrollable list of checkboxes, and a "Clear all" button footer. Animation: `fadeDown`.

**Sort/Comm Dropdown:** `.sort-dropdown` is `position: absolute; top: calc(100% + 6px); right: 0; min-width: 170px`. Each `.sort-option` has hover and `.active` states.

**Pill Button (`.pill-btn`):** `padding: 3px 10px; border-radius: 18px; border: 1.5px solid var(--border);`. On `.active`, shows accent border and soft background. The `.chevron` SVG inside rotates 180° when `aria-expanded="true"`.

**Skeleton Loading:** `.skeleton-box` uses a moving gradient shimmer (`background: linear-gradient(90deg, ...); animation: shimmer 1.5s infinite linear`). Placed inside `.skeleton-card` to show loading placeholders before data arrives.

**Seat Badges:** `.seat-badge` is a small pill with `font-size: clamp(0.55rem, 2.2vw, 0.7rem)`. Three variants: `.badge-full` (green), `.badge-partial` (amber), `.badge-empty` (red).

**Empty State:** `.empty-state` is a centered flex column with icon, title, subtitle, and a reset button.

**Buttons:** `.btn-primary` (filled accent), `.btn-ghost` (bordered), `.btn-ghost-sm` (smaller bordered).

---

## 6. /public/shared/js — Core Utilities

### `public/shared/js/utils.js`
4 exported helper functions and constants used across the entire codebase.

```js
export const $ = id => document.getElementById(id);
```
Shortcut for `document.getElementById`. Used everywhere as `$('element-id')`.

```js
export const $$ = sel => document.querySelectorAll(sel);
```
Shortcut for `document.querySelectorAll`. Returns a NodeList. Used as `$$('.class-name')`.

```js
export function tok(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w);
}
```
**Tokenizer:** Converts a string into an array of clean, lowercase words. Strips all non-alphanumeric characters (punctuation, hyphens, parentheses). Splits on whitespace. Filters empty strings. Used to index and query the Trie search. Example: `tok("Anna University (CEG)")` → `["anna", "university", "ceg"]`.

```js
export function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```
**HTML Escaper:** Sanitizes strings before inserting into `.innerHTML` to prevent XSS injection. Replaces `&`, `<`, `>`, `"` with their HTML entity equivalents.

---

### `public/shared/js/theme.js`
Manages the Rankra-wide dark/light theme system.

**Imports:** `$`, `$$` from `utils.js`.

```js
export function applyTheme(mode) {
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(mode);

  const iconSun = $('icon-sun');
  const iconMoon = $('icon-moon');
  if (iconSun) iconSun.classList.toggle('hidden', mode === 'light');
  if (iconMoon) iconMoon.classList.toggle('hidden', mode === 'dark');

  localStorage.setItem('rankra-theme', mode);
}
```

**`applyTheme(mode)`** — Accepts `'light'` or `'dark'`.
1. Removes both `light` and `dark` classes from `<body>`, then adds the new one. This triggers all `body.dark` CSS variable overrides in `tokens.css`.
2. Toggles the `#icon-sun` and `#icon-moon` SVG icons to show the correct one. In light mode, moon icon shows (click to go dark). In dark mode, sun shows (click to go light).
3. Persists the choice in `localStorage` under key `rankra-theme` so the preference survives page refreshes.

**Persistence:** On each page load, the app reads `localStorage.getItem('rankra-theme')` and calls `applyTheme` accordingly. If no preference is stored, it checks `window.matchMedia('(prefers-color-scheme:dark)')` as a system default fallback.

---

### `public/shared/js/trie.js`
A **Prefix Tree (Trie)** data structure for fast real-time text search across thousands of college records.

**Why a Trie?** Linear `Array.filter + String.includes` on 3,000+ records on every keypress causes noticeable UI lag. A Trie indexes every word once at boot and then retrieves matching record indices in O(prefix_length) time.

```js
export class Trie {
  constructor() { this.r = {}; }
```
`this.r` is the root node of the tree. Each key in the node object is a single character. Each node has a `_` property which is an array of record indices.

```js
  add(w, i) {
    let n = this.r;
    for (const c of w) {
      if (!n[c]) n[c] = { _: [] };
      if (n[c]._.length < 5000) n[c]._.push(i);
      n = n[c];
    }
  }
```
**`add(word, index)`** — Walks through each character of the word, creating tree nodes as needed. At every node along the path (not just at the leaf), it records the record index `i` in the `_` array. The `< 5000` cap prevents any single prefix from having an unbounded array (memory protection). This "store at every node" approach means `find("an")` instantly returns all records containing words starting with "an".

```js
  find(p) {
    let n = this.r;
    for (const c of p) {
      if (!n[c]) return new Set();
      n = n[c];
    }
    return new Set(this._c(n));
  }
```
**`find(prefix)`** — Navigates to the node for the last character of the prefix. If any character is missing in the tree, returns an empty `Set` (no results). Otherwise collects all indices from that node downward via `_c`.

```js
  _c(n) {
    let r = [...n._];
    for (const k in n) {
      if (k !== '_') r = r.concat(this._c(n[k]));
    }
    return r;
  }
```
**`_c(node)`** — Recursive collector. Gathers all `_` index arrays from the current node and all its children, producing a flat array of all matching record indices.

**Multi-word search:** Each search term is tokenized into words. Each word gets its own `find()` call producing a Set. The app then intersects these Sets (AND logic) — records must match ALL words. E.g., "CEG computer" finds records where both "ceg" and "computer" appear in the indexed fields.

---

### `public/shared/js/sw-register.js`
Handles Service Worker lifecycle and revision-based cache invalidation.

**Imports:** `$` from `utils.js`.

```js
export async function checkRevision(apiPath) {
  try {
    const res = await fetch(apiPath, { cache: 'no-store' });
    if (!res.ok) return;
    const { app_revision, data_revision } = await res.json();
    const stored = parseInt(localStorage.getItem('rankra-app-revision') || '0', 10);
    if (app_revision !== stored) {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      localStorage.setItem('rankra-app-revision', String(app_revision));
    }
  } catch (e) {
    // Silent fail — don't crash the app if API is unreachable
  }
}
```
**`checkRevision(apiPath)`** — Fetches `api/update.json` with `cache: 'no-store'` to always bypass browser caching for this one request. Compares the server's `app_revision` against what's stored in localStorage. If different, **deletes all browser caches** using `caches.keys()` + `caches.delete()`. Then stores the new revision number. Next page load, the browser fetches everything fresh.

```js
**`registerSW(swPath)`** — Registers a Service Worker file. Not actively used in the current TNEA app (SW was removed), but kept in the shared layer for future apps that need it.

---

## 7. /public/shared/components/dummy-ad — Ad Component

### `dummy-ad.js`
A self-contained ad simulator used **in place of real AdSense ad units** during development and as actual "house ads" in production. The same function is used for both vignette and in-feed ad placements.

```js
export function generateAdMockup() {
  const themes = [
    { text: "Find Your Perfect Tech Stack", cta: "Explore Now" },
    { text: "Best Engineering Colleges in TN", cta: "See Rankings" },
    // ... 11 total themes
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  return `<div class="ad-sim">...</div>`;
}
```

**`generateAdMockup()`** — Picks a random ad "theme" from the `themes` array (13 options). Returns an HTML string encoding the following ad structure:
- `.ad-sim-id-badge` — Yellow "Ad" badge, top-left corner
- `.ad-sim-controls` — `fa-circle-info` and `fa-xmark` icons, top-right
- `.ad-sim-content` — The ad headline (randomized) and a CTA button
- `.ad-sim-footer` — "Ads by Rankra" attribution

The returned HTML string is set via `.innerHTML = generateAdMockup()` on an `.ad-container` wrapper div.

**Randomization:** Every call to `generateAdMockup()` selects a different random ad theme so users see variety across sessions.

---

### `dummy-ad.css`
Styles for the ad simulator widget.

- **`.ad-container`** — Wrapper that forces `width: 100%; margin: 12px 0; overflow: hidden`.
- **`.ad-sim`** — `position: relative; background: var(--bg-card); border-radius: 12px; box-shadow`. Has a `transform: translateY(-2px)` hover lift effect.
- **`.ad-sim-id-badge`** — Yellow `#fbc02d` pill with "Ad" text. `position: absolute; top: 8px; left: 8px`.
- **`.ad-sim-controls`** — Info and close icons. `position: absolute; top: 8px; right: 8px`.
- **`.ad-sim-content`** — `display: flex; justify-content: space-between; padding: 24px 16px; background: var(--bg-hover)`. On mobile (`<600px`), switches to `flex-direction: column`.
- **`.ad-sim-title`** — `flex: 1` to consume available space.
- **`.ad-sim-cta`** — Solid blue button `background: #1a73e8` (Google blue). `border-radius: 20px; padding: 6px 16px`.
- **`.ad-sim-footer`** — 10px gray "Ads by Rankra" attribution at the bottom.

---

## 8. /public/assets — Media and Data

### `/public/assets/engineering/tnea/cutoff/tnea100.png`
The TNEA brand/logo image (100px dimensions). Used in the app header and on the root portal.

### `/public/assets/db/tnea/cutoff/`
Contains 5 binary data files. **There are no raw JSON files here.** All data has been processed through the security pipeline:

| File | Original Source | Year |
|---|---|---|
| `0202.gzip` | `tnea_c_2020.json` | 2020 |
| `1202.gzip` | `tnea_c_2021.json` | 2021 |
| `2202.gzip` | `tnea_c_2022.json` | 2022 |
| `3202.gzip` | `tnea_c_2023.json` | 2023 |
| `4202.gzip` | `tnea_c_2024.json` | 2024 |

**Filename logic:** The year is reversed character-by-character (e.g., `"2024".split('').reverse().join('')` → `"4202"`). This is a basic obfuscation so someone inspecting network requests can't immediately identify what year they're downloading.

**Size comparison:** Original JSON files were ~1.8–2.2MB each (~10MB total). After gzip+encryption each file is ~110–160KB total (~700KB total). A **~14x reduction** in download size.

---

## 9. /public/assets — Brand Assets

| File | Size | Usage |
|---|---|---|
| `rankra_favicon30.png` | 30px | `<link rel="icon">` on all pages |
| `rankra_logo.png` | Full | Portal hero section (`index.html`) |
| `rankra_logo50.png` | 50px render | App headers (`height="30"` attribute in HTML) |

---

## 10. /public/tnea/cutoff — TNEA Application

### 10.01 `public/tnea/cutoff/index.html`
The main entry point for the TNEA Cutoff web app. 257 lines.

**`<head>` section:**
- **SW kill script (lines 5–10):** Inline script that runs synchronously before CSS/JS load to unregister any previously installed Service Workers. This ensures that old SW caches don't interfere with the current session. Uses `navigator.serviceWorker.getRegistrations().then(...)`.
- **Meta tags:** `charset`, `viewport`, SEO `title`, `meta description` describing the app's 2020–2024 coverage.
- **Font:** Google Inter font loaded via `fonts.googleapis.com`.
- **CSS load order:** `tokens.css` → `reset.css` → `animations.css` → `components.css` → `layout.css` → `dummy-ad.css` → `tnea.css`. Each layer relies on variables defined by the previous.

**Overlays (before main content in DOM):**

**Community Gate `#community-gate` (lines 34–52):** A full-screen overlay (`overlay-full hidden`) with a modal sheet. On first visit (when `tnea-primary` is not in localStorage), this is shown. Contains 7 `.gate-chip` buttons for OC, BC, BCM, MBC, SC, SCA, ST. The `#gate-continue` button is disabled until a chip is selected. Selecting a chip sets the user's primary community for the session.

**District Bottom Sheet `#district-sheet` (lines 55–71):** Mobile-only sliding panel that replaces the desktop dropdown. Contains a search input (`#district-sheet-search`), a scrollable list of checkboxes (`#district-sheet-list`), and a footer with "Clear All" + "Apply" buttons. Has a backdrop element (`#district-sheet-backdrop`) that closes the sheet when clicked.

**Skeleton Loading:** The app immediately calls `renderSkeletons()` during `boot()` which fills `#results-body` with shimmer placeholders while `loadYear()` runs in the background. This provides instant visual feedback without blocking the UI with an overlay.

**Site Header (lines 88–116):**
- `.header-left` — Logo + "TNEA cutoff" text + TNEA logo
- `#export-btn (.header-export-btn)` — "Share" button with `fa-share` icon
- `#theme-toggle (.icon-btn)` — Sun/Moon SVG toggle

**Filter Bar `#filter-bar` (lines 119–214):**
- **Row 1 (`.frow`):** Search box with `#search-input`, a search SVG icon, and `#search-clear` button.
- **Row 2 (`.frow.frow-scroll`):** Horizontally scrollable year tab container `#year-tabs`. Tabs are dynamically generated by JS from `TNEA_CONFIG.years`.
- **Row 3 (`.frow.frow-district`):** District filter pill button `#district-btn` with its desktop dropdown `#district-dropdown` (containing `#dd-search-input`, `#dd-list` checkboxes, `#dd-clear`). Also contains the Sort group with `#sort-btn` and `#sort-dropdown` (5 sort options).
- **Row 4 (`.frow.frow-bottom`):** Cutoff range inputs `#cutoff-min` and `#cutoff-max` (each 0–200, step 0.5), the community sort target dropdown `#comm-btn` / `#comm-dropdown`, and the `#results-count` text.

**Main Content (lines 220–242):**
- `#results-body` — Empty div where result cards are dynamically injected.
- `#load-more-wrap` — Hidden wrapper for the "Load More" button. Contains `#load-more-btn` with two `fa-angles-down` icons and a `bounceY` animation.
- `#empty-state` — Hidden div shown when no results match filters. Has a search icon, "No results found" title, subtitle, and `#empty-reset` button.

**Vignette Ad Overlay (lines 247–252):** `#vignette-ad` with class `overlay-full vignette-overlay hidden`. Contains a modal box with `#vignette-close` button and `.ad-vignette` container where the ad mockup HTML is injected.

**Script (line 254):** `<script type="module" src="tnea.js">` — Loads the main application as an ES Module.

---

### 10.02 `public/tnea/cutoff/tnea-config.js`
A **pure configuration object** for the TNEA app. Contains no logic. Changing this file is the correct way to modify app-wide settings.

```js
export const TNEA_CONFIG = {
  id: 'tnea',
  name: 'TNEA Cutoff',
  description: '...',
  years: ['2020', '2021', '2022', '2023', '2024'],
  communities: ['OC', 'BC', 'BCM', 'MBC', 'SC', 'SCA', 'ST'],
  seatKeys: {
    OC:  { tl: 'octl',  al: 'ocal'  },
    BC:  { tl: 'bctl',  al: 'bcal'  },
    BCM: { tl: 'bcmtl', al: 'bcmal' },
    MBC: { tl: 'mbctl', al: 'mbcal' },
    SC:  { tl: 'sctl',  al: 'scal'  },
    SCA: { tl: 'scatl', al: 'scaal' },
    ST:  { tl: 'sttl',  al: 'stal'  },
  },
  districtNorm: { 'Kanchipuram': 'Kancheepuram', ... },
  dataPath: '../../assets/db/tnea/cutoff/',
  chunkSize: 60,
};
```

**Fields:**
- `id` / `name` / `description` — App identity metadata
- `years` — The 5 years of data available. Adding a new year here and providing the data file is all that's needed to show a new tab.
- `communities` — The 7 Tamil Nadu reservation communities. The order matters — it defines the column order in the cutoff table.
- `seatKeys` — Maps each community code to the JSON field names for total seats (`tl`) and allocated/filled seats (`al`). E.g., for OC: total is `octl`, filled is `ocal`.
- `districtNorm` — A spelling normalization map. Raw data sometimes has inconsistent district spellings (e.g., `'Kanchipuram'` vs `'Kancheepuram'`). This map corrects them to the canonical name. Used in `loadYear()`.
- `dataPath` — Relative path from `tnea.js` to the data directory. Currently `'../../assets/db/tnea/cutoff/'`.
- `chunkSize` — Legacy setting (60), no longer used since switching to the "Load More 20" pattern.

---

### 10.03 `public/tnea/cutoff/tnea.css`
Application-specific CSS file that overrides and extends the shared styles for TNEA-specific components.

**Year Tabs (`.year-tab`):** `padding: 2px 12px; border-radius: 18px; border: 1.5px solid transparent`. Active state has `background: var(--accent-soft); border-color: var(--accent); color: var(--accent); font-weight: 600`.

**Cutoff Group (`.cutoff-group`):** Flex container that holds the label, min/max inputs, and community dropdown. Uses `flex-wrap: wrap` for narrow screens.

**Cutoff Input (`.cutoff-input`):** 52px wide number input with centered text. `padding: 2px 5px`. Has `border: 1.5px solid var(--border); border-radius: 6px`. Focus state shows accent border.

**Custom Select (`.custom-select`):** A styled `<select>` with a custom SVG arrow icon embedded as a `background-image` data URL. Dark mode gets a different arrow color via `body.dark .custom-select`.

**Sort Group (`.sort-group`):** `margin-left: auto` to push the sort controls to the right side of the row.

**Skeleton Loading:** `.skeleton-box` with shimmer gradient animation. `.skeleton-card` has `pointer-events: none` to block interactions.

**Result Cards (`.result-card`):**
- `background: var(--bg-card); border-bottom: 5px solid var(--bg-primary); border-radius: 15px`
- Hover: `background: var(--bg-hover)`
- Expanded (`.expanded`): `background: var(--accent-soft)`

**Card Header (`.card-header`):** `padding: 12px 16px 10px`. Contains: `.card-code-line` (code badge + district), `.card-name` (college name), `.card-branch` (branch code + name).

**Cutoff Table (`.comm-table`):**
- `.ct-row` — `display: grid; grid-template-columns: minmax(0, 0.9fr) repeat(7, 1fr)` — 8 columns: 1 label + 7 communities
- `.ct-th` — Column header. `font-size: clamp(0.38rem, 1.8vw, 0.5625rem)` — scales with viewport. `.primary` variant in accent color.
- `.ct-td` — Data cell. `font-size: clamp(0.55rem, 3vw, 0.875rem)`. `.nd` (no data) shows muted dash.
- `.ct-label` — Row label (e.g., "Cutoff", "Total seats"). `display: flex; align-items: center; justify-content: center; white-space: nowrap`.

**Seat Detail (`.seat-detail`):** Hidden by default. Shown on card click expansion. Contains three rows: Total seats, Filled seats, Unfilled seats.

**Card Footer (`.card-foot`):** `display: flex; justify-content: space-between; padding: 8px 14px; border-top`. Three sections: `.card-foot-left` (global seat badge), `.card-foot-center` (blinking "Seat allocation info" hint), `.card-foot-right` (community-specific badge).

**Card Address (`.card-address`):** Optional bottom section with a location pin SVG and the address text. `border-top: 1px dashed var(--border-strong)`.

**Desktop overrides (`@media (min-width: 651px)`):** Larger `card-header` padding, bigger `card-name` font, bigger `card-branch`, larger `ct-th` and `ct-td` sizes, and `ct-label` left-aligned.

---

### 10.04 `public/tnea/cutoff/tnea.js`
The **core application logic engine** (769 lines). An ES Module that imports utilities, manages state, handles data, and drives the entire TNEA Cutoff UI.

#### Imports (lines 1–5)
```js
import { $, $$, esc, tok } from '../../shared/js/utils.js';
import { applyTheme } from '../../shared/js/theme.js';
import { Trie } from '../../shared/js/trie.js';
import { TNEA_CONFIG } from './tnea-config.js';
import { generateAdMockup } from '../../shared/components/dummy-ad/dummy-ad.js';
```
All five dependencies imported: DOM helpers, theme toggler, search index, app config, and the ad template generator.

---

#### Encryption Key Variables (lines 7, 58, 213)
```js
const _v1 = "rank";   // line 7 — placed near top imports
const _v2 = "vicky";  // line 58 — placed after syncURL(), before initFromURL()
const _v3 = "1611";   // line 213 — placed after boot(), before _rx()
```
These three innocuous-looking constants are actually the **three parts of the XOR decryption key** for the data files. Intentionally scattered far apart in the code to confuse casual inspection. The actual key is assembled in `_rx()` as: `_v1 + "ra" + _v2 + _v3` → `"rankravicky1611"`.

---

#### State Object `S` (lines 9–30)
The single source of truth for all application state. A plain JavaScript object:

| Property | Type | Default | Meaning |
|---|---|---|---|
| `year` | String | `'2024'` | Currently selected data year |
| `data` | Array | `[]` | Full decoded dataset from the `.gzip` file |
| `filtered` | Array | `[]` | Result of applying all filters to `data` |
| `rendered` | Number | `0` | Count of cards currently in the DOM |
| `expandedIdx` | Number | `-1` | Index of the currently expanded card (-1 = none) |
| `search` | String | `''` | Current search query text |
| `districts` | Set | `new Set()` | Selected district filter values |
| `primaryComm` | String\|null | `null` | User's chosen community from the gate (persisted) |
| `cutoffMin` | Number | `0` | Minimum cutoff filter value |
| `cutoffMax` | Number | `200` | Maximum cutoff filter value |
| `cutoffComm` | String | `''` | Which community's cutoff to filter/sort by |
| `sortBy` | String | `'cutoff-desc'` | Current sort mode |
| `isMobile` | Boolean | `false` | Whether viewport is <768px |
| `trie` | Trie\|null | `null` | The loaded search index |
| `districtIndex` | Map\|null | `null` | Maps district name → Set of record indices |
| `lastAdTime` | Number | `0` | Timestamp (ms) of last in-feed ad injection |

---

#### `setCommUI(val)` (line 34)
```js
function setCommUI(val) {
  $$('.comm-option').forEach(o => o.classList.toggle('active', o.dataset.value === val));
  if ($('comm-btn-text')) $('comm-btn-text').textContent = val || 'OC';
}
```
Syncs the community dropdown UI to reflect the current `S.cutoffComm`. Marks the correct `.comm-option` as `.active` and updates the button label text. Called whenever `cutoffComm` changes.

---

#### `syncURL()` (line 42)
```js
function syncURL() {
  const params = new URLSearchParams();
  if (S.year !== '2024') params.set('year', S.year);
  if (S.search) params.set('q', S.search);
  if (S.districts.size > 0) params.set('d', [...S.districts].join(','));
  if (S.cutoffComm) params.set('c', S.cutoffComm);
  if (S.cutoffMin > 0) params.set('min', S.cutoffMin);
  if (S.cutoffMax < 200) params.set('max', S.cutoffMax);
  if (S.sortBy !== 'cutoff-desc') params.set('sort', S.sortBy);
  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '');
  window.history.replaceState(null, '', url);
}
```
Deep-links the current filter state into the browser URL using `history.replaceState` (no page reload). Only includes non-default values to keep URLs clean. This makes the app shareable — any filter combination can be bookmarked or shared as a URL.

**URL parameters:**
- `year` — Selected year (omitted if 2024, the default)
- `q` — Search query
- `d` — Comma-separated district list
- `c` — Selected community
- `min`, `max` — Cutoff range
- `sort` — Sort mode (omitted if default `cutoff-desc`)

---

#### `initFromURL()` (line 60)
The inverse of `syncURL`. Reads `window.location.search` on page load and hydrates the `S` state object from URL parameters. Called at the start of `init()`. If `year`, `q`, `d`, `c`, `min`, `max`, or `sort` are present, they override the defaults in `S` and update the relevant UI elements immediately.

---

#### `init()` (line 100) — Async Entry Point
The main initialization function, triggered by `document.addEventListener('DOMContentLoaded', init)` at the bottom of the file.

**Step-by-step execution:**
1. `S.isMobile = window.innerWidth < 768` — Detect mobile viewport
2. `initFromURL()` — Restore state from URL params
3. **Native Ad Persistence:** Reads `localStorage.getItem('native_ad_last_time')` and sets `S.lastAdTime`. This ensures the 10–15s cooldown is respected even after a page refresh.
4. **Vignette Ad Logic:** Reads `localStorage.getItem('vignette_ad_time')`. If no timestamp exists OR it's been more than `10 * 60 * 1000` ms (10 minutes), generates a new ad mockup via `generateAdMockup()`, injects it into `.ad-vignette`, shows `#vignette-ad`, and saves the current timestamp. The `#vignette-close` click handler hides the overlay.
5. **Year Tabs Generation:** Reads `TNEA_CONFIG.years` and creates a `<button class="year-tab">` for each year. The currently active year gets the `.active` class and `aria-selected="true"`.
6. **Theme:** Reads `rankra-theme` from localStorage and applies it via `applyTheme()`. Fallback to system preference.
7. **Community Gate Check:** Reads `tnea-primary` from localStorage. If not set, hides loading overlay and calls `showGate()`. If set, restores `S.primaryComm`, syncs community UI, and calls `boot()`.

---

#### `showGate()` (line 161)
Shown on the user's very first visit. Reveals the `#community-gate` overlay. Attaches click handlers to all `.gate-chip` buttons to track `selected`. When `#gate-continue` is clicked: stores the selection in `S.primaryComm` and `S.cutoffComm`, saves to localStorage (`tnea-primary`), hides the gate, and calls `boot()`.

---

#### `boot()` (line 187) — Async
Called after the community gate is satisfied (either first-time selection or stored preference retrieved).
1. `renderSkeletons()` — Shows shimmer placeholders immediately
2. `await loadYear(S.year)` — Fetches, decrypts, and parses the data
3. `buildDistrictList()` — Builds the district filter UI from loaded data
4. `bindEvents()` — Attaches all event listeners (called once)
5. `render()` — Applies filters, sorts, and paints results

---

#### `tryInjectAd(parent)` (line 195)
The **centralized native ad injection function** with anti-bot timing logic.

```js
function tryInjectAd(parent) {
  if (!parent) return;
  const now = Date.now();
  const interval = 10000 + Math.random() * 5000;  // Random 10s–15s
  if (!S.lastAdTime || now - S.lastAdTime > interval) {
    const adWrapper = document.createElement('div');
    adWrapper.className = 'ad-container in-feed-ad';
    adWrapper.innerHTML = generateAdMockup();
    parent.after ? parent.after(adWrapper) : parent.appendChild(adWrapper);
    S.lastAdTime = now;
    localStorage.setItem('native_ad_last_time', now.toString());
    console.log("In-feed ad injected (Interval: " + Math.round(interval/1000) + "s)");
    return true;
  }
  console.log("Ad suppressed (Cooldown)");
  return false;
}
```
- `interval` = random float between 10000ms and 15000ms. Randomized every call intentionally.
- If enough time has passed (or no ad has been shown yet), creates a `.ad-container.in-feed-ad` div, sets its `.innerHTML` to a fresh ad mockup, and inserts it **after** the parent element in the DOM using `parent.after()`.
- Updates `S.lastAdTime` and writes to `localStorage` (`native_ad_last_time`) for cross-session persistence.
- Returns `true` if an ad was injected, `false` if suppressed.
- Called in two places: after first card on initial load (`renderResults`), and on every "Load More" click (`bindEvents`).

---

#### `_rx(_d)` (line 215) — Async Decryptor (Obfuscated)
```js
async function _rx(_d) {
  const _k = (_v1 + "ra" + _v2 + _v3).split('').map(c => c.charCodeAt(0));
  const _b = new Uint8Array(_d);
  for (let i = 0; i < _b.length; i++) _b[i] ^= _k[i % _k.length];
  const _s = new Response(_b).body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(_s).json();
}
```
- **`_d`** — Raw `ArrayBuffer` from the `.gzip` fetch
- **`_k`** — Assembles the key `"rankravicky1611"` from the three scattered constants and converts each character to its ASCII char code array: `[114, 97, 110, 107, 114, 97, 118, 105, 99, 107, 121, 49, 54, 49, 49]`
- **XOR Decryption loop** — For each byte in the buffer, XOR it with the corresponding key byte (wrapping with `i % _k.length`). This recovers the original Gzip binary.
- **`DecompressionStream('gzip')`** — A browser-native Web API that decompresses Gzip streams. Wraps the decrypted bytes in a `Response` body and pipes through the decompressor.
- **`new Response(_s).json()`** — Reads the decompressed stream to completion and parses it as JSON.
- Result: The original JavaScript array of college record objects, available in memory only. Never written to disk.

---

#### `loadYear(year)` (line 223) — Async
```js
async function loadYear(year) {
  const rev = year.split('').reverse().join('');
  $('loading-status').textContent = `Syncing ${year}…`;
  $('loading-bar').style.width = '30%';
  try {
    const res = await fetch(`${TNEA_CONFIG.dataPath}${rev}.gzip`);
    if (!res.ok) throw new Error(res.status);
    const buf = await res.arrayBuffer();
    const raw = await _rx(buf);
    $('loading-bar').style.width = '75%';
    S.data = raw.map(r => {
      const d = TNEA_CONFIG.districtNorm[r.district] || r.district || 'Unknown';
      const conClean = r.con ? r.con.split('\n')[0].trim() : '';
      const abbrMatch = r.con ? r.con.match(/\(([^)]+)\)/g) : null;
      const abbrs = abbrMatch ? abbrMatch.map(m => m.slice(1, -1).toLowerCase()) : [];
      return { ...r, district: d, _conClean: conClean, _abbrs: abbrs };
    });
    buildSearchIndex();
    $('loading-bar').style.width = '100%';
  } catch (e) {
    $('loading-status').textContent = `Error: ${e.message}`;
    console.error(e);
  }
}
```
1. Reverses the year string to construct the filename (e.g., `'2024'` → `'4202'`)
2. Updates loading status text; sets loading bar to 30%
3. Fetches `4202.gzip` as an `ArrayBuffer`
4. Passes to `_rx()` to decrypt and decompress → returns raw JS array
5. Sets loading bar to 75%
6. **Data normalization** for each record `r`:
   - `d` — Normalizes district name using `TNEA_CONFIG.districtNorm` map
   - `conClean` — Extracts only the first line of `r.con` (strips the address which appears on subsequent lines)
   - `abbrs` — Extracts all parenthetical abbreviations from `r.con` (e.g., `"(CEG)"` → `"ceg"`). Used in search indexing.
   - Spreads the original record + adds `district` (normalized), `_conClean`, `_abbrs` helper properties
7. Calls `buildSearchIndex()` to index the loaded data
8. Sets loading bar to 100%

---

#### `buildSearchIndex()` (line 250)
Indexes every loaded record into the Trie and the district Map.

For each record `r` at index `i`:
- Tokenizes `r._conClean` (college name) and adds each word → `i` to the Trie
- Adds each abbreviation from `r._abbrs` (e.g., "ceg") → `i`
- Tokenizes `r.brn` (branch name) and adds each word → `i`
- Adds `r.brc` lowercase (branch code, e.g., "by") → `i`
- Adds `String(r.coc)` (raw college code number) → `i`
- Adds zero-padded `r.coc` (e.g., `"0001"`) → `i`
- Populates `S.districtIndex` Map: `district name → Set of record indices`

---

#### `applyFilters()` (line 268)
Computes `S.filtered` by applying all active filter conditions. Called by `render()`.

1. **Guard:** If `S.trie` is null (data not loaded), sets `S.filtered = []` and returns early
2. **Search:** If `S.search` is non-empty, tokenizes it and calls `S.trie.find(term)` for each token. Intersects all result Sets (AND logic). Maps index set to actual record objects.
3. **District filter:** If `S.districts.size > 0`, filters records to only those in selected districts
4. **Cutoff range filter:** If `S.cutoffComm` is set and either limit is non-default, filters records where `parseFloat(r[cutoffComm])` is within `[cutoffMin, cutoffMax]`. Records with `NaN` cutoff are excluded.
5. Calls `sortArr()` on the result
6. Stores final result in `S.filtered`, resets `S.rendered = 0` and `S.expandedIdx = -1`

---

#### `sortArr(arr)` (line 298)
Sorts the filtered array without mutating it (uses spread `[...arr]`).

Sort modes:
- `cutoff-desc` — Highest cutoff first. Uses `parseFloat(a[comm]) || 0`. Community = `S.cutoffComm || S.primaryComm || 'OC'`
- `cutoff-asc` — Lowest cutoff first
- `name-asc` — Alphabetical by college name (`_conClean`). Uses `localeCompare`.
- `code-asc` — Numerical by college code (`coc`)
- `vacant-desc` — Most vacant (unfilled) seats first. Uses `tVacant()` helper

---

#### `tSeats(r)`, `tFill(r)`, `tVacant(r)` (line 318–320)
Three helper functions for seat calculations across all 7 communities:

- **`tSeats(r)`** — Sums all community `tl` (total) seat fields using `TNEA_CONFIG.communities.reduce(...)`. E.g., `octl + bctl + bcmtl + ... = total seats for that branch`
- **`tFill(r)`** — Sums all community `al` (allocated/filled) seat fields
- **`tVacant(r)`** — Returns `tSeats(r) - tFill(r)` = number of unfilled seats across all communities

---

#### `render()` (line 323)
The main re-render function. Called every time any filter, sort, search, or year changes.
1. `applyFilters()` — Recomputes `S.filtered`
2. `syncURL()` — Updates the browser URL
3. `renderResults(true)` — Resets and re-paints the first 20 results
4. Shows/hides the empty state
5. Updates `#results-count` text
6. `window.scrollTo({ top: 0, behavior: 'smooth' })` — Scrolls back to top

---

#### `renderResults(reset)` (line 339)
Renders the next batch of result cards (20 at a time, "Load More" pattern).

- If `reset = true`: clears `#results-body` innerHTML, sets `S.rendered = 0`
- Calculates `from` and `to` (next 20 records from `S.filtered`)
- If nothing to render: hides `#load-more-wrap` and returns early
- Loops `from → to`: creates each card via `mkResultCard()`, adds it to a `DocumentFragment` (batched DOM update for performance)
- On initial load (`from === 0`) and after the first card (`i === 0`): calls `tryInjectAd(card)` to attempt native ad injection
- Appends the fragment to `#results-body`, sets `S.rendered = to`
- Shows/hides `#load-more-wrap` based on whether more records remain

---

#### `renderSkeletons()` (line 374)
Shows 6 shimmer placeholder cards before real data loads. Each skeleton card is a `.result-card.skeleton-card` with 3 `.skeleton-box` divs of specific sizes replicating the real card layout. `pointer-events: none` prevents any interaction. Cleared when `renderResults()` runs.

---

#### `mkResultCard(r, idx)` (line 400)
Creates and returns a single fully-rendered `.result-card` DOM element for record `r`.

**Building the cutoff table:**
- `headerCells` — Builds 8 column headers: a `ct-label` "Community" then one `.ct-th` per community. The user's `primaryComm` gets the `.primary` class and a `★` indicator.
- `cutoffCells` — One `.ct-td` per community with the cutoff value (`n.toFixed(1)` if decimal, `n` if whole number). If no data: shows `—` with `.nd` class.

**Seat badges (`.card-foot-left`, global):**
- Calls `tSeats()`, `tFill()`, `tVacant()` for total across all communities
- If 0 vacancies: green "✓ All seats filled" badge
- If 1–3 vacancies: amber badge
- If >3 vacancies: red badge

**Right badge (`.card-foot-right`, community-specific):**
- Uses `S.cutoffComm` or `S.primaryComm` to pick the community
- Looks up seats using `TNEA_CONFIG.seatKeys[cc].tl` and `.al`
- Same color logic as left badge but with community-specific message

**Seat detail rows (hidden):**
- Three `.ct-row` divs showing Total/Filled/Unfilled seats per community
- Hidden by default, revealed on card click via `toggleCardDetail()`

**Card HTML template:** Assembled as a template literal and set via `.innerHTML`. Contains `.card-header`, `.comm-table`, `.card-foot`, and optional `.card-address`.

**Auto-expand first card:** If `idx === 0`, adds `.expanded`, unhides `.seat-detail`, rotates the caret icon.

**Click handler:** Each card gets `addEventListener('click', () => toggleCardDetail(card))`.

---

#### `toggleCardDetail(card)` (line 491)
Accordion-style toggle for the seat detail expansion.
1. Gets the `.seat-detail` element and `.fa-caret-down` icon from within the card
2. Checks if currently open (`!detail.hidden`)
3. Closes ALL currently expanded cards (removes `.expanded`, hides `.seat-detail`, resets caret)
4. If the clicked card was NOT already open: adds `.expanded`, shows `.seat-detail`, rotates caret 180°

This ensures only one card is ever expanded at a time.

---

#### `buildDistrictList()` (line 510)
Builds both the desktop dropdown and mobile sheet district lists from `S.districtIndex`.

- **Desktop:** Gets all district names from `S.districtIndex.keys()`, sorts alphabetically, creates a `<label><input type="checkbox">District Name</label>` for each in `#dd-list`. Each checkbox's `change` event adds/removes the district from `S.districts` and calls `syncDistrictLabel()` then `render()`.
- **Mobile sheet:** Same district list, same checkbox structure, but in `#district-sheet-list`. The "Apply" button reads checked values instead of live-updating.

---

#### `syncDistrictLabel()` (line 536)
Updates the district button label and active state.
- If 1+ districts selected: label = `'District (N)'`, adds `.active` class
- If none: label = `'District'`, removes `.active`

---

#### `bindEvents()` (line 543)
Called once from `boot()` after data is loaded. Attaches all event listeners to the static DOM elements.

**All event bindings:**
- `#dd-search-input` input → filters labels in `#dd-list` live (client-side text filter)
- `#district-sheet-search` input → same for mobile sheet list
- `#theme-toggle` click → `applyTheme()` toggle
- `#export-btn` click → `alert('Exporting feature is coming soon!')`
- `#search-input` input → debounced (150ms) call to `render()` via `setTimeout`. Shows/hides `#search-clear` button.
- `#search-clear` click → clears search input, clears `S.search`, calls `render()`, refocuses input
- `#year-tabs` click (delegated) → finds the clicked `.year-tab`, updates all tabs' aria-selected + class, updates `S.year`, shows skeletons, calls `loadYear()` + `buildDistrictList()` + `render()`
- `#district-btn` click → opens mobile sheet (if `S.isMobile`) or toggles desktop dropdown
- `document` click → closes all custom dropdowns when clicking outside them
- `#dd-clear` click → clears `S.districts`, unchecks all, re-renders
- Mobile sheet buttons → backdrop closes, close button closes, clear button clears, apply button reads checked values into `S.districts`
- `#cutoff-min` change → clamps value to `[0, 200]`, updates `S.cutoffMin`, re-renders
- `#cutoff-max` change → clamps value to `[0, 200]`, updates `S.cutoffMax`, re-renders
- `#comm-btn` click → toggles `#comm-dropdown` visibility
- `.comm-option` clicks → sets `S.cutoffComm`, updates UI, closes dropdown, re-renders
- `#sort-btn` click → toggles `#sort-dropdown` visibility
- `#sort-dropdown .sort-option` clicks → sets `S.sortBy`, updates button text (stripping the `<i>` icon via DOM clone), marks active, closes dropdown, re-renders
- `#empty-reset` click → calls `resetAll()`
- `#load-more-btn` click:
  1. Gets all current `.result-card` elements, saves the last one as `lastItem`
  2. Removes all existing `.in-feed-ad` elements
  3. Calls `tryInjectAd(lastItem)` for the ad before loading more
  4. Calls `renderResults(false)` to append the next 20 cards
  5. Scrolls `lastItem` into view smoothly
- `window resize` → if crossing the 768px boundary, updates `S.isMobile` and re-renders
- **Scroll listener (hide-on-scroll filter bar):**
  - Tracks `lastScrollY`
  - Within 60px of top: always shows filter bar
  - Scrolled down >4px since last position: adds `.filter-bar--hidden`
  - Scrolled up >4px since last position: removes `.filter-bar--hidden`
  - `{ passive: true }` is specified to improve scroll performance

---

#### `resetAll()` (line 754)
Resets all filter state to defaults:
- Clears search input and `S.search`
- Clears `S.districts`, unchecks all checkboxes in `#dd-list`
- Resets cutoff min/max
- Resets `S.cutoffComm` to `S.primaryComm`
- Resets `S.sortBy` to `'cutoff-desc'`, updates sort UI
- Calls `render()`

---

#### Entry Point (line 769)
```js
document.addEventListener('DOMContentLoaded', init);
```
Boots the entire app when the DOM is fully parsed. This is the last line.

---

## 11. Data Schema Reference

Each record object in the decoded data array has the following fields:

| Field | Type | Example | Description |
|---|---|---|---|
| `coc` | Integer | `1` | College code. Zero-padded to 4 digits for display. |
| `con` | String | `"Anna University...\nChennai-600025"` | Full college name on line 1, address on subsequent lines. Split by `\n` to get `_conClean`. |
| `brc` | String | `"BY"` | Branch code abbreviation |
| `brn` | String | `"Bio-Medical Engineering (SS)"` | Full branch name |
| `OC` | Float\|String | `191` | Open Category cutoff mark |
| `BC` | Float\|String | `190` | BC category cutoff |
| `BCM` | Float\|String | `189.5` | BCM category cutoff |
| `MBC` | Float\|String | `189` | MBC category cutoff |
| `SC` | Float\|String | `182` | SC category cutoff |
| `SCA` | Float\|String | `156.5` | SCA category cutoff |
| `ST` | Float\|String | `165.5` | ST category cutoff |
| `octl` | Integer | `17` | OC total seats for this branch |
| `ocal` | Integer | `17` | OC seats filled (allotted) — cumulative across rounds |
| `bctl` | Integer | `15` | BC total seats |
| `bcal` | Integer | `15` | BC allotted seats |
| `bcmtl` | Integer | `2` | BCM total seats |
| `bcmal` | Integer | `2` | BCM allotted seats |
| `mbctl` | Integer | `12` | MBC total seats |
| `mbcal` | Integer | `12` | MBC allotted seats |
| `sctl` | Integer | `8` | SC total seats |
| `scal` | Integer | `8` | SC allotted seats |
| `scatl` | Integer | `2` | SCA total seats |
| `scaal` | Integer | `2` | SCA allotted seats |
| `sttl` | Integer | `1` | ST total seats |
| `stal` | Integer | `1` | ST allotted seats |
| `district` | String | `"Chennai"` | Normalized district name |
| `address` | String | `"Sardar Patel Road..."` | Full college address |
| **`_conClean`** | String | `"Anna University..."` | *(Computed)* First line of `con` only — the college name |
| **`_abbrs`** | Array | `["ceg"]` | *(Computed)* Parenthetical abbreviations extracted from `con` |

> Fields prefixed with `_` are computed and added during `loadYear()` data normalization. They are not in the raw files.

---

## 12. Data Security Pipeline

### Why it exists
Raw JSON data is ~2MB per year file. Exposing it directly would let anyone trivially scrape, copy, or redistribute the TNEA cutoff dataset. The pipeline provides basic data protection and massive bandwidth savings.

### The Pipeline Steps (done offline, not at runtime)

**Tool:** `brain/812727c9.../scratch/obfuscate_data.js` (Node.js script)

Run this script manually whenever data files need to be updated or regenerated.

**Step 1 — Gzip Compression:**
```js
const compressed = zlib.gzipSync(data);
```
Compresses the UTF-8 JSON string using the standard Gzip algorithm. Achieves ~93% compression (2MB → ~130KB).

**Step 2 — XOR Encryption:**
```js
const key = Buffer.from('rankravicky1611');
for (let i = 0; i < compressed.length; i++) {
  encrypted[i] = compressed[i] ^ key[i % key.length];
}
```
XOR encrypts the Gzip binary. Each byte is XOR'd with the corresponding byte of the key (cycling through the key). Not cryptographic-grade, but sufficient to prevent casual inspection. Without knowing the key AND the reverse-filename scheme, the file is unreadable.

**Step 3 — Reversed Filename:**
```js
const reversedYear = year.split('').reverse().join('');
// "2024" → "4202"
```

**Step 4 — Write and Delete:**
Writes the encrypted binary to `4202.gzip`. Deletes the original `tnea_c_2024.json`.

### Runtime Decryption (in the browser)
Handled entirely by `_rx()` in `tnea.js`. Data is only ever held in memory as the `S.data` JavaScript array. It is never written to IndexedDB, sessionStorage, disk, or any other persistent store.

---

## 13. Monetization & Ad Engine

### Vignette Ads (Full-Screen Overlay)
**Trigger condition:** `!vignetteTime || (now - vignetteTime) > 10 * 60 * 1000`
- Shown if the user has **never** seen an ad (`vignette_ad_time` not in localStorage)
- OR if **10 minutes** have passed since the last vignette
- localStorage key: `vignette_ad_time`
- The ad mockup is injected into `.ad-vignette` inside `#vignette-ad`
- User dismisses via `#vignette-close`

### Native In-Feed Ads (Inline in Results)
**Placement:** After the 1st result card on initial load, and before each "Load More" batch.
**Function:** `tryInjectAd(parent)` — see tnea.js section above.
**Cooldown:** Randomized 10–15 seconds (`10000 + Math.random() * 5000` ms).
**Persistence:** `native_ad_last_time` localStorage key prevents bypass via page refresh.
**Anti-bot strategy:** Random interval mimics human browsing variability. Google AdSense IVT detection looks for mechanical, fixed-interval patterns; randomization defeats this.

### Ad Density / AdSense Policy Compliance
- Ads are injection only on explicit user actions (initial load = visiting the page, load more = user click). Both qualify as user-initiated.
- Total max frequency: 1 ad per 10–15 seconds per user session.
- All previous in-feed ads are removed (`$$('.in-feed-ad').forEach(el => el.remove())`) before injecting a new one to prevent ad density violations.

---

## 14. localStorage Keys Reference

| Key | Set by | Value | Purpose |
|---|---|---|---|
| `rankra-theme` | `theme.js → applyTheme()` | `'light'` or `'dark'` | Persists user theme preference |
| `rankra-app-revision` | `sw-register.js → checkRevision()` | Integer string | Tracks app version for cache busting |
| `tnea-primary` | `tnea.js → showGate()` | Community string e.g. `'OC'` | User's selected primary community |
| `vignette_ad_time` | `tnea.js → init()` | Unix timestamp ms string | Last vignette ad shown time |
| `native_ad_last_time` | `tnea.js → tryInjectAd()` | Unix timestamp ms string | Last in-feed ad shown time |

---

## 15. Developer Runbooks

### ➕ Adding a New Year of Data
1. Obtain the raw JSON file in the original schema format
2. Copy it to `assets/db/tnea/cutoff/` named as `tnea_c_YYYY.json` (e.g., `tnea_c_2025.json`)
3. Add `'2025'` to `TNEA_CONFIG.years` in `tnea-config.js` (order determines tab order)
4. Run the obfuscation script:
   ```
   node brain/812727c9-2ae9-475e-9b26-3b0ce1a1a675/scratch/obfuscate_data.js
   ```
   This will create `5202.gzip` and delete `tnea_c_2025.json`
5. Bump `data_revision` in `api/update.json`
6. Bump `app_revision` in `api/update.json`

### 🎨 Making Global Style Changes
- Change a color → edit `shared/css/tokens.css` (update both `:root` and `body.dark`)
- Change a layout rule → edit `shared/css/layout.css`
- Change a component style → edit `shared/css/components.css`
- TNEA-specific change → edit `tnea/cutoff/tnea.css`

### 🔑 Changing the Data Encryption Key
1. Pick the new key string
2. Split it thoughtfully across `_v1`, `_v2`, `_v3` in `tnea.js`, keeping the concatenation order
3. Update the `obfuscate_data.js` script with the new key buffer
4. Re-run the script to regenerate all `.gzip` files
5. Bump `data_revision`

### 🐛 Debugging "No data loads"
- Check browser Dev Tools → Network tab for the `.gzip` request. 404 = wrong path or missing file.
- Check console for `Error:` from `loadYear()`. The error message is the HTTP status code.
- Verify file naming: year 2024 → `4202.gzip`
- Verify `TNEA_CONFIG.dataPath` is correct relative to `tnea.js`

### 🧪 Testing Ad Logic
- Clear `native_ad_last_time` from localStorage to force an immediate in-feed ad on next load
- Clear `vignette_ad_time` from localStorage to force vignette on next load
- Watch browser console for "In-feed ad injected (Interval: Xs)" messages

### 🚀 Deploying Changes
1. Make your changes
2. Bump `app_revision` in `api/update.json`
3. Document changes in `local_changelog.md` under `(Uncommitted)` section
4. Deploy to hosting
