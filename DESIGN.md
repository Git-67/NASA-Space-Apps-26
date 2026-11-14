---
version: alpha
name: Martian-Map-mission-control
description: >-
  An original "mission control" design system for a Mars map and Marswalk planning website, built for the NASA Space Apps Challenge 2026 "Interplanetary Survival Guide - Martian Map" challenge. Two themes, dark (default) and light. Deep-space surfaces ({colors.void}, {colors.canvas}), an orbit-blue primary action ({colors.primary}), and a single launch-orange accent ({colors.accent}) used sparingly for the one thing that matters on screen. Headlines are set in Space Grotesk, body in Inter, and telemetry (coordinates, timestamps, dataset IDs) in JetBrains Mono. The hero is an orbital band that leads with a live data visual, and the system ships first-class chart and map components with a validated, colourblind-safe data palette. It is NASA-inspired, not NASA-branded: no NASA insignia, logotype or seal is used anywhere.

colors:
  # Surfaces (darkest to lightest)
  void: "#04060c"
  canvas: "#0a0e1a"
  surface: "#111727"
  surface-raised: "#182036"
  hairline: "#232c45"
  hairline-strong: "#3a4666"
  border-control: "#6a7592"
  # Text
  ink: "#f2f5fa"
  text-secondary: "#b6bfd2"
  text-muted: "#8b96ad"
  text-disabled: "#5d6782"
  # Action and brand
  primary: "#2f6fed"
  primary-pressed: "#2459c7"
  on-primary: "#ffffff"
  link: "#7db2ff"
  accent: "#ff6a3d"
  accent-pressed: "#e5532a"
  on-accent: "#04060c"
  # Tag tints (dark fills with light text)
  tint-blue: "#14264a"
  tint-orange: "#3a1a10"
  tint-green: "#0f2e1f"
  tint-amber: "#33270a"
  tint-red: "#3a1414"
  on-tint-orange: "#ffb199"
  on-tint-green: "#6fdc9c"
  # Semantic (UI state; always paired with an icon and a label)
  semantic-success: "#2fbf71"
  semantic-warning: "#fab219"
  semantic-error: "#d03b3b"
  semantic-error-text: "#ff8a8a"
  # Charts: categorical series, fixed order, never cycled
  chart-1: "#3987e5"
  chart-2: "#d95926"
  chart-3: "#199e70"
  chart-4: "#c98500"
  chart-5: "#d55181"
  chart-6: "#008300"
  chart-7: "#9085e9"
  chart-8: "#e66767"
  # Charts and maps: sequential ramp, low (recedes into surface) to high
  seq-1: "#0d366b"
  seq-2: "#184f95"
  seq-3: "#256abf"
  seq-4: "#3987e5"
  seq-5: "#6da7ec"
  seq-6: "#9ec5f4"
  seq-7: "#cde2fb"
  # Charts and maps: diverging ramp, cool pole to neutral to warm pole
  div-cool-2: "#6da7ec"
  div-cool-1: "#256abf"
  div-neutral: "#2c3347"
  div-warm-1: "#b84040"
  div-warm-2: "#ee8a8a"
  # Chart chrome
  chart-grid: "#1c2438"
  chart-axis: "#3a4666"
  no-data: "#1c2438"
  # Map overlays (theme-independent: they sit on Mars imagery, not on a UI surface)
  route: "#4de1f5"
  route-casing: "#04060c"
  map-ink: "#f2f5fa"
  # Light theme. Each token replaces the dark token of the same name without the "light-" prefix.
  light-void: "#efebe5"
  light-canvas: "#f7f5f2"
  light-surface: "#ffffff"
  light-surface-raised: "#ffffff"
  light-hairline: "#e4dfd7"
  light-hairline-strong: "#cfc8bd"
  light-border-control: "#8a8275"
  light-ink: "#14161c"
  light-text-secondary: "#474b57"
  light-text-muted: "#5f6472"
  light-text-disabled: "#9a9ca5"
  light-link: "#2459c7"
  light-accent: "#b83c0c"
  light-tint-blue: "#e3ecfd"
  light-tint-orange: "#fde8df"
  light-tint-green: "#dff3e7"
  light-tint-amber: "#fbefcc"
  light-tint-red: "#fde3e3"
  light-on-tint-blue: "#1d4fb8"
  light-on-tint-orange: "#9a3412"
  light-on-tint-green: "#17663a"
  light-on-tint-amber: "#7a5200"
  light-on-tint-red: "#a82020"
  light-semantic-success: "#146c34"
  light-semantic-warning: "#8a5a00"
  light-semantic-error: "#c62828"
  light-semantic-error-text: "#c62828"
  light-chart-1: "#2a78d6"
  light-chart-2: "#eb6834"
  light-chart-3: "#1baf7a"
  light-chart-4: "#eda100"
  light-chart-5: "#e87ba4"
  light-chart-6: "#008300"
  light-chart-7: "#6250d6"
  light-chart-8: "#e34948"
  light-seq-1: "#cde2fb"
  light-seq-2: "#9ec5f4"
  light-seq-3: "#6da7ec"
  light-seq-4: "#3987e5"
  light-seq-5: "#256abf"
  light-seq-6: "#184f95"
  light-seq-7: "#0d366b"
  light-div-cool-2: "#184f95"
  light-div-cool-1: "#6da7ec"
  light-div-neutral: "#e9e6e0"
  light-div-warm-1: "#ee8a8a"
  light-div-warm-2: "#a83232"
  light-chart-grid: "#ece8e1"
  light-chart-axis: "#cfc8bd"
  light-no-data: "#e4dfd7"

typography:
  hero-display:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -1.5px
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: -1px
  heading-1:
    fontFamily: Space Grotesk
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.5px
  heading-2:
    fontFamily: Space Grotesk
    fontSize: 34px
    fontWeight: 700
    lineHeight: 1.20
    letterSpacing: -0.5px
  heading-3:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: 500
    lineHeight: 1.25
  heading-4:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.30
  stat-value:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: -0.5px
  subtitle:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.50
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-md-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.55
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
  body-sm-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.50
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.40
  caption-bold:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.40
  chart-label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.30
  button-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.30
  telemetry:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.40
  eyebrow:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.40
    letterSpacing: 1.5px

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section-sm: 48px
  section: 64px
  section-lg: 96px
  hero: 120px

