export const shellStyles = `
:host {
  all: initial;
  color-scheme: light dark;
}

*, *::before, *::after {
  box-sizing: border-box;
  letter-spacing: 0;
}

[hidden] {
  display: none !important;
}

.root {
  --dv-bg: #ffffff;
  --dv-text: #172033;
  --dv-muted: #5e687b;
  --dv-border: #cfd5df;
  --dv-accent: #e5484d;
  --dv-accent-text: #ffffff;
  --dv-selected: #eaf2ff;
  --dv-selected-text: #174ea6;
  position: fixed;
  inset: 0;
  pointer-events: none;
  color: var(--dv-text);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.35;
}

.root[data-theme='dark'] {
  --dv-bg: #1f2430;
  --dv-text: #f6f7f9;
  --dv-muted: #b8c0ce;
  --dv-border: #454e5e;
  --dv-selected: #243d62;
  --dv-selected-text: #d8e8ff;
}

@media (prefers-color-scheme: dark) {
  .root[data-theme='auto'] {
    --dv-bg: #1f2430;
    --dv-text: #f6f7f9;
    --dv-muted: #b8c0ce;
    --dv-border: #454e5e;
    --dv-selected: #243d62;
    --dv-selected-text: #d8e8ff;
  }
}

.interaction-layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
}

.targeting-layer {
  pointer-events: none;
}

.chrome {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.root[data-position='bottom-right'] .chrome {
  right: 16px;
  bottom: 16px;
  flex-direction: row-reverse;
}

.root[data-position='bottom-left'] .chrome {
  left: 16px;
  bottom: 16px;
}

.root[data-position='top-right'] .chrome {
  right: 16px;
  top: 16px;
  flex-direction: row-reverse;
}

.root[data-position='top-left'] .chrome {
  left: 16px;
  top: 16px;
}

button {
  appearance: none;
  border: 1px solid var(--dv-border);
  border-radius: 6px;
  background: var(--dv-bg);
  color: var(--dv-text);
  font: inherit;
  letter-spacing: 0;
  cursor: pointer;
}

button:focus-visible {
  outline: 3px solid #4c8bf5;
  outline-offset: 2px;
}

.trigger {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-color: #aeb6c4;
  background: var(--dv-accent);
  color: var(--dv-accent-text);
  box-shadow: 0 4px 14px rgb(17 24 39 / 22%);
  font-size: 16px;
  font-weight: 800;
}

.toolbar {
  display: flex;
  min-height: 40px;
  max-width: min(420px, calc(100vw - 72px));
  align-items: center;
  gap: 8px;
  padding: 5px;
  border: 1px solid var(--dv-border);
  border-radius: 8px;
  background: var(--dv-bg);
  box-shadow: 0 8px 24px rgb(17 24 39 / 20%);
}

.brand {
  padding: 0 5px;
  color: var(--dv-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.modes {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--dv-border);
  border-radius: 6px;
}

.modes button {
  min-width: 54px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 0;
}

.modes button + button {
  border-left: 1px solid var(--dv-border);
}

.modes button[aria-pressed='true'] {
  background: var(--dv-selected);
  color: var(--dv-selected-text);
  font-weight: 700;
}

.command {
  height: 30px;
  padding: 0 9px;
  white-space: nowrap;
}

.close {
  width: 30px;
  height: 30px;
  padding: 0;
  font-weight: 800;
}

@media (max-width: 560px) {
  .chrome {
    align-items: flex-end;
  }

  .toolbar {
    width: min(304px, calc(100vw - 72px));
    flex-wrap: wrap;
  }

  .brand {
    display: none;
  }
}
`;
