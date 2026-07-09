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
});