components:
  # Buttons
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  button-primary-disabled:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-disabled}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-accent-pressed:
    backgroundColor: "{colors.accent-pressed}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    border: "1px solid {colors.border-control}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.link}"
    typography: "{typography.body-sm-medium}"
    padding: "0"
  # Cards
  card-base:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  card-feature:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    border: "1px solid {colors.hairline}"
  card-raised:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline-strong}"
  cta-banner:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.section}"
    border: "1px solid {colors.hairline}"
  # Inputs
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.border-control}"
    height: 44px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.link}"
  text-input-error:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.semantic-error-text}"
  select-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.border-control}"
    height: 44px
  # Tabs
  pill-tab:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs} {spacing.md}"
    border: "1px solid {colors.hairline-strong}"
  pill-tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.void}"
    rounded: "{rounded.full}"
    border: "1px solid {colors.ink}"
  segmented-tab:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm-medium}"
    padding: "{spacing.sm} {spacing.md}"
  segmented-tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm-medium}"
    border: "0 0 2px {colors.accent} solid"
  # Badges
  badge-blue:
    backgroundColor: "{colors.tint-blue}"
    textColor: "{colors.link}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-orange:
    backgroundColor: "{colors.tint-orange}"
    textColor: "{colors.on-tint-orange}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-success:
    backgroundColor: "{colors.tint-green}"
    textColor: "{colors.on-tint-green}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-warning:
    backgroundColor: "{colors.tint-amber}"
    textColor: "{colors.semantic-warning}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-error:
    backgroundColor: "{colors.tint-red}"
    textColor: "{colors.semantic-error-text}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-live:
    backgroundColor: "{colors.tint-orange}"
    textColor: "{colors.on-tint-orange}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  # Hero
  hero-orbit:
    backgroundColor: "{colors.void}"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "{spacing.hero} {spacing.xxl}"
  hero-eyebrow:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.eyebrow}"
  hero-data-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "0"
    border: "1px solid {colors.hairline-strong}"
    shadow: "rgba(47, 111, 237, 0.18) 0px 0px 80px 0px"
  telemetry-strip:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.telemetry}"
    padding: "{spacing.md} 0"
    border: "1px 0 0 {colors.hairline} solid"
  # Data display
  stat-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.stat-value}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  data-table:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.hairline}"
  data-table-header:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption-bold}"
    padding: "{spacing.sm} {spacing.md}"
  data-table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "{spacing.sm} {spacing.md}"
    border: "0 0 1px {colors.hairline} solid"
  data-source-caption:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    padding: "{spacing.xs} 0 0"
  # Charts
  chart-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  chart-title:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.heading-4}"
  chart-subtitle:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
  chart-axis-label:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.chart-label}"
  chart-legend-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.chart-label}"
    padding: "0 {spacing.sm} 0 0"
  chart-tooltip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.sm}"
    border: "1px solid {colors.hairline-strong}"
    shadow: "rgba(0, 0, 0, 0.5) 0px 8px 24px -4px"
  chart-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  # Maps
  map-container:
    backgroundColor: "{colors.void}"
    rounded: "{rounded.lg}"
    padding: "0"
    border: "1px solid {colors.hairline}"
  map-control:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.hairline-strong}"
    size: 44px
  map-legend:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.chart-label}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
    border: "1px solid {colors.hairline-strong}"
  map-layer-panel:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
    border: "1px solid {colors.hairline-strong}"
  map-popup:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.hairline-strong}"
    shadow: "rgba(0, 0, 0, 0.5) 0px 8px 24px -4px"
  map-marker:
    backgroundColor: "{colors.map-ink}"
    rounded: "{rounded.full}"
    size: 14px
    border: "2px solid {colors.route-casing}"
  map-waypoint:
    backgroundColor: "{colors.route-casing}"
    textColor: "{colors.map-ink}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    size: 24px
    border: "2px solid {colors.route}"
  map-route:
    backgroundColor: "{colors.route}"
    height: 4px
    border: "2px solid {colors.route-casing}"
  map-scale:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.telemetry}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
    border: "1px solid {colors.hairline-strong}"
  route-summary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  theme-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    size: 44px
  map-timeline:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.telemetry}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.hairline-strong}"
  map-attribution:
    backgroundColor: "{colors.void}"
    textColor: "{colors.text-muted}"
    typography: "{typography.chart-label}"
    padding: "2px 6px"
  # Page chrome
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm-medium}"
    height: 64px
    border: "0 0 1px {colors.hairline} solid"
  faq-accordion-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "{spacing.xl} 0"
    border: "0 0 1px {colors.hairline} solid"
  footer-region:
    backgroundColor: "{colors.void}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
    padding: "{spacing.section} {spacing.xxl}"
    border: "1px 0 0 {colors.hairline} solid"
  footer-link:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xxs} 0"
---

## Overview

This is a **mission control** identity: the calm, instrument-panel look of an operations room, built to make data the brightest thing on screen. It is our own identity, inspired by spaceflight, and it does not copy any company's brand.

**The product** is a layered, interactive map of a place or route on Mars. It combines data from several NASA missions so that a human explorer can plan a safe Marswalk and do science along the way. The map is the product: every page either is the map or exists to explain it.

The site has **two themes**: dark (the default, described first) and light (see **Themes**). In dark, surfaces step up from `{colors.void}` (the hero and footer) through `{colors.canvas}` (the page) to `{colors.surface}` and `{colors.surface-raised}` (cards and floating panels). Depth comes from those steps and from hairline borders, not from drop shadows.

Two colours carry meaning in the chrome. **Orbit blue** (`{colors.primary}`) is the action colour: the main button on any screen. **Launch orange** (`{colors.accent}`) is the signal colour: one eyebrow label, one active tab underline, one "live" badge. It is never used on the map itself, where it would vanish against Mars imagery. If orange appears more than a couple of times in a viewport, it has stopped being a signal.

**Key characteristics:**
- Two themes, dark by default; the map viewport looks the same in both
- Deep-space surfaces with hairline borders
- Grayscale Mars basemaps under data layers, so colour always means data
- Orbit-blue primary action, launch-orange signal accent used sparingly
- Space Grotesk headlines, Inter body, JetBrains Mono for telemetry
- A hero that leads with a real data visual, not an illustration
- First-class chart and map components with a validated, colourblind-safe data palette
- Every chart, map and figure carries a visible data source caption
- 8px buttons, 12px cards, pills reserved for tabs and the live badge

### Brand rules (read before using any NASA material)

