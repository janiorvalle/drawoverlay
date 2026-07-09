import type { DocumentPoint, DocumentRect } from "./contracts/index.js";

export interface ViewportPoint {
  x: number;
  y: number;
}

export interface ViewportRect extends ViewportPoint {
  width: number;
  height: number;
}

export interface ScrollOffset {
  x: number;
  y: number;
}

/** The sole source of live page scroll offsets for coordinate conversion. */
export function getScrollOffset(): ScrollOffset {
  return { x: window.scrollX, y: window.scrollY };
}

/** Convert a viewport point to the document-coordinate model. */
export function viewportToDocument(
  point: ViewportPoint,
  scroll = getScrollOffset(),
): DocumentPoint {
  return { x: point.x + scroll.x, y: point.y + scroll.y };
}

/** Convert a document point for viewport rendering or DOM hit testing. */
export function documentToViewport(
  point: DocumentPoint,
  scroll = getScrollOffset(),
): ViewportPoint {
  return { x: point.x - scroll.x, y: point.y - scroll.y };
}

/** Convert viewport bounds from getBoundingClientRect to document bounds. */
export function viewportRectToDocument(
  rect: ViewportRect,
  scroll = getScrollOffset(),
): DocumentRect {
  const point = viewportToDocument(rect, scroll);
  return { ...point, width: rect.width, height: rect.height };
}

/** Convert stored document bounds for viewport-relative rendering. */
export function documentRectToViewport(
  rect: DocumentRect,
  scroll = getScrollOffset(),
): ViewportRect {
  const point = documentToViewport(rect, scroll);
  return { ...point, width: rect.width, height: rect.height };
}
