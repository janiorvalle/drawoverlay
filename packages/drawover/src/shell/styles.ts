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
  --dv-accent: #c7353a;
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

.workspace {
  display: flex;
  min-width: 0;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 8px;
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

.command[data-command='copy-markdown'] {
  border-color: var(--dv-accent);
  background: var(--dv-accent);
  color: var(--dv-accent-text);
  font-weight: 700;
}

.command-status {
  max-width: 150px;
  overflow: hidden;
  color: var(--dv-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close {
  width: 30px;
  height: 30px;
  padding: 0;
  font-weight: 800;
}

.notes-panel {
  display: grid;
  width: min(340px, calc(100vw - 72px));
  max-height: min(420px, calc(100vh - 88px));
  overflow: hidden;
  border: 1px solid var(--dv-border);
  border-radius: 8px;
  background: var(--dv-bg);
  box-shadow: 0 8px 24px rgb(17 24 39 / 20%);
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
  font-size: 14px;
  line-height: 1.3;
}

.notes-count {
  display: grid;
  min-width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  background: var(--dv-selected);
  color: var(--dv-selected-text);
  font-size: 12px;
  font-weight: 700;
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
  grid-template-columns: minmax(0, 1fr) 30px;
  gap: 6px;
}

.note-row textarea,
.note-form textarea {
  width: 100%;
  min-width: 0;
  resize: vertical;
  border: 1px solid var(--dv-border);
  border-radius: 6px;
  background: var(--dv-bg);
  color: var(--dv-text);
  font: inherit;
  line-height: 1.4;
}

.note-row textarea {
  min-height: 66px;
  padding: 8px;
}

.note-remove {
  width: 30px;
  height: 30px;
  padding: 0;
  color: var(--dv-muted);
  font-size: 18px;
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
  padding: 0 9px;
  border-color: var(--dv-accent);
  background: var(--dv-accent);
  color: var(--dv-accent-text);
  font-weight: 700;
}

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