- **Do not use the NASA insignia ("meatball"), the NASA logotype ("worm"), the NASA seal, or the Space Apps logo as part of our own identity.** Their use is restricted, and using them implies an endorsement we do not have. If the Space Apps organisers supply an official participant badge, use it exactly as supplied and only where their guidelines allow.
- NASA imagery and data are generally free to use, but check the usage note on each source page and **credit the source** every time (see `data-source-caption`).
- Do not ship another organisation's proprietary fonts, logos or illustrations. All three typefaces here are open-licensed (SIL Open Font License).
- Our own logo is described under **Logo** below.

### Logo

The Sol Stroll logo is a wordmark with the mark built into it. Files are in `public/brand/`.

- **Wordmark**: "Sol Stroll" in Space Grotesk 700, converted to outlines so it renders without the font.
- **The sun**: the "o" in "Sol" is replaced by a solid disc in `{colors.accent}`. It is the sun, and a sol is one Martian day. There is no separate symbol.
- **Tagline**: "Know before you go." Set in `{typography.body-sm}` and `{colors.text-secondary}` when shown with the logo. It is never part of the logo file.

| File | Use |
|---|---|
| `logo-on-dark.svg` | Dark theme: top nav, hero, slides with a dark background |
| `logo-on-light.svg` | Light theme and light slides |

- Minimum width: 80px for the wordmark. There is no icon-only version and no favicon; where the wordmark will not fit, use plain text.
- Clear space: at least the diameter of the sun on every side.
- Do not recolour, stretch, rotate, add effects, or place it over imagery. The sun is always `{colors.accent}`; this is the one fixed use of the accent outside the "sparingly" rule.
- In running text, write "Sol Stroll" as plain text. Never imitate the logo by colouring a letter.
- The logo files hold fixed colour values, because an image file cannot read theme tokens. If `accent`, `ink` or `light-ink` change, regenerate the files.

## Colors

### Surfaces
- **Void** (`{colors.void}`): hero band, footer, map background. The darkest plane.
- **Canvas** (`{colors.canvas}`): page background.
- **Surface** (`{colors.surface}`): cards, chart cards, tables.
- **Surface Raised** (`{colors.surface-raised}`): anything that floats above a card: tooltips, popups, map controls, table headers.
- **Hairline** (`{colors.hairline}`): default 1px card borders and dividers. Decorative only.
- **Hairline Strong** (`{colors.hairline-strong}`): borders on raised panels.
- **Border Control** (`{colors.border-control}`): borders of inputs and outlined buttons. This is the only border token that meets the 3:1 contrast needed for interactive boundaries; never use a hairline for a control edge.

### Text
- **Ink** (`{colors.ink}`): headlines and primary body text.
- **Text Secondary** (`{colors.text-secondary}`): supporting copy, legends, nav links.
- **Text Muted** (`{colors.text-muted}`): axis labels, captions, footer links. The dimmest colour allowed for readable text.
- **Text Disabled** (`{colors.text-disabled}`): disabled labels and placeholders only. Never for content a user must read.

### Action and signal
- **Orbit Blue** (`{colors.primary}`): primary button background, with `{colors.on-primary}` text. Not for text on dark surfaces.
- **Orbit Blue Pressed** (`{colors.primary-pressed}`): pressed state.
- **Link** (`{colors.link}`): inline links and focus rings. This is the blue to use for text.
- **Launch Orange** (`{colors.accent}`): the signal accent. Text on it is `{colors.on-accent}` (dark), never white.
- **Launch Orange Pressed** (`{colors.accent-pressed}`): pressed state.

### Semantic
- **Success** (`{colors.semantic-success}`), **Warning** (`{colors.semantic-warning}`), **Error** (`{colors.semantic-error}` for fills and icons, `{colors.semantic-error-text}` for text).
- A status colour always ships with an icon and a label. Colour is never the only signal.

### Data palette
Defined under **Charts** below. The `chart-*`, `seq-*` and `div-*` tokens are for data marks only. They are never used for buttons, text or decoration, and chrome colours are never used as series colours.

### Themes

- **Dark is the default.** On first visit the site follows the visitor's system setting (`prefers-color-scheme`); the `theme-toggle` in the top nav overrides it and the choice is remembered.
- **Light is a token swap, not a redesign.** Every token that has a `light-` twin in the front matter is replaced by it (`surface` becomes `light-surface`, `chart-1` becomes `light-chart-1`, and so on). Component specs are written once, against the unprefixed names.
- **Shared by both themes**: `primary`, `primary-pressed`, `on-primary`, the `accent` fill with `on-accent` text, and the map overlay tokens (`route`, `route-casing`, `map-ink`).
- **Light surfaces are warm**: `light-canvas` is a paper tone, cards are white, and `light-void` (hero, footer) is a slightly deeper sand. These are neutral warm greys, not a Mars orange wash.
- **Accent text differs.** `accent` is too pale for text on light surfaces. In light, eyebrow labels and tab underlines use `light-accent`; the orange button fill is unchanged.
- **Ramps flip.** In light, `seq-1` (low) is the palest step and `seq-7` the darkest, so low values still recede into the surface. The diverging ramp likewise has dark poles and a pale neutral midpoint.
- **The map viewport does not change with the theme.** Mars imagery, data layers and route overlays are identical in both. Only the floating panels around the map (controls, legend, popups) follow the theme. Data layers on the map always use the dark-theme ramp order.
- **Slides and the demo video use the light theme** unless the room is known to be dark; light projects more reliably.
- Never mix themes on one page, and never hard-code a colour that only works in one theme.

### Checked contrast, light theme (WCAG ratio)

| Pair | On light-void | On light-canvas | On light-surface |
|---|---|---|---|
| `light-ink` | 15.2 | 16.6 | 18.1 |
| `light-text-secondary` | 7.3 | 8.0 | 8.7 |
| `light-text-muted` | 5.0 | 5.4 | 5.9 |
| `light-link` | 5.3 | 5.8 | 6.3 |
| `light-accent` | 4.8 | 5.2 | 5.7 |
| `light-semantic-success` | 5.5 | 6.0 | 6.5 |
| `light-semantic-warning` | 5.0 | 5.4 | 5.9 |
| `light-semantic-error` | 4.7 | 5.2 | 5.6 |

`light-border-control` is 3.2 to 3.8 against all three. All light badge pairs are about 6.0. `light-text-disabled` is for disabled labels only.

