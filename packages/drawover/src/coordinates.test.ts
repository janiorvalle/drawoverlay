import { describe, expect, it } from "vitest";
import {
  documentRectToViewport,
  documentToViewport,
  viewportRectToDocument,
  viewportToDocument,
} from "./coordinates.js";

const scroll = { x: 40, y: 120 };

describe("coordinate conversion seam", () => {
  it("round-trips points through document coordinates", () => {
    const viewport = { x: 12, y: 30 };
    expect(
      documentToViewport(viewportToDocument(viewport, scroll), scroll),
    ).toEqual(viewport);
  });

  it("preserves dimensions while converting rectangles", () => {
    const viewport = { x: 12, y: 30, width: 400, height: 80 };
    expect(
      documentRectToViewport(viewportRectToDocument(viewport, scroll), scroll),
    ).toEqual(viewport);
  });
});
