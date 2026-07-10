import { getScrollOffset, viewportRectToDocument } from "../coordinates.js";
import { PNG_BACKGROUND, TRANSPARENT_RGBA } from "../theme/tokens.js";

interface ScreenshotLibrary {
  toCanvas(
    node: HTMLElement,
    options: {
      backgroundColor?: string;
      fetchRequestInit?: RequestInit;
      filter: (node: Node) => boolean;
      height: number;
      includeQueryParams?: boolean;
      includeStyleProperties?: string[];
      onImageErrorHandler?: (...attributes: unknown[]) => void;
      pixelRatio: number;
      skipFonts?: boolean;
      width: number;
    },
  ): Promise<HTMLCanvasElement>;
}

export interface CompositedPngOptions {
  /** Host-page root to capture. Defaults to the document element. */
  page?: HTMLElement;
  /** The rendered scene SVG. It may live inside drawover's Shadow DOM. */
  annotationSvg: SVGSVGElement;
  backgroundColor?: string;
  pixelRatio?: number;
  filter?: (node: Node) => boolean;
}

export interface PngExportDependencies {
  loadScreenshotLibrary: () => Promise<ScreenshotLibrary>;
  loadSvgImage: (svg: SVGSVGElement) => Promise<CanvasImageSource>;
  encodePng: (canvas: HTMLCanvasElement) => Promise<Blob>;
}

const defaultDependencies: PngExportDependencies = {
  loadScreenshotLibrary: async () => import("html-to-image"),
  loadSvgImage,
  encodePng,
};

/**
 * Capture may re-request assets the host page already references so they can
 * be inlined into the PNG (the rasterizer renders through an SVG image,
 * which cannot load external URLs). Requests are cache-first and bounded:
 * a slow or dead asset costs its own pixels, never the capture.
 */
const ASSET_FETCH_TIMEOUT_MS = 3_000;

function assetFetchInit(): RequestInit {
  const init: RequestInit = { cache: "force-cache" };
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    init.signal = AbortSignal.timeout(ASSET_FETCH_TIMEOUT_MS);
  }
  return init;
}

const CAPTURE_STYLE_PROPERTIES = [
  "accent-color",
  "align-content",
  "align-items",
  "align-self",
  "appearance",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-repeat",
  "background-size",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "box-shadow",
  "box-sizing",
  "color",
  "column-gap",
  "display",
  "flex-basis",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-column-end",
  "grid-column-start",
  "grid-row-end",
  "grid-row-start",
  "grid-template-columns",
  "grid-template-rows",
  "height",
  "inset",
  "justify-content",
  "justify-items",
  "justify-self",
  "left",
  "letter-spacing",
  "line-height",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "object-fit",
  "object-position",
  "opacity",
  "order",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow-x",
  "overflow-y",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "pointer-events",
  "position",
  "right",
  "row-gap",
  "table-layout",
  "text-align",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-indent",
  "text-overflow",
  "text-shadow",
  "text-transform",
  "top",
  "transform",
  "transform-origin",
  "vertical-align",
  "visibility",
  "white-space",
  "width",
  "word-break",
  "word-spacing",
  "z-index",
];

