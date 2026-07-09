import { viewportRectToDocument } from "../coordinates.js";

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
  const root = options.annotationSvg.getRootNode();
  const overlayHost = root instanceof ShadowRoot ? root.host : undefined;

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
        node !== overlayHost && (options.filter?.(node) ?? true),
      height,
      pixelRatio,
      width,
    });
  } catch (error) {
    throw pngError("Could not capture the host page for PNG export.", error);
  }

  let annotationImage: CanvasImageSource;
  try {
    annotationImage = await dependencies.loadSvgImage(options.annotationSvg);
  } catch (error) {
    throw pngError(
      "Could not render the annotation SVG for PNG export.",
      error,
    );
  }

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the PNG canvas context.");

  const viewportBounds = options.annotationSvg.getBoundingClientRect();
  const documentBounds = viewportRectToDocument(viewportBounds);
  const pageBounds = viewportRectToDocument(page.getBoundingClientRect());
  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;
  context.drawImage(
    annotationImage,
    (documentBounds.x - pageBounds.x) * scaleX,
    (documentBounds.y - pageBounds.y) * scaleY,
    documentBounds.width * scaleX,
    documentBounds.height * scaleY,
  );

  try {
    return await dependencies.encodePng(canvas);
  } catch (error) {
    throw pngError("Could not encode the composited PNG.", error);
  }
}

async function loadSvgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.max(bounds.width, 1)));
  clone.setAttribute("height", String(Math.max(bounds.height, 1)));
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
