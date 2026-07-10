import { describe, expect, it } from "vitest";
import type { Serializer } from "./serializer.js";
import {
  section5Expected,
  section5PageContext,
  section5Scene,
} from "./fixtures/section5.fixture.js";

/** Reusable executable spec for the Phase 1 serializer implementation. */
export function expectSection5SerializerContract(serializer: Serializer): void {
  expect(serializer(section5Scene, section5PageContext)).toEqual(
    section5Expected,
  );
}

describe("section 5 serializer contract fixtures", () => {
  it("freeze the normative markdown shape", () => {
    expect(section5Expected.markdown).toMatchSnapshot();
  });

  it("freeze versioned JSON that mirrors the same scene", () => {
    expect(JSON.parse(section5Expected.json)).toEqual({
      drawoverVersion: 1,
      page: section5PageContext,
      annotations: section5Scene.annotations,
    });
    expect(section5Expected.json).toMatchSnapshot();
  });

  it("covers the annotation discriminators used by the section 5 fixture", () => {
    const types = new Set(section5Scene.annotations.map(({ type }) => type));
    expect(types).toEqual(new Set(["element-pin", "rect", "text"]));
  });
});
