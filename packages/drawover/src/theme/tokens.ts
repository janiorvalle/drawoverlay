/**
 * The single source of design values ("Polish" direction, PLAN.md Phase 2.5).
 *
 * Every raw color, shadow, blur, and motion value in the published package
 * lives in this file. All other modules consume either the emitted
 * `--dv-*` custom properties (UI chrome inside the Shadow DOM) or the
 * exported constants (values that must be baked as concrete SVG presentation
 * attributes because PNG export serializes the scene standalone, where
 * `var()` would not resolve). The architecture guard rejects raw color
 * values everywhere else.
 */

/** Annotation palette baked into scenes as inline attributes (never var()). */
export const ANNOTATION_COLORS = [
  "#e5484d",
  "#1769e0",
  "#16805c",
  "#202936",
] as const;

/** Badge ring + selection-handle fill, baked inline for export fidelity. */
export const SCENE_WHITE = "#ffffff";

/** Default page background for composited PNG capture. */
export const PNG_BACKGROUND = "#ffffff";

/** Browser-normalized fully-transparent color, used only for comparisons. */
export const TRANSPARENT_RGBA = "rgba(0, 0, 0, 0)";

interface SemanticTokens {
  /** Base translucent surface. NOTE: the name --dv-bg is a prod-strip
   * runtime marker (scripts/verify-prod-strip.mjs) — do not rename. */
  bg: string;
  surfaceRaised: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  danger: string;
  selected: string;
  selectedText: string;
  focusRing: string;
  shadow: string;
  /** Opaque fallbacks used when backdrop-filter is unsupported. */
  bgOpaque: string;
  surfaceRaisedOpaque: string;
}

const dark: SemanticTokens = {
  bg: "rgba(19, 19, 24, 0.86)",
  surfaceRaised: "rgba(31, 31, 39, 0.94)",
  border: "rgba(255, 255, 255, 0.09)",
  text: "#ececf1",
  muted: "#8b8b98",
  accent: "#7c86ff",
  accentText: "#0e0e2a",
  accentSoft: "rgba(124, 134, 255, 0.16)",
  danger: "#ff5d5d",
  selected: "rgba(124, 134, 255, 0.16)",
  selectedText: "#b3baff",
  focusRing: "#9aa3ff",
  shadow:
    "0 12px 32px rgba(8, 8, 14, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
  bgOpaque: "rgb(24, 24, 30)",
  surfaceRaisedOpaque: "rgb(34, 34, 42)",
};

const light: SemanticTokens = {
  bg: "rgba(250, 250, 252, 0.88)",
  surfaceRaised: "rgba(255, 255, 255, 0.96)",
  border: "rgba(12, 12, 24, 0.1)",
  text: "#1a1a1e",
  muted: "#67676f",
  accent: "#5b66e8",
  accentText: "#ffffff",
  accentSoft: "rgba(91, 102, 232, 0.12)",
  danger: "#d92d20",
  selected: "rgba(91, 102, 232, 0.12)",
  selectedText: "#4550cf",
  focusRing: "#5b66e8",
  shadow:
    "0 12px 32px rgba(18, 18, 28, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
  bgOpaque: "rgb(250, 250, 252)",
  surfaceRaisedOpaque: "rgb(255, 255, 255)",
};

function declarations(tokens: SemanticTokens): string {
  return `
  --dv-bg: ${tokens.bg};
  --dv-surface-raised: ${tokens.surfaceRaised};
  --dv-border: ${tokens.border};
  --dv-text: ${tokens.text};
  --dv-muted: ${tokens.muted};
  --dv-accent: ${tokens.accent};
  --dv-accent-text: ${tokens.accentText};
  --dv-accent-soft: ${tokens.accentSoft};
  --dv-danger: ${tokens.danger};
  --dv-selected: ${tokens.selected};
  --dv-selected-text: ${tokens.selectedText};
  --dv-focus-ring: ${tokens.focusRing};
  --dv-shadow: ${tokens.shadow};
  --dv-bg-opaque: ${tokens.bgOpaque};
  --dv-surface-raised-opaque: ${tokens.surfaceRaisedOpaque};`;
}

export const tokenStyles = `
.root {
${declarations(dark)}
  --dv-radius: 10px;
  --dv-radius-inner: 6px;
  --dv-blur: blur(14px);
  --dv-font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --dv-font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  --dv-motion: 140ms cubic-bezier(0.3, 0.7, 0.4, 1);
  --dv-motion-fast: 90ms ease-out;
}

.root[data-theme='light'] {
${declarations(light)}
}

@media (prefers-color-scheme: light) {
  .root[data-theme='auto'] {
${declarations(light)}
  }
}

@supports not (backdrop-filter: blur(1px)) {
  .root {
    --dv-bg: var(--dv-bg-opaque);
    --dv-surface-raised: var(--dv-surface-raised-opaque);
  }
}
`;
