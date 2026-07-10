import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PngExportDependencies } from "./png.js";
import { exportCompositedPng, normalizeCaptureStyle } from "./png.js";

interface PngHarness {
  canvas: HTMLCanvasElement;
  dependencies: PngExportDependencies;
  drawImage: ReturnType<typeof vi.fn>;
  encodePng: ReturnType<typeof vi.fn>;
  loadScreenshotLibrary: ReturnType<typeof vi.fn>;
  loadSvgImage: ReturnType<typeof vi.fn>;
  page: HTMLElement;
  png: Blob;
  svg: SVGSVGElement;
  toCanvas: ReturnType<typeof vi.fn<ScreenshotToCanvas>>;
}

type ScreenshotToCanvas = (
  node: HTMLElement,
  options: Record<string, unknown>,
) => Promise<HTMLCanvasElement>;

describe("composited PNG output", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollX", { configurable: true, value: 0 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("lazy-loads the screenshot dependency only when export starts", async () => {
    const harness = createHarness();
    expect(harness.loadScreenshotLibrary).not.toHaveBeenCalled();

    const result = await exportCompositedPng(
      { annotationSvg: harness.svg, page: harness.page, pixelRatio: 2 },
      harness.dependencies,
    );

    expect(result).toBe(harness.png);
    expect(harness.loadScreenshotLibrary).toHaveBeenCalledOnce();
    expect(harness.toCanvas).toHaveBeenCalledOnce();
    expect(harness.loadSvgImage).toHaveBeenCalledOnce();
    expect(harness.loadSvgImage.mock.calls[0]?.[0]).not.toBe(harness.svg);
    expect(harness.drawImage).toHaveBeenCalledOnce();
    expect(harness.encodePng).toHaveBeenCalledWith(harness.canvas);
  });

  it("snapshots SVG geometry and scroll coordinates before async capture", async () => {
    const harness = createHarness();
    const annotation = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    annotation.setAttribute("x", "10");
    harness.svg.append(annotation);
    let resolveLibrary:
      ((library: { toCanvas: PngHarness["toCanvas"] }) => void) | undefined;
    const libraryPromise = new Promise<{
      toCanvas: PngHarness["toCanvas"];
    }>((resolve) => {
      resolveLibrary = resolve;
    });
    harness.loadScreenshotLibrary.mockReturnValue(libraryPromise);

    const exportPromise = exportCompositedPng(
      { annotationSvg: harness.svg, page: harness.page },
      harness.dependencies,
    );
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 400,
    });
    annotation.setAttribute("x", "99");
    resolveLibrary?.({ toCanvas: harness.toCanvas });
    await exportPromise;

    const exported = harness.loadSvgImage.mock.calls[0]?.[0] as
      SVGSVGElement | undefined;
    expect(exported?.querySelector("rect")?.getAttribute("x")).toBe("10");
    expect(
      exported
        ?.querySelector('[data-export-scene="true"]')
        ?.getAttribute("transform"),
    ).toBe("translate(10 10)");
  });

  it("removes selection chrome from the standalone annotation SVG", async () => {
    const harness = createHarness();
    const annotation = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    annotation.dataset.annotationId = "rect-1";
    const selection = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    selection.dataset.sceneUi = "true";
    harness.svg.setAttribute("viewBox", "0 0 180 80");
    harness.svg.append(annotation, selection);

    await exportCompositedPng(
      { annotationSvg: harness.svg, page: harness.page },
      harness.dependencies,
    );

    const exported = harness.loadSvgImage.mock.calls[0]?.[0] as
      SVGSVGElement | undefined;
    expect(
      exported?.querySelector('[data-annotation-id="rect-1"]'),
    ).not.toBeNull();
    expect(exported?.querySelector('[data-scene-ui="true"]')).toBeNull();
    expect(exported?.getAttribute("width")).toBe("200");
    expect(exported?.getAttribute("height")).toBe("100");
    expect(exported?.getAttribute("viewBox")).toBe("0 0 200 100");
    expect(exported?.getAttribute("preserveAspectRatio")).toBe("none");
    expect(
      exported
        ?.querySelector('[data-export-scene="true"]')
        ?.getAttribute("transform"),
    ).toBe("translate(10 10)");
    expect(
      exported
        ?.querySelector('svg[data-export-source="true"]')
        ?.getAttribute("viewBox"),
    ).toBe("0 0 180 80");
  });

  it("translates viewport-rendered annotations into a full-page SVG", async () => {
    const harness = createHarness();
    const offscreen = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    offscreen.dataset.offscreen = "true";
    offscreen.setAttribute("y", "-200");
    offscreen.setAttribute("height", "20");
    harness.svg.append(offscreen);
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(harness.page, "scrollHeight", { value: 1_000 });
    harness.page.getBoundingClientRect = () =>
      ({
        bottom: 600,
        height: 1_000,
        left: 0,
        right: 200,
        top: -400,
        width: 200,
        x: 0,
        y: -400,
        toJSON: () => ({}),
      }) satisfies DOMRect;

    await exportCompositedPng(
      { annotationSvg: harness.svg, page: harness.page },
      harness.dependencies,
    );

    const exported = harness.loadSvgImage.mock.calls[0]?.[0] as
      SVGSVGElement | undefined;
    expect(exported?.getAttribute("height")).toBe("1000");
    expect(exported?.getAttribute("viewBox")).toBe("0 0 200 1000");
    expect(
      exported
        ?.querySelector('[data-export-scene="true"]')
        ?.getAttribute("transform"),
    ).toBe("translate(10 410)");
    const source = exported?.querySelector('svg[data-export-source="true"]');
    expect(source?.getAttribute("overflow")).toBe("visible");
    expect(
      source?.querySelector('[data-offscreen="true"]')?.getAttribute("y"),
    ).toBe("-200");
  });

  it("excludes the Shadow DOM overlay host from the page capture", async () => {
    const harness = createHarness(true);

    await exportCompositedPng(
      { annotationSvg: harness.svg, page: harness.page },
      harness.dependencies,
    );

    const options = harness.toCanvas.mock.calls[0]?.[1] as {
      filter: (node: Node) => boolean;
    };
    const overlayHost = harness.svg.getRootNode() as ShadowRoot;
    expect(options.filter(overlayHost.host)).toBe(false);
    expect(options.filter(document.createElement("main"))).toBe(true);
    expect(options.filter(document.createElement("img"))).toBe(true);
    expect(
      (harness.toCanvas.mock.calls[0]?.[1] as { skipFonts?: boolean })
        .skipFonts,
    ).toBe(true);
  });

  it("captures asset-bearing nodes and configures bounded, cache-first fetches", async () => {
    const harness = createHarness();
    await exportCompositedPng(
      { annotationSvg: harness.svg, page: harness.page },
      harness.dependencies,
    );

    const options = harness.toCanvas.mock.calls[0]?.[1] as {
      fetchRequestInit?: RequestInit;
      filter: (node: Node) => boolean;
      includeQueryParams?: boolean;
      includeStyleProperties: string[];
      onImageErrorHandler?: () => void;
    };
    expect(options.includeStyleProperties).toContain("background-color");
    expect(options.includeStyleProperties).toContain("background-image");
    expect(options.includeStyleProperties).not.toContain("background");
    expect(options.includeStyleProperties).not.toContain("mask");
    // Asset inlining fetches must come from cache when possible, stop
    // hanging captures, disambiguate query-string image endpoints, and
    // degrade to a blank spot instead of failing the whole capture.
    expect(options.fetchRequestInit?.cache).toBe("force-cache");
    expect(options.includeQueryParams).toBe(true);
    expect(options.onImageErrorHandler).toBeTypeOf("function");
    expect(options.onImageErrorHandler?.()).toBeUndefined();

    const remoteImage = document.createElement("img");
    remoteImage.src = "https://assets.example.com/review.png";
    const remoteStyle = document.createElement("div");
    remoteStyle.style.backgroundImage =
      'url("https://assets.example.com/review-background.png")';
    const inlineSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    const strandedSvgChild = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    const remoteVideo = document.createElement("video");
    Object.defineProperty(remoteVideo, "currentSrc", {
      value: "https://assets.example.com/review.mp4",
    });
    expect(options.filter(remoteImage)).toBe(true);
    expect(options.filter(remoteStyle)).toBe(true);
    expect(options.filter(inlineSvg)).toBe(true);
    expect(options.filter(strandedSvgChild)).toBe(false);
    expect(options.filter(remoteVideo)).toBe(false);
    expect(options.filter(document.createElement("style"))).toBe(false);
    expect(options.filter(document.createElement("iframe"))).toBe(false);
  });

  it("keeps image sources for capture inlining and clears responsive candidates", async () => {
    const harness = createHarness();
    const page = document.createElement("main");
    const remoteImage = document.createElement("img");
    remoteImage.src = "https://assets.example.com/review.png";
    remoteImage.dataset.fixture = "remote";
    const localImage = document.createElement("img");
    localImage.src = "data:image/png;base64,AA==";
    localImage.srcset = "https://assets.example.com/review-2x.png 2x";
    localImage.dataset.fixture = "local";
    page.append(remoteImage, localImage);

    await exportCompositedPng(
      { annotationSvg: harness.svg, page },
      harness.dependencies,
    );

    const capturePage = harness.toCanvas.mock.calls[0]?.[0];
    const remoteClone = capturePage?.querySelector<HTMLImageElement>(
      '[data-fixture="remote"]',
    );
    const localClone = capturePage?.querySelector<HTMLImageElement>(
      '[data-fixture="local"]',
    );
    // The rendered URL stays for the capture library to inline.
    expect(remoteClone?.getAttribute("src")).toBe(
      "https://assets.example.com/review.png",
    );
    expect(localClone?.getAttribute("src")).toBe("data:image/png;base64,AA==");
    // A leftover srcset would let the standalone rasterization pick an
    // external candidate over the inlined src.
    expect(remoteClone?.srcset ?? "").toBe("");
    expect(localClone?.srcset ?? "").toBe("");
  });

  it("rasterizes inline SVG standalone with sprite targets and styles inlined", async () => {
    const harness = createHarness();
    const sprite = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    const symbol = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "symbol",
    );
    symbol.id = "fixture-sprite-icon";
    symbol.append(
      document.createElementNS("http://www.w3.org/2000/svg", "path"),
    );
    sprite.append(symbol);
    document.body.append(sprite);
    const page = document.createElement("main");
    const logo = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    logo.getBoundingClientRect = () =>
      ({
        bottom: 28,
        height: 28,
        left: 0,
        right: 28,
        top: 0,
        width: 28,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) satisfies DOMRect;
    const shape = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    shape.style.fill = "rgb(30, 70, 215)";
    const spriteUse = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "use",
    );
    spriteUse.setAttribute("href", "#fixture-sprite-icon");
    logo.append(shape, spriteUse);
    page.append(logo);

    try {
      await exportCompositedPng(
        { annotationSvg: harness.svg, page },
        harness.dependencies,
      );
    } finally {
      sprite.remove();
    }

    const capturePage = harness.toCanvas.mock.calls[0]?.[0];
    expect(capturePage?.querySelector("svg")).toBeNull();
    const rasterized = capturePage?.querySelector<HTMLImageElement>("img");
    const src = rasterized?.getAttribute("src") ?? "";
    expect(src.startsWith("data:image/svg+xml")).toBe(true);
    const markup = decodeURIComponent(src.split(",")[1] ?? "");
    expect(markup).toContain('width="28"');
    // Sprite targets living elsewhere in the document must serialize along,
    // or `<use>` icons rasterize blank.
    expect(markup).toContain("fixture-sprite-icon");
    expect(markup).toContain("<defs>");
    // CSS-driven presentation (icon-set pattern) must be inlined or the
    // standalone serialization loses it.
    expect(markup).toContain("fill: rgb(30, 70, 215)");
  });

  it("strips modern interpolation hints from captured gradients", () => {
    // SVG-image rasterization drops gradients carrying interpolation hints;
    // real-browser retention is covered by the e2e pixel scan.
    expect(
      normalizeCaptureStyle(
        "linear-gradient(in oklab, rgb(184, 78, 0) 0%, rgb(179, 76, 0) 100%)",
      ),
    ).toBe("linear-gradient(rgb(184, 78, 0) 0%, rgb(179, 76, 0) 100%)");
    expect(
      normalizeCaptureStyle(
        "linear-gradient(to right in oklch longer hue, red, blue)",
      ),
    ).toBe("linear-gradient(to right, red, blue)");
    expect(
      normalizeCaptureStyle("radial-gradient(in srgb-linear, red, blue)"),
    ).toBe("radial-gradient(red, blue)");
    expect(normalizeCaptureStyle("rgb(184, 78, 0)")).toBe("rgb(184, 78, 0)");
    expect(
      normalizeCaptureStyle("linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))"),
    ).toBe("linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))");
  });

  it("keeps page asset references while stripping inert legacy attributes", async () => {
    const harness = createHarness();
    const page = document.createElement("main");
    page.style.backgroundImage =
      'url("https://assets.example.com/review-background.png")';
    const customElement = document.createElement("capture-probe");
    customElement.textContent = "Inert custom element";
    const legacyBackground = document.createElement("table");
    legacyBackground.setAttribute(
      "background",
      "/private/review-background.png",
    );
    page.append(customElement, legacyBackground);
    document.body.append(page);

    try {
      await exportCompositedPng(
        { annotationSvg: harness.svg, page },
        harness.dependencies,
      );
    } finally {
      page.remove();
    }

    const capturePage = harness.toCanvas.mock.calls[0]?.[0];
    expect(capturePage).not.toBe(page);
    // Referenced backgrounds ride along for the capture library to inline.
    expect(capturePage?.style.backgroundImage).toContain(
      "review-background.png",
    );
    expect(capturePage?.querySelector("capture-probe")).toBeNull();
    expect(capturePage?.textContent).toContain("Inert custom element");
    expect(
      capturePage?.querySelector("table")?.hasAttribute("background"),
    ).toBe(false);
    expect(harness.loadScreenshotLibrary).toHaveBeenCalledOnce();
  });

  it.each([
    {
      message: "Could not load the PNG screenshot library.",
      override: (harness: PngHarness, failure: Error) => {
        harness.loadScreenshotLibrary.mockRejectedValue(failure);
      },
    },
    {
      message: "Could not capture the host page for PNG export.",
      override: (harness: PngHarness, failure: Error) => {
        harness.toCanvas.mockRejectedValue(failure);
      },
    },
    {
      message: "Could not render the annotation SVG for PNG export.",
      override: (harness: PngHarness, failure: Error) => {
        harness.loadSvgImage.mockRejectedValue(failure);
      },
    },
    {
      message: "Could not encode the composited PNG.",
      override: (harness: PngHarness, failure: Error) => {
        harness.encodePng.mockRejectedValue(failure);
      },
    },
  ])("reports the $message path", async ({ message, override }) => {
    const harness = createHarness();
    const failure = new Error("fixture failure");
    override(harness, failure);

    await expect(
      exportCompositedPng(
        { annotationSvg: harness.svg, page: harness.page },
        harness.dependencies,
      ),
    ).rejects.toMatchObject({ message, cause: failure });
  });
});

