# drawover

Your AI agent just finished some UI work. Now you're looking at the screen,
typing out "the button in the top right, no, the other one" — or taking a
screenshot, opening an image editor, and drawing arrows on it. Drawover
replaces that loop.

It's a dev-only overlay for your own app. Toggle it, click the elements you
have feedback on, draw the UI that doesn't exist yet, then hit Copy. You get a
structured Markdown review plus an annotated screenshot on your clipboard —
precise enough that an agent can act on it without guessing which button you
meant.

It runs entirely in the browser: no accounts, no telemetry, no network
requests, nothing stored outside your own `localStorage`.

## The loop

1. Open your app in dev, hit `Alt+Shift+D`.
2. **Comment** mode: click elements to pin them, add comments to the ones that
   need changes. Drawover captures a stable selector, the accessible facts,
   and the React/Vue component name when available.
3. **Draw** mode: rectangles, arrows, text, and images for the UI you're
   proposing — the output clearly tells the agent these elements don't exist
   yet.
4. **Copy review**, paste into your agent. Text targets get the Markdown,
   image targets get the annotated screenshot. Badge numbers match across
   both.

## Install

```sh
pnpm add -D drawover
```

Keep the import behind an environment guard — that's what lets production
bundlers strip the package completely. Drawover ships with a CI check for
this pattern; you should never see it in a production bundle.

### Vite

```ts
if (import.meta.env.DEV || import.meta.env.VITE_DRAWOVER === "true") {
  import("drawover").then(({ init }) => init());
}
```

### Next.js

```tsx
"use client";

import { useEffect } from "react";

export function DrawoverBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    if (
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_DRAWOVER === "true"
    ) {
      void import("drawover").then(({ init }) => {
        const instance = init();
        if (cancelled) instance.destroy();
        else destroy = () => instance.destroy();
      });
    }
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return null;
}
```

Render `DrawoverBootstrap` once from the app layout.

### webpack

```ts
declare const __DRAWOVER_PREVIEW__: boolean;

if (process.env.NODE_ENV !== "production" || __DRAWOVER_PREVIEW__) {
  import("drawover").then(({ init }) => init());
}
```

Define `__DRAWOVER_PREVIEW__` with webpack's `DefinePlugin`. Keep it `false`
in production unless a preview environment explicitly opts in.

## API

```ts
const drawover = init({
  hotkey: "alt+shift+d",
  position: "bottom-right",
  theme: "auto",
});

drawover.open();
drawover.close();
await drawover.copy(); // same as the Copy review button
drawover.clear();
drawover.destroy();
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
- **Arrow** — straight arrows; select one to move either endpoint.
- **Text** — freestanding text anywhere on the page.
- **Image** — insert an image from a file, or just paste one while in Draw
  mode. Images stay local as data URLs.

After you draw a shape, the tool returns to Select so your next click
manipulates instead of drawing again.

Annotations persist in `localStorage` keyed by origin and path, so they
survive reloads. **Clear** removes the scene and its stored copy.

## Copy review

One press puts two representations on the clipboard: the Markdown review as
text, and a full-page PNG of your app with the annotations baked in.

Here's the part worth knowing: the paste target picks which one it takes.
Text fields take the Markdown, image-accepting targets (most agent chats)
take the screenshot. You can't force a target's choice — so after a copy the
toolbar shows **Text** and **Image** chips that re-copy just one flavor. If
an app grabbed the Markdown when you wanted the screenshot, click **Image**
and paste again.

The Markdown looks like this — badge numbers in the screenshot match the
headings, so you and the agent are always pointing at the same thing:

```markdown
# UI Review — /checkout (drawover)

## Element comments

### [1] "Disable this until validation passes"

## Drawings (proposed UI — these elements do NOT exist yet)

### [2] Rectangle: "Home"
```

A couple of capture caveats: the screenshot dependency only loads when you
press Copy, and capture never fetches host-page assets — so externally
hosted images, video, and host-page SVG may be missing from the PNG. Layout,
text, and locally loaded assets come through fine. If the browser refuses
image clipboard, you still get the Markdown with an honest "Markdown only"
status.

One tip that saves a round trip: write comments as instructions ("change
this to X"), not observations ("this is wrong"). The tool nails the _where_;
the _what_ is on you.

## Keyboard

| Shortcut                           | Action                          |
| ---------------------------------- | ------------------------------- |
| `Alt+Shift+D`                      | Toggle Drawover                 |
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
| `Alt` while dragging               | Duplicate and move              |

## Security

Short version: nothing leaves your machine.

No telemetry, no network requests, no websockets, no remote fonts or CDN
assets, no server component. Review data stays in the current origin's
`localStorage` until you clear it. The overlay renders in an open Shadow DOM
so your app's styles and Drawover's can't touch each other, and it doesn't
mutate your page beyond its single mount element and a temporary hover
highlight. Keep the dynamic import behind the environment guard shown above
and production builds contain zero Drawover bytes — CI here verifies that on
every change.

## Feedback

If Drawover produces a bad selector, a useless spatial description, or a
broken screenshot on your app, open an issue and paste the copied output —
it's self-contained, so that's usually all we need to reproduce and fix it.
