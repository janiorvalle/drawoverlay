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

    expect(markdown.indexOf("### [3]")).toBeLessThan(
      markdown.indexOf("### [2]"),
    );
    expect(markdown).toContain(
      '## General notes\n- [1] "Keep the \\"quiet\\" treatment\\non narrow screens"',
    );
    expect(markdown).not.toContain("### [1]");
  });

  it("places named spatial narration before raw drawing coordinates", () => {
    const { markdown } = serializeReview(
      allAnnotationsScene,
      allAnnotationsPageContext,
    );
    const image = markdown.slice(
      markdown.indexOf('### [2] Image: "Account'),
      markdown.indexOf("### [4] Arrow"),
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

  it("omits unavailable component and source metadata instead of guessing", () => {
    const { markdown } = serializeReview(
      allAnnotationsScene,
      allAnnotationsPageContext,
    );
    const pin = markdown.slice(
      markdown.indexOf("### [3]"),
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
