import {
  createShell,
  DRAWOVER_HOST_ID,
  type DrawoverInstance,
  type DrawoverOptions,
} from "./shell/shell.js";
import { createElementTargetingController } from "./targeting/controller.js";

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

  const shell = createShell({
    ...options,
    onDestroy: () => {
      activeInstance = undefined;
    },
  });
  const host = document.getElementById(DRAWOVER_HOST_ID);
  if (!host) {
    shell.destroy();
    throw new Error("Drawover host was not mounted.");
  }
  const targeting = createElementTargetingController(host);
  let destroyed = false;
  activeInstance = {
    ...shell,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      targeting.destroy();
      shell.destroy();
    },
  };
  return activeInstance;
}
