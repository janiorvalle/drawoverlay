import { afterEach, describe, expect, it } from "vitest";
import type { SceneSnapshot } from "../contracts/index.js";
import {
  section5Expected,
  section5PageContext,
  section5Scene,
} from "../contracts/fixtures/section5.fixture.js";
import {
  allAnnotationsPageContext,
  allAnnotationsScene,
} from "./fixtures/all-annotations.fixture.js";
import { serializeReview } from "./serializer.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("output serializer", () => {
  it("implements the frozen section 5 serializer contract exactly", () => {
    expect(serializeReview(section5Scene, section5PageContext)).toEqual(
      section5Expected,
    );
  });

  it("snapshots every annotation discriminator and page context", () => {
    expect(
      serializeReview(allAnnotationsScene, allAnnotationsPageContext).markdown,
    ).toMatchSnapshot();
  });

  it("preserves scene order for badge numbers without sorting by z", () => {
    const { markdown } = serializeReview(
      allAnnotationsScene,
      allAnnotationsPageContext,
    );

    // The pin ([2] in scene order) prints in the element-comments section
    // before drawing [1], proving numbering never re-sorts by z or section.
    expect(markdown.indexOf("### [2]")).toBeLessThan(
      markdown.indexOf("### [1]"),
    );
  });

  it("places named spatial narration before raw drawing coordinates", () => {
    const { markdown } = serializeReview(
      allAnnotationsScene,
      allAnnotationsPageContext,
    );
    const image = markdown.slice(
      markdown.indexOf('### [1] Image: "Account'),
      markdown.indexOf("### [3] Arrow"),
    );

    expect(image.indexOf("Below <nav>")).toBeLessThan(
      image.indexOf("Doc coords:"),
    );
  });

  it("derives missing spatial narration from a nearby named live element", () => {
    const main = document.createElement("main");
    main.id = "content";
    main.getBoundingClientRect = () =>
      ({
        bottom: 500,
        height: 300,
        left: 100,
        right: 900,
        top: 200,
        width: 800,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      }) satisfies DOMRect;
    document.body.append(main);
    const scene = {
      version: 1,
      annotations: [
        {
          id: "proposed-banner",
          type: "rect",
          geometry: { x: 100, y: 100, width: 800, height: 64 },
          z: 1,
          rotation: 0,
          stroke: "#2563eb",
          fill: "#dbeafe",
          strokeWidth: 2,
        },
      ],
    } as const satisfies SceneSnapshot;

    const { markdown } = serializeReview(scene, allAnnotationsPageContext);

    expect(markdown).toContain(
      '- Above <main id="content">\n- Doc coords: 100,100 → 900,164',
    );
  });

  it("never narrates against page-scale mounts and falls back to page region", () => {
    // SPA archetype: everything lives inside a #root that spans the page.
    const rectFor = (rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) =>
      (() =>
        ({
          bottom: rect.y + rect.height,
          height: rect.height,
          left: rect.x,
          right: rect.x + rect.width,
          top: rect.y,
          width: rect.width,
          x: rect.x,
          y: rect.y,
          toJSON: () => ({}),
        }) satisfies DOMRect) as Element["getBoundingClientRect"];
    const root = document.createElement("div");
    root.id = "root";
    root.getBoundingClientRect = rectFor({
      x: 0,
      y: 0,
      width: 1024,
      height: 3000,
    });
    document.body.append(root);
    Object.defineProperty(document.documentElement, "scrollWidth", {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 3000,
    });

    const scene = {
      version: 1,
      annotations: [
        {
          id: "floating-arrow",
          type: "arrow",
          geometry: { x: 400, y: 1400, width: 200, height: 100 },
          z: 1,
          rotation: 0,
          start: { x: 400, y: 1400 },
          end: { x: 600, y: 1500 },
          color: "#2563eb",
          strokeWidth: 2,
        },
      ],
    } as const satisfies SceneSnapshot;

    const { markdown } = serializeReview(scene, allAnnotationsPageContext);

    expect(markdown).not.toContain('<div id="root">');
    expect(markdown).toContain("In the center of the page, about 48% down");
  });

  it("relates a drawing to the sibling drawing that contains it", () => {
    const scene = {
      version: 1,
      annotations: [
        {
          id: "frame",
          type: "rect",
          geometry: { x: 100, y: 100, width: 400, height: 300 },
          z: 1,
          rotation: 0,
          stroke: "#2563eb",
          fill: "#dbeafe",
          strokeWidth: 2,
        },
        {
          id: "caption",
          type: "text",
          geometry: { x: 150, y: 150, width: 120, height: 24 },
          z: 2,
          rotation: 0,
          text: "hey!",
          color: "#111827",
          fontSize: 16,
          align: "left",
        },
      ],
    } as const satisfies SceneSnapshot;

    const { markdown } = serializeReview(scene, allAnnotationsPageContext);

    expect(markdown).toContain(
      '### [2] Text: "hey!"\n- Inside drawing [1]\n- Doc coords: 150,150 → 270,174',
    );
  });

  it("rounds coordinates to whole pixels", () => {
    const scene = {
      version: 1,
      annotations: [
        {
          id: "precise",
          type: "rect",
          geometry: {
            x: 776.86328125,
            y: 566.35546875,
            width: 261.5234375,
            height: 219.7734375,
          },
          z: 1,
          rotation: 0,
          stroke: "#2563eb",
          fill: "#dbeafe",
          strokeWidth: 2,
          spatialDescription: "test placement",
        },
      ],
    } as const satisfies SceneSnapshot;

    const { markdown } = serializeReview(scene, allAnnotationsPageContext);

    expect(markdown).toContain("- Doc coords: 777,566 → 1038,786");
    expect(markdown).not.toContain("## General notes");
  });

  it("omits unavailable component and source metadata instead of guessing", () => {
    const { markdown } = serializeReview(
      allAnnotationsScene,
      allAnnotationsPageContext,
    );
    const pin = markdown.slice(
      markdown.indexOf("### [2]"),
      markdown.indexOf("## Drawings"),
    );

    expect(pin).not.toContain("Component:");
    expect(pin).not.toContain("Source:");
    expect(pin).toContain('<button type="submit" name="save\\"profile">');
    expect(pin).toContain('"Save draft"');
  });

  it("keeps JSON in exact parity with the versioned scene and page", () => {
    const { json } = serializeReview(
      allAnnotationsScene,
      allAnnotationsPageContext,
    );

    expect(JSON.parse(json)).toEqual({
      drawoverVersion: 1,
      page: allAnnotationsPageContext,
      annotations: allAnnotationsScene.annotations,
    });
    expect(json).toMatchSnapshot();
  });
});
