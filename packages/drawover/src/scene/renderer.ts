import type {
  Annotation,
  ArrowAnnotation,
  DocumentRect,
  SceneSnapshot,
} from "../contracts/index.js";
import { documentRectToViewport, documentToViewport } from "../coordinates.js";
import { resolveElementPinPosition } from "./anchoring.js";
import { visualBounds } from "./model.js";
import { ANNOTATION_COLORS, SCENE_WHITE } from "../theme/tokens.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const SYSTEM_FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export interface RenderState {
  selectedIds: ReadonlySet<string>;
  overrides?: ReadonlyMap<string, Annotation>;
  previews?: readonly Annotation[];
  marquee?: DocumentRect;
}

export class SceneRenderer {
  readonly #svg: SVGSVGElement;

  constructor(svg: SVGSVGElement) {
    this.#svg = svg;
  }

  render(snapshot: SceneSnapshot, state: RenderState): void {
    this.#svg.replaceChildren();
    const numberById = new Map(
      snapshot.annotations.map(({ id }, index) => [id, index + 1] as const),
    );
    const annotations = snapshot.annotations
      .filter(({ type }) => type !== "note")
      .map((annotation) => state.overrides?.get(annotation.id) ?? annotation)
      .map(resolveElementPinPosition)
      .sort((left, right) => left.z - right.z);

    for (const annotation of annotations) {
      this.#svg.append(
        renderAnnotation(annotation, false, numberById.get(annotation.id)),
      );
    }
    for (const preview of state.previews ?? []) {
      this.#svg.append(renderAnnotation(preview, true));
    }

    const selected = annotations.filter(({ id }) => state.selectedIds.has(id));
    if (selected.length === 1 && selected[0]) {
      this.#svg.append(renderSingleSelection(selected[0]));
    } else if (selected.length > 1) {
      this.#svg.append(renderGroupSelection(selected));
    }
    if (state.marquee) this.#svg.append(renderMarquee(state.marquee));
  }
}

function renderAnnotation(
  annotation: Annotation,
  preview = false,
  number?: number,
): SVGGElement {
  const group = svgElement("g");
  group.classList.add("scene-node");
  if (preview) {
    group.classList.add("scene-preview");
    group.dataset.sceneUi = "true";
  }
  group.dataset.annotationId = annotation.id;
  group.dataset.annotationType = annotation.type;
  if (number !== undefined) group.dataset.annotationNumber = String(number);

  const viewportGeometry = documentRectToViewport(annotation.geometry);
  if (annotation.rotation !== 0) {
    const centerX = viewportGeometry.x + viewportGeometry.width / 2;
    const centerY = viewportGeometry.y + viewportGeometry.height / 2;
    group.setAttribute(
      "transform",
      ["rotate(", annotation.rotation, " ", centerX, " ", centerY, ")"].join(
        "",
      ),
    );
  }

  switch (annotation.type) {
    case "rect": {
      const rect = svgElement("rect");
      setAttributes(rect, {
        x: viewportGeometry.x,
        y: viewportGeometry.y,
        width: viewportGeometry.width,
        height: viewportGeometry.height,
        fill: annotation.fill,
        stroke: annotation.stroke,
        "stroke-width": annotation.strokeWidth,
      });
      group.append(rect);
      if (annotation.label) {
        const label = svgElement("text");
        const align = annotation.labelAlign ?? "center";
        setAttributes(label, {
          x:
            align === "left"
              ? viewportGeometry.x + 8
              : align === "right"
                ? viewportGeometry.x + viewportGeometry.width - 8
                : viewportGeometry.x + viewportGeometry.width / 2,
          y: viewportGeometry.y + viewportGeometry.height / 2,
          fill: annotation.stroke,
          "font-family": SYSTEM_FONT_FAMILY,
          "font-size": 14,
          "font-weight": 700,
          "text-anchor":
            align === "left" ? "start" : align === "right" ? "end" : "middle",
          "dominant-baseline": "middle",
        });
        label.textContent = annotation.label;
        group.append(label);
      }
      break;
    }
    case "arrow":
      group.append(...renderArrow(annotation));
      break;
    case "text": {
      const text = svgElement("text");
      setAttributes(text, {
        x:
          annotation.align === "left"
            ? viewportGeometry.x
            : annotation.align === "right"
              ? viewportGeometry.x + viewportGeometry.width
              : viewportGeometry.x + viewportGeometry.width / 2,
        y: viewportGeometry.y + annotation.fontSize,
        fill: annotation.color,
        "font-family": SYSTEM_FONT_FAMILY,
        "font-size": annotation.fontSize,
        "font-weight": 600,
        "text-anchor":
          annotation.align === "left"
            ? "start"
            : annotation.align === "right"
              ? "end"
              : "middle",
      });
      text.textContent = annotation.text;
      group.append(text);
      break;
    }
    case "image": {
      const image = svgElement("image");
      setAttributes(image, {
        x: viewportGeometry.x,
        y: viewportGeometry.y,
        width: viewportGeometry.width,
        height: viewportGeometry.height,
        href: annotation.dataUrl,
        opacity: annotation.opacity,
        preserveAspectRatio: "none",
      });
      group.append(image);
      break;
    }
    case "element-pin": {
      const title = svgElement("title");
      title.textContent = annotation.comment;
      group.append(
        title,
        ...renderBadge(
          number ?? 0,
          viewportGeometry.x + viewportGeometry.width / 2,
          viewportGeometry.y + viewportGeometry.height / 2,
          Math.max(11, viewportGeometry.width / 2),
        ),
      );
      break;
    }
    case "note":
      break;
  }
  if (
    annotation.type !== "element-pin" &&
    annotation.type !== "note" &&
    number
  ) {
    group.append(
      ...renderBadge(number, viewportGeometry.x, viewportGeometry.y, 11),
    );
  }
  return group;
}