/** Lazily capture the host page, then bake the rendered annotation SVG over it. */
export async function exportCompositedPng(
  options: CompositedPngOptions,
  dependencies: PngExportDependencies = defaultDependencies,
): Promise<Blob> {
  const page = options.page ?? document.documentElement;
  const pixelRatio = options.pixelRatio ?? window.devicePixelRatio;
  const backgroundColor =
    options.backgroundColor ?? resolvePageBackground(page);
  const width = Math.max(page.scrollWidth, page.clientWidth, 1);
  const height = Math.max(page.scrollHeight, page.clientHeight, 1);
  const pageBounds = viewportRectToDocument(page.getBoundingClientRect());
  const scroll = getScrollOffset();
  const svgBounds = options.annotationSvg.getBoundingClientRect();
  const bleed = annotationBleed(options.annotationSvg, {
    height,
    offsetX: svgBounds.left + scroll.x - pageBounds.x,
    offsetY: svgBounds.top + scroll.y - pageBounds.y,
    width,
  });
  const root = options.annotationSvg.getRootNode();
  const overlayHost = root instanceof ShadowRoot ? root.host : undefined;
  const capturePage = createCapturePage(
    page,
    (node) =>
      node !== overlayHost &&
      isCaptureSafeNode(node) &&
      (options.filter?.(node) ?? true),
  );
  const exportSvg = createExportSvg(options.annotationSvg, {
    height: height + bleed.top + bleed.bottom,
    offsetX: svgBounds.left + scroll.x - pageBounds.x + bleed.left,
    offsetY: svgBounds.top + scroll.y - pageBounds.y + bleed.top,
    sourceHeight: svgBounds.height,
    sourceWidth: svgBounds.width,
    width: width + bleed.left + bleed.right,
  });

  let library: ScreenshotLibrary;
  try {
    library = await dependencies.loadScreenshotLibrary();
  } catch (error) {
    throw pngError("Could not load the PNG screenshot library.", error);
  }

  let canvas: HTMLCanvasElement;
  const staging = stageCapturePage(
    options.annotationSvg,
    capturePage,
    width,
    height,
  );
  try {
    canvas = await library.toCanvas(capturePage, {
      backgroundColor,
      fetchRequestInit: assetFetchInit(),
      filter: (node) =>
        node !== overlayHost &&
        isCaptureSafeNode(node) &&
        (options.filter?.(node) ?? true),
      height,
      // Next-style image endpoints differ only by query string; without this
      // the library's URL cache would hand every image the first one's bytes.
      includeQueryParams: true,
      includeStyleProperties: CAPTURE_STYLE_PROPERTIES,
      // Without a handler the library rejects the whole capture when one
      // image fails to inline; a missing asset must degrade to a blank spot.
      onImageErrorHandler: () => undefined,
      pixelRatio,
      skipFonts: true,
      width,
    });
  } catch (error) {
    throw pngError("Could not capture the host page for PNG export.", error);
  } finally {
    staging.remove();
  }

  let annotationImage: CanvasImageSource;
  try {
    annotationImage = await dependencies.loadSvgImage(exportSvg);
  } catch (error) {
    throw pngError(
      "Could not render the annotation SVG for PNG export.",
      error,
    );
  }

  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;
  // Annotations at the page edge (badges especially) extend past the page
  // bounds; a bleed margin keeps them whole instead of clipping them.
  const composite =
    bleed.left || bleed.right || bleed.top || bleed.bottom
      ? expandCanvas(canvas, bleed, { scaleX, scaleY }, backgroundColor)
      : canvas;
  const context = composite.getContext("2d");
  if (!context) throw new Error("Could not create the PNG canvas context.");
  context.drawImage(annotationImage, 0, 0, composite.width, composite.height);

  try {
    return await dependencies.encodePng(composite);
  } catch (error) {
    throw pngError("Could not encode the composited PNG.", error);
  }
}

interface BleedMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const MAX_BLEED = 24;

