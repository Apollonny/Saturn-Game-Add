---
name: Saturn — Steam Game Add
description: A full-window Saturn game catalogue with local queue previews.
colors:
  space-black: "#000"
  panel-black: "#000"
  text-white: "#eeeef0"
  muted-silver: "#a1a3aa"
  faint-silver: "#858891"
  border-neutral: "#292b31"
  divider-neutral: "#202227"
  status-green: "#77d8ae"
  action-white: "#f1f1f3"
  white: "#fff"
  action-ink: "#14161b"
  action-pressed: "#d0d2d8"
  focus-silver: "#d9dade"
  error-rose: "#f0a8a8"
  catalog-error-rose: "#e6b0ac"
typography:
  display:
    fontFamily: "Rajdhani, Manrope, Segoe UI, sans-serif"
    fontSize: "49px"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "0.2em"
  headline:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "30px"
    fontWeight: 550
    lineHeight: 1.5
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 750
    lineHeight: 1.5
rounded:
  thumbnail: "4px"
  chip: "6px"
  control: "8px"
  cover-action: "9px"
  field: "10px"
  panel: "12px"
  queue-popup: "15px"
  dialog: "16px"
  orbit: "50%"
spacing:
  tight: "4px"
  small: "8px"
  control-gap: "12px"
  gallery-gap: "18px"
  gallery-row: "22px"
  panel-inset: "18px"
  section-gap: "20px"
  medium: "24px"
  mobile-section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.action-white}"
    textColor: "{colors.action-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.cover-action}"
    padding: "0 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.white}"
  button-primary-active:
    backgroundColor: "{colors.action-pressed}"
  button-secondary:
    backgroundColor: "#ffffff06"
    textColor: "#dddfe5"
    rounded: "{rounded.control}"
    padding: "0 15px"
  input-intake:
    backgroundColor: "rgba(0,0,0,.28)"
    textColor: "{colors.white}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "52px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted-silver}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  nav-item-active:
    backgroundColor: "#ffffff0b"
    textColor: "#f4f4f5"
  category-chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted-silver}"
    rounded: "{rounded.chip}"
    padding: "7px 12px"
  category-chip-active:
    backgroundColor: "#ffffff0b"
    textColor: "#f5f5f7"
  game-cover:
    backgroundColor: "{colors.space-black}"
    rounded: "{rounded.cover-action}"
    width: "100%"
  queue-launcher:
    backgroundColor: "rgba(0,0,0,.28)"
    textColor: "#dfe1e6"
    rounded: "{rounded.control}"
    padding: "0 11px"
  queue-popover:
    backgroundColor: "rgba(0,0,0,.97)"
    textColor: "{colors.text-white}"
    rounded: "{rounded.queue-popup}"
    padding: "0"
    width: "min(500px,calc(100vw - 32px))"
---

# Design System: Saturn — Steam Game Add

## Overview

**Creative North Star: "The Quiet Orbit"**

The implemented world follows the user's black Saturn reference and supplied monochrome video: a live starfield fills the entire window behind the gallery and all views. Transparent black panels, fine neutral outlines, spaced display lettering and quiet white light preserve that atmosphere. Cover imagery supplies the gallery's color, following the added PlayStation Store reference.

This system belongs to the Turkish Steam catalogue interface and its Windows Electron shell. Source labels distinguish live store results from the 1,000-game bundled catalogue. Queue completion, library entries and history retain explicit local-preview scope. Source evidence: current `outputs/steam-game-add/style.css`, `index.html`, `app.js` and `electron/main.cjs`, checked against `PRODUCT.md` and `work/surface-brief.md`.

**Key Characteristics:**

- Full-window black space with transparent black surfaces and fine borders.
- Light geometric display type paired with readable Manrope utility text.
- A white primary action and cover-led game selection.
- Paginated Steam results, restrained status signals and explicit local-preview copy.

## Colors

The palette is neutral and cool; the frontmatter preserves the source values.

### Primary

- **Action White / White:** primary actions, brighter hover feedback and input text.
- **Action Ink / Action Pressed:** contrast inside the white action and its pressed state.

### Secondary

- **Status Green:** successful intake, processing state, completed preview history and the local-workspace status dot.
- **Error Rose / Catalog Error Rose:** intake validation and catalogue connection feedback.

### Neutral

- **Space Black / Panel Black:** the page and native chrome base; larger surfaces use transparent black fills so the wallpaper remains visible.
- **Text White / Muted Silver / Faint Silver:** reading hierarchy, supporting copy and App IDs.
- **Border Neutral / Divider Neutral:** container edges and internal separators.
- **Focus Silver:** visible keyboard focus around interactive elements.

**The Quiet Light Rule.** Keep interface emphasis white; reserve green and rose for state. Preserve cover artwork's own colors.

## Typography

Rajdhani Light is the display face; Manrope is the utility face, with Segoe UI and sans-serif fallbacks. Both font files are bundled locally. The display uses wide tracking; headings tighten tracking; compact labels retain normal spacing.

- **Display:** short desktop windows use (32px); mobile uses (31px, 0.12em), then (28px) below the smallest breakpoint.
- **Headline:** alternate-view headings become (25px) on mobile.
- **Title:** catalog headings become (17px) below (850px).
- **Body / Label:** default body text is the body role; supporting copy commonly uses (12–13px), with (11–12px) mobile labels. Final game titles use (13px, 650, 1.6 line height), reduced to (12px) on mobile; queue-item titles use (13px).
- **Action:** primary controls use the action role; standard secondary controls use (11px), selection actions (13px), and pagination controls (12px).

## Layout

