import {
  createShell,
  DRAWOVER_HOST_ID,
  type DrawoverInstance,
  type DrawoverOptions,
} from "./shell/shell.js";
import { createSceneEditor, type SceneEditor } from "./scene/editor.js";

export type {
  Annotation,
  ElementRef,
  PageContext,
  SceneSnapshot,
  SceneStore,
  Serializer,
} from "./contracts/index.js";
export {
  documentRectToViewport,
  documentToViewport,
  getScrollOffset,
  viewportRectToDocument,
  viewportToDocument,
} from "./coordinates.js";
export type {
  DrawoverInstance,
  DrawoverMode,
  DrawoverOptions,
  DrawoverPosition,
  DrawoverTheme,
} from "./shell/shell.js";

let activeInstance: DrawoverInstance | undefined;

/** Mount the singleton Drawover shell into an open Shadow DOM. */
export function init(options: DrawoverOptions = {}): DrawoverInstance {
  if (activeInstance) return activeInstance;

  const integration: { sceneEditor?: SceneEditor } = {};
  const instance = createShell({
    ...options,
    onDestroy: () => {
      integration.sceneEditor?.destroy();
      activeInstance = undefined;
    },
  });
  const host = document.getElementById(DRAWOVER_HOST_ID);
  const shadow = host?.shadowRoot;
  const sceneLayer = shadow?.querySelector<SVGSVGElement>(
    '[data-layer="scene"]',
  );
  const toolbar = shadow?.querySelector<HTMLElement>(".toolbar");
  if (!host || !shadow || !sceneLayer || !toolbar) {
    instance.destroy();
    throw new Error("Drawover scene could not attach to the shell.");
  }
  integration.sceneEditor = createSceneEditor({
    host,
    sceneLayer,
    shadow,
    toolbar,
  });
  activeInstance = instance;
  return instance;
}
