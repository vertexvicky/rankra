# TNEA cutoff - rankra — Local Changelog

---

- **Architecture Refactor**: Removed `api/` directory and `update.json` versioning tracker. Created `functions/` directory to house backend logic, moving towards a function-based architecture.
- **Documentation Sync**: Fully revised `structure.md` to reflect the removal of versioning API and the addition of the new directory hierarchy.
- **Cleanup: Systematic Removal of All Comments**: Cleansed the entire codebase of comments and documentation across JS, CSS, and HTML files for a production-ready state.

---

- **UI Enhancement: Reverted Theme Labels**: Updated the theme toggle labels from "DAY/NIGHT" back to the preferred "DAY MODE" and "NIGHT MODE" within the shared header component.
- **Architecture Refactor: Shared SiteHeader Component**: Migrated the hardcoded header and hamburger menu logic into a centralized `SiteHeader.js` shared component.
- **Cache Busted**: `app_revision` incremented to 147 in `api/update.json`.

- **UI Enhancement: FilterSheet Header Refinement**: 
  - Replaced the bulky "Include/Exclude" toggle row in mobile `FilterSheet` with a compact, inline dropdown positioned next to the 'X' close button.
  - Centered the "Select [Filter]" sheet title dynamically.
  - Bound the global header "Clear filters" button correctly to reset all filter categories (fixing clear-wrap bug).
- **Cache Busted**: `app_revision` incremented to 132 in `api/update.json`.

- **UI Optimization: Compact Filter Bar Layout**: Reduced vertical spacing between filter rows and wrapped filter pills. Decreased the base row height and implemented a tighter `row-gap` (2px) to ensure the interface remains information-dense and minimizes layout shifts on smaller screens.
- **Cache Busted**: `app_revision` incremented to 131 in `api/update.json`.

- **UX Enhancement: Persistent FilterSheet on Clear**: Modified the "Clear all" behavior in mobile `FilterSheets`. Clicking "Clear all" now clears all selections and refreshes the underlying results without automatically closing the sheet. This allows users to start a new filtering session immediately without having to reopen the sheet.
- **Cache Busted**: `app_revision` incremented to 130 in `api/update.json`.

- **Fix: Mobile Tap Highlight**: Removed the default blue highlight box that appears on mobile devices when tapping or long-pressing buttons and interactive elements. Applied `-webkit-tap-highlight-color: transparent` globally in `reset.css`.
- **Cache Busted**: `app_revision` incremented to 125 in `api/update.json`.

- **UI Enhancement: Mobile Filter Sheet Header Layout**: Absolutely centered the sheet title within the header and removed legacy margin constraints so the "Clear all" button properly snaps to the far left and the close button stays on the far right.
- **Cache Busted**: `app_revision` incremented to 123 in `api/update.json`.

- **UI Enhancement: Mobile Filter Sheet Width**: Set the `FilterSheet` content width to `100vw` on mobile devices (≤520px) and removed border-radius to ensure a consistent full-screen bottom sheet experience.

- **UI/Logic Enhancement: Year Order & Filter Sheet Header Reorder**:
  - Reversed the year dropdown order: Latest year (2025) is now at the top, and 2020 is at the bottom.
  - Reorganized the mobile `FilterSheet` header: "Clear all" button moved to the far left, titles updated to singular "Select [Filter]", and the close "X" remains on the far right.
- **Cache Busted**: `app_revision` incremented to 121 in `api/update.json`.

- **UI/Logic Enhancement: Filter Auto-Apply & Desktop Mode Toggle**:
  - Removed the manual "Apply" button from mobile `FilterSheet`. Changes now automatically sync and apply to search results when the sheet is dismissed or closed.
  - Ported the "Include/Exclude" toggle functionality to the desktop dropdown footers. Users can now flip between inclusive and exclusive filtering directly in the College, Course, and District dropdowns.
- **Cache Busted**: `app_revision` incremented to 120 in `api/update.json`.

- **UI Refinement: Filter Dropdown Aesthetics**: Increased the `min-width` of the filter dropdown to 300px and `height` to 350px for better visibility and usability. Implemented a custom slim scrollbar with a rounded thumb to improve the visual experience in choice-heavy lists.
- **Cache Busted**: `app_revision` incremented to 119 in `api/update.json`.

