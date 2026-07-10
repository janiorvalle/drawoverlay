import { beforeEach, describe, expect, it } from "vitest";
import type { SceneSnapshot } from "../contracts/index.js";
import { SceneRenderer } from "./renderer.js";

describe("SVG scene renderer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "scrollX", { configurable: true, value: 40 });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 120,
    });
  });

  it("re-anchors an element pin from its live selector bounds", () => {
    const target = document.createElement("button");
    target.id = "live-target";
    target.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 200,
        width: 180,
        height: 44,
        top: 200,
        right: 280,
        bottom: 244,
        left: 100,
        toJSON: () => ({}),
      }) satisfies DOMRect;
    document.body.append(target);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const snapshot: SceneSnapshot = {
      version: 1,
      annotations: [
        {
          id: "pin",
          type: "element-pin",
          geometry: { x: 10, y: 20, width: 26, height: 26 },
          z: 1,
          rotation: 0,
          comment: "Anchored",
          element: {
            selector: { primary: "#live-target", fallbacks: [] },
            facts: {
              tag: "button",
              attributes: {},
              bbox: { x: 10, y: 20, width: 30, height: 40 },
            },
          },
          elementOffset: { x: 167, y: -13 },
        },
      ],
    };

    new SceneRenderer(svg).render(snapshot, { selectedIds: new Set() });

    const badge = svg.querySelector('[data-annotation-id="pin"] circle');
    expect(badge?.getAttribute("cx")).toBe("280");
    expect(badge?.getAttribute("cy")).toBe("200");
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
    expect(
      svg
        .querySelector('[data-annotation-id="rect"] text')
        ?.getAttribute("font-family"),
    ).toContain("system-ui");

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
    expect(text?.getAttribute("font-family")).toContain("system-ui");
    expect(text?.getAttribute("text-anchor")).toBe("end");

    const image = svg.querySelector('[data-annotation-id="image"] image');
    expect(image?.getAttribute("href")).toBe("data:image/png;base64,AA==");
    expect(image?.getAttribute("opacity")).toBe("0.75");

    expect(
      svg
        .querySelector('[data-annotation-id="pin"] circle')
        ?.getAttribute("fill"),
    ).toBe("#e5484d");
    expect(svg.querySelectorAll('[data-scene-ui="true"]')).toHaveLength(1);
    expect(svg.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("frames a multi-selection using rotated visual bounds", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const snapshot: SceneSnapshot = {
      version: 1,
      annotations: [
        {
          id: "rotated",
          type: "rect",
          geometry: { x: 100, y: 180, width: 100, height: 20 },
          z: 1,
          rotation: 90,
          stroke: "#e5484d",
          fill: "transparent",
          strokeWidth: 2,
        },
        {
          id: "plain",
          type: "rect",
          geometry: { x: 300, y: 200, width: 20, height: 20 },
          z: 2,
          rotation: 0,
          stroke: "#1769e0",
          fill: "transparent",
          strokeWidth: 2,
        },
      ],
    };

    new SceneRenderer(svg).render(snapshot, {
      selectedIds: new Set(["rotated", "plain"]),
    });

    const box = svg.querySelector(".group-selection .selection-box");
    expect(box?.getAttribute("x")).toBe("100");
    expect(box?.getAttribute("y")).toBe("20");
    expect(box?.getAttribute("width")).toBe("180");
    expect(box?.getAttribute("height")).toBe("100");
  });

  it("keeps badge numbers in scene order when z-order and notes differ", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const snapshot: SceneSnapshot = {
      version: 1,
      annotations: [
        {
          id: "pin",
          type: "element-pin",
          geometry: { x: 200, y: 200, width: 26, height: 26 },
          z: 30,
          rotation: 0,
          comment: "First in scene order",
          element: {
            selector: { primary: "#target", fallbacks: [] },
            facts: {
              tag: "button",
              attributes: {},
              bbox: { x: 180, y: 180, width: 80, height: 30 },
            },
          },
          elementOffset: { x: 20, y: 20 },
        },
        {
          id: "note",
          type: "note",
          geometry: { x: 0, y: 0, width: 0, height: 0 },
          z: 0,
          rotation: 0,
          text: "Second in scene order",
        },
        {
          id: "rect",
          type: "rect",
          geometry: { x: 100, y: 160, width: 80, height: 40 },
          z: 10,
          rotation: 0,
          stroke: "#e5484d",
          fill: "transparent",
          strokeWidth: 2,
        },
      ],
    };

    new SceneRenderer(svg).render(snapshot, { selectedIds: new Set() });

    const rendered = svg.querySelectorAll<SVGGElement>("[data-annotation-id]");
    expect([...rendered].map(({ dataset }) => dataset.annotationId)).toEqual([
      "rect",
      "pin",
    ]);
    expect(
      svg
        .querySelector('[data-annotation-id="pin"]')
        ?.getAttribute("data-annotation-number"),
    ).toBe("1");
    expect(
      svg
        .querySelector('[data-annotation-id="rect"]')
        ?.getAttribute("data-annotation-number"),
    ).toBe("3");
    expect(
      svg.querySelector(
        '[data-annotation-id="pin"] [data-annotation-badge-label]',
      )?.textContent,
    ).toBe("1");
    expect(
      svg.querySelector(
        '[data-annotation-id="rect"] [data-annotation-badge-label]',
      )?.textContent,
    ).toBe("3");
  });
});