/** Overflow of rendered annotations past the page bounds, clamped per side. */
function annotationBleed(
  svg: SVGSVGElement,
  page: { width: number; height: number; offsetX: number; offsetY: number },
): BleedMargins {
  let content: { x: number; y: number; width: number; height: number };
  try {
    content = svg.getBBox();
  } catch {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  if (content.width === 0 && content.height === 0) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  // getBBox is in the scene's local (viewport) space; shift into page space.
  const left = content.x + page.offsetX;
  const top = content.y + page.offsetY;
  const clamp = (value: number): number =>
    Math.ceil(Math.min(MAX_BLEED, Math.max(0, value)));
  return {
    top: clamp(0 - top),
    right: clamp(left + content.width - page.width),
    bottom: clamp(top + content.height - page.height),
    left: clamp(0 - left),
  };
}

/** Copy the captured page onto a larger canvas with background-filled bleed. */
function expandCanvas(
  canvas: HTMLCanvasElement,
  bleed: BleedMargins,
  scale: { scaleX: number; scaleY: number },
  backgroundColor: string,
): HTMLCanvasElement {
  const expanded = document.createElement("canvas");
  expanded.width =
    canvas.width + Math.round((bleed.left + bleed.right) * scale.scaleX);
  expanded.height =
    canvas.height + Math.round((bleed.top + bleed.bottom) * scale.scaleY);
  const context = expanded.getContext("2d");
  if (!context) throw new Error("Could not create the PNG canvas context.");
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, expanded.width, expanded.height);
  context.drawImage(
    canvas,
    Math.round(bleed.left * scale.scaleX),
    Math.round(bleed.top * scale.scaleY),
  );
  return expanded;
}

function stageCapturePage(
  annotationSvg: SVGSVGElement,
  page: HTMLElement,
  width: number,
  height: number,
): SVGForeignObjectElement {
  const staging = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject",
  );
  staging.dataset.sceneUi = "true";
  staging.setAttribute("x", "-100000");
  staging.setAttribute("y", "0");
  staging.setAttribute("width", String(width));
  staging.setAttribute("height", String(height));
  const boundary = document.createElement("div");
  boundary.style.width = `${String(width)}px`;
  boundary.style.height = `${String(height)}px`;
  boundary.attachShadow({ mode: "open" }).append(page);
  staging.append(boundary);
  annotationSvg.append(staging);
  return staging;
}

function resolvePageBackground(page: HTMLElement): string {
  const candidates = [page, page.ownerDocument.body];
  for (const candidate of candidates) {
    const color = window.getComputedStyle(candidate).backgroundColor;
    if (color && color !== "transparent" && color !== TRANSPARENT_RGBA) {
      return color;
    }
  }
  return PNG_BACKGROUND;
}

function createCapturePage(
  page: HTMLElement,
  include: (node: Node) => boolean,
): HTMLElement {
  const clone = cloneCaptureNode(page, include, true);
  if (!(clone instanceof HTMLElement)) {
    throw new Error("Could not create the host-page snapshot.");
  }
  return clone;
}

function cloneCaptureNode(
  source: Node,
  include: (node: Node) => boolean,
  isRoot = false,
): Node | undefined {
  if (!isRoot && !include(source)) return undefined;
  if (source instanceof HTMLCanvasElement) return cloneCanvas(source);
  if (source instanceof HTMLImageElement) return cloneImage(source);
  if (source instanceof SVGSVGElement) return cloneInlineSvg(source);
  if (!(source instanceof Element)) return source.cloneNode(false);

  const clone =
    source instanceof HTMLElement &&
    (source.localName.includes("-") || source.hasAttribute("is"))
      ? document.createElement("div")
      : source.cloneNode(false);
  if (!(clone instanceof Element)) return undefined;
  sanitizeClone(source, clone);
  const children =
    source instanceof HTMLSlotElement
      ? source.assignedNodes({ flatten: true })
      : (source.shadowRoot?.childNodes ?? source.childNodes);
  for (const child of children) {
    const childClone = cloneCaptureNode(child, include);
    if (childClone) clone.append(childClone);
  }
  return clone;
}

function cloneCanvas(source: HTMLCanvasElement): HTMLImageElement | undefined {
  try {
    const dataUrl = source.toDataURL();
    if (dataUrl === "data:,") return undefined;
    const clone = document.createElement("img");
    clone.src = dataUrl;
    clone.width = source.width;
    clone.height = source.height;
    sanitizeClone(source, clone);
    return clone;
  } catch {
    return undefined;
  }
}

/**
 * Keep the rendered URL (`currentSrc` resolves responsive candidates) and
 * let the capture library request and inline it — cache-first, so a
 * displayed image rarely costs a round trip, and the original compressed
 * bytes come through instead of a synchronous canvas re-encode. Below-fold
 * lazy images inline the same way even though they never decoded.
 * Cross-origin images without CORS stay missing: the request is blocked.
 */