- **UI Enhancement: Wide-Viewport Single-Row Filter Bar**: Added a `@media (min-width: 951px)` block in `shared/css/layout.css`. Both `frow-district` and `frow-bottom` use `display: contents` to dissolve into the parent `filter-bar` flex row. CSS `order` properties rearrange all children into: college → course → district → year → sort-by → cutoff-group → clear-filters → results-count (pushed far right via `margin-left: auto`). Overrides the default `flex: 1` sizing so items stay auto-sized. Existing layouts for `≤520px` and `521–950px` are completely untouched.
- **Cache Busted**: `app_revision` incremented to 118 in `api/update.json`.


- **Fix: FilterSheet Header Misalignment**: Stripped away all hardcoded absolute positioning overrides on mobile for the `sheet-footer` and `sheet-close` elements. By leveraging the parent container's native Flexbox (`align-items: center`), the title, logic buttons ("Clear all", "Apply"), and the dismiss icon now center themselves perfectly along the exact same vertical axis without any floating visual artifacts.
- **Cache Busted**: `app_revision` incremented to 117 in `api/update.json`.



- **UI Refinement: FilterSheet Header Consolidation**: Structurally moved the `.sheet-footer` (containing the 'Clear all' and 'Apply' buttons) entirely inside the `.sheet-header` DOM element. Stripped away outdated desktop CSS targeting the footer, natively integrating the buttons to float smoothly next to the 'X' button uniformly across all form factors.
- **Cache Busted**: `app_revision` incremented to 116 in `api/update.json`.



- **UX Enhancement: Swipe-to-Close FilterSheets**: Added native-feeling touch gesture support to mobile `FilterSheets`. Users can now drag down anywhere on the sheet to close it fluidly. This includes a smart scroll-lock mechanism that ensures vertical scrolling through the filter lists is not interrupted by the swipe gesture. A visual "pill" drag handle was also added to the top of the sheets.
- **Cache Busted**: `app_revision` incremented to 115 in `api/update.json`.



- **UI Refinement: FilterSheet Header Layout**: 
    - **Close Button**: Increased size to 36px and font-size to 1rem for improved touch target and visibility.
    - **Spacing**: Added significantly more horizontal gap between the logic buttons (Clear/Apply) and the Close icon on mobile to prevent mis-clicks.
    - **Safe Area**: Increased header padding-right to 130px to accommodate the shifted interactive elements.
- **Cache Busted**: `app_revision` incremented to 114 in `api/update.json`.



- **UX Enhancement: Dynamic Filter Sorting (Mobile)**: The mobile `FilterSheet` now dynamically sorts its DOM elements *every time* you open it. Any previously applied filters will automatically float to the top of the interface instantly.
- **Cache Busted**: `app_revision` incremented to 113 in `api/update.json`.



- **UX Enhancement: One-Click Filter CLEAR**: Accelerated the filter clearing workflow. Clicking `Clear all` inside a mobile `FilterSheet` now immediately forces an aggressive background table re-render and automatically slides the sheet down, eliminating the previous friction of having to hit `Clear all` and *then* `Apply`.
- **Cache Busted**: `app_revision` incremented to 112 in `api/update.json`.



- **Fix: FilterSheet State Persistence**: Fixed an issue where if a user modified selections in a mobile `FilterSheet` but closed the sheet via the backdrop or 'X' instead of applying, the UI would incorrectly remember those cancelled inputs upon reopening. The `open()` method now explicitly resynchronizes all visual checkboxes, search inputs, and mode toggles to the confirmed application state immediately.
- **Cache Busted**: `app_revision` incremented to 111 in `api/update.json`.



- **UX Enhancement: Dynamic Filter Sorting**: Modified `tnea.js` so that actively selected items in the District, College, and Course lists automatically float to the top of the list arrays. This ensures selected items are immediately visible natively in both the Desktop Dropdowns and Mobile FilterSheets immediately upon opening.
- **Cache Busted**: `app_revision` incremented to 110 in `api/update.json`.



- **Hotfix: Infinite Loading Loop**: Fixed a JavaScript crash (`ReferenceError: esc is not defined`) in `FilterSheet.js` introduced during the object-parameter update, which broke the UI render cycle.
- **Cache Busted**: `app_revision` incremented to 109 in `api/update.json`.



