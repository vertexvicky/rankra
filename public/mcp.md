# Machine Context Protocol (MCP) Documentation

This document provides a comprehensive specification for the static Server-Side Rendered (SSR) endpoints designed specifically for LLM context windows, scraper engines, and automated agents.

All pages are rendered as pure, semantic HTML with zero JavaScript execution dependencies and zero CSS design clutter, ensuring max token efficiency and zero parsing ambiguity.

---

## Global Architecture & Principles

- **Semantic Markup**: Built strictly using standard HTML5 tags (`<section>`, `<dl>`, `<dt>`, `<dd>`, `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`).
- **Color Scheme Support**: Includes `<meta name="color-scheme" content="light dark">` and simple system-aware CSS for accessibility across light and dark modes.
- **Base Domain**: `rankra.in`

---

## Endpoints Specification

### 1. Pre-rendered College List Endpoint (Static Pre-rendered Page)
- **Path**: `/tnea/college/list`
- **Method**: `GET`
- **Description**: Provides a complete static map of TNEA college codes to full institution names.

#### Output Structure
```html
<main>
    <section>
        <h2>College Code to Name Mapping</h2>
        <dl>
            <dt>1</dt>
            <dd>University Departments of Anna University Chennai - CEG Campus...</dd>
            <dt>2</dt>
            <dd>University Departments of Anna University Chennai - ACT Campus...</dd>
        </dl>
    </section>
</main>
```

---

### 2. College Course Lookup Endpoint (Cloudflare Pages Function)
- **Path**: `/mcp/college/course`
- **Method**: `GET`
- **Query Parameters**:
  - `c` (required): Comma-separated list of college codes (e.g., `?c=1` or `?c=1,2`).

#### Output Structure
- `<dt>` contains `available course in tnea code {code} {name}`.
- `<dd>` contains the branch formatted as `BRANCH_CODE - BRANCH_NAME`.

```html
<main>
    <section>
        <dl>
            <dt>available course in tnea code 1 University Departments of Anna University Chennai - CEG Campus</dt>
            <dd>BY - BIO MEDICAL ENGINEERING  (SS)</dd>
            <dd>CE - CIVIL ENGINEERING</dd>
            <dt>available course in tnea code 2 University Departments of Anna University Chennai - ACT Campus</dt>
            <dd>CL - CHEMICAL ENGINEERING</dd>
        </dl>
    </section>
</main>
```

---

### 3. College Cutoff & Rank Endpoint (Cloudflare Pages Function)
- **Path**: `/mcp/college/cutoff`
- **Method**: `GET`
- **Query Parameters**:
  - `c` (required): Comma-separated college codes (e.g., `?c=1`).
  - `co` (required): Comma-separated community categories (e.g., `?co=OC` or `?co=OC,BC`). Available communities: `OC`, `BC`, `BCM`, `MBC`, `SC`, `SCA`, `ST`.
  - `b` (optional): Comma-separated branch codes (e.g., `?b=BY`).
  - `s` (optional): Sorting order. Options:
    - `rank` (default): Sort by 2026 Community Rank (ascending, best rank first).
    - `coc`: Sort by College Code numerically.
    - `inbr`: Sort by input sequence of branch codes provided in `b`.
    - `inco`: Sort by input sequence of college codes provided in `c`.

#### Data Source
- Fetches 2026 predicted community ranks directly from `public/assets/db/tnea/cutoff/pred2026.json`.

#### Output Structure
- Output is rendered using an HTML `<table>` without headers or full college names.
- Columns: `college code`, `branch code`, `branch name`, `2026 community rank`.

```html
<main>
    <section>
        <table>
            <thead>
                <tr>
                    <th>college code</th>
                    <th>branch code</th>
                    <th>branch name</th>
                    <th>2026 community rank</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>1</td>
                    <td>BY</td>
                    <td>BIO MEDICAL ENGINEERING  (SS)</td>
                    <td>4207</td>
                </tr>
            </tbody>
        </table>
    </section>
</main>
```
