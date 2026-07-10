import type { Annotation } from "../contracts/index.js";
import { resolveElementDocumentRect } from "../targeting/resolve.js";

/** Materialize a live element pin position without mutating its stored scene data. */
export function resolveElementPinPosition(annotation: Annotation): Annotation {
  if (annotation.type !== "element-pin") return annotation;
  const bounds = resolveElementDocumentRect(annotation.element);
  return {
    ...annotation,
    geometry: {
      ...annotation.geometry,
      x: bounds.x + annotation.elementOffset.x,
      y: bounds.y + annotation.elementOffset.y,
    },
  };
}