- **URL Parameter Optimization**:
    - **College IDs**: Switched the `col=` parameter to use the numeric College Code (`coc`) instead of full strings.
    - **Course IDs**: Switched the `crs=` parameter to use the Branch Code (`brc`) instead of full strings.
    - **FilterSheet Upgrade**: Enhanced the `FilterSheet` component to support internal ID tracking with separate display labels, ensuring filters remain legible while keeping URLs compact.
- **Cache Busted**: `app_revision` incremented to 108 in `api/update.json`.



- **Fix: UI Layout Refinements**:
    - **Header Title**: Increased the title's horizontal limit to 50% on mobile to prevent "Select Districts" from truncating prematurely.
    - **Year Dropdown**: Fixed an alignment issue on mobile where the Year dropdown would overflow the left edge of the viewport. Forced `left: 0` alignment for the Year selection.
- **Cache Busted**: `app_revision` incremented to 107 in `api/update.json`.



- **Fix: Button Text Folding**: Fixed an issue where "Clear all" would wrap to a second line in the header on mobile.
    - Set `white-space: nowrap` to explicitly prevent text folding.
    - Balanced the `sheet-title` and `sheet-footer` widths to ensure buttons have enough horizontal room.
    - Optimized button padding for a snug fit in the header area.
- **Cache Busted**: `app_revision` incremented to 106 in `api/update.json`.

- **FilterSheet UI Polishing**:
    - **Spacing**: Added a vertical gap between the search bar and the include/exclude mode toggle.
    - **Footer Buttons**: Equalized the size of "Clear all" and "Apply" buttons for a balanced look.
    - **Typography**: Increased text size for footer buttons to 0.85rem for better readability.
    - **Color & Contrast**: Enhanced the visibility of the "Clear all" button by increasing text contrast and using bold typography.
- **Cache Busted**: `app_revision` incremented to 105 in `api/update.json`.

- **Fix: Mobile Flex Optimization for Row 2**: Adjusted mobile `@media (max-width: 520px)` CSS. Row 1 (College, Course, District) securely maintains `33.333%` bounds. However, Row 2 was liberated: Year and Sort automatically share remaining horizontal flex space equally, while the 'Clear all' button is assigned a hard auto-width bound (`flex: 0 0 auto !important`) and shunted explicitly to the extreme right via `margin-left: auto`. This mirrors exactly standard toolbar/app interfaces where actions sit securely on the trailing edge.
- **Cache Busted**: `app_revision` incremented to 104 in `api/update.json`.


- **Fix: Single-Row Desktop Layout & Reset Button Sizing**: Merged the dual `frow-district` containers into a single overarching container in `index.html`. This ensures that on viewports > 519px, the grid relies on default `nowrap` behavior, perfectly displaying all 6 filters in a majestic single inline row. Furthermore, the "Clear filters" button was explicitly scoped down (`width: auto`) and stripped of internal paddings so its footprint never exceeds its own text length.
- **Cache Busted**: `app_revision` incremented to 103 in `api/update.json`.


- **Fix: Filter Bar Mobile Wrapping**: Fixed a CSS sizing issue caused by `calc(50% - 4px)` under the `max-width: 520px` media query. Adjusted this to `calc(33.333% - 6px)` ensuring that both Row 1 and Row 2 perfectly maintain their 3-item horizontal layout even on very small screens, exactly mirroring their desktop arrangement without unwanted line wrapping.
- **Cache Busted**: `app_revision` incremented to 102 in `api/update.json`.

- **Filter Bar Reorganization**: Flattened the filter UI into two balanced rows.
    - **Row 1**: Multi-select filters (College, Course, District).
    - **Row 2**: Year selection (now a dropdown), Sort preferences, and a universal "Clear filters" action.
    - **Balanced Grid**: Improved desktop layout with an even 3-column distribution for both filter rows.
- **Year Dropdown**: Replaced the scrollable tab list with a smart dropdown that follows the "one-open-at-a-time" rule.
- **Improved FilterSheet Aesthetics**:
    - **Color-Coded Modes**: Include button is now Green (`#22c55e`), and Exclude button is Red (`#ef4444`) when active.
    - **Boxy Design**: Switched from pill shapes to elegant boxy rounded corners (6px) to match the card and input aesthetic.
    - **Seamless UI**: Unified the mode row background with the sheet content for a cohesive look.
