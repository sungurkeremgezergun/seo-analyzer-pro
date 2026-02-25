# SEO Analyzer Pro — Chrome Extension

**Advanced on-page SEO analysis, performance auditing, and competitor comparison — all in one click.**

SEO Analyzer Pro is a comprehensive Chrome extension that provides real-time, in-depth SEO analysis for any web page. Designed for SEO professionals, web developers, content creators, and digital marketers, it delivers actionable insights across 12 analysis categories without leaving the browser.

---

## Key Features

### Overall SEO Score (0–100)

Every page receives a weighted SEO score calculated across five core pillars:

| Category | Weight | What It Measures |
|---|---|---|
| **On-Page SEO** | 30 pts | Title tag, meta description, canonical URL, robots directive, viewport, URL structure |
| **Content Quality** | 20 pts | H1 usage, heading hierarchy, word count, image alt coverage |
| **Technical SEO** | 20 pts | HTTPS, structured data (JSON-LD / Microdata / RDFa), hreflang, Open Graph, Twitter Card |
| **Link Health** | 15 pts | Internal / external link ratio, nofollow ratio, empty anchor detection |
| **Performance Signals** | 15 pts | Lazy loading adoption, explicit image dimensions, inline style count |

The score is displayed as an animated SVG ring with color-coded thresholds: green (80+), orange (50–79), and red (0–49). A detailed breakdown bar shows each category's contribution.

---

### 1. Overview Tab

- **Title Tag Analysis** — Character count with optimal range validation (30–60 characters recommended)
- **Meta Description Analysis** — Length check with recommended range guidance (70–160 characters)
- **URL Display** — Current page URL at a glance
- **Canonical URL Check** — Detects self-referential canonical and flags mismatches
- **Meta Robots Directive** — Shows index/noindex, follow/nofollow status
- **Security Status** — HTTPS verification with mixed content detection (images, scripts, stylesheets, iframes, media)
- **Word Count** — Total word count of the page content

---

### 2. Headings Tab

- **H1–H6 Count Summary** — Visual breakdown of all heading levels used on the page
- **H1 Validation** — Warns if H1 is missing or if multiple H1 tags are present
- **Heading Hierarchy Check** — Detects level skips (e.g., H2 → H4 without H3) that harm accessibility and SEO
- **Heading Content Preview** — Expandable/collapsible lists showing the text content of each heading

---

### 3. Hreflang Tab

- **Language Tag Detection** — Lists all `hreflang` alternate tags on the page
- **x-default Check** — Warns if the `x-default` fallback tag is missing
- **Status Indicators** — Table view with language code, target URL, and status for each tag

---

### 4. Links Tab

- **Link Statistics** — Total links, unique links, internal links, external links
- **Nofollow Highlight** — Toggle button that visually highlights all nofollow links directly on the page
- **Broken Link Checker** — Tests up to 50 unique URLs via HEAD requests with GET fallback; reports OK, Redirect, Broken, and Timeout status for each link
- **Redirect Chain Detection** — Identifies multi-hop redirect chains (up to 10 hops) with full chain visualization and HTTP status codes
- **Internal / External Link Lists** — Collapsible sections with link text, URL, and nofollow indicator

---

### 5. Images Tab

- **Image Statistics** — Total images, images with alt text, images missing alt text
- **Alt Text Coverage** — Percentage of images that have descriptive alt attributes
- **Paginated Image List** — Cards showing thumbnail preview, alt text (or missing warning), and source URL
- **Lazy Loading Detection** — Tracks which images use native lazy loading

---

### 6. Schema / Structured Data Tab

- **JSON-LD Detection** — Parses and displays all JSON-LD scripts on the page
- **Microdata Extraction** — Detects `itemscope` / `itemprop` markup
- **RDFa Extraction** — Detects `typeof` / `property` markup
- **Type-Specific Validation** — Checks required and recommended fields for 12 schema types:
  - Article, NewsArticle, BlogPosting
  - Product, Organization, LocalBusiness
  - FAQPage, BreadcrumbList, Event
  - VideoObject, WebSite, Person
- **Field Status Indicators** — Required (missing), Recommended (missing), and Present fields clearly marked
- **Collapsible JSON View** — Pretty-printed JSON for each detected schema block

---

### 7. Social Media Preview Tab

- **Facebook / LinkedIn Preview** — Simulated Open Graph card with image, title, and description
- **Twitter / X Preview** — Simulated Twitter Card preview
- **Open Graph Validation Checklist** — Checks 7 OG fields:
  - `og:title` (required), `og:type` (required), `og:url` (required), `og:image` (required)
  - `og:description` (recommended), `og:site_name` (recommended), `og:locale` (recommended)
- **Twitter Card Validation Checklist** — Checks 6 Twitter fields:
  - `twitter:card` (required), `twitter:title` (required), `twitter:description` (required), `twitter:image` (required)
  - `twitter:site` (recommended), `twitter:creator` (recommended)

---

### 8. Performance Tab

- **Core Metrics with Color-Coded Thresholds**
  - DOM Content Loaded — Good: ≤1000 ms / Warning: ≤2500 ms / Poor: >2500 ms
  - First Contentful Paint (FCP) — Good: ≤1800 ms / Warning: ≤3000 ms / Poor: >3000 ms
  - DOM Element Count — Good: ≤1500 / Warning: ≤3000 / Poor: >3000