The centered shell is capped at (1640px), with (96px) total outer space at desktop widths, (48px) below (1150px), and (36px) below (640px). The topbar is (76px) high; intake is capped at (800px). The catalogue fills and centers within the shell. A centered queue popover opens when needed and leaves the full width available for games.

The catalogue shows up to (60) cards per page: five cover columns, four at (1150px) and below, three at (850px) and below, then two at (640px) and below. Compact mode adds one column at each step. Default gallery gaps are (22px) vertically and (18px) horizontally; compact gaps remain (15px / 12px). The alternate library retains six columns, four below (850px), then two on mobile. Mobile navigation takes a second header row, pagination labels take a full row, and a fixed queue-action tray reserves bottom space and safe-area padding. Opening the queue hides that tray; closing restores it when relevant.

Above mobile width, windows no taller than (850px) condense the topbar to (64px), hero to (170px) and orbit to (170px); the Saturn footage scales down with the hero. Electron initially targets (1440 × 980px), with a (960 × 680px) minimum, each bounded by the monitor work area minus (48px). Its draggable titlebar is (34px) high and reserves native window controls. Browser rendering retains a (320px) body minimum.

## Elevation & Depth

Depth comes from the full-window live starfield and softly masked Saturn footage, rendered from one video decoder. A black canvas base and transparent black fills keep the scene visible: intake (0.28 opacity), empty/history surfaces (0.16), queue popover and sticky header (0.97), settings dialog (0.72), toast/tray (0.9). Text shadows protect readability over stars. White buttons retain faint ambient shadows; selected covers gain a narrow outer ring. The non-modal queue has no dimming curtain; settings dialogs use a light darkening backdrop without blur. Exact shadows and motion values are recorded in the sidecar.

Background video can pause and retains a static canvas frame or poster. Initial motion follows the operating system's reduced-motion preference; hidden/minimized windows stop wallpaper updates. Reduced-motion CSS removes cover zoom and nearly eliminates transitions and animations.

## Shapes

Controls have modest rounded corners, covers retain a portrait silhouette, and the queue popover uses (15px) corners around an unbordered inner panel. Circular orbit graphics, status dots and the selection check repeat the Saturn identity. Borders are generally (1px); the keyboard outline is (2px) with an offset of (5px). Mobile covers use (7px) corners and a slightly shorter portrait ratio.

## Components

- **Primary button:** white, compact and confident; its standard height is in the frontmatter. Intake uses (52px); queue and mobile tray use (38px). Hover brightens the surface and shadow, press darkens it, and disabled controls use (0.4) opacity.
- **Secondary button:** a quiet tinted surface with a neutral border, minimum height (39px). Hover increases tint and border brightness.
- **Intake field:** transparent black wrapper, search icon, (14px) text and desktop slash-key hint. Focus strengthens the wrapper border. Mobile uses (49px) height and (12px) text; adjacent live feedback sets `aria-invalid` for errors.
- **Navigation:** bordered, rounded active tabs; inactive text stays muted. Active state uses `aria-current="page"`. Icon visibility and labels adapt across narrower breakpoints.
- **Category chip:** a neutral filter, minimum height (36px). Selected state combines tint, visible border and `aria-pressed`; mobile reduces text and padding.
- **Game cover tile:** every tile keeps a portrait silhouette at (2 / 2.8), shifting to (2 / 2.65) on mobile. Prefer Steam's 600×900 library capsule; when only a horizontal source exists, fill the portrait tile with a centered crop so no cover renders as a horizontal strip. Hover adds a small zoom; selection adds a bright outline and circular check. Favorites use (32px) controls, appearing on hover, keyboard focus or saved state and continuously on mobile. Failed artwork and unknown App IDs retain fallback covers. Catalogue re-rendering restores keyboard focus; page changes focus the first available tile.
- **Pagination / source status:** previous/next controls frame a tabular page count. Live counts say “sonuç”; bundled counts say “oyun”. A loading message accompanies grid opacity (0.72), disabled pagination and `aria-busy`; connection feedback offers retry while the local catalogue remains usable.
- **Queue / notices:** the count-bearing launcher opens a centered `popover="auto"` with `role="dialog"` and `aria-modal="false"`. Selecting a game also opens it. The popover closes on outside click, Escape, its close control, successful queue addition or completed preview run. It is capped at (500px) width and (min(78dvh, 720px)) height; mobile uses (min(460px, 100vw − 24px)) width and (82dvh) height. The compact selection uses a (36 × 48px) thumbnail, (9px) gap and an action with (11px) top margin. A sticky header and bounded scrolling list keep actions usable; the tighter footer uses (12px / 18px) action padding and a (10px, 1.55 line height) notice with its preview label inline. Status toasts sit above the mobile tray when visible.

Seven self-contained component examples, including the actual bundled cover artwork and native queue popover, are in `.impeccable/design.json`.

## Do's and Don'ts

### Do:

- **Do** preserve the supplied monochrome Saturn world and full-window live starfield behind all views.
- **Do** use the white primary action, compact utility text and visible selection outline.
- **Do** keep keyboard focus and reduced-motion behavior visible and functional.
- **Do** retain local-preview scope in queue, library and history copy.
- **Do** distinguish live Steam result counts from the bundled catalogue.

### Don't:

- **Don't** spread status green across decorative surfaces.
- **Don't** cover the gallery or workspace with an opaque gray curtain.
- **Don't** replace bundled cover art with generic illustrations when the catalog has an actual cover.
- **Don't** describe preview completion as a change to the user's Steam library.

The catalogue queue launcher pins to the bottom-right when its heading scrolls above the viewport. The same DOM control preserves count, dialog state and keyboard focus; mobile positioning reserves space for the action tray.
