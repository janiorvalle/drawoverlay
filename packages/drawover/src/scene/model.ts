import type {
  Annotation,
  ArrowAnnotation,
  DocumentPoint,
  DocumentRect,
  SceneSnapshot,
} from "../contracts/index.js";

export type ZOrderAction = "back" | "backward" | "forward" | "front";

export function createAnnotationId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `annotation-${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
}

export function nextZ(snapshot: SceneSnapshot): number {
  return Math.max(0, ...snapshot.annotations.map(({ z }) => z)) + 1;
}

export function normalizeRect(
  start: DocumentPoint,
  end: DocumentPoint,
): DocumentRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function arrowGeometry(
  start: DocumentPoint,
  end: DocumentPoint,
): DocumentRect {
  return normalizeRect(start, end);
}

export function translateAnnotation(
  annotation: Annotation,
  delta: DocumentPoint,
): Annotation {
  const translated = structuredClone(annotation);
  translated.geometry.x += delta.x;
  translated.geometry.y += delta.y;
  if (translated.type === "arrow") {
    translated.start.x += delta.x;
    translated.start.y += delta.y;
    translated.end.x += delta.x;
    translated.end.y += delta.y;
  }
  return translated;
}

export function resizeAnnotation(
  annotation: Annotation,
  handle: "ne" | "nw" | "se" | "sw",
  point: DocumentPoint,
  minimum = 8,
): Annotation {
  const original = annotation.geometry;
  const opposite = {
    x: handle.includes("w") ? original.x + original.width : original.x,
    y: handle.includes("n") ? original.y + original.height : original.y,
  };
  const horizontal = handle.includes("w")
    ? Math.min(point.x, opposite.x - minimum)
    : Math.max(point.x, opposite.x + minimum);
  const vertical = handle.includes("n")
    ? Math.min(point.y, opposite.y - minimum)
    : Math.max(point.y, opposite.y + minimum);
  const next = structuredClone(annotation);
  next.geometry = normalizeRect(opposite, { x: horizontal, y: vertical });
  return next;
}

export function updateArrowEndpoint(
  annotation: ArrowAnnotation,
  endpoint: "end" | "start",
  point: DocumentPoint,
): ArrowAnnotation {
  const next = structuredClone(annotation);
  next[endpoint] = { ...point };
  next.geometry = arrowGeometry(next.start, next.end);
  return next;
}

export function duplicateAnnotation(
  annotation: Annotation,
  offset: DocumentPoint,
  z: number,
): Annotation {
  const duplicate = translateAnnotation(annotation, offset);
  duplicate.id = createAnnotationId();
  duplicate.z = z;
  return duplicate;
}

export function intersects(left: DocumentRect, right: DocumentRect): boolean {
  return !(
    left.x + left.width < right.x ||
    right.x + right.width < left.x ||
    left.y + left.height < right.y ||
    right.y + right.height < left.y
  );
}

export function reorderAnnotations(
  annotations: readonly Annotation[],
  selectedIds: ReadonlySet<string>,
  action: ZOrderAction,
): Annotation[] {
  const ordered = [...annotations].sort((left, right) => left.z - right.z);
  if (selectedIds.size === 0) return ordered;

  if (action === "front" || action === "back") {
    const selected = ordered.filter(({ id }) => selectedIds.has(id));
    const rest = ordered.filter(({ id }) => !selectedIds.has(id));
    const combined =
      action === "front" ? [...rest, ...selected] : [...selected, ...rest];
    return combined.map((annotation, index) => ({
      ...annotation,
      z: index + 1,
    }));
  }

  const step = action === "forward" ? -1 : 1;
  const start = action === "forward" ? ordered.length - 2 : 1;
  const boundary = action === "forward" ? -1 : ordered.length;
  for (let index = start; index !== boundary; index += step) {
    const current = ordered[index];
    const neighborIndex = action === "forward" ? index + 1 : index - 1;
    const neighbor = ordered[neighborIndex];
    if (
      current &&
      neighbor &&
      selectedIds.has(current.id) &&
      !selectedIds.has(neighbor.id)
    ) {
      ordered[index] = neighbor;
      ordered[neighborIndex] = current;
    }
  }
  return ordered.map((annotation, index) => ({ ...annotation, z: index + 1 }));
}
