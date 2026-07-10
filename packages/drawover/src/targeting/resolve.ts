import type { DocumentRect, ElementRef } from "../contracts/index.js";
import { viewportRectToDocument } from "../coordinates.js";

/** Resolve a captured element reference against the current host document. */
export function resolveElement(reference: ElementRef): Element | undefined {
  for (const selector of [
    reference.selector.primary,
    ...reference.selector.fallbacks,
  ]) {
    try {
      const element = document.querySelector(selector);
      if (element) return element;
    } catch {
      // Persisted selectors can outlive markup changes; try the next fallback.
    }
  }
  return undefined;
}

/** Return current document bounds, falling back to the captured facts. */
export function resolveElementDocumentRect(
  reference: ElementRef,
): DocumentRect {
  const element = resolveElement(reference);
  if (!element) return { ...reference.facts.bbox };
  const bounds = element.getBoundingClientRect();
  return viewportRectToDocument({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
}
