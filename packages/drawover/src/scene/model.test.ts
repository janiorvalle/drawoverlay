import { describe, expect, it } from "vitest";
import type { ArrowAnnotation, RectAnnotation } from "../contracts/index.js";
import {
  reorderAnnotations,
  resizeAnnotation,
  translateAnnotation,
  updateArrowEndpoint,
} from "./model.js";

const rect = (id: string, z: number): RectAnnotation => ({
  id,
  type: "rect",
  geometry: { x: 10, y: 20, width: 100, height: 60 },
  z,
  rotation: 0,
  stroke: "#000000",
  fill: "transparent",
  strokeWidth: 2,
});

describe("scene model operations", () => {
  it("translates arrows in document coordinates and edits endpoints", () => {
    const arrow: ArrowAnnotation = {
      id: "arrow",
      type: "arrow",
      geometry: { x: 10, y: 20, width: 90, height: 40 },
      z: 1,
      rotation: 0,
      start: { x: 10, y: 20 },
      end: { x: 100, y: 60 },
      color: "#000000",
      strokeWidth: 2,
    };

    const moved = translateAnnotation(arrow, { x: 5, y: -10 });
    expect(moved).toMatchObject({
      geometry: { x: 15, y: 10 },
      start: { x: 15, y: 10 },
      end: { x: 105, y: 50 },
    });
    if (moved.type !== "arrow") throw new Error("Expected an arrow.");
    expect(updateArrowEndpoint(moved, "end", { x: 40, y: 80 })).toMatchObject({
      geometry: { x: 15, y: 10, width: 25, height: 70 },
      end: { x: 40, y: 80 },
    });
  });

  it("resizes from a corner and preserves the opposite corner", () => {
    const resized = resizeAnnotation(rect("one", 1), "se", { x: 180, y: 140 });
    expect(resized.geometry).toEqual({ x: 10, y: 20, width: 170, height: 120 });
  });

  it("moves a multi-selection through each z-order operation", () => {
    const annotations = [rect("one", 1), rect("two", 2), rect("three", 3)];
    const selected = new Set(["one"]);
    expect(
      reorderAnnotations(annotations, selected, "forward").map(({ id }) => id),
    ).toEqual(["two", "one", "three"]);
    expect(
      reorderAnnotations(annotations, selected, "front").map(({ id }) => id),
    ).toEqual(["two", "three", "one"]);
  });
});
