import {
  createShell,
  DRAWOVER_HOST_ID,
  type DrawoverInstance,
  type DrawoverOptions,
} from "./shell/shell.js";
import { createSceneEditor, type SceneEditor } from "./scene/editor.js";
import { createElementTargetingController } from "./targeting/controller.js";
import { bindScenePersistence } from "./persistence/persistence.js";
import { createSceneStore } from "./scene/store.js";

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
export {
  copyJson,
  copyMarkdown,
  exportCompositedPng,
  serializeReview,
  writeReviewToClipboard,
} from "./output/index.js";
export type {
  ClipboardFormat,
  ClipboardWriter,
  CompositedPngOptions,
  PngExportDependencies,
} from "./output/index.js";
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

  const store = createSceneStore();
  const persistence = bindScenePersistence(store, {
    ...(options.storageKey ? { storageKey: options.storageKey } : {}),
  });
  const shell = createShell({
    ...options,
    sceneStore: store,
    onClear: () => persistence.clear(),
    onDestroy: () => {
      persistence.destroy();
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
    shell.destroy();
    throw new Error("Drawover scene could not attach to the shell.");
  }
  const sceneEditor: SceneEditor = createSceneEditor({
    host,
    sceneLayer,
    shadow,
    store,
    toolbar,
  });
  const targeting = createElementTargetingController(host);
  let destroyed = false;
  activeInstance = {
    ...shell,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      targeting.destroy();
      sceneEditor.destroy();
      shell.destroy();
    },
  };
  return activeInstance;
}