Three light chart colours (`light-chart-3`, `light-chart-4`, `light-chart-5`) are below 3:1 against white. That is allowed **only because** every chart has direct labels or a legend plus a table view; never rely on those three colours alone.

### Checked contrast, dark theme (WCAG ratio)

| Pair | On canvas | On surface | On surface-raised |
|---|---|---|---|
| `ink` | 17.6 | 16.4 | 14.8 |
| `text-secondary` | 10.4 | 9.7 | 8.8 |
| `text-muted` | 6.5 | 6.0 | 5.4 |
| `link` | 8.9 | 8.2 | 7.5 |
| `accent` | 6.8 | 6.3 | 5.7 |
| `semantic-error-text` | 8.5 | 7.9 | 7.1 |

`on-primary` on `primary` is 4.55. `on-accent` on `accent` is 7.1. All badge pairs are above 6.8. `text-disabled` (about 3.2) and `semantic-error` (about 3.7) are below the 4.5 needed for body text, which is why they are restricted above.

## Typography

### Font families
- **Space Grotesk** (display): headlines, stat values, the wordmark. Weights 500 and 700. Fallbacks: `"Space Grotesk", "Inter", system-ui, sans-serif`.
- **Inter** (body and UI): all running text, buttons, labels, chart text. Weights 400, 500, 600. Fallbacks: `"Inter", system-ui, -apple-system, "Segoe UI", sans-serif`.
- **JetBrains Mono** (telemetry): coordinates, timestamps, dataset IDs, units readouts, eyebrow labels. Weights 400 and 500. Fallbacks: `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`.

All three are open-licensed and available from Google Fonts. Load only the weights listed, with `font-display: swap`.

### Hierarchy

| Token | Font | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|---|
| `{typography.hero-display}` | Space Grotesk | 72px | 700 | 1.05 | -1.5px | Hero headline |
| `{typography.display-lg}` | Space Grotesk | 56px | 700 | 1.10 | -1px | Section openers |
| `{typography.heading-1}` | Space Grotesk | 44px | 700 | 1.15 | -0.5px | Page headlines |
| `{typography.heading-2}` | Space Grotesk | 34px | 700 | 1.20 | -0.5px | Section headlines |
| `{typography.heading-3}` | Space Grotesk | 26px | 500 | 1.25 | 0 | Card titles |
| `{typography.heading-4}` | Space Grotesk | 20px | 500 | 1.30 | 0 | Chart titles, tile titles |
| `{typography.stat-value}` | Space Grotesk | 40px | 700 | 1.10 | -0.5px | Stat tile numbers |
| `{typography.subtitle}` | Inter | 18px | 400 | 1.50 | 0 | Hero subtitle |
| `{typography.body-md}` | Inter | 16px | 400 | 1.55 | 0 | Body text (default) |
| `{typography.body-md-medium}` | Inter | 16px | 500 | 1.55 | 0 | Body emphasis |
| `{typography.body-sm}` | Inter | 14px | 400 | 1.50 | 0 | Secondary body, tables, tooltips |
| `{typography.body-sm-medium}` | Inter | 14px | 500 | 1.50 | 0 | Nav links, tabs |
| `{typography.caption}` | Inter | 13px | 400 | 1.40 | 0 | Captions, data source lines |
| `{typography.caption-bold}` | Inter | 13px | 600 | 1.40 | 0 | Badges, table headers |
| `{typography.chart-label}` | Inter | 12px | 400 | 1.30 | 0 | Axis ticks, legends, map legend |
| `{typography.button-md}` | Inter | 14px | 600 | 1.30 | 0 | Button labels |
| `{typography.telemetry}` | JetBrains Mono | 13px | 400 | 1.40 | 0 | Coordinates, timestamps, IDs |
| `{typography.eyebrow}` | JetBrains Mono | 12px | 500 | 1.40 | 1.5px | Uppercase eyebrow labels |

### Principles
- Tight leading and negative tracking on display sizes; generous 1.55 leading on body.
- Eyebrows are uppercase mono. Nothing else is uppercase.
- Mono is for machine-like values only. Never set a sentence in mono.
- Numbers that line up in columns (tables, axis ticks) use `font-variant-numeric: tabular-nums`.
- Always show units next to a value ("412 ppm", "14.2 °C"), and write dates unambiguously ("14 Nov 2026").
- No text below 12px.

## Layout

### Spacing system
- **Base unit**: 4px, with 8px as the main increment.
- **Tokens**: `{spacing.xxs}` (4px) through `{spacing.hero}` (120px).
- **Section rhythm**: `{spacing.section-lg}` (96px) between major sections; `{spacing.section}` (64px) inside dense data pages.

### Grid and container
- 1280px max width with 32px gutters (16px on mobile).
- 12-column grid, 24px column gap. Chart cards span 6 or 12 columns; stat tiles span 3.
- The hero is left-aligned on desktop: text in the left 6 columns, `hero-data-card` in the right 6. It stacks on mobile.
- Data pages put filters in one row above the charts they control.

### Whitespace philosophy
Dark interfaces feel crowded faster than light ones. Give data room: at least `{spacing.xl}` (24px) between cards, and never let two charts share a card.

## Elevation & Depth

Shadows barely show on dark surfaces, so in dark elevation is expressed by surface colour and border. In light, cards and raised panels are both white, so raised and floating levels add a soft shadow: level 2 uses `rgba(20, 22, 28, 0.06) 0px 2px 8px 0px`, level 3 uses `rgba(20, 22, 28, 0.14) 0px 12px 32px -4px`. The hero glow is dark-theme only; in light the hero data card uses the level 3 shadow.

| Level | Treatment | Use |
|---|---|---|
| 0 (page) | `{colors.canvas}`, no border | Page background |
| 1 (card) | `{colors.surface}` + 1px `{colors.hairline}` | Cards, chart cards, tables |
| 2 (raised) | `{colors.surface-raised}` + 1px `{colors.hairline-strong}` | Map controls, legends, table headers |
| 3 (floating) | Level 2 + `rgba(0, 0, 0, 0.5) 0px 8px 24px -4px` | Tooltips, popups, dropdowns, modals |
| Glow | `rgba(47, 111, 237, 0.18) 0px 0px 80px 0px` | `hero-data-card` only |

The blue glow is used once per page, on the hero data card. It is not a general-purpose effect.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Bar chart data-ends, small chips |
| `{rounded.sm}` | 6px | Badges, ghost buttons |
| `{rounded.md}` | 8px | Buttons, inputs, tooltips, map controls |
| `{rounded.lg}` | 12px | Cards, chart cards, map container |
| `{rounded.xl}` | 16px | Hero data card, CTA banner |
| `{rounded.full}` | 9999px | Pill tabs, live badge, map markers |