function createHarness(inShadowRoot = false): PngHarness {
  const page = document.createElement("main");
  Object.defineProperties(page, {
    clientHeight: { configurable: true, value: 100 },
    clientWidth: { configurable: true, value: 200 },
    scrollHeight: { configurable: true, value: 100 },
    scrollWidth: { configurable: true, value: 200 },
  });
  page.getBoundingClientRect = () =>
    ({
      bottom: 100,
      height: 100,
      left: 0,
      right: 200,
      top: 0,
      width: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) satisfies DOMRect;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.getBoundingClientRect = () =>
    ({
      bottom: 90,
      height: 80,
      left: 10,
      right: 190,
      top: 10,
      width: 180,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    }) satisfies DOMRect;

  if (inShadowRoot) {
    document.body.append(document.createElement("div"));
    document.body.lastElementChild?.attachShadow({ mode: "open" }).append(svg);
  }

  const drawImage = vi.fn();
  const canvas = {
    getContext: vi.fn(() => ({ drawImage })),
    height: 200,
    width: 400,
  } as unknown as HTMLCanvasElement;
  const png = new Blob(["png"], { type: "image/png" });
  const toCanvas = vi.fn<ScreenshotToCanvas>().mockResolvedValue(canvas);
  const loadScreenshotLibrary = vi.fn().mockResolvedValue({ toCanvas });
  const loadSvgImage = vi
    .fn<(svg: SVGSVGElement) => Promise<CanvasImageSource>>()
    .mockResolvedValue({} as CanvasImageSource);
  const encodePng = vi
    .fn<(canvas: HTMLCanvasElement) => Promise<Blob>>()
    .mockResolvedValue(png);

  return {
    canvas,
    dependencies: { encodePng, loadScreenshotLibrary, loadSvgImage },
    drawImage,
    encodePng,
    loadScreenshotLibrary,
    loadSvgImage,
    page,
    png,
    svg,
    toCanvas,
  };
}
