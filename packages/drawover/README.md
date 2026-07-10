# drawoverlay

Your AI agent just finished some UI work. Now you're looking at the screen,
typing out "the button in the top right, no, the other one" — or taking a
screenshot, opening an image editor, and drawing arrows on it.

drawoverlay is a dev-only overlay for your own app. Toggle it, click the elements you
have feedback on or even draw the UI that doesn't exist yet, then hit Copy. You get a
structured Markdown review plus an annotated screenshot on your clipboard —
precise enough that an agent can act on it without guessing which button you
meant.

<img src="https://github.com/janiorvalle/drawoverlay/raw/main/docs/demo.gif" alt="Seven-second demo: drawoverlay opens over a checkout page, pins a comment on the Place order button, draws a rectangle over the order summary, and copies the review as Markdown">

It runs entirely in the browser: no accounts, no telemetry, no server,
nothing stored outside your own `localStorage`. Nothing you review ever
leaves your machine.

## The loop

1. Open your app in dev, hit `Alt+Shift+D` (`⌥⇧D` on Mac) or click the
   trigger button in the corner.
2. **Comment** mode: click elements to pin them, add comments as needed.
   drawoverlay captures the selector, the accessible facts, and the React/Vue
   component name when available.
3. **Draw** mode: rectangles, arrows, text, and images for the UI you're
   proposing.
4. **Copy Markdown** and **Copy image**, then paste both into your agent.

## Install

```sh
npm install -D drawoverlay
# or
pnpm add -D drawoverlay
# or
yarn add -D drawoverlay
# or
bun add -D drawoverlay
```

Keep the import behind an environment guard so bundlers strip the package
from production builds. drawoverlay is never included in a production bundle
when set up this way.

### Vite

```ts
if (import.meta.env.DEV || import.meta.env.VITE_DRAWOVER === "true") {
  import("drawoverlay").then(({ init }) => init());
}
```

### Next.js

On Next.js 15.3+, add an `instrumentation-client.ts` at the project root —
no component needed:

```ts
// instrumentation-client.ts
if (
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_DRAWOVER === "true"
) {
  void import("drawoverlay").then(({ init }) => init());
}
```

On older versions, use a small client component rendered once from the app
layout. `init()` is a singleton, so StrictMode double-mounting is harmless:

```tsx
"use client";

import { useEffect } from "react";

export function DrawoverBootstrap() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_DRAWOVER === "true"
    ) {
      void import("drawoverlay").then(({ init }) => init());
    }
  }, []);

  return null;
}
```

### webpack

```ts
declare const __DRAWOVER_PREVIEW__: boolean;

if (process.env.NODE_ENV !== "production" || __DRAWOVER_PREVIEW__) {
  import("drawoverlay").then(({ init }) => init());
}
```

Define `__DRAWOVER_PREVIEW__` with webpack's `DefinePlugin`. Keep it `false`
in production unless a preview environment explicitly opts in.

## API

```ts
const drawoverlay = init({
  hotkey: "alt+shift+d",
  position: "bottom-right",
  theme: "auto",
});

drawoverlay.open();
drawoverlay.close();
await drawoverlay.copy(); // same as the Copy Markdown button
drawoverlay.clear();
drawoverlay.destroy();
```

`position` accepts `bottom-right`, `bottom-left`, `top-right`, or `top-left`;
`theme` accepts `auto`, `light`, or `dark`.

## Tools

- **Comment** — hover to inspect, click to pin an element (clicks never
  operate your page while reviewing: buttons don't fire, tabs don't switch,
  links don't navigate). Pin as many as you want; each pinned element gets an
  "Add comment" button for when you're ready. Click a pinned element again to
  unpin it, `Escape` clears them all.
- **Select** — click and marquee selection, group move, corner resize,
  rotation, duplicate, delete, nudge, and layer order for your drawings.
- **Rect** — rectangles with a small color palette and optional fill.
  Double-click one to give it a label.
- **Ellipse** — same palette, fill, and labels as rectangles, drawn as an
  ellipse.
- **Arrow** — straight arrows; select one to move either endpoint.
- **Line** — straight lines without the arrowhead.
- **Text** — freestanding text anywhere on the page.
- **Image** — insert an image from a file, or just paste one while in Draw
  mode. Images stay local as data URLs.

After you draw a shape, the tool returns to Select so your next click
manipulates instead of drawing again.

Annotations persist in `localStorage` keyed by origin and path, so they
survive reloads. **Clear** removes the scene and its stored copy.

## Copying your review

Two buttons, one per representation:

- **Copy Markdown** puts the structured review on the clipboard as text.
- **Copy image** puts a full-page PNG of your app with the annotations baked
  in on the clipboard.

Copy and paste each one into your agent — no files to save or open.

The Markdown looks like this — badge numbers in the screenshot match the
headings, so you and the agent are always pointing at the same thing:

```markdown
# UI Review — /checkout (drawoverlay)

## Element comments

### [1] "Disable this until validation passes"

## Drawings (proposed UI — these elements do NOT exist yet)

### [2] Rectangle: "Home"
```

A couple of capture notes: the screenshot dependency only loads when you
press Copy image, and the capture re-fetches images your page already shows
(from cache when possible) so it can bake them into the PNG. Your own
images, inline SVG, and CSS backgrounds come through fine. Cross-origin
images need CORS headers from their host — without them they show up blank.
Video frames don't make it in. If the browser refuses image clipboard, the
status says so plainly; Copy Markdown is never affected.

## Keyboard

| Shortcut                           | Action                          |
| ---------------------------------- | ------------------------------- |
| `Alt+Shift+D` (`⌥⇧D` on Mac)       | Toggle drawoverlay              |
| `Escape`                           | Cancel the current tool or edit |
| `Delete` / `Backspace`             | Delete the selection            |
| `Cmd/Ctrl+Z`                       | Undo                            |
| `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` | Redo                            |
| `Cmd/Ctrl+D`                       | Duplicate the selection         |
| Arrow keys                         | Nudge by 1px                    |
| `Shift` + Arrow keys               | Nudge by 10px                   |
| `[` / `]`                          | Send backward / bring forward   |
| `Cmd/Ctrl+Shift+[` / `]`           | Send to back / bring to front   |
| `Shift` while rotating             | Snap to 15 degrees              |
| `Alt/⌥` while dragging             | Duplicate and move              |

## Security

Short version: nothing leaves your machine.

No telemetry, no websockets, no remote fonts or CDN assets, no server
component. The one time drawoverlay touches the network is when you press Copy
image: it re-fetches images your page already displays — cache-first and
time-bounded — so it can bake them into the screenshot. It never requests a
URL your page doesn't reference, and it never sends data anywhere. Review
data stays in the current origin's `localStorage` until you clear it. The overlay renders in an open Shadow DOM
so your app's styles and drawoverlay's can't touch each other, and it doesn't
mutate your page beyond its single mount element and a temporary hover
highlight. Keep the dynamic import behind the environment guard shown above
and production builds contain zero drawoverlay bytes — CI here verifies that on
every change.

## Feedback

If drawoverlay produces a bad selector, a useless spatial description, or a
broken screenshot on your app, open an issue and paste the copied output —
it's self-contained, so that's usually all we need to reproduce and fix it.
