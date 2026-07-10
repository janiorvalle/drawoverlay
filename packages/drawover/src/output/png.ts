import { getScrollOffset, viewportRectToDocument } from "../coordinates.js";

interface ScreenshotLibrary {
  toCanvas(
    node: HTMLElement,
    options: {
      backgroundColor?: string;
      filter: (node: Node) => boolean;
      height: number;
      includeStyleProperties?: string[];
      pixelRatio: number;
      skipFonts?: boolean;
      width: number;
    },
  ): Promise<HTMLCanvasElement>;
}

export interface CompositedPngOptions {
  /** Host-page root to capture. Defaults to the document element. */
  page?: HTMLElement;
  /** The rendered scene SVG. It may live inside Drawover's Shadow DOM. */
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

const CAPTURE_STYLE_PROPERTIES = [
  "accent-color",
  "align-content",
  "align-items",
  "align-self",
  "appearance",
  "background-color",
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
    height,
    offsetX: svgBounds.left + scroll.x - pageBounds.x,
    offsetY: svgBounds.top + scroll.y - pageBounds.y,
    sourceHeight: svgBounds.height,
    sourceWidth: svgBounds.width,
    width,
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
      filter: (node) =>
        node !== overlayHost &&
        isCaptureSafeNode(node) &&
        (options.filter?.(node) ?? true),
      height,
      includeStyleProperties: CAPTURE_STYLE_PROPERTIES,
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

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the PNG canvas context.");

  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;
  context.drawImage(annotationImage, 0, 0, width * scaleX, height * scaleY);

  try {
    return await dependencies.encodePng(canvas);
  } catch (error) {
    throw pngError("Could not encode the composited PNG.", error);
  }
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
    if (color && color !== "transparent" && color !== "rgba(0, 0, 0, 0)") {
      return color;
    }
  }
  return "#ffffff";
}

function createCapturePage(
  page: HTMLElement,
  include: (node: Node) => boolean,
): HTMLElement {
  const clone = cloneCaptureNode(page, include, true);
  if (!(clone instanceof HTMLElement)) {
    throw new Error("Could not create a local-only host-page snapshot.");
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

function sanitizeClone(source: Element, clone: Element): void {
  for (const attribute of [...clone.attributes]) {
    const name = attribute.name.toLowerCase();
    if (
      name === "class" ||
      name === "is" ||
      name === "style" ||
      name === "srcset" ||
      name.startsWith("on") ||
      !isSafeStyleValue(attribute.value) ||
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
      if (value && isSafeStyleValue(value)) {
        clone.style.setProperty(property, value);
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

function isSafeStyleValue(value: string): boolean {
  return !/\b(?:-webkit-)?image-set\s*\(|\burl\s*\(|(?:https?:)?\/\//i.test(
    value,
  );
}

function isCaptureSafeNode(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  const inlineStyle = node.getAttribute("style") ?? "";
  if (/\b(?:-webkit-)?image-set\s*\(|\burl\s*\(/i.test(inlineStyle)) {
    return false;
  }
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
      "use",
      "video",
    ].includes(node.localName)
  ) {
    return false;
  }
  if (node instanceof SVGElement) return false;
  if (node instanceof HTMLImageElement) {
    return (
      isLocalResource(node.src) &&
      (node.currentSrc === "" || isLocalResource(node.currentSrc)) &&
      node.srcset.trim() === ""
    );
  }
  if (
    node instanceof HTMLInputElement &&
    node.type === "image" &&
    !isLocalResource(node.src)
  ) {
    return false;
  }
  if (node.localName === "use") {
    const href = node.getAttribute("href") ?? node.getAttribute("xlink:href");
    if (href && !href.startsWith("#") && !isLocalResource(href)) return false;
  }
  return (
    !hasResourcePseudo(node, "::before") && !hasResourcePseudo(node, "::after")
  );
}

function isLocalResource(value: string): boolean {
  return value.startsWith("blob:") || value.startsWith("data:");
}

function hasResourcePseudo(
  element: Element,
  pseudo: "::after" | "::before",
): boolean {
  return window.getComputedStyle(element, pseudo).content.includes("url(");
}

async function loadSvgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  const width = Number(svg.getAttribute("width")) || bounds.width;
  const height = Number(svg.getAttribute("height")) || bounds.height;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.max(width, 1)));
  clone.setAttribute("height", String(Math.max(height, 1)));
  const source = new XMLSerializer().serializeToString(clone);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("The annotation SVG image failed to load."));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
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