## Components

### Interaction states (apply to every interactive component)
- **Hover**: one surface step lighter, or `primary` to `primary-pressed`. Transition 150ms ease.
- **Pressed**: the `-pressed` token where one exists.
- **Focus**: a 2px `{colors.link}` outline with a 2px offset. Always visible for keyboard users; never removed.
- **Disabled**: `surface-raised` background, `text-disabled` label, no pointer events.
- Respect `prefers-reduced-motion`: no transitions, no animated map flights, no auto-playing timelines.

### Buttons

**`button-primary`**: the main action on a screen. One per view.
- Background `{colors.primary}`, text `{colors.on-primary}`, typography `{typography.button-md}`, padding `12px 20px`, rounded `{rounded.md}`. Pressed uses `{colors.primary-pressed}`.

**`button-accent`**: launch-orange button for the single most important call to action on the whole site (for example "Explore the data" in the hero). At most one per page; if in doubt, use `button-primary`.
- Background `{colors.accent}`, text `{colors.on-accent}`, same size as primary.

**`button-secondary`**: outlined, for secondary actions.
- Transparent, text `{colors.ink}`, border `1px solid {colors.border-control}`.

**`button-ghost`**: low-emphasis actions inside cards and toolbars.
- Transparent, text `{colors.text-secondary}`, padding `8px 12px`, rounded `{rounded.sm}`.

**`button-link`**: inline text link.
- Text `{colors.link}`, underlined on hover and focus.

All buttons have a minimum touch height of 44px.

### Cards and containers

**`card-base`**: standard content card. Background `{colors.surface}`, rounded `{rounded.lg}`, padding `{spacing.xl}`, border `1px solid {colors.hairline}`.

**`card-feature`**: the same with `{spacing.xxl}` padding, for feature explanations.

**`card-raised`**: a card that must stand out from its neighbours. Background `{colors.surface-raised}`, border `{colors.hairline-strong}`.

**`cta-banner`**: closing call to action. Background `{colors.surface}`, rounded `{rounded.xl}`, padding `{spacing.section}`.

### Inputs and forms

**`text-input`** and **`select-input`**: background `{colors.canvas}`, text `{colors.ink}`, border `1px solid {colors.border-control}`, rounded `{rounded.md}`, height 44px. Every input has a visible label above it; placeholders are not labels.

**`text-input-focused`**: border becomes `2px solid {colors.link}`.

**`text-input-error`**: border `2px solid {colors.semantic-error-text}`, with an error message below in `{colors.semantic-error-text}` and an icon.

### Tabs

**`pill-tab`** and **`pill-tab-active`**: top-level switching (for example between datasets). Inactive: text `{colors.text-secondary}`, border `{colors.hairline-strong}`. Active: background `{colors.ink}`, text `{colors.void}`.

**`segmented-tab`** and **`segmented-tab-active`**: underline tabs inside a section. Active: text `{colors.ink}` with a 2px `{colors.accent}` underline.

### Badges

**`badge-blue`**, **`badge-orange`**: neutral category tags. Dark tint background with light text.

**`badge-success`**, **`badge-warning`**, **`badge-error`**: status tags. Always include a short label; add an icon when space allows.

**`badge-live`**: pill-shaped mono badge for "LIVE" or "UPDATED 14 NOV". Only use "LIVE" when the data really is live.

### Hero

**`hero-orbit`**: the signature hero band.
- Background `{colors.void}`, padding `{spacing.hero} {spacing.xxl}`.
- **Content, left**: `hero-eyebrow` (uppercase mono in `{colors.accent}`, for example the challenge name), headline in `{typography.hero-display}`, subtitle in `{typography.subtitle}` and `{colors.text-secondary}`, then a button row (`button-accent` or `button-primary`, plus `button-secondary`).
- **Content, right**: `hero-data-card`.
- **Below**: `telemetry-strip`.
- **Decoration**, all original, drawn in CSS or inline SVG:
  - A sparse star field: small dots in `{colors.text-muted}` at 20 to 60 percent opacity. Static, or a very slow twinkle that is disabled under reduced motion.
  - One or two thin orbital arcs: 1px elliptical strokes in `{colors.hairline-strong}`, with a single 6px `{colors.accent}` dot on one arc as the "satellite".
  - A horizon glow: a wide radial gradient of `{colors.primary}` at about 20 percent opacity rising from the bottom edge, suggesting the limb of a planet.
- In the light theme the band is `light-void`; the star field is dropped, the orbital arcs are drawn in `light-hairline-strong`, and the horizon glow becomes a soft `accent` wash at about 12 percent opacity, like a dusty Martian horizon.
- Decoration sits behind content, is hidden from assistive technology, and never reduces text contrast. No stock rocket clip art, no photo backgrounds behind text.

**`hero-data-card`**: the hero's proof. It holds the **real, working map** (or a live crop of it showing a route), built from the project's NASA data, not a mockup or a screenshot of another product.
- Background `{colors.surface}`, rounded `{rounded.xl}`, border `1px solid {colors.hairline-strong}`, blue glow (see Elevation).
- It includes its own `data-source-caption`.

**`telemetry-strip`**: a row of three or four mono readouts under the hero, separated by hairlines. Each is an eyebrow label plus a value, for example `SITE  Jezero Crater`, `LAT / LON  18.4° N, 77.5° E`, `TERRAIN  MGS MOLA`, `IMAGERY  MRO CTX`.
- Every value must be true and traceable to `docs/DATA_SOURCES.md`. Do not invent readouts for atmosphere.

### Data display

**`stat-tile`**: one headline number.
- Layout, top to bottom: label in `{typography.caption}` and `{colors.text-secondary}`; value in `{typography.stat-value}` with its unit in `{typography.body-md}`; an optional change line ("+2.1 ppm vs 2025") with an arrow icon and a semantic colour; an optional sparkline.
- If a single number tells the story, use a stat tile instead of a chart.

**`data-table`**, **`data-table-header`**, **`data-table-row`**: the accessible view of any dataset.
- Numbers are right-aligned with tabular figures; text is left-aligned. Header row is sticky. Units go in the header, not in every cell.
- Every chart and map offers a "View as table" control that shows this component.