- **Resource Analysis**
  - Render-blocking resource count
  - Total transfer size (auto-formatted: B / KB / MB / GB)
  - Total resource count
- **Top 10 Largest Resources** — Table with resource type, file name, transfer size, load duration, and visual size comparison bars

---

### 9. Keyword Analysis Tab

- **Content Statistics** — Total words, average sentence length, average word length
- **Keyword Stuffing Detection** — Alerts when any keyword density exceeds 3%
- **N-Gram Frequency Tables**
  - Unigrams (single words) — with title and meta description presence indicators
  - Bigrams (2-word phrases)
  - Trigrams (3-word phrases)
- **Density Calculation** — Percentage density for each keyword/phrase
- **Stopword Filtering** — Built-in Turkish and English stopword lists for accurate results

---

### 10. Crawlability Tab

- **Robots.txt Analysis**
  - Found / not found status
  - Current page block detection (Disallow rule matching)
  - Disallow rule count
  - Sitemap URL references
  - Collapsible robots.txt content preview
- **Sitemap Analysis with Full Index Support**
  - Detects and parses regular sitemaps (`<urlset>`) and sitemap index files (`<sitemapindex>`)
  - Follows all sub-sitemaps inside a sitemap index (e.g., `pages.xml`, `products.xml`, `collections.xml`, `blogs.xml`)
  - Checks **all** sitemap URLs declared in robots.txt — not just the first one
  - Tree view visualization:
    - Sitemap index nodes with child count
    - Individual sitemap nodes with URL count
    - Current page presence indicator showing which specific sitemap contains the page
  - Total unique URL count across all sitemaps

---

### 11. Competitor Comparison Tab

- **Side-by-Side Analysis** — Enter any competitor URL to fetch and compare 15+ SEO metrics:
  - SEO Score (with difference indicator)
  - Title length and meta description length
  - Word count
  - H1 count and total heading count
  - Internal and external link counts
  - Total images and alt text coverage percentage
  - Schema type count
  - HTTPS status
  - Canonical URL presence
  - Open Graph and Twitter Card tag counts
- **Color-Coded Results** — Green when your page is better, red when the competitor leads

---

### 12. Export & Reporting

Export your full analysis in four formats:

| Format | Description |
|---|---|
| **CSV** | Structured spreadsheet with sections: Overview, Score Breakdown, Security, Headings, Links, Images, Schema, Social, Performance, Keywords, Hreflang |
| **PDF** | Formatted report with score ring, color-coded breakdown bars, page numbers, and timestamp |
| **JSON** | Complete raw data export with all metrics, lists, and metadata |
| **Clipboard** | Human-readable summary with visual score bars (█░░) for quick sharing |

---

## Additional Features

### Score History & Trend Chart

- Tracks up to 30 historical scores per URL
- SVG sparkline trend chart showing score progression over time
- Score change indicator (+/−) compared to previous analysis
- Record count with date range

### Dark Mode

- Full dark theme with one-click toggle
- Persistent preference saved across sessions
- Smooth transition animation

### Multi-Language Support

- Turkish (default) and English
- 158+ translated message keys covering all UI elements, alerts, and analysis labels

### Accessibility

- Full keyboard navigation for all tabs, buttons, and menus (Arrow keys, Home, End, Enter, Space, Escape)
- ARIA roles, labels, and live regions for screen reader support
- Semantic HTML structure
- Focus management across interactive elements

### Interactive Page Highlighting

- Nofollow Link Highlight — Toggles a visual overlay on all nofollow links directly on the inspected page, with count indicator

---

## Optimal Ranges & Thresholds

| Metric | Optimal | Acceptable | Needs Improvement |
|---|---|---|---|
| Title Length | 30–60 characters | 20–29 or 61–70 characters | <20 or >70 characters |
| Meta Description | 70–160 characters | 50–69 or 161–200 characters | <50 or >200 characters |
| DOM Load Time | ≤1000 ms | ≤2500 ms | >2500 ms |
| First Contentful Paint | ≤1800 ms | ≤3000 ms | >3000 ms |
| DOM Element Count | ≤1500 | ≤3000 | >3000 |
| Lazy Loading Coverage | ≥80% of images | ≥50% | <50% |
| Image Dimensions | ≥80% with width/height | ≥50% | <50% |
| Keyword Density | 1–3% | <1% | >3% (stuffing alert) |
| Alt Text Coverage | 100% | ≥70% | <30% |
| Nofollow Ratio | ≤50% | ≤80% | >80% |

---

## Technical Details

- **Manifest Version:** 3
- **Permissions:** `activeTab`, `scripting`, `storage` (minimal permission footprint)
- **Architecture:** Popup UI + Background Service Worker + Content Script
- **No external API calls for analysis** — All SEO analysis is performed locally in the browser
- **Concurrent processing** — Broken link checks run 5 parallel workers with 5-second timeout per URL
- **Redirect chain limit** — Follows up to 10 hops
- **History limit** — 30 entries per URL
- **Broken link check limit** — Up to 50 unique URLs per scan

---

## Who Is It For?

- **SEO Professionals** — Comprehensive on-page audit without switching tools
- **Web Developers** — Quick technical SEO validation during development
- **Content Creators** — Keyword density analysis and content quality scoring
- **Digital Marketers** — Competitor comparison and exportable reports
- **Site Owners** — One-click health check for any page

---

**Version:** 1.0.0
**Developer:** Kerem Gezergün
