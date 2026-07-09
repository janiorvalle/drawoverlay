import type { PageContext, SceneSnapshot } from "drawover";

interface OutputApi {
  copyJson: typeof import("drawover").copyJson;
  copyMarkdown: typeof import("drawover").copyMarkdown;
  exportCompositedPng: typeof import("drawover").exportCompositedPng;
  viewportRectToDocument: typeof import("drawover").viewportRectToDocument;
}

/** Query-only WS-C harness. It deliberately does not wire the shell Copy button. */
export function installOutputFixture(api: OutputApi): void {
  const submit = document.querySelector<HTMLButtonElement>(
    '[data-testid="checkout-submit"]',
  );
  const host = document.querySelector<HTMLElement>("#drawover-root");
  const annotationSvg = host?.shadowRoot?.querySelector<SVGSVGElement>(
    '[data-layer="scene"]',
  );
  if (!submit || !annotationSvg) {
    throw new Error(
      "The output fixture could not find its page or scene targets.",
    );
  }

  const scene = createFixtureScene(submit, api.viewportRectToDocument);
  renderFixtureAnnotations(annotationSvg);
  const fixture = renderFixturePanel();
  const page = document.querySelector<HTMLElement>(".page-shell");
  if (!page)
    throw new Error("The output fixture could not find the page shell.");
  const pageContext = (): PageContext => ({
    url: window.location.href,
    pathname: window.location.pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    capturedAt: new Date().toISOString(),
  });

  fixture.copyMarkdown.addEventListener("click", () => {
    void run(fixture, async () => {
      await api.copyMarkdown(scene, pageContext());
      fixture.status.textContent = "Markdown copied";
    });
  });
  fixture.copyJson.addEventListener("click", () => {
    void run(fixture, async () => {
      await api.copyJson(scene, pageContext());
      fixture.status.textContent = "JSON copied";
    });
  });
  fixture.exportPng.addEventListener("click", () => {
    void run(fixture, async () => {
      const blob = await api.exportCompositedPng({
        annotationSvg,
        backgroundColor: "#eef1f5",
        page,
      });
      const previous = fixture.preview.dataset.objectUrl;
      if (previous) URL.revokeObjectURL(previous);
      const url = URL.createObjectURL(blob);
      fixture.preview.dataset.objectUrl = url;
      fixture.preview.src = url;
      fixture.download.href = url;
      fixture.download.hidden = false;
      fixture.status.textContent = `PNG ready (${String(blob.size)} bytes)`;
    });
  });
}

function createFixtureScene(
  submit: HTMLButtonElement,
  toDocument: OutputApi["viewportRectToDocument"],
): SceneSnapshot {
  const bbox = toDocument(submit.getBoundingClientRect());
  return {
    version: 1,
    annotations: [
      {
        id: "fixture-pin",
        type: "element-pin",
        geometry: {
          x: bbox.x + bbox.width - 12,
          y: bbox.y + 12,
          width: 24,
          height: 24,
        },
        z: 30,
        rotation: 0,
        comment: "This button should be disabled until the form validates",
        elementOffset: { x: bbox.width - 12, y: 12 },
        spatialDescription: 'bottom of <form id="checkout">',
        element: {
          selector: {
            primary: '[data-testid="checkout-submit"]',
            fallbacks: ['#checkout button[type="submit"]'],
          },
          facts: {
            tag: "button",
            role: "button",
            accessibleName: "Place order",
            text: "Place order",
            attributes: { type: "submit" },
            bbox,
          },
        },
      },
      {
        id: "fixture-rect",
        type: "rect",
        geometry: { x: 24, y: 76, width: 520, height: 60 },
        z: 10,
        rotation: 0,
        stroke: "#c62828",
        fill: "#fee2e2",
        strokeWidth: 3,
        label: "Proposed checkout alert",
        labelAlign: "left",
        spatialDescription: 'Full-width alert above <form id="checkout">',
      },
      {
        id: "fixture-text",
        type: "text",
        geometry: { x: 48, y: 92, width: 320, height: 28 },
        z: 20,
        rotation: 0,
        text: "Review payment details",
        color: "#991b1b",
        fontSize: 18,
        align: "left",
        spatialDescription: "Inside drawing [2], left-aligned",
        intent: "Use as the proposed alert heading",
      },
      {
        id: "fixture-note",
        type: "note",
        geometry: { x: 0, y: 0, width: 0, height: 0 },
        z: 0,
        rotation: 0,
        text: "Overall spacing feels cramped on mobile widths",
      },
    ],
  };
}