**`data-source-caption`**: **required under every chart, map, stat tile and figure.**
- Format: `Source: <dataset name>, <provider>. Accessed <date>.` with the dataset name linking to the source page.
- Text `{colors.text-muted}`, typography `{typography.caption}`.

### Charts

**`chart-card`**: the frame for one chart. One chart per card.
- Layout, top to bottom: `chart-title` (says what the chart shows, ideally the finding); `chart-subtitle` (measure, unit, period); optional filter row; legend; plot area; `data-source-caption`.
- Background `{colors.surface}`, rounded `{rounded.lg}`, padding `{spacing.xl}`.
- Plot area minimum height 240px on mobile, 320px on desktop.

**Choosing a form**

| The data's job | Use |
|---|---|
| One headline number | `stat-tile` |
| Change over time | Line chart (area only for a single series) |
| Compare categories | Horizontal or vertical bars, sorted |
| Part of a whole | Stacked bar. No pie charts beyond 3 slices, no donuts with a meaningless centre |
| Relationship between two measures | Scatter plot |
| Magnitude over a grid or over geography | Heatmap or choropleth with the sequential ramp |
| Above and below a baseline (anomalies) | Diverging ramp or diverging bars |

**Colour by job**
- **Categorical** (identity): `{colors.chart-1}` to `{colors.chart-8}`, assigned **in order and never cycled**. A colour follows its entity: filtering must not repaint the remaining series. More than 8 series means grouping the rest as "Other" or using small multiples.
- For scatter plots, choropleths and small multiples, where any two colours can end up side by side, use only `chart-1` to `chart-3`.
- **Sequential** (magnitude): `{colors.seq-1}` (low, recedes into the dark surface) to `{colors.seq-7}` (high). One hue only.
- **Diverging** (polarity): `{colors.div-cool-2}`, `{colors.div-cool-1}`, `{colors.div-neutral}`, `{colors.div-warm-1}`, `{colors.div-warm-2}`. The neutral midpoint is the baseline. State what the baseline is.
- **Never a rainbow scale.** It distorts the data and fails colourblind readers.
- Status colours (`semantic-*`) and the chrome colours (`primary`, `accent`) are never used as series colours.
- Text in a chart (values, labels, legend text) uses text tokens, never the series colour. A coloured mark next to the text carries identity.

The categorical palette was validated against `{colors.surface}`: all eight slots sit in the dark-mode lightness band, clear 3:1 contrast against the surface, and adjacent slots stay distinguishable under simulated protanopia and deuteranopia. The first three slots also pass when every pair is compared. Re-validate if a hex value or the order changes.

**Marks**
- Lines: 2px stroke, round joins. Point markers at least 8px, shown on hover or where data is sparse.
- Bars: `{rounded.xs}` (4px) corners on the data end only, square at the baseline. 2px gap in `{colors.surface}` between adjacent or stacked segments.
- Overlapping points get a 2px `{colors.surface}` ring.
- Gridlines: 1px `{colors.chart-grid}`, horizontal only by default. Axis and baseline: 1px `{colors.chart-axis}`.
- `chart-axis-label`: `{typography.chart-label}` in `{colors.text-muted}`, tabular figures. Value axes for bars start at zero.
- **One value axis per chart.** No dual-axis charts; use two charts or index both series to a common base.

**Legend and labels**
- `chart-legend-item`: a 10px colour swatch plus a label in `{colors.text-secondary}`. Placed above the plot, left-aligned.
- Two or more series always have a legend. With four or fewer series, also label the lines directly at their right-hand end.
- A single series needs no legend; the title names it.
- Do not print a value on every point. Label the latest value, the extremes, or the point the story is about.

**`chart-tooltip`**
- Background `{colors.surface-raised}`, border `1px solid {colors.hairline-strong}`, rounded `{rounded.md}`, floating shadow.
- Line and area charts: a vertical crosshair in `{colors.chart-axis}` with one tooltip listing every series at that x value. Bars, points and cells: a tooltip per mark.
- Content: the x value as a heading, then swatch, series name, value and unit per row.
- Hit targets are larger than the mark. Tooltips also open on keyboard focus and on tap.

**`chart-state`**: every chart implements all three.
- **Loading**: a skeleton in `{colors.surface-raised}` at the chart's final size, so the layout does not jump.
- **Empty**: a plain sentence saying why ("No observations for this period") and what to try.
- **Error**: an icon, a plain sentence, and a retry `button-secondary`. Never show a blank card or a raw error message.

**Accessibility**
- Each chart has a text alternative: a one-sentence summary of the finding, plus the "View as table" control.
- Identity is never carried by colour alone: legends, direct labels, or distinct line dashes back it up.

### Maps

**`map-container`**: the frame for a map.
- Background `{colors.void}`, rounded `{rounded.lg}`, border `1px solid {colors.hairline}`, overflow hidden.
- Height: at least 360px on mobile, 480px or more on desktop. A map never traps page scroll: on touch devices, pan with two fingers; on desktop, zoom with the scroll wheel only after the map has been clicked or with a modifier key.
- **Basemap**: Mars imagery or shaded relief; see **Mars map rules** below. The area outside the imagery is `{colors.void}` in both themes.

**`map-control`**: zoom in, zoom out, reset view, locate.
- 44px square buttons, background `{colors.surface-raised}`, border `1px solid {colors.hairline-strong}`, rounded `{rounded.md}`, icon in `{colors.ink}`. Stacked in the top-right with `{spacing.xs}` between them. Each has an accessible name.

**`map-legend`**: required whenever colour or size encodes a value.
- Bottom-left panel. Background `{colors.surface-raised}`, padding `{spacing.sm}`.
- Continuous data: a horizontal gradient bar of the `seq-*` or `div-*` ramp, with min, mid and max ticks and **the unit in the title** ("Sea surface temperature, °C").
- Classed data: a swatch per class with its range.
- Always includes a "No data" swatch in `{colors.no-data}` when gaps exist.

**`map-layer-panel`**: turn data layers on and off.
- Top-left panel. A checkbox or radio per layer with its name, and an optional opacity slider. Show at most one sequential layer at a time; two colour ramps on one map cannot be read.

**`map-marker`**: a point of interest, such as a science stop or a landing site.
- 14px circle in `{colors.map-ink}` with a 2px `{colors.route-casing}` ring; hit target 44px. The selected marker grows to 18px with a `{colors.route}` ring.
- **Markers are never orange or red.** Mars imagery is orange, tan and brown, so warm markers disappear on it.
- Categories of points use a different icon or shape for each category, with a label, not colour alone.
- Cluster markers when points overlap: a `{colors.surface-raised}` circle with the count in `{typography.caption-bold}`.

