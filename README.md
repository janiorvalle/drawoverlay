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

```ts
if (
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_DRAWOVER === "true"
) {
  import("drawover").then(({ init }) => init());
}
```

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
drawover.destroy();
```

The default hotkey is `Alt+Shift+D`. The package has no telemetry, fonts, CDN
assets, or other runtime network behavior.