function cloneImage(source: HTMLImageElement): HTMLImageElement {
  const clone = source.cloneNode(false) as HTMLImageElement;
  sanitizeClone(source, clone);
  const rendered = source.currentSrc || source.src;
  if (rendered) clone.src = rendered;
  return clone;
}

const SVG_PRESENTATION_PROPERTIES = [
  "color",
  "display",
  "fill",
  "fill-opacity",
  "fill-rule",
  "opacity",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "visibility",
];

/**
 * Host-page SVG (inline logos, icon sets) rasterizes through the same
 * standalone data-URI path as the annotation layer. External references
 * inside it cannot load in that context, so it is inert by construction —
 * but presentation usually comes from host CSS (`stroke: currentColor` icon
 * sets), which a standalone serialization loses. Inline the computed
 * presentation styles before serializing.
 */
function cloneInlineSvg(source: SVGSVGElement): HTMLImageElement | undefined {
  const bounds = source.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return undefined;
  const svg = source.cloneNode(true) as SVGSVGElement;
  inlineSvgPresentation(source, svg);
  inlineSpriteReferences(source, svg);
  for (const element of svg.querySelectorAll("foreignObject, script")) {
    element.remove();
  }
  const clone = document.createElement("img");
  sanitizeClone(source, clone);
  clone.src = svgToDataUri(svg, bounds);
  return clone;
}

/** Serialize an SVG element into a standalone data-URI image source. */
function svgToDataUri(
  svg: SVGSVGElement,
  size: { width: number; height: number },
): string {
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(Math.max(size.width, 1)));
  svg.setAttribute("height", String(Math.max(size.height, 1)));
  const markup = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function inlineSvgPresentation(
  source: SVGSVGElement,
  clone: SVGSVGElement,
): void {
  const sourceElements = [source, ...source.querySelectorAll("*")];
  const cloneElements = [clone, ...clone.querySelectorAll("*")];
  for (const [index, sourceElement] of sourceElements.entries()) {
    const cloneElement = cloneElements[index];
    if (!(cloneElement instanceof SVGElement)) continue;
    const computed = window.getComputedStyle(sourceElement);
    for (const property of SVG_PRESENTATION_PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (value) cloneElement.style.setProperty(property, value);
    }
  }
}

/**
 * Icon sprites (`<use href="#id">` pointing into a hidden sheet elsewhere in
 * the document) lose their target when one svg serializes alone; pull the
 * referenced document nodes into local defs.
 */
function inlineSpriteReferences(
  source: SVGSVGElement,
  clone: SVGSVGElement,
): void {
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const inlined = new Set<string>();
  for (const reference of clone.querySelectorAll("use")) {
    const href =
      reference.getAttribute("href") ??
      reference.getAttribute("xlink:href") ??
      "";
    if (!href.startsWith("#") || inlined.has(href)) continue;
    inlined.add(href);
    const target = source.ownerDocument.getElementById(href.slice(1));
    if (!target || source.contains(target)) continue;
    defs.append(target.cloneNode(true));
  }
  if (defs.childNodes.length > 0) clone.append(defs);
}

