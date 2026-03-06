# Task: TASK-054 Status bar with message history

## Metadata
- **Priority**: P2
- **Status**: complete

## Goal
Replace the static header subtitle ("Plan your road trip with dates and destinations") with a status bar that temporarily displays feedback messages from search operations. Messages crossfade over the subtitle using CSS opacity transitions, auto-dismiss after 10 seconds, and a clickable history dropdown shows all past messages with detail popups.

## Implementation notes

### Component: `src/app/map/components/StatusBar.tsx`
- Uses `forwardRef` + `useImperativeHandle` to expose `pushStatus(text, detail?)` method
- Crossfade animation: default subtitle at full opacity when idle, status message overlaid absolutely with opacity transitions (500ms fade)
- Auto-dismiss: status messages fade out after 10 seconds
- History dropdown: reverse-chronological list, opens on subtitle click, closes on outside click or Escape
- Detail popup: fixed modal showing full message text and optional detail (e.g., JSON error responses)
- ID generation uses `Date.now() + Math.random()` (not `crypto.randomUUID` which is unavailable in HTTP contexts)
- Max 50 messages retained in history

### Wiring in `src/app/map/page.tsx`
- `statusBarRef = useRef<StatusBarHandle>(null)` replaces the static subtitle `<p>` element
- All 5 search handlers push status messages:
  - Nearby search (OSM/Google)
  - Park4Night
  - Tripadvisor
  - Foursquare
  - Show Cached
- Success: "Found N places via [Provider]"
- Error: provider-specific error message with optional JSON detail

## Definition of done
- [x] `StatusBar` component created with crossfade animation
- [x] `StatusBarHandle` interface exported with `pushStatus` method
- [x] Messages auto-dismiss after 10 seconds with fade transition
- [x] Clicking subtitle opens reverse-chronological history dropdown
- [x] Clicking history entry opens detail popup with full message and optional detail
- [x] Outside click and Escape close dropdown and popup
- [x] All search handlers wired to push status messages
- [x] Works in HTTP (insecure) dev context (no `crypto.randomUUID`)

## Links
- Component: `src/app/map/components/StatusBar.tsx`
- Wiring: `src/app/map/page.tsx`
