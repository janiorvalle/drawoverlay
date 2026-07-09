import { beforeEach, describe, expect, it } from "vitest";
import type { SceneSnapshot } from "../contracts/index.js";
import { SceneRenderer } from "./renderer.js";

describe("SVG scene renderer", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollX", { configurable: true, value: 40 });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 120,
    });
  });

  it("renders model geometry from document coordinates with selection handles", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const snapshot: SceneSnapshot = {
      version: 1,
      annotations: [
        {
          id: "rect",
          type: "rect",
          geometry: { x: 90, y: 180, width: 160, height: 80 },
          z: 1,
          rotation: 30,
          stroke: "#e5484d",
          fill: "#e5484d22",
          strokeWidth: 3,
          label: "Header",
        },
      ],
    };

    new SceneRenderer(svg).render(snapshot, { selectedIds: new Set(["rect"]) });

    const node = svg.querySelector<SVGGElement>('[data-annotation-id="rect"]');
    const shape = node?.querySelector("rect");
    expect(shape?.getAttribute("x")).toBe("50");
    expect(shape?.getAttribute("y")).toBe("60");
    expect(node?.getAttribute("transform")).toContain("rotate(30");
    expect(node?.querySelector("text")?.textContent).toBe("Header");
    expect(svg.querySelectorAll("[data-handle]")).toHaveLength(5);
  });

  it("uses inline presentation attributes for standalone SVG export", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const snapshot: SceneSnapshot = {
      version: 1,
      annotations: [
        {
          id: "rect",
          type: "rect",
          geometry: { x: 50, y: 130, width: 100, height: 60 },
          z: 1,
          rotation: 0,
          stroke: "#e5484d",
          fill: "#e5484d22",
          strokeWidth: 3,
          label: "Header",
        },
        {
          id: "arrow",
          type: "arrow",
          geometry: { x: 170, y: 140, width: 80, height: 50 },
          z: 2,
          rotation: 0,
          start: { x: 170, y: 140 },
          end: { x: 250, y: 190 },
          color: "#1769e0",
          strokeWidth: 4,
        },
        {
          id: "text",
          type: "text",
          geometry: { x: 270, y: 140, width: 120, height: 32 },
          z: 3,
          rotation: 0,
          text: "Log out",
          color: "#111111",
          fontSize: 18,
          align: "right",
        },
        {
          id: "image",
          type: "image",
          geometry: { x: 410, y: 140, width: 80, height: 60 },
          z: 4,
          rotation: 0,
          dataUrl: "data:image/png;base64,AA==",
          alt: "Reference",
          opacity: 0.75,
        },
        {
          id: "pin",
          type: "element-pin",
          geometry: { x: 510, y: 140, width: 24, height: 24 },
          z: 5,
          rotation: 0,
          comment: "Adjust this",
          element: {
            selector: { primary: "#target", fallbacks: [] },
            facts: {
              tag: "button",
              attributes: {},
              bbox: { x: 500, y: 130, width: 100, height: 40 },
            },
          },
          elementOffset: { x: 10, y: 10 },
        },
      ],
    };

    new SceneRenderer(svg).render(snapshot, { selectedIds: new Set() });

    const rect = svg.querySelector('[data-annotation-id="rect"] rect');
    expect(rect?.getAttribute("fill")).toBe("#e5484d22");
    expect(rect?.getAttribute("stroke")).toBe("#e5484d");
    expect(rect?.getAttribute("stroke-width")).toBe("3");
    expect(
      svg
        .querySelector('[data-annotation-id="rect"] text')
        ?.getAttribute("font-weight"),
    ).toBe("700");

    const arrow = svg.querySelectorAll('[data-annotation-id="arrow"] line')[1];
    expect(arrow?.getAttribute("stroke")).toBe("#1769e0");
    expect(arrow?.getAttribute("stroke-width")).toBe("4");
    expect(
      svg
        .querySelector('[data-annotation-id="arrow"] polygon')
        ?.getAttribute("fill"),
    ).toBe("#1769e0");

    const text = svg.querySelector('[data-annotation-id="text"] text');
    expect(text?.getAttribute("fill")).toBe("#111111");
    expect(text?.getAttribute("font-size")).toBe("18");
    expect(text?.getAttribute("text-anchor")).toBe("end");

    const image = svg.querySelector('[data-annotation-id="image"] image');
    expect(image?.getAttribute("href")).toBe("data:image/png;base64,AA==");
    expect(image?.getAttribute("opacity")).toBe("0.75");

    expect(
      svg
        .querySelector('[data-annotation-id="pin"] circle')
        ?.getAttribute("fill"),
    ).toBe("#e5484d");
    expect(svg.querySelectorAll("[style]")).toHaveLength(0);
  });
});