function renderBadge(
  number: number,
  x: number,
  y: number,
  radius: number,
): SVGElement[] {
  const circle = svgElement("circle");
  circle.dataset.annotationBadge = String(number);
  setAttributes(circle, {
    cx: x,
    cy: y,
    r: radius,
    fill: ANNOTATION_COLORS[0],
    stroke: SCENE_WHITE,
    "stroke-width": 2,
  });
  const text = svgElement("text");
  text.dataset.annotationBadgeLabel = String(number);
  setAttributes(text, {
    x,
    y: y + 4,
    fill: SCENE_WHITE,
    "font-family": SYSTEM_FONT_FAMILY,
    "font-size": 12,
    "font-weight": 800,
    "text-anchor": "middle",
    "pointer-events": "none",
  });
  text.textContent = String(number);
  return [circle, text];
}

function renderArrow(annotation: ArrowAnnotation): SVGElement[] {
  const start = documentToViewport(annotation.start);
  const end = documentToViewport(annotation.end);
  const line = svgElement("line");
  setAttributes(line, {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    stroke: annotation.color,
    "stroke-width": annotation.strokeWidth,
    "stroke-linecap": "round",
  });
  const hitTarget = svgElement("line");
  hitTarget.classList.add("arrow-hit-target");
  hitTarget.dataset.sceneUi = "true";
  setAttributes(hitTarget, {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    stroke: "transparent",
    "stroke-width": Math.max(12, annotation.strokeWidth + 8),
  });

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = 11 + annotation.strokeWidth;
  const left = {
    x: end.x - size * Math.cos(angle - Math.PI / 6),
    y: end.y - size * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: end.x - size * Math.cos(angle + Math.PI / 6),
    y: end.y - size * Math.sin(angle + Math.PI / 6),
  };
  const head = svgElement("polygon");
  setAttributes(head, {
    points: [
      end.x,
      ",",
      end.y,
      " ",
      left.x,
      ",",
      left.y,
      " ",
      right.x,
      ",",
      right.y,
    ].join(""),
    fill: annotation.color,
  });
  return [hitTarget, line, head];
}

function renderSingleSelection(annotation: Annotation): SVGGElement {
  const group = svgElement("g");
  group.classList.add("selection-ui");
  group.dataset.sceneUi = "true";
  group.dataset.selectionFor = annotation.id;
  const geometry = documentRectToViewport(annotation.geometry);
  if (annotation.rotation !== 0) {
    group.setAttribute(
      "transform",
      [
        "rotate(",
        annotation.rotation,
        " ",
        geometry.x + geometry.width / 2,
        " ",
        geometry.y + geometry.height / 2,
        ")",
      ].join(""),
    );
  }
  group.append(selectionBox(geometry));

  if (annotation.type === "arrow") {
    const start = documentToViewport(annotation.start);
    const end = documentToViewport(annotation.end);
    group.append(
      handle(start.x, start.y, "arrow-start"),
      handle(end.x, end.y, "arrow-end"),
    );
  } else {
    group.append(
      handle(geometry.x, geometry.y, "nw"),
      handle(geometry.x + geometry.width, geometry.y, "ne"),
      handle(geometry.x, geometry.y + geometry.height, "sw"),
      handle(geometry.x + geometry.width, geometry.y + geometry.height, "se"),
    );
  }

  const rotateLine = svgElement("line");
  const centerX = geometry.x + geometry.width / 2;
  setAttributes(rotateLine, {
    x1: centerX,
    y1: geometry.y,
    x2: centerX,
    y2: geometry.y - 24,
    "stroke-width": 1,
  });
  rotateLine.classList.add("rotate-line");
  group.append(rotateLine, handle(centerX, geometry.y - 28, "rotate", 5));
  return group;
}

function renderGroupSelection(annotations: readonly Annotation[]): SVGGElement {
  const group = svgElement("g");
  group.classList.add("selection-ui", "group-selection");
  group.dataset.sceneUi = "true";
  group.append(
    selectionBox(documentRectToViewport(combinedBounds(annotations))),
  );
  return group;
}

function renderMarquee(rect: DocumentRect): SVGRectElement {
  const element = selectionBox(documentRectToViewport(rect));
  element.classList.add("marquee");
  element.dataset.sceneUi = "true";
  return element;
}

function selectionBox(rect: DocumentRect): SVGRectElement {
  const element = svgElement("rect");
  element.classList.add("selection-box");
  setAttributes(element, {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  });
  return element;
}

function handle(
  x: number,
  y: number,
  name: string,
  radius = 4,
): SVGCircleElement {
  const element = svgElement("circle");
  element.classList.add("selection-handle");
  element.dataset.handle = name;
  setAttributes(element, { cx: x, cy: y, r: radius });
  return element;
}

function combinedBounds(annotations: readonly Annotation[]): DocumentRect {
  const bounds = annotations.map(visualBounds);
  const minX = Math.min(...bounds.map(({ x }) => x));
  const minY = Math.min(...bounds.map(({ y }) => y));
  const maxX = Math.max(...bounds.map(({ x, width }) => x + width));
  const maxY = Math.max(...bounds.map(({ y, height }) => y + height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name);
}

function setAttributes(
  element: Element,
  attributes: Readonly<Record<string, number | string>>,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
}