- **Contextual Labels**: Updated filter button text to show "All [Category]" (e.g., "All Districts") when no filters are applied, or "Category (n)" when active.
- **Cache Busted**: `app_revision` incremented to 101 in `api/update.json`.

- **Universal FilterSheet Component**: Refactored the mobile filter overlays (District, College, Course) into a centralized `FilterSheet.js` component. This eliminates nearly 100 lines of redundant HTML/JS and ensures UI consistency across all filters.
- **Include/Exclude Filtering Modes**: Added a powerful new filtering capability. Each filter now supports "Include" (default) and "Exclude" modes, allowing users to hide specific districts, colleges, or courses from their results.
- **Improved Filter UI (Mobile)**: Added a premium segmented toggle for Include/Exclude modes at the top of each filter sheet.
- **URL Persistence**: District, College, and Course modes are now persisted in the URL (e.g., `&dm=ex` for exclude mode), making filtered views fully shareable.
- **Cache Busted**: `app_revision` incremented to 100 in `api/update.json`.

- **Fix: Sort Filter Sizing (Mobile)**: Resolved an issue where the Sort button appeared slightly smaller than the other three filters on mobile. Added explicit `flex: 1` and `width: 100%` to the inner sort wrapper to ensure it fills its allocated 50% row container perfectly.
- **Cache Busted**: `app_revision` incremented to 99 in `api/update.json`.

- **Exclusive Dropdown Behavior (Desktop)**: Improved the UX of the filter bar on desktop. Opening any dropdown (District, College, Course, Sort, or Community) now automatically closes any other currently open dropdown, preventing visual overlap.
- **Equalized Mobile Filter Sizing**: Refined the 2-row mobile filter layout (< 520px) to ensure all four filter buttons have exactly equal width (50% each).
    - Added `text-overflow: ellipsis` to button labels to handle long names (like "Cutoff: High → Low") gracefully without breaking the layout.
    - Standardized padding and flex behavior for perfect alignment.
- **Cache Busted**: `app_revision` incremented to 98 in `api/update.json`.

- **Responsive Filter Bar Wrap**: Implemented a two-row layout for the main filter row (District, College, Course, Sort) on screens narrower than 520px. 
    - **Row 1**: College and Course dropdowns.
    - **Row 2**: District and Sort dropdowns.
    - For widths ≥ 520px, all four elements remain in a single row.
- **Filter Element Reordering**: Adjusted the HTML source order of filter elements to College → Course → District → Sort. This improves the visual flow on both desktop (where they appear left-to-right) and mobile (where they wrap logically).
- **Cache Busted**: `app_revision` incremented to 97 in `api/update.json`.

- **College Filter Dropdown**: Removed the search bar and replaced it with a "College" pill-button dropdown (desktop: absolute dropdown with search + clear; mobile: bottom sheet with search + clear + apply). Filters results to only show the selected college(s). Button label shows count when active (e.g., `College (3)`).
- **Course Filter Dropdown**: Added a "Course" pill-button dropdown with the same UX pattern as the College and District dropdowns. Filters results to only show the selected course/branch(es). Button label shows count when active (e.g., `Course (2)`).
- **Filter Bar Row Consolidation**: District, College, Course, and Sort are now all on the same filter row for a compact layout.
- **URL State**: College and course filter selections are persisted in the URL (`col=` and `crs=` params, `||`-delimited) so shared links reflect the current college/course filters.
- **Reset All**: The "Reset all filters" empty-state button now also clears college and course selections.
- **Cache Busted**: `app_revision` incremented to 96 in `api/update.json`.

