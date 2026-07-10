import type {
  Annotation,
  ArrowAnnotation,
  ElementPinAnnotation,
  ImageAnnotation,
  PageContext,
  RectAnnotation,
  SceneSnapshot,
  SerializedReview,
  Serializer,
  TextAnnotation,
} from "../contracts/index.js";
import { viewportRectToDocument } from "../coordinates.js";

const DRAWING_TYPES = new Set<Annotation["type"]>([
  "rect",
  "arrow",
  "text",
  "image",
]);

interface NumberedAnnotation {
  annotation: Annotation;
  number: number;
}

/** Serialize a frozen scene snapshot without reading or mutating the host page. */
export const serializeReview: Serializer = (
  scene: SceneSnapshot,
  pageContext: PageContext,
): SerializedReview => {
  const numbered = scene.annotations.map((annotation, index) => ({
    annotation,
    number: index + 1,
  }));
  const elementPins = numbered.filter(isElementPin);
  const drawings = numbered.filter(isDrawing);
  const notes = numbered.filter(({ annotation }) => annotation.type === "note");

  return {
    markdown: serializeMarkdown(pageContext, elementPins, drawings, notes),
    json: JSON.stringify(
      {
        drawoverVersion: scene.version,
        page: pageContext,
        annotations: scene.annotations,
      },
      null,
      2,
    ),
  };
};

function serializeMarkdown(
  page: PageContext,
  elementPins: readonly NumberedAnnotation[],
  drawings: readonly NumberedAnnotation[],
  notes: readonly NumberedAnnotation[],
): string {
  const lines = [
    `# UI Review — ${oneLine(page.pathname)} (drawover)`,
    "",
    `- URL: ${oneLine(page.url)}`,
    `- Viewport: ${formatNumber(page.viewport.width)}×${formatNumber(page.viewport.height)} @${formatNumber(page.viewport.devicePixelRatio)}x`,
    `- Captured: ${oneLine(page.capturedAt)}`,
    `- Annotations: ${countLabel(elementPins.length, "element comment")}, ${countLabel(drawings.length, "drawing")}, ${countLabel(notes.length, "note")}`,
    "",
    "## Element comments",
  ];

  for (const item of elementPins) {
    const pin = item.annotation as ElementPinAnnotation;
    lines.push("", ...formatElementPin(pin, item.number));
  }

  lines.push("", "## Drawings (proposed UI — these elements do NOT exist yet)");
  for (const item of drawings) {
    lines.push("", ...formatDrawing(item.annotation, item.number, drawings));
  }

  if (notes.length > 0) {
    lines.push("", "## General notes");
    for (const { annotation, number } of notes) {
      if (annotation.type === "note") {
        lines.push(`- [${String(number)}] "${quoted(annotation.text)}"`);
      }
    }
  }

  return lines.join("\n");
}

function formatElementPin(pin: ElementPinAnnotation, number: number): string[] {
  const { facts } = pin.element;
  const attributes = formatAttributes(facts.attributes);
  const name = facts.accessibleName ?? facts.text;
  const element = `<${oneLine(facts.tag)}${attributes}>${name ? ` "${quoted(name)}"` : ""}`;
  const bbox = facts.bbox;
  const lines = [
    `### [${formatNumber(number)}] "${quoted(pin.comment)}"`,
    `- Element: ${element}`,
    `- Selector: ${oneLine(pin.element.selector.primary)}`,
  ];

  if (pin.element.component) {
    const source = pin.element.component.source;
    lines.push(
      `- Component: <${oneLine(pin.element.component.name)}>${source ? ` (${formatSource(source)})` : ""}`,
    );
  }

  const position = `${formatRect(bbox)} (doc coords)`;
  lines.push(
    `- Position: ${position}${pin.spatialDescription ? `; ${oneLine(pin.spatialDescription)}` : ""}`,
  );
  return lines;
}

function formatDrawing(
  annotation: Annotation,
  number: number,
  siblings: readonly NumberedAnnotation[],
): string[] {
  switch (annotation.type) {
    case "rect":
      return formatRectangle(annotation, number, siblings);
    case "arrow":
      return formatArrow(annotation, number, siblings);
    case "text":
      return formatText(annotation, number, siblings);
    case "image":
      return formatImage(annotation, number, siblings);
    case "element-pin":
    case "note":
      throw new Error(`Annotation ${annotation.id} is not a drawing.`);
  }
}

function formatRectangle(
  annotation: RectAnnotation,
  number: number,
  siblings: readonly NumberedAnnotation[],
): string[] {
  const label = annotation.label ? `: "${quoted(annotation.label)}"` : "";
  const lines = [`### [${formatNumber(number)}] Rectangle${label}`];
  appendSpatialThenCoordinates(
    lines,
    annotation,
    spatialNarration(annotation, number, siblings),
  );
  if (annotation.label) {
    lines.push(
      `- Contains label text: "${quoted(annotation.label)}"${annotation.labelAlign ? ` (${annotation.labelAlign} side)` : ""}`,
    );
  }
  appendRotation(lines, annotation.rotation);
  return lines;
}

