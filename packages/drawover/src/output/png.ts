import { getScrollOffset, viewportRectToDocument } from "../coordinates.js";

interface ScreenshotLibrary {
  toCanvas(
    node: HTMLElement,
    options: {
      backgroundColor?: string;
      filter: (node: Node) => boolean;
      height: number;
      pixelRatio: number;
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

/** Lazily capture the host page, then bake the rendered annotation SVG over it. */
export async function exportCompositedPng(
  options: CompositedPngOptions,
  dependencies: PngExportDependencies = defaultDependencies,
): Promise<Blob> {
  const page = options.page ?? document.documentElement;
  const pixelRatio = options.pixelRatio ?? window.devicePixelRatio;
  const width = Math.max(page.scrollWidth, page.clientWidth, 1);
  const height = Math.max(page.scrollHeight, page.clientHeight, 1);
  const pageBounds = viewportRectToDocument(page.getBoundingClientRect());
  const scroll = getScrollOffset();
  const root = options.annotationSvg.getRootNode();
  const overlayHost = root instanceof ShadowRoot ? root.host : undefined;
  const exportSvg = createExportSvg(options.annotationSvg, {
    height,
    offsetX: scroll.x - pageBounds.x,
    offsetY: scroll.y - pageBounds.y,
    width,
  });

  let library: ScreenshotLibrary;
  try {
    library = await dependencies.loadScreenshotLibrary();
  } catch (error) {
    throw pngError("Could not load the PNG screenshot library.", error);
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await library.toCanvas(page, {
      ...(options.backgroundColor === undefined
        ? {}
        : { backgroundColor: options.backgroundColor }),
      filter: (node) =>
        node !== overlayHost &&
        hasRenderableSource(node) &&
        (options.filter?.(node) ?? true),
      height,
      pixelRatio,
      width,
    });
  } catch (error) {
    throw pngError("Could not capture the host page for PNG export.", error);
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

function hasRenderableSource(node: Node): boolean {
  if (node.nodeName.toLowerCase() !== "img") return true;
  return Boolean((node as HTMLImageElement).getAttribute("src"));
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
    width: number;
  },
): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  for (const element of clone.querySelectorAll('[data-scene-ui="true"]')) {
    element.remove();
  }
  const translated = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  translated.dataset.exportScene = "true";
  translated.setAttribute(
    "transform",
    `translate(${String(options.offsetX)} ${String(options.offsetY)})`,
  );
  translated.append(...clone.children);
  clone.append(translated);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.max(options.width, 1)));
  clone.setAttribute("height", String(Math.max(options.height, 1)));
  clone.setAttribute(
    "viewBox",
    `0 0 ${String(Math.max(options.width, 1))} ${String(Math.max(options.height, 1))}`,
  );
  clone.setAttribute("preserveAspectRatio", "none");
  return clone;
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
