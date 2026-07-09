import {
  createShell,
  type DrawoverInstance,
  type DrawoverOptions,
} from "./shell/shell.js";

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

  activeInstance = createShell({
    ...options,
    onDestroy: () => {
      activeInstance = undefined;
    },
  });
  return activeInstance;
}
