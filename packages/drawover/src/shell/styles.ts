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
  position: fixed;
  inset: 0;
  pointer-events: none;
  color: var(--dv-text);
  font-family: var(--dv-font-sans);
  font-size: 12px;
  line-height: 1.4;
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
  gap: 10px;
  pointer-events: auto;
}

.workspace {
  display: flex;
  min-width: 0;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 10px;
  pointer-events: auto;
}

.root[data-position='bottom-left'] .workspace,
.root[data-position='top-left'] .workspace {
  align-items: flex-start;
}

.root[data-position='top-right'] .workspace,
.root[data-position='top-left'] .workspace {
  flex-direction: column;
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
  border: 1px solid transparent;
  border-radius: var(--dv-radius-inner);
  background: transparent;
  color: var(--dv-text);
  font: inherit;
  letter-spacing: 0;
  cursor: pointer;
  transition: background var(--dv-motion-fast), color var(--dv-motion-fast),
    border-color var(--dv-motion-fast);
}

button:focus-visible {
  outline: 2px solid var(--dv-focus-ring);
  outline-offset: 1px;
}

button svg {
  display: block;
  width: 15px;
  height: 15px;
}

/* ── surfaces ─────────────────────────────────────── */

.trigger,
.toolbar {
  border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius);
  background: var(--dv-bg);
  box-shadow: var(--dv-shadow);
  backdrop-filter: var(--dv-blur);
  -webkit-backdrop-filter: var(--dv-blur);
}

.trigger {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--dv-accent);
  transition: transform var(--dv-motion), color var(--dv-motion-fast);
}

.trigger svg {
  width: 20px;
  height: 20px;
}

.trigger:hover {
  transform: translateY(-1px);
  color: var(--dv-text);
}

.toolbar {
  position: relative;
  display: flex;
  min-height: 40px;
  max-width: min(560px, calc(100vw - 72px));
  align-items: center;
  gap: 3px;
  padding: 5px 7px;
}

.brand {
  display: grid;
  place-items: center;
  padding: 0 4px 0 1px;
  color: var(--dv-accent);
}

.brand svg {
  width: 17px;
  height: 17px;
}

/* ── segmented mode switch ────────────────────────── */

.modes {
  display: flex;
  padding: 2px;
  border-radius: calc(var(--dv-radius) - 3px);
  background: var(--dv-accent-soft);
  margin-right: 3px;
}

.modes button {
  display: flex;
  height: 26px;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border: 0;
  border-radius: calc(var(--dv-radius) - 4px);
  color: var(--dv-muted);
  white-space: nowrap;
}

.modes button svg {
  width: 13px;
  height: 13px;
}

.modes button[aria-pressed='true'] {
  background: var(--dv-accent);
  color: var(--dv-accent-text);
  font-weight: 600;
}

/* ── icon buttons ─────────────────────────────────── */

.command,
.close {
  position: relative;
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  color: var(--dv-muted);
}

.command:hover,
.close:hover {
  background: var(--dv-accent-soft);
  color: var(--dv-text);
}

.command[data-command='copy-markdown'] {
  background: var(--dv-accent);
  color: var(--dv-accent-text);
}

.command[data-command='copy-markdown']:hover {
  color: var(--dv-accent-text);
  filter: brightness(1.08);
}

.command[data-command='copy-json'] {
  font-family: var(--dv-font-mono);
  font-size: 11px;
  font-weight: 700;
}

/* Transient status floats above the toolbar so messages never reflow it. */
.command-status {
  position: absolute;
  right: 8px;
  bottom: calc(100% + 8px);
  max-width: 260px;
  overflow: hidden;
  padding: 3px 8px;
  border: 1px solid var(--dv-border);
  border-radius: 5px;
  background: var(--dv-surface-raised);
  color: var(--dv-text);
  font-family: var(--dv-font-mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: var(--dv-shadow);
}

.command-status:empty {
  display: none;
}

.root[data-position='top-right'] .command-status,
.root[data-position='top-left'] .command-status {
  top: calc(100% + 8px);
  bottom: auto;
}

.separator {
  width: 1px;
  height: 18px;
  flex: 0 0 auto;
  background: var(--dv-border);
  margin: 0 3px;
}

/* ── tooltips (aria-label + optional kbd hint) ───── */

[data-tip] {
  position: relative;
}

[data-tip]::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  z-index: 5;
  padding: 3px 7px;
  border: 1px solid var(--dv-border);
  border-radius: 5px;
  background: var(--dv-surface-raised);
  color: var(--dv-text);
  font-family: var(--dv-font-mono);
  font-size: 10px;
  font-weight: 400;
  line-height: 1.5;
  white-space: nowrap;
  box-shadow: var(--dv-shadow);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 2px);
  transition: opacity var(--dv-motion) 250ms, transform var(--dv-motion) 250ms;
}

[data-tip]:hover::after,
[data-tip]:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.root[data-position='top-right'] [data-tip]::after,
.root[data-position='top-left'] [data-tip]::after {
  top: calc(100% + 7px);
  bottom: auto;
}

/* ── responsive ───────────────────────────────────── */

@media (max-width: 560px) {
  .chrome {
    align-items: flex-end;
  }

  .toolbar {
    width: min(304px, calc(100vw - 72px));
    flex-wrap: wrap;
  }

  .workspace {
    width: min(304px, calc(100vw - 72px));
  }

  .brand {
    display: none;
  }
}
`;
