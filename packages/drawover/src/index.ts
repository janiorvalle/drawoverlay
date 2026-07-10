import {
  createShell,
  DRAWOVER_HOST_ID,
  type DrawoverInstance,
  type DrawoverOptions,
} from "./shell/shell.js";
import { createSceneEditor, type SceneEditor } from "./scene/editor.js";
import { createElementTargetingController } from "./targeting/controller.js";
import {
  bindScenePersistence,
  loadPersistedAnnotations,
} from "./persistence/persistence.js";
import { createSceneStore } from "./scene/store.js";
import {
  copyJson as copySceneJson,
  copyMarkdown as copySceneMarkdown,
  exportCompositedPng as exportScenePng,
} from "./output/index.js";
import { createElementCommentsController } from "./integration/element-comments.js";

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

  const persistenceOptions = {
    ...(options.storageKey ? { storageKey: options.storageKey } : {}),
  };
  const store = createSceneStore(loadPersistedAnnotations(persistenceOptions));
  const persistence = bindScenePersistence(store, {
    ...persistenceOptions,
    hydrate: false,
  });
  const shell = createShell({
    ...options,
    sceneStore: store,
    onClear: () => persistence.clear(),
    onCopy: async (format) => {
      const page = capturePageContext();
      if (format === "json") await copySceneJson(store.getSnapshot(), page);
      else await copySceneMarkdown(store.getSnapshot(), page);
    },
    onDestroy: () => {
      persistence.destroy();
      activeInstance = undefined;
    },
    onExportPng: async () => {
      if (!sceneLayer || !shadow) {
        throw new Error("The annotation scene is unavailable.");
      }
      const blob = await exportScenePng({ annotationSvg: sceneLayer });
      downloadBlob(shadow, blob, "drawover-review.png");
    },
  });
  const host = document.getElementById(DRAWOVER_HOST_ID);
  const shadow = host?.shadowRoot ?? undefined;
  const sceneLayer =
    shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]') ?? undefined;
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
  const elementComments = createElementCommentsController({ host, store });
  let destroyed = false;
  activeInstance = {
    ...shell,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      elementComments.destroy();
      targeting.destroy();
      sceneEditor.destroy();
      shell.destroy();
    },
  };
  return activeInstance;
}

function capturePageContext() {
  return {
    url: window.location.href,
    pathname: window.location.pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    capturedAt: new Date().toISOString(),
  };
}

function downloadBlob(shadow: ShadowRoot, blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  shadow.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
