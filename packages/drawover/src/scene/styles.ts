export const sceneStyles = `
.scene-layer {
  overflow: visible;
  touch-action: none;
  user-select: none;
}

.scene-node {
  cursor: move;
  pointer-events: all;
}

.scene-preview {
  opacity: 0.72;
  pointer-events: none;
}

.arrow-hit-target {
  pointer-events: stroke;
}

.selection-ui {
  pointer-events: none;
}

.selection-box {
  fill: var(--dv-accent-soft);
  stroke: var(--dv-accent);
  stroke-width: 1;
  stroke-dasharray: 5 3;
  vector-effect: non-scaling-stroke;
}

.selection-handle {
  fill: var(--dv-bg-opaque);
  stroke: var(--dv-accent);
  stroke-width: 2;
  pointer-events: all;
}

.selection-handle[data-handle='rotate'] {
  cursor: grab;
}

.selection-handle[data-handle='nw'],
.selection-handle[data-handle='se'] {
  cursor: nwse-resize;
}

.selection-handle[data-handle='ne'],
.selection-handle[data-handle='sw'] {
  cursor: nesw-resize;
}

.selection-handle[data-handle^='arrow-'] {
  cursor: crosshair;
}

.marquee {
  fill: var(--dv-accent-soft);
  pointer-events: none;
}

.rotate-line {
  stroke: var(--dv-accent);
}

.toolbar {
  max-width: min(1240px, calc(100vw - 72px));
  flex-wrap: wrap;
}

.scene-tools,
.history-tools,
.z-tools,
.palette {
  display: flex;
  align-items: center;
  gap: 2px;
}

.scene-tools button,
.history-tools button,
.z-tools button {
  position: relative;
  display: grid;
  width: 31px;
  height: 31px;
  padding: 0;
  place-items: center;
  color: var(--dv-muted);
  white-space: nowrap;
}

.scene-tools button:hover,
.history-tools button:hover,
.z-tools button:hover {
  background: var(--dv-accent-soft);
  color: var(--dv-text);
}

.root[data-mode='scene'] .scene-tools button[aria-pressed='true'] {
  background: var(--dv-accent-soft);
  color: var(--dv-selected-text);
}

/* Scene tools are reachable but visibly inactive while Comment mode owns
   pointer input; clicking any of them switches to Draw. Text-bearing controls
   (the Fill toggle) keep full opacity so text contrast stays WCAG-compliant. */
.root[data-mode='element-select'] .scene-tools,
.root[data-mode='element-select'] .palette button:not([data-fill-toggle]) {
  opacity: 0.45;
}

.history-tools button:disabled,
.z-tools button:disabled {
  opacity: 0.38;
  cursor: default;
}

.history-tools button:disabled:hover,
.z-tools button:disabled:hover {
  background: transparent;
  color: var(--dv-muted);
}

.palette {
  gap: 5px;
  padding: 0 4px;
}

.palette button {
  width: 15px;
  height: 15px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--dv-border);
  transition: box-shadow var(--dv-motion-fast);
}

.palette button[aria-pressed='true'] {
  box-shadow: 0 0 0 2px var(--dv-accent);
}

.palette button[data-fill-toggle='true'] {
  width: auto;
  height: 24px;
  padding: 0 7px;
  border: 1px solid var(--dv-border);
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
  color: var(--dv-muted);
  font-size: 11px;
}

.palette button[data-fill-toggle='true'][aria-pressed='true'] {
  background: var(--dv-accent-soft);
  border-color: transparent;
  box-shadow: none;
  color: var(--dv-selected-text);
  font-weight: 600;
}

.inline-editor {
  position: fixed;
  z-index: 2;
  width: min(260px, calc(100vw - 24px));
  height: 36px;
  padding: 0 9px;
  border: 2px solid var(--dv-accent);
  border-radius: 5px;
  background: var(--dv-surface-raised);
  color: var(--dv-text);
  font: 600 14px/1.2 var(--dv-font-sans);
  pointer-events: auto;
}

.scene-status {
  min-width: 60px;
  padding: 0 3px;
  color: var(--dv-muted);
  font-family: var(--dv-font-mono);
  font-size: 10px;
  text-align: center;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .toolbar {
    width: min(360px, calc(100vw - 80px));
    max-height: none;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .toolbar > * {
    flex: 0 0 auto;
  }

  .brand,
  .scene-status {
    display: none;
  }
}
`;