function formatArrow(
  annotation: ArrowAnnotation,
  number: number,
  siblings: readonly NumberedAnnotation[],
): string[] {
  const lines = [`### [${formatNumber(number)}] Arrow`];
  const spatial = spatialNarration(annotation, number, siblings);
  if (spatial) {
    lines.push(`- ${oneLine(spatial)}`);
  }
  lines.push(
    `- Start/end: ${formatPoint(annotation.start)} → ${formatPoint(annotation.end)} (doc coords)`,
  );
  appendRotation(lines, annotation.rotation);
  return lines;
}

function formatText(
  annotation: TextAnnotation,
  number: number,
  siblings: readonly NumberedAnnotation[],
): string[] {
  const lines = [
    `### [${formatNumber(number)}] Text: "${quoted(annotation.text)}"`,
  ];
  const spatial = spatialNarration(annotation, number, siblings);
  if (spatial) {
    lines.push(`- ${oneLine(spatial)}`);
  }
  lines.push(`- Doc coords: ${formatRect(annotation.geometry)}`);
  if (annotation.intent) lines.push(`- Intent: ${oneLine(annotation.intent)}`);
  appendRotation(lines, annotation.rotation);
  return lines;
}

function formatImage(
  annotation: ImageAnnotation,
  number: number,
  siblings: readonly NumberedAnnotation[],
): string[] {
  const lines = [
    `### [${formatNumber(number)}] Image: "${quoted(annotation.alt)}"`,
  ];
  appendSpatialThenCoordinates(
    lines,
    annotation,
    spatialNarration(annotation, number, siblings),
  );
  if (annotation.opacity !== 1) {
    lines.push(`- Opacity: ${formatNumber(annotation.opacity)}`);
  }
  appendRotation(lines, annotation.rotation);
  return lines;
}

function appendSpatialThenCoordinates(
  lines: string[],
  annotation: RectAnnotation | ImageAnnotation,
  spatial: string | undefined,
): void {
  if (spatial) {
    lines.push(`- ${oneLine(spatial)}`);
  }
  lines.push(`- Doc coords: ${formatRect(annotation.geometry)}`);
}

const GENERIC_MOUNT_IDS = new Set(["root", "app", "__next", "__nuxt"]);

function spatialNarration(
  annotation:
    RectAnnotation | ArrowAnnotation | TextAnnotation | ImageAnnotation,
  number: number,
  siblings: readonly NumberedAnnotation[],
): string | undefined {
  if (annotation.spatialDescription) return annotation.spatialDescription;

  return (
    drawingRelation(annotation, number, siblings) ??
    nearestElementRelation(annotation) ??
    pageRegion(annotation)
  );
}

/** Relate a drawing to another drawing whose bounds contain its center. */
function drawingRelation(
  annotation:
    RectAnnotation | ArrowAnnotation | TextAnnotation | ImageAnnotation,
  number: number,
  siblings: readonly NumberedAnnotation[],
): string | undefined {
  const center = {
    x: annotation.geometry.x + annotation.geometry.width / 2,
    y: annotation.geometry.y + annotation.geometry.height / 2,
  };
  for (const sibling of siblings) {
    if (sibling.number === number) continue;
    const other = sibling.annotation;
    if (other.type !== "rect" && other.type !== "image") continue;
    const bounds = other.geometry;
    if (
      center.x >= bounds.x &&
      center.x <= bounds.x + bounds.width &&
      center.y >= bounds.y &&
      center.y <= bounds.y + bounds.height
    ) {
      return `Inside drawing [${formatNumber(sibling.number)}]`;
    }
  }
  return undefined;
}