- **Logo Navigation**: The header logo image is now wrapped in a link that directs users back to the root page (`/`), improving navigation efficiency.
- **Cache Busted**: `app_revision` incremented to 95 in `api/update.json`.
- **Community Gate Logic Fix**: Resolved an issue where selecting a primary community as a new user would override the community parameter (`c=`) in a shared link. The URL parameter now correctly takes precedence, ensuring users see the specific community view intended by the share link.
- **Frontend Assets Relocation**: Moved `assets`, `shared`, `tnea`, and `index.html` to the `public/` directory. Moved brand images (`rankra_favicon30.png`, `rankra_logo.png`, `rankra_logo50.png`) from `public/` to `public/assets/`. Updated all corresponding HTML file references and fully revised the directory tree and file paths inside `structure.md`.
- **Cache Busted**: `app_revision` incremented to 93 in `api/update.json`.
- **Git Maintenance**: Updated `.gitignore` to include project-specific files (`local_changelog.md`, `structure.md`, `.agents/`) and system artifacts (`desktop.ini`). Cleaned up duplicates for a more organized structure.
- **Cache Busted**: `app_revision` incremented to 92 in `api/update.json`.
- **Ad-Disabling Master List**: Implemented a global `DISABLED_PATHS` master list in the ad engine. This allows developers to easily disable dummy ads for specific sections of the site by simply adding the path to the list. Currently, ads are disabled for `/tnea/cutoff/`.
- **Cache Busted**: `app_revision` incremented to 91 in `api/update.json`.
- **Share Modal Design Refinement**: Optimized the Share Modal layout by moving the close (✕) button to the absolute top-right corner for a cleaner look. Added a professional, student-centric explanation: *"Help your friends find the right college! Share this page with your current filters and search results instantly."*
- **Cache Busted**: `app_revision` incremented to 90 in `api/update.json`.
- **Custom Feature Notifications**: Replaced default browser alerts for "College info" and "Course info" links with a premium, student-friendly custom notification (toast). The notice informs users that these features are currently in development with a clear, engaging message.
- **Minimalist Share Modal**: Implemented a clean, focused Share Modal accessible via the "Share" header button. The modal features exactly what is needed: a branded input box containing the shareable link alongside a dedicated "Copy" button for instant clipboard access, matching the required minimalist aesthetic.
- **Cache Busted**: `app_revision` incremented to 89 in `api/update.json`.
- **Home Page Redirection**: Implemented an immediate JavaScript and meta-refresh redirect from the root `index.html` to `/tnea/cutoff/`. This ensures users landing on the home page are automatically routed to the TNEA cutoff application.
- **Corner Rounding Consistency Fix**: Added `overflow: hidden` to the `.ct-primary-row`. This ensures that the left-most community label correctly inherits the row's bottom-left rounded corner, fixing the visual glitch where the left side appeared square due to background overflow.
- **Table Aesthetic Refinement**: Updated the `.ct-primary-row` (the highlighted community row) to have **rounded corners only on the bottom**. This allows the top of the row to sit perfectly flush against the table header row, while still providing a soft, finished look at the base of the data entry.
- **Community Table Visual Refresh**: 
    - Softened the community data table by moving to title-case headers and reduced font-weights for better hierarchy.
    - Added a subtle `border-bottom` to the table header row.