**`map-popup`**: details for a clicked feature.
- Background `{colors.surface-raised}`, rounded `{rounded.md}`, floating shadow, maximum width 320px.
- Content: place or feature name in `{typography.body-md-medium}`; coordinates in `{typography.telemetry}`; value with unit; observation date; an optional `button-link`.
- Has a close button and closes on Escape.

**`map-timeline`**: the time scrubber for time-series layers.
- A bar docked to the bottom of the map: play/pause button, a slider, and the current date in `{typography.telemetry}`.
- The slider thumb and the filled track are `{colors.accent}`; the unfilled track is `{colors.hairline-strong}`.
- Paused by default. Works with arrow keys. Under reduced motion, playback steps frame by frame instead of animating.

**`map-attribution`**: required on every map.
- Bottom-right. Text `{colors.text-muted}` on `{colors.void}` at 80 percent opacity. Credits the basemap provider and every data layer. The full citation also goes in the `data-source-caption` below the map.

### Mars map rules

These apply on top of the map components above. They exist because Mars is an orange planet and this is a planning tool.

**Basemap**
- **Use a grayscale basemap whenever a data layer or a route is shown** (for example shaded relief, or grayscale orbital imagery). Colour imagery is for looking at the place with no data on top. This keeps one rule true everywhere: on the map, colour means data.
- The layer panel names each basemap and data layer by **mission and instrument**, not by a nickname: "MGS MOLA elevation", "MRO HiRISE imagery", "MRO CTX mosaic".
- Never stretch imagery beyond its real resolution without showing the visitor that it is zoomed past its limit.

**Encoding the layers**

| Layer type | Encoding |
|---|---|
| Elevation | Sequential ramp, or the diverging ramp around the 0 m datum. Hillshade underneath. **Not** the rainbow ramp often seen on MOLA maps |
| Slope and traversability | Three ordered classes: passable, caution, impassable. Semantic colours plus a hatch pattern on "impassable", each with a text label in the legend |
| Mineralogy and composition | Categorical, `chart-1` to `chart-3` only, with labels |
| Temperature, pressure, radiation, dust | Sequential ramp for a surface; a `stat-tile` or chart for a single station |
| Anomalies (difference from a mean) | Diverging ramp, with the baseline named |

- Class thresholds (for example the slope limit for a suited walker) come from a cited source and are printed in the legend. Do not invent them.
- Semi-transparent data layers sit at 60 to 80 percent opacity over the basemap, so terrain stays readable.

**`map-route`**: the planned walk.
- A 4px line in `{colors.route}` with a 2px `{colors.route-casing}` casing on each side. The casing is what keeps the route readable on both pale dust and dark basalt; never draw a route without it.
- Segments that cross "caution" or "impassable" terrain are dashed, and flagged in the `route-summary`. Colour alone never marks a hazard.
- A draft route (being drawn) is the same line at 60 percent opacity.

**`map-waypoint`**: a numbered stop on the route.
- 24px circle, fill `{colors.route-casing}`, number in `{colors.map-ink}`, 2px `{colors.route}` ring. Start and end are labelled "Start" and "End", not just numbered. Hit target 44px; draggable with the pointer and movable with arrow keys when focused.

**`map-scale`**: required on every map.
- A scale bar in metres or kilometres, bottom-left above the legend, in `{typography.telemetry}`. It updates with zoom. A north arrow appears whenever the map can be rotated.

**`route-summary`**: the planning read-out beside or below the map.
- A card listing distance, total ascent and descent, steepest slope, hazards crossed, and science stops, each with a unit.
- **Anything estimated** (walking time, consumables, radiation dose) is labelled "estimate", and the assumption behind it is stated next to the number with its source.
- Includes an **elevation profile**: a line chart of elevation against distance along the route, built as a `chart-card` plot, with waypoints marked and hazard segments shaded. Hovering the profile highlights the matching point on the map.

**Mars conventions (show them, do not assume them)**
- **Coordinates**: show latitude and longitude in `{typography.telemetry}`, and state the convention once near the map (planetocentric or planetographic latitude, east-positive or west-positive longitude). Datasets differ; convert at the data boundary and use one convention in the UI.
- **Elevation** is relative to the Mars datum (areoid), not "sea level". Say "elevation (m, MOLA datum)".
- **Time**: use sols and local Mars time where the data does, and show the Earth date (UTC) beside it.
- **Units**: SI throughout. Metres, kilometres, kelvin or degrees Celsius, pascals, and so on, always written out next to the value.
- Say which Mars year, season or date range an environmental reading covers. A reading from one rover at one site is not the weather for the whole planet.

**Map states and accessibility**
- Loading, empty and error states follow `chart-state`.
- Every map has a text summary of what it shows, and its underlying data is available through `data-table`.
- State the projection or the caveat when area or distance matters to the claim being made.

### Briefing components

Added with the first build of the briefing page. They are compositions of existing tokens, with no new colours.

**`verdict`**: the page's main message: Go, Caution, No-go or No verdict.
- The level is set in `{typography.stat-value}` beside a round symbol (a tick, an exclamation mark, a cross or a question mark). The symbol uses the matching badge colours: `badge-success` for go, `badge-warning` for caution, `badge-error` for no-go, and `{colors.surface-raised}` with `{colors.text-secondary}` for no verdict.
- Below it, every reason is listed with its own symbol, a sentence in `{typography.body-sm}`, and its basis in `{typography.caption}` and `{colors.text-muted}`.
- The level is always given in words and by symbol, never by colour alone. The region is announced to screen readers when it changes.
- The overall level is the worst of its reasons.

**`sol-slider`**: a range input for choosing a sol, always paired with a labelled number input showing the same value.
- Thumb and filled track in `{colors.accent}` (`light-accent` in the light theme), 44px tall hit area.

**`check-row`**: a checkbox with its label, at least 44px tall. The checkbox is filled with `{colors.primary}` when ticked.

**`stop-list`**: the checklist of stops. Each row has a checkbox, the stop's number and name in `{typography.body-sm-medium}`, a one-line summary in `{typography.caption}`, and a `button-link` to its details. Rows are divided by `{colors.hairline}`. The starting stop is ticked and cannot be unticked.

