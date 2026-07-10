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
.toolbar,
.notes-panel {
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
.close,
.note-remove {
  position: relative;
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  color: var(--dv-muted);
}

.command:hover,
.close:hover,
.note-remove:hover {
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

.command-status {
  max-width: 150px;
  overflow: hidden;
  padding: 0 2px;
  color: var(--dv-muted);
  font-family: var(--dv-font-mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* ── notes panel ──────────────────────────────────── */

.notes-panel {
  display: grid;
  width: min(340px, calc(100vw - 72px));
  max-height: min(420px, calc(100vh - 88px));
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border-bottom: 1px solid var(--dv-border);
}

.notes-header h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.notes-count {
  display: grid;
  min-width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  background: var(--dv-accent-soft);
  color: var(--dv-selected-text);
  font-family: var(--dv-font-mono);
  font-size: 11px;
  font-weight: 600;
}

.notes-list {
  display: grid;
  overflow-y: auto;
  padding: 8px;
  gap: 8px;
}

.notes-empty {
  margin: 8px 4px;
  color: var(--dv-muted);
}

.note-row {
  display: grid;
  align-items: start;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 6px;
}

.note-row textarea,
.note-form textarea {
  width: 100%;
  min-width: 0;
  resize: vertical;
  border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius-inner);
  background: var(--dv-accent-soft);
  color: var(--dv-text);
  font: inherit;
  line-height: 1.45;
  transition: border-color var(--dv-motion-fast);
}

.note-row textarea:focus-visible,
.note-form textarea:focus-visible {
  border-color: var(--dv-focus-ring);
  outline: none;
}

.note-row textarea {
  min-height: 66px;
  padding: 8px;
}

.note-form {
  display: grid;
  padding: 8px;
  border-top: 1px solid var(--dv-border);
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.note-form textarea {
  min-height: 48px;
  padding: 7px 8px;
}

.note-add {
  min-width: 72px;
  padding: 0 10px;
  background: var(--dv-accent);
  color: var(--dv-accent-text);
  font-weight: 600;
}

.note-add:hover {
  filter: brightness(1.08);
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

  .workspace,
  .notes-panel {
    width: min(304px, calc(100vw - 72px));
  }

  .notes-panel {
    max-height: calc(100vh - 152px);
  }

  .brand {
    display: none;
  }
}
`;