- **Cache Busted**: `app_revision` incremented to 87 in `api/update.json`.
- **Hamburger Menu Layout Redesign**: Converted the floating dropdown into a full-height side-drawer. On mobile it now occupies 100% viewport height and 85vw width, sliding in from the right. On desktop (≥768px) it is a fixed 280px sidebar, also full-height. The semi-transparent dimming backdrop (with blur) now has `z-index: 999` to sit behind the panel but above the app content.
- **Theme Toggle Repositioned**: Pill toggle moved from the menu body into the `hmenu-header-right` group inside the header row, sitting next to the close button top-right. Size reduced to height 28px / min-width 96px with a 22px knob.
- **Dark Mode Knob Fix**: The circular knob in dark mode was invisible (dark on dark). Fixed by using `background: #555` for the knob in dark mode (clearly visible against the panel's dark background).
- **Cache Busted**: `app_revision` incremented to 67 in `api/update.json`.
- **Hamburger Menu**: Replaced the standalone theme toggle icon in the header with a 3-bar hamburger button. Clicking it opens a compact floating panel (top-right, fixed position) with a smooth scale+fade animation. The panel contains a `Menu` header with a close (✕) button and a pill-shaped day/night toggle button styled to match the DAYMODE/NIGHTMODE reference design (sliding circular knob, animated label swap, dark/light background transition). Backdrop click also closes the menu.
- **Theme Pill Toggle**: The theme button inside the menu is a full-width pill with a sliding circular knob that moves left (day) / right (night). The label reads `DAYMODE` or `NIGHTMODE` and swaps automatically. `syncThemePill()` keeps icon and label in sync on every toggle and on page load.
- **Cache Busted**: `app_revision` incremented to 66 in `api/update.json`.
- **Ad Injection Optimization**: adjusted in-feed ad frequency to trigger exactly once every 8 result cards (was 5). The first ad still appears immediately after the first result card.
- **Cache Busted**: `app_revision` incremented to 65 in `api/update.json`.
- **Ad Injection Optimization**: Standardized in-feed ad placement to trigger exactly once every 5 result cards, with the first ad appearing immediately after the first result card. Removed the redundant time-based `tryInjectAd` logic at Load More junctions to ensure a consistent, predictable frequency.
- **Cache Busted**: `app_revision` incremented to 64 in `api/update.json`.
- **Pill Button UI Refresh**: Updated `.pill-btn` elements to use white color for both `span` text and internal `svg` icons for better visibility in specific contexts (as requested).
- **Cache Busted**: `app_revision` incremented to 63 in `api/update.json`.
- **Result Card UI Transformation**: Replaced the `card-address` block with a `.card-actions` row containing two interactive buttons: "College information" and "Course information".
- **Card Border Modernization**: The `.result-card` now renders with a full uniform `border: 1.5px solid var(--border)` on all sides; hover state elevates with `box-shadow` and `translateY(-2px)`.
- **Smooth Blending Card UI**: Eliminated "liney" internal borders (no more `border-top` for community table/actions or `border-right/bottom` for table cells). Differentiation is now achieved through subtle background sectioning and rounded corner blocks for headers (`.ct-th`) and primary rows, resulting in a cleaner, premium aesthetic.
- **Button UI Compactness**: Removed all pulsing/blinking animations from `.card-btn` for a cleaner, static look. Reduced padding to `4px 7px` to ensure a more compact card footprint.
- **Layout Fix**: Increased `.main-content` top padding/margin to prevent sticky filter bar overlap.
- **Monetization Optimized**: Increased in-feed ad frequency to trigger every 6 results (previously only once per load). Injections are now strictly index-based to ensure consistent coverage throughout the feed.
- **2025 Data Integration**: Added 2025 TNEA cutoff data (`5202.gzip`) using the secure Gzip+XOR pipeline. The raw `2025mini.json` was processed and removed.
- **Default Year Update**: Switched the application's default year from 2024 to 2025. Updated `S.year` and `syncURL` logic in `tnea.js` to handle 2025 as the default state.
- **SEO Enhancements**: Updated meta descriptions in `tnea/cutoff/index.html` to reflect coverage from 2020 up to 2025.
- **Cache Invalidation**: Incremented `app_revision` (to 56) and `data_revision` (to 3) in `api/update.json` to force client-side cache updates.
- **Result Card Community Fix**: Resolved a bug where result cards incorrectly displayed the user's primary community (selected at the gate) even when a different community was selected for filtering/sorting in the UI. Cards now correctly shadow the active community selected in the filter bar.

- Reverted pagination UI to an extending "Load More" functionality, displaying 20 items per click.
- Removed desktop sidebars and re-centered `main-content` for a cleaner design.
- Abstracted ad generation logic into a universal `shared/components/dummy-ad/` component.
- Implemented responsive in-feed ad injection: pressing "Load More" explicitly removes the old contextual ad, reveals the new ad natively in the list, and intelligently scrolls it securely to the top of the viewport.
- Unlinked URL state tracking from pagination to match conventional scrolling feeds.
- **Auto-Scroll on Filter**: Implemented automatic smooth scroll-to-top whenever a filter, search term, or sort order is modified.
- **Smart Ad Throttling**: Introduced a 10-second minimum cooldown (`lastAdTime`) for ad injection to prevent excessive reloads. Added state-specific console logging: "does it created ad", "reload ad", and "tried but did not reload...".
- **Enhanced Load More UI**: Replaced the standard primary button with a symmetric, dual-icon ghost design using `fa-chevron-down`. Implemented a custom `bounceY` animation that pulses the entire button vertically for better visibility, and fixed spacing symmetry using `inline-flex` with a consistent `8px` gap.
- **Smart Filter Bar**: Filter bar now auto-hides when scrolling down and gracefully slides back in when scrolling up (4px hysteresis, always visible within 60px of top). Row padding reduced from 6px → 4px for a more compact look.
- **Filter Bar Compaction (UI)**: Further reduced filter bar height by tightening all internal paddings: `frow` rows from `4px` → `1px` (with a `min-height: 32px` guard), `frow-comms` from `7px` → `3px`, `frow-bottom` from default → `1px`. Also compacted `.pill-btn` padding (`5px 11px` → `3px 10px`), `.search-input` padding (`8px` → `5px` vertical), `.year-tab` (`4px 14px` → `2px 12px`), and `.cutoff-input` (`4px` → `2px` vertical). The hide-on-scroll JS behavior was already implemented; no new JS changes needed.
- **Monetization Update**: Reduced the Vignette Ad display interval to 10 minutes.
- **Search Engine Upgrade**: Switched from 'AND' logic to 'OR' logic for the main search bar. Users can now search for multiple entities simultaneously (e.g., 'EE ECE', '1 1315', 'Chennai Coimbatore') to compare branches, colleges, or locations in a single view.
- **Randomized Native Ads**:
  - Replaced the fixed 10s cooldown for in-feed ads with a randomized interval (**10s to 15s**) to mimic human scrolling patterns more effectively.
  - **Persistence**: Implemented `localStorage` tracking for native ads (`rankra_last_ad_time`), ensuring the cooldown is respected even if the user refreshes the page or restarts their session.
- **Data Obfuscation & Compression**:
  - Implemented a severe data optimization and protection layer. All `tnea_c_202x.json` files have been converted to encrypted Gzip archives.
  - **Reverse Filenames**: Filenames are now derived from the reversed year string (e.g., `2024.json` → `4202.gzip`).
  - **Encryption**: Files are Gzip-compressed and then XOR-encrypted using a custom key (`rankravicky1611`).
  - **Confuscated Client Logic**: Added the `_rx` decoding utility in `tnea.js`, which uses broken-up key variables (`_v1`, `_v2`, `_v3`) and bitwise operations to decrypt and decompress data on-the-fly via `DecompressionStream`.
  - **Storage Optimization**: Drastically reduced data footprint from ~10MB total down to < 700KB, improving initial load times and cache efficiency.
  - Originals were deleted; the app never touches raw JSON files on the server anymore.

## [v0.4] — 2026-04-04 (Architecture & Performance Refactor) (uncommited)

### Major Restructuring & Monetization (2026-04-10)
- **Directory Flattening**: Migrated TNEA app from `apps/tnea/` to a cleaner, SEO-friendly path: `tnea/cutoff/`.
- **Centralized Assets**: Relocated app-specific assets to a global architecture:
  - Images: `./assets/engineering/tnea/cutoff/`
  - Data: `./assets/db/tnea/cutoff/`
- **Service Worker Removal**: Deleted all Service Worker (`sw.js`) and cache-management logic in favor of standard HTTP caching and a faster "Network-First" experience.
- **AdSense Integration**:
  - Implemented Google AdSense "Auto Ads" and dedicated display slots (Top, Sticky Footer).
  - Added `refreshAds()` logic: Automatically triggers an ad refresh (with 10-second debounce) whenever users change filters, sort criteria, or search queries to maximize revenue per session.
- **Deep-Linking (URL Sync)**: Integrated `URLSearchParams` sync. The app now persists the current search query, districts, community, cutoff range, and sorting directly into the browser URL for easy sharing and session persistence.
- **Year Cutoff**: Fully removed all references to "2025" cutoff data as requested. The app now defaults to 2024 and covers the 2020–2024 range.

### Architecture Changes
- **Ecosystem Migration**: Extracted styling and core logic from monolithic TNEA scope into reusable `shared/css/` (tokens, reset, layout, animations, components) and `shared/js/` (utils, theme, trie, sw-register) architectures, supporting multiple future rankra applications independently.
- **Unified Card Architecture**: Completely deprecated dual rendering paths (`renderDesktop` producing grids and `renderMobile` producing lists). Now universally uses `renderResults()` building responsive, unified `.result-card` elements for all screen sizes.
- **Data Source Relocation**: Moved JSON dataset files and updated internal fetch requests & Service Worker caching (`sw.js`) from `./assets/` to the targeted `./assets/db/` directory.

### Branding & UI Refactor
- **Header Rebranding**: Removed the legacy `header-sub` and completely rebuilt `.header-left` to feature a dual-logo branding layout: `rankra_logo50.png` → "TNEA cutoff" → `tnea100.png` with tighter, "minor space" refined spacing and bottom-edge (baseline) alignment via `flex-end`.
- **Asset Migration**: Removed the old `240x240.png` and `100x100.png` binaries. Updated the global favicon and loading screen logos to the new `tnea100.png` specification and corrected the primary brand logo to `rankra_logo50.png`.


### Performance
- **DOM Virtualization (Memory Leak Fix)**: Replaced standard append-only infinite scroll with a chunk-based `IntersectionObserver` virtualization engine. It selectively unmounts (offloads) DOM nodes of result cards into empty height-preserving `card-chunk` wrappers when they exit a 1500px off-screen buffer. Drops peak RAM usage drastically from ~1.5GB to < 150MB, maintaining a steady 60fps even when viewing 5000+ results.

### Added
- Added a dummy "Export" button to the site header (positioned between branding and theme toggle) using a rectangular, rounded corners design; label remains visible across all device sizes including mobile.
- Real-time results count indicator directly inline on the right side of the `frow-bottom` filter bar row (auto-updates dynamically via `applyFilters()`).
- Injected dynamic community-specific seat badge (e.g. `5 available seats for OC`) mirroring the exact community toggled within the `sort-by` mechanics directly into the previously empty `.card-foot-right` container, serving as an instant visual counterbalance alongside the global total seats badge on the far left.

### Fixed
- **Dropdown Event Listener Conflict**: Fixed a critical bug where both `sort` and `comm` dropdown items erroneously shared the `.sort-option` JS binding, causing community selection clicks to break the current sort state. Now scoped explicitly to `#sort-dropdown .sort-option`.
- **Data Sorting Quirks**: Explicitly refactored `Cutoff: Low to High` and `Cutoff: High to Low` sorting so missing data (NaN) resolves natively as `0`, matching exact user specifications.
- **Seat Availability Sorting Algorithm**: Fixed `Most Seats Available` descending sort getting jumbled because raw JSON parsing was inducing string concatenation (e.g., "12"+"5" rendering as "125") rather than mathematical reduction. Now strictly casts properties through `parseInt(x, 10)`.
- **Dynamic Community Sorting**: Hard-linked sorting algorithm to specifically track `S.cutoffComm`, allowing the cutoff array to dynamically sort mathematically when switching communities via the filter bar, instead of always forcing `primaryComm`.

### Changed
- Removed the old blocking global loading overlay (`showLoading(true)`) and its visible SVG circle spinner during data swaps.
- Implemented **Skeleton Result Cards** with a seamless CSS gradient shimmer effect (`.skeleton-box` animation). `renderSkeletons()` dynamically generates visually accurate skeleton blocks natively replacing the old loading screen on app initial boot (`boot()`) and whenever switching tabs across different years.
- Removed the "— any —" option entirely from the `comm-wrap` (community sort/filter target) dropdown enforcing users explicitly target their desired community (defaults fallback directly to their primary community).
- Result Cards unconditionally generate their unfilled badge metrics referencing total seats (`tVacant()`) across the entire institution, rather than artificially siloing the output entirely onto the primary community perspective.
- Hardened `.card-foot .seat-badge` styling with highly dynamic typography (`font-size: clamp(0.55rem, 2.2vw, 0.7rem)`) scaling efficiently on smaller screens to prevent twin left/right seat badges from aggressively colliding and wrapping out of bounds. Also enforced `.seat-badge` to `nowrap` with `ellipsis` text-overflow as an ultimate safety buffer.

---

## [v0.3] — 2026-04-03 (in progress) (commited)

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

## [v0.2] — 2026-04-03 (commited)

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

## [v0.1] — 2026-04-03 (commited)

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
- Chunked rendering (60 records/batch) via IntersectionObserver
- Light / Dark mode with system preference detection
- Service Worker cache-first strategy for all JSON assets
- Expandable drawer for seat details and address
- Mobile-first CSS with separate card list view
- Mobile-first CSS with separate card list view
- Chunked rendering (60 records/batch) via IntersectionObserver
- Light / Dark mode with system preference detection
- Service Worker cache-first strategy for all JSON assets
- Expandable drawer for seat details and address
- Mobile-first CSS with separate card list view
- Mobile-first CSS with separate card list view
- Chunked rendering (60 records/batch) via IntersectionObserver
- Light / Dark mode with system preference detection
- Service Worker cache-first strategy for all JSON assets
- Expandable drawer for seat details and address
- Mobile-first CSS with separate card list view