**`reading-list`**: label and value pairs for measured conditions. Label in `{colors.text-secondary}`, value right-aligned with tabular figures, rows divided by `{colors.hairline}`.

**Basis lines**: any derived or assumed number is followed by a line starting "Basis:" or "Our own", in `{typography.caption}` and `{colors.text-muted}`.

### Navigation

**`top-nav`**: sticky bar, height 64px, background `{colors.canvas}`, bottom border `1px solid {colors.hairline}`.
- Left: the logo (`logo-on-dark.svg` or `logo-on-light.svg` by theme), 28px tall, linking to the home page. Centre or right: page links in `{typography.body-sm-medium}` and `{colors.text-secondary}`; the current page is `{colors.ink}` with a 2px `{colors.accent}` underline. Far right: `theme-toggle`, then one `button-primary`.

**`theme-toggle`**: a 44px icon button (sun or moon) that switches theme. It has an accessible name that states the action ("Switch to light theme"), and the choice persists.
- Collapses to a menu button below 1024px.

**`faq-accordion-item`**: a question in `{typography.heading-4}` with a chevron, bottom border `1px solid {colors.hairline}`.

**`footer-region`** and **`footer-link`**: background `{colors.void}`, top border `1px solid {colors.hairline}`.
- Must include: the team name, a "Data sources" link, the list of NASA datasets used with links, and a line stating that the project was made for the NASA Space Apps Challenge 2026 and is not endorsed by NASA.

## Do's and Don'ts

### Do
- Put real data in the hero.
- Use `{colors.primary}` for the main action and `{colors.accent}` for the one thing that must be noticed.
- Put a `data-source-caption` under every chart, map and figure.
- Show units with every number.
- Use the sequential ramp for magnitude and the diverging ramp for anomalies.
- Check every screen in both themes before calling it done.
- Draw routes with their dark casing, and show a scale bar on every map.
- Give every chart and map loading, empty and error states and a table view.
- Keep text on `ink`, `text-secondary` or `text-muted`.

### Don't
- Don't use NASA's insignia, logotype or seal, or imply NASA endorsement.
- Don't use rainbow colour scales, dual-axis charts, 3D charts or decorative charts with invented data.
- Don't use launch orange for more than a couple of elements per viewport, and don't use it as a series colour.
- Don't use `{colors.primary}` for text; use `{colors.link}`.
- Don't put white text on `{colors.accent}`.
- Don't use hairline tokens for input or button borders.
- Don't add new colours or fonts without updating this file first, and don't add a colour without its twin in the other theme.
- Don't put orange, red or brown markers, routes or labels on Mars imagery.
- Don't show a data layer over colour imagery; switch to the grayscale basemap.
- Don't present an estimate (walking time, dose, consumables) as a measurement.
- Don't place text over photographs or imagery without a solid `surface-raised` panel behind it.
- Don't use pill-shaped buttons; pills are for tabs and the live badge.

## Responsive Behavior

### Breakpoints
| Name | Width | Key changes |
|---|---|---|
| Mobile (small) | < 480px | Single column. Hero headline 36px. Stat tiles 1-up. |
| Mobile (large) | 480 to 767px | Stat tiles 2-up. Hero headline 44px. |
| Tablet | 768 to 1023px | Two-column card grids. Hero headline 56px. |
| Desktop | 1024 to 1279px | Hero becomes two columns. Hero headline 64px. |
| Wide desktop | ≥ 1280px | Full 72px hero headline. |

### Touch targets
- Buttons, inputs, map controls and tab hit areas are at least 44px tall.
- Map markers and chart marks have hit areas larger than the visible mark.

### Collapsing strategy
- **Top nav**: collapses to a menu button below 1024px.
- **Hero**: `hero-data-card` moves below the text and buttons; `telemetry-strip` wraps to a two-by-two grid; orbital arcs are simplified or hidden below 480px.
- **Charts**: full width. Reduce axis tick count rather than shrinking text. Legends wrap above the plot. Direct labels are dropped before the legend is.
- **Map page**: on desktop the map fills the viewport height below the nav with the briefing in a side panel 400px wide; below 1024px the briefing sits below the map and the page scrolls.
- **Maps**: full width. `map-layer-panel` and `map-legend` collapse into toggle buttons that open a bottom sheet. `map-timeline` stays docked at the bottom.
- **Tables**: scroll horizontally inside their own container with the first column pinned. The page itself never scrolls sideways.
- **Card grids**: 3-up desktop, 2-up tablet, 1-up mobile.

## Iteration Guide

1. Work on one component at a time.
2. Reference component names and tokens directly; never hard-code a hex value or pixel size in a component.
3. Add new variants as separate `components:` entries here first, then implement them.
4. Default to `{typography.body-md}` for body text.
5. If a colour changes, re-check its contrast and update the table in **Colors**. If a `chart-*` value or its order changes, re-validate the palette for colourblind safety.
6. Mirror the tokens once in the code (`src/styles/`) and keep that file in step with this one.

## Known Gaps

- The first build has been rendered in both themes at 1440px and at 390px in the dark theme. The light theme has not been checked on mobile.
- The first build uses a single basemap. There is no `map-layer-panel`, `map-legend`, `map-popup` or `map-timeline` yet.
- When two stops are closer than 30 m their map badges are nudged 14px apart so both stay visible; the stops' coordinates are unchanged.

- The light theme's text and UI pairs were computed, but neither theme has been rendered and reviewed on a real page yet.
- The light diverging ramp was chosen by eye from the sequential steps and has not been validated.
- The route colour was checked against sample Mars tones only, not against the actual imagery.
- Slope and hazard thresholds, walking-speed assumptions and the coordinate convention are not decided; each needs a cited source.
- The study site is not chosen. The hero and telemetry examples use Jezero Crater as a placeholder.
- The logo was checked by web search on 13 Nov 2026: no product or brand named "Sol Stroll" was found, and no identical mark. This was a text search, not an image search or a trademark search, and other "Sol" brands do use a sun in place of the "o".
- The project name and headline copy are not chosen yet.
- The basemap source and map library are not chosen; confirm licence and attribution wording when they are. The challenge's official resource list was not readable when this was written, and more resources are due on 14 Nov, so the layer names here are examples.
- Icon set not chosen. Pick one open-licensed set and use it throughout.
- The diverging ramp's two warm steps were matched to the cool steps by lightness but have not been tested in a rendered map.
- No texture or pattern fills are defined for print or forced-colours mode.
