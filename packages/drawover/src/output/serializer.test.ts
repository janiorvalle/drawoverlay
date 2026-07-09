import { describe, expect, it } from "vitest";
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
      '## General notes\n- "Keep the \\"quiet\\" treatment\\non narrow screens"',
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
