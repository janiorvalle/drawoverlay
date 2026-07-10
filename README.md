# drawover

Drawover is a framework-agnostic development overlay for precise UI review. It
runs entirely in the browser, stores no data remotely, and makes no network
requests.

## Install

```sh
pnpm add -D drawover
```

The import must stay behind an environment guard so production bundlers can
remove the package completely.

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

Define `__DRAWOVER_PREVIEW__` with webpack's `DefinePlugin`. Keep it `false` in
production unless the preview environment explicitly opts in.

## Shell API

```ts
const drawover = init({
  hotkey: "alt+shift+d",
  position: "bottom-right",
  theme: "auto",
});

drawover.open();
drawover.close();
await drawover.copy(); // Markdown
drawover.clear();
drawover.destroy();
```

The default hotkey is `Alt+Shift+D`. `position` accepts `bottom-right`,
`bottom-left`, `top-right`, or `top-left`; `theme` accepts `auto`, `light`, or
`dark`.

## Tools

- **Comment** highlights host-page elements and captures a robust selector,
  accessible facts, bounds, and available React/Vue development metadata. Click
  an element, enter the comment, and save. Double-click its numbered pin in Draw
  mode to edit it.
- **Select** supports click and marquee selection, group movement, corner resize,
  rotation, duplication, deletion, nudging, and layer order.
- **Rect** draws rectangles with a fixed color palette and optional fill.
  Double-click a rectangle to add or edit its label.
- **Arrow** draws straight arrows; select one to move either endpoint.
- **Text** places editable freestanding text.
- **Image** imports an image file. Pasting an image while Draw mode is active also
  inserts it. Images remain local as data URLs.
- **Notes** manages page-level general notes.

Annotations and notes are saved in `localStorage` using an origin-and-path key.
They survive reloads, while **Clear** removes both the scene and its stored copy.
Undo after reload starts from the restored scene instead of erasing it.

## Commands

- **Copy** writes the primary Markdown review to the clipboard.
- **JSON** writes the same versioned scene as JSON.
- **PNG** downloads a composited full-page PNG with the visible annotations baked
  in. The screenshot dependency is loaded only when this command runs. Capture
  never fetches host-page assets, so externally hosted images or web fonts that
  are not already data/blob resources, video, and host-page SVG may be omitted.

Badge numbers use scene order and match the Markdown headings. The Markdown
structure contains page metadata, element comments, a clearly marked proposed
drawings section, and general notes:

```markdown
# UI Review — /checkout (drawover)

## Element comments

### [1] "Disable this until validation passes"

## Drawings (proposed UI — these elements do NOT exist yet)

### [2] Rectangle: "Home"

## General notes

- "Check mobile spacing"
```

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

Drawover runs entirely in the browser. It has no telemetry, network requests,
websockets, remote fonts, CDN assets, or server component. Review data stays in
the current origin's `localStorage` until the user clears it. The overlay uses an
open Shadow DOM for host-style isolation and does not mutate the host page beyond
its single mount element and temporary hover highlight. Production integrations
must keep the dynamic import behind the environment guard shown above.
