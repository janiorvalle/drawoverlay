# drawover

Framework-agnostic browser overlay for precise UI review. Drawover provides
element comments, drawings, images, notes, Markdown/JSON clipboard output, and
composited PNG export inside an open Shadow DOM.

```sh
pnpm add -D drawover
```

Keep the dynamic import behind a development or explicit preview guard:

```ts
if (import.meta.env.DEV || import.meta.env.VITE_DRAWOVER === "true") {
  import("drawover").then(({ init }) => init());
}
```

The default shortcut is `Alt+Shift+D`. Drawover makes no network requests and
stores review data only in the current origin's `localStorage`. See the
repository README for Next.js and webpack gating, the full tool list, keyboard
shortcuts, output format, and security details.