function nearestElementRelation(
  annotation:
    RectAnnotation | ArrowAnnotation | TextAnnotation | ImageAnnotation,
): string | undefined {
  const currentDocument = Reflect.get(globalThis, "document") as
    Document | undefined;
  if (!currentDocument) return undefined;

  const pageArea =
    currentDocument.documentElement.scrollWidth *
    currentDocument.documentElement.scrollHeight;
  const candidates = currentDocument.querySelectorAll<HTMLElement>(
    "[data-testid], [id], [aria-label], main, nav, header, footer, form, aside",
  );
  let nearest:
    | { element: HTMLElement; rect: ReturnType<typeof viewportRectToDocument> }
    | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const element of candidates) {
    if (element.dataset.drawoverRuntime) continue;
    if (isGenericMount(element)) continue;
    const rect = viewportRectToDocument(element.getBoundingClientRect());
    if (rect.width === 0 && rect.height === 0) continue;
    // Page-scale wrappers "overlap" everything and describe nothing.
    if (pageArea > 0 && rect.width * rect.height >= pageArea * 0.5) continue;
    const distance = rectDistance(annotation.geometry, rect);
    if (distance < nearestDistance) {
      nearest = { element, rect };
      nearestDistance = distance;
    }
  }

  if (!nearest || nearestDistance > 480) return undefined;
  const reference = formatLiveElement(nearest.element);
  const drawing = annotation.geometry;
  const target = nearest.rect;
  if (drawing.y + drawing.height <= target.y) return `Above ${reference}`;
  if (drawing.y >= target.y + target.height) return `Below ${reference}`;
  if (drawing.x + drawing.width <= target.x) return `Left of ${reference}`;
  if (drawing.x >= target.x + target.width) return `Right of ${reference}`;
  return `Overlapping ${reference}`;
}

function isGenericMount(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === "html" || tag === "body") return true;
  return element.id ? GENERIC_MOUNT_IDS.has(element.id.toLowerCase()) : false;
}

/** Universal fallback: locate the drawing by page region. Works on any DOM. */
function pageRegion(
  annotation:
    RectAnnotation | ArrowAnnotation | TextAnnotation | ImageAnnotation,
): string | undefined {
  const currentDocument = Reflect.get(globalThis, "document") as
    Document | undefined;
  if (!currentDocument) return undefined;
  const pageWidth = currentDocument.documentElement.scrollWidth;
  const pageHeight = currentDocument.documentElement.scrollHeight;
  if (pageWidth <= 0 || pageHeight <= 0) return undefined;

  const centerX = annotation.geometry.x + annotation.geometry.width / 2;
  const centerY = annotation.geometry.y + annotation.geometry.height / 2;
  const column =
    centerX < pageWidth / 3
      ? "left"
      : centerX > (pageWidth * 2) / 3
        ? "right"
        : "center";
  const percentDown = Math.round(
    Math.min(100, Math.max(0, (centerY / pageHeight) * 100)),
  );
  return `In the ${column} of the page, about ${formatNumber(percentDown)}% down`;
}

function rectDistance(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): number {
  const horizontal = Math.max(
    second.x - (first.x + first.width),
    first.x - (second.x + second.width),
    0,
  );
  const vertical = Math.max(
    second.y - (first.y + first.height),
    first.y - (second.y + second.height),
    0,
  );
  return Math.hypot(horizontal, vertical);
}

function formatLiveElement(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const testId = element.dataset.testid;
  if (testId) return `<${tag} data-testid="${attributeValue(testId)}">`;
  if (element.id) return `<${tag} id="${attributeValue(element.id)}">`;
  return `<${tag}>`;
}

function appendRotation(lines: string[], rotation: number): void {
  if (rotation !== 0) lines.push(`- Rotation: ${formatNumber(rotation)}°`);
}

function formatAttributes(
  attributes: ElementPinAnnotation["element"]["facts"]["attributes"],
): string {
  const names = ["type", "name", "placeholder", "href"] as const;
  return names
    .flatMap((name) => {
      const value = attributes[name];
      return value === undefined ? [] : [` ${name}="${attributeValue(value)}"`];
    })
    .join("");
}

function formatSource(source: {
  file: string;
  line?: number;
  column?: number;
}): string {
  let value = oneLine(source.file);
  if (source.line !== undefined) value += `:${formatNumber(source.line)}`;
  if (source.line !== undefined && source.column !== undefined) {
    value += `:${formatNumber(source.column)}`;
  }
  return value;
}

function formatRect(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): string {
  return `${formatPoint(rect)} → ${formatPoint({ x: rect.x + rect.width, y: rect.y + rect.height })}`;
}

function formatPoint(point: { x: number; y: number }): string {
  return `${formatCoord(point.x)},${formatCoord(point.y)}`;
}

/** Coordinates round to whole CSS pixels; sub-pixel noise helps no agent. */
function formatCoord(value: number): string {
  const rounded = Math.round(value);
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function formatNumber(value: number): string {
  return String(Object.is(value, -0) ? 0 : value);
}

function countLabel(count: number, singular: string): string {
  return `${formatNumber(count)} ${singular}${count === 1 ? "" : "s"}`;
}

function quoted(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\n")
    .replaceAll('"', '\\"');
}

function attributeValue(value: string): string {
  return quoted(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isElementPin(
  item: NumberedAnnotation,
): item is NumberedAnnotation & { annotation: ElementPinAnnotation } {
  return item.annotation.type === "element-pin";
}

function isDrawing(item: NumberedAnnotation): boolean {
  return DRAWING_TYPES.has(item.annotation.type);
}
