import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PngExportDependencies } from "./png.js";
import { exportCompositedPng } from "./png.js";

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
  toCanvas: ReturnType<typeof vi.fn>;
}

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
    expect(options.filter(document.createElement("img"))).toBe(false);
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
  const page = {
    clientHeight: 100,
    clientWidth: 200,
    getBoundingClientRect: () =>
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
      }) satisfies DOMRect,
    scrollHeight: 100,
    scrollWidth: 200,
  } as HTMLElement;
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
  const toCanvas = vi.fn().mockResolvedValue(canvas);
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