function sanitizeClone(source: Element, clone: Element): void {
  for (const attribute of [...clone.attributes]) {
    const name = attribute.name.toLowerCase();
    if (
      name === "class" ||
      name === "is" ||
      name === "style" ||
      name === "srcset" ||
      name.startsWith("on") ||
      ([
        "archive",
        "background",
        "code",
        "codebase",
        "data",
        "href",
        "icon",
        "longdesc",
        "manifest",
        "poster",
        "profile",
        "src",
        "srcdoc",
        "xlink:href",
      ].includes(name) &&
        attribute.value !== "" &&
        !attribute.value.startsWith("#") &&
        !isLocalResource(attribute.value))
    ) {
      clone.removeAttribute(attribute.name);
    }
  }

  if (clone instanceof HTMLElement || clone instanceof SVGElement) {
    const computed = window.getComputedStyle(source);
    for (const property of CAPTURE_STYLE_PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (value) {
        clone.style.setProperty(property, normalizeCaptureStyle(value));
      }
    }
  }
  if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
    if (source.type !== "file") clone.value = source.value;
    clone.checked = source.checked;
  } else if (
    source instanceof HTMLTextAreaElement &&
    clone instanceof HTMLTextAreaElement
  ) {
    clone.textContent = source.value;
  } else if (
    source instanceof HTMLOptionElement &&
    clone instanceof HTMLOptionElement
  ) {
    clone.selected = source.selected;
  } else if (
    source instanceof HTMLImageElement &&
    clone instanceof HTMLImageElement
  ) {
    clone.srcset = "";
  }
}

/**
 * SVG-image rasterization silently drops gradients that use modern color
 * interpolation hints (the Tailwind v4 gradient pattern), leaving elements
 * blank. Computed color stops are already resolved, so removing the hint
 * preserves the endpoints exactly.
 */
export function normalizeCaptureStyle(value: string): string {
  if (!value.includes("gradient(")) return value;
  return value
    .replace(
      /\s*\bin\s+[a-z][a-z0-9-]*(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?/gi,
      "",
    )
    .replace(/\(\s*,\s*/g, "(");
}

function isCaptureSafeNode(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  if (
    [
      "audio",
      "applet",
      "base",
      "embed",
      "frame",
      "frameset",
      "head",
      "iframe",
      "link",
      "meta",
      "object",
      "script",
      "source",
      "style",
      "track",
      "video",
    ].includes(node.localName)
  ) {
    return false;
  }
  // Inline SVG roots rasterize separately; their content never reaches the
  // clone walk, and stray non-root SVG elements cannot render alone.
  if (node instanceof SVGElement) return node instanceof SVGSVGElement;
  return true;
}

function isLocalResource(value: string): boolean {
  return value.startsWith("blob:") || value.startsWith("data:");
}

async function loadSvgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  const width = Number(svg.getAttribute("width")) || bounds.width;
  const height = Number(svg.getAttribute("height")) || bounds.height;
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("The annotation SVG image failed to load."));
    image.src = svgToDataUri(clone, { width, height });
  });
  return image;
}

function createExportSvg(
  svg: SVGSVGElement,
  options: {
    height: number;
    offsetX: number;
    offsetY: number;
    sourceHeight: number;
    sourceWidth: number;
    width: number;
  },
): SVGSVGElement {
  const source = svg.cloneNode(true) as SVGSVGElement;
  for (const element of source.querySelectorAll('[data-scene-ui="true"]')) {
    element.remove();
  }
  source.dataset.exportSource = "true";
  source.setAttribute("x", "0");
  source.setAttribute("y", "0");
  source.setAttribute("width", String(Math.max(options.sourceWidth, 1)));
  source.setAttribute("height", String(Math.max(options.sourceHeight, 1)));
  source.setAttribute("overflow", "visible");
  const exported = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  const translated = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  translated.dataset.exportScene = "true";
  translated.setAttribute(
    "transform",
    `translate(${String(options.offsetX)} ${String(options.offsetY)})`,
  );
  translated.append(source);
  exported.append(translated);
  exported.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  exported.setAttribute("width", String(Math.max(options.width, 1)));
  exported.setAttribute("height", String(Math.max(options.height, 1)));
  exported.setAttribute(
    "viewBox",
    `0 0 ${String(Math.max(options.width, 1))} ${String(Math.max(options.height, 1))}`,
  );
  exported.setAttribute("preserveAspectRatio", "none");
  return exported;
}

async function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas PNG encoding returned no data."));
    }, "image/png");
  });
}

function pngError(message: string, cause: unknown): Error {
  return new Error(message, { cause });
}
