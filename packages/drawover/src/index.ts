import {
  createShell,
  type DrawoverInstance,
  type DrawoverOptions,
} from "./shell/shell.js";
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
  activeInstance = createShell({
    ...options,
    sceneStore: store,
    onClear: () => persistence.clear(),
    onDestroy: () => {
      persistence.destroy();
      activeInstance = undefined;
    },
  });
  return activeInstance;
}