function renderFixtureAnnotations(svg: SVGSVGElement): void {
  svg.setAttribute(
    "viewBox",
    `0 0 ${String(window.innerWidth)} ${String(window.innerHeight)}`,
  );
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.replaceChildren(
    svgElement("rect", {
      x: "24",
      y: "76",
      width: "520",
      height: "60",
      rx: "5",
      fill: "#fee2e2",
      "fill-opacity": "0.94",
      stroke: "#c62828",
      "stroke-width": "3",
    }),
    svgElement(
      "text",
      {
        x: "48",
        y: "112",
        fill: "#991b1b",
        "font-family": "system-ui, sans-serif",
        "font-size": "18",
        "font-weight": "700",
      },
      "Review payment details",
    ),
    badge(1, window.innerWidth - 176, window.innerHeight - 98),
    badge(2, 24, 76),
    badge(3, 374, 92),
  );
}

function badge(number: number, x: number, y: number): SVGGElement {
  const group = svgElement("g", {
    transform: `translate(${String(x)} ${String(y)})`,
  });
  group.dataset.badge = String(number);
  group.append(
    svgElement("circle", {
      cx: "0",
      cy: "0",
      r: "13",
      fill: "#c62828",
      stroke: "#ffffff",
      "stroke-width": "2",
    }),
    svgElement(
      "text",
      {
        x: "0",
        y: "5",
        fill: "#ffffff",
        "font-family": "system-ui, sans-serif",
        "font-size": "13",
        "font-weight": "800",
        "text-anchor": "middle",
      },
      String(number),
    ),
  );
  return group;
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Readonly<Record<string, string>>,
  text?: string,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderFixturePanel(): {
  copyJson: HTMLButtonElement;
  copyMarkdown: HTMLButtonElement;
  download: HTMLAnchorElement;
  exportPng: HTMLButtonElement;
  preview: HTMLImageElement;
  status: HTMLElement;
} {
  const panel = document.createElement("section");
  panel.className = "output-fixture";
  panel.setAttribute("aria-label", "Output workstream fixture");
  panel.innerHTML = `
    <h2>Output fixture</h2>
    <div class="output-actions">
      <button type="button" data-output="markdown">Copy Markdown</button>
      <button type="button" data-output="json">Copy JSON</button>
      <button type="button" data-output="png">Export PNG</button>
      <a download="drawover-output-fixture.png" hidden>Open PNG</a>
    </div>
    <p class="output-status" role="status">Ready</p>
    <label for="output-pasteback">Paste copied output</label>
    <textarea id="output-pasteback" rows="10" spellcheck="false"></textarea>
    <img class="output-preview" alt="Composited PNG preview" />
  `;
  document.querySelector(".page-shell")?.after(panel);

  const query = (selector: string): Element => {
    const element = panel.querySelector(selector);
    if (!element)
      throw new Error(`Missing output fixture element: ${selector}`);
    return element;
  };
  return {
    copyJson: query('[data-output="json"]') as HTMLButtonElement,
    copyMarkdown: query('[data-output="markdown"]') as HTMLButtonElement,
    download: query("a[download]") as HTMLAnchorElement,
    exportPng: query('[data-output="png"]') as HTMLButtonElement,
    preview: query(".output-preview") as HTMLImageElement,
    status: query(".output-status") as HTMLElement,
  };
}

async function run(
  fixture: { status: HTMLElement },
  operation: () => Promise<void>,
): Promise<void> {
  fixture.status.textContent = "Working";
  try {
    await operation();
  } catch (error) {
    if (error instanceof Error) {
      const cause =
        error.cause instanceof Error ? ` ${error.cause.message}` : "";
      fixture.status.textContent = `${error.message}${cause}`;
    } else {
      fixture.status.textContent = "Output action failed";
    }
  }
}
