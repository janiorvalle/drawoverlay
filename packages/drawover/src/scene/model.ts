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
  const center = rectCenter(original);
  const opposite = rotatePoint(
    {
      x: handle.includes("w") ? original.x + original.width : original.x,
      y: handle.includes("n") ? original.y + original.height : original.y,
    },
    center,
    annotation.rotation,
  );
  const radians = degreesToRadians(annotation.rotation);
  const horizontalAxis = { x: Math.cos(radians), y: Math.sin(radians) };
  const verticalAxis = { x: -Math.sin(radians), y: Math.cos(radians) };
  const directionX = handle.includes("w") ? -1 : 1;
  const directionY = handle.includes("n") ? -1 : 1;
  const delta = { x: point.x - opposite.x, y: point.y - opposite.y };
  const width = Math.max(
    minimum,
    directionX * dotProduct(delta, horizontalAxis),
  );
  const height = Math.max(
    minimum,
    directionY * dotProduct(delta, verticalAxis),
  );
  const nextCenter = {
    x:
      opposite.x +
      horizontalAxis.x * directionX * (width / 2) +
      verticalAxis.x * directionY * (height / 2),
    y:
      opposite.y +
      horizontalAxis.y * directionX * (width / 2) +
      verticalAxis.y * directionY * (height / 2),
  };
  const next = structuredClone(annotation);
  next.geometry = {
    x: nextCenter.x - width / 2,
    y: nextCenter.y - height / 2,
    width,
    height,
  };
  if (next.type === "text") {
    const scale = height / Math.max(original.height, 1);
    next.fontSize = Math.max(8, next.fontSize * scale);
  }
  return next;
}

export function updateArrowEndpoint(
  annotation: ArrowAnnotation,
  endpoint: "end" | "start",
  point: DocumentPoint,
): ArrowAnnotation {
  const next = structuredClone(annotation);
  const center = rectCenter(annotation.geometry);
  const oppositeEndpoint =
    endpoint === "end" ? annotation.start : annotation.end;
  const oppositeVisual = rotatePoint(
    oppositeEndpoint,
    center,
    annotation.rotation,
  );
  const visualStart = endpoint === "start" ? point : oppositeVisual;
  const visualEnd = endpoint === "end" ? point : oppositeVisual;
  const visualCenter = {
    x: (visualStart.x + visualEnd.x) / 2,
    y: (visualStart.y + visualEnd.y) / 2,
  };
  next.start = rotatePoint(visualStart, visualCenter, -annotation.rotation);
  next.end = rotatePoint(visualEnd, visualCenter, -annotation.rotation);
  next.geometry = arrowGeometry(next.start, next.end);
  return next;
}

function rectCenter(rect: DocumentRect): DocumentPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function rotatePoint(
  point: DocumentPoint,
  center: DocumentPoint,
  degrees: number,
): DocumentPoint {
  const radians = degreesToRadians(degrees);
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const x = point.x - center.x;
  const y = point.y - center.y;
  return {
    x: center.x + x * cosine - y * sine,
    y: center.y + x * sine + y * cosine,
  };
}

function dotProduct(left: DocumentPoint, right: DocumentPoint): number {
  return left.x * right.x + left.y * right.y;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
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
    return applyStackOrder(annotations, combined);
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
  return applyStackOrder(annotations, ordered);
}

function applyStackOrder(
  annotations: readonly Annotation[],
  stackOrder: readonly Annotation[],
): Annotation[] {
  const zById = new Map(
    stackOrder.map(({ id }, index) => [id, index + 1] as const),
  );
  return annotations.map((annotation) => ({
    ...annotation,
    z: zById.get(annotation.id) ?? annotation.z,
  }));
}
