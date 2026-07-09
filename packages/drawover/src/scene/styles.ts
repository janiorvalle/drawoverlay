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
  fill: rgb(23 105 224 / 6%);
  stroke: #1769e0;
  stroke-width: 1;
  stroke-dasharray: 5 3;
  vector-effect: non-scaling-stroke;
}

.selection-handle {
  fill: #ffffff;
  stroke: #1769e0;
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
  fill: rgb(23 105 224 / 12%);
  pointer-events: none;
}

.toolbar {
  max-width: min(940px, calc(100vw - 72px));
  flex-wrap: wrap;
}

.scene-tools,
.history-tools,
.z-tools,
.palette {
  display: flex;
  align-items: center;
  gap: 3px;
}

.scene-tools button,
.history-tools button,
.z-tools button {
  height: 28px;
  padding: 0 7px;
  white-space: nowrap;
}

.scene-tools button[aria-pressed='true'] {
  background: var(--dv-selected);
  color: var(--dv-selected-text);
  font-weight: 700;
}

.history-tools button,
.z-tools button {
  width: 29px;
  padding: 0;
  font-weight: 800;
}

.palette button {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 2px solid var(--dv-bg);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--dv-border);
}

.palette button[aria-pressed='true'] {
  box-shadow: 0 0 0 2px #1769e0;
}

.palette button[data-fill-toggle='true'] {
  width: auto;
  padding: 0 6px;
  border: 1px solid var(--dv-border);
  border-radius: 5px;
  background: var(--dv-bg);
  box-shadow: none;
  color: var(--dv-text);
  font-size: 11px;
}

.palette button[data-fill-toggle='true'][aria-pressed='true'] {
  background: var(--dv-selected);
  box-shadow: none;
  color: var(--dv-selected-text);
}

.inline-editor {
  position: fixed;
  z-index: 2;
  width: min(260px, calc(100vw - 24px));
  height: 36px;
  padding: 0 9px;
  border: 2px solid #1769e0;
  border-radius: 5px;
  background: var(--dv-bg);
  color: var(--dv-text);
  font: 600 14px/1.2 ui-sans-serif, system-ui, sans-serif;
  pointer-events: auto;
}

.scene-status {
  min-width: 72px;
  color: var(--dv-muted);
  font-size: 11px;
  text-align: center;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .toolbar {
    width: min(360px, calc(100vw - 64px));
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

  .scene-tools button {
    padding: 0 6px;
  }
}
`;
