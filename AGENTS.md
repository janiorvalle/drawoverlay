# Working on drawoverlay

Conventions for anyone (human or agent) changing this codebase. These aren't
style preferences — most of them are enforced by CI, and the rest exist
because breaking them breaks the product's core promises.

## Hard rules

- No telemetry, no new runtime dependencies, and no network calls in the
  published package. One exception: PNG capture may re-fetch assets the host
  page already shows (cache-first, time-bounded, GET-only) so they land in
  the screenshot. Nothing is ever sent anywhere. The one allowed dependency
  is the lazy-loaded screenshot library. An architecture check fails the
  build on violations.
- Raw color values live only in `src/theme/tokens.ts`. Everything else uses
  the `--dv-*` custom properties. Also enforced by the architecture check.
- All coordinate conversion between viewport and document space goes through
  `coordinates.ts`. Don't do your own `scrollX/scrollY` math anywhere else.
- Pointer-mode changes route through the shell-owned mode state. No other
  module toggles `pointer-events` on the layers.
- drawoverlay UI renders inside its open Shadow DOM host. Don't mutate the host
  page beyond the single mount element and the temporary hover highlight.

## Things that look safe to change but aren't

- `aria-label` values — the test suite selects by accessible name, and
  they're the public a11y contract. Changing one is a breaking change to
  both.
- The scene SVG's inline presentation attributes — PNG export serializes the
  scene standalone, where CSS variables and classes resolve to nothing.
  Export-critical styling must stay inline with concrete values.
- The `--dv-bg` token name — it doubles as a production-strip marker that CI
  scans builds for.

## Before you're done

Add tests for any contract or behavior change, then run `pnpm verify`. It
mirrors CI exactly; if a gate fails, fix the cause rather than the check. If
you're unsure whether something counts as a contract change, it probably
does — ask first.
