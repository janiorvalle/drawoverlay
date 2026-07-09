import { describe, expect, it } from "vitest";
import type {
  ArrowAnnotation,
  DocumentPoint,
  RectAnnotation,
  TextAnnotation,
} from "../contracts/index.js";
import {
  reorderAnnotations,
  resizeAnnotation,
  translateAnnotation,
  updateArrowEndpoint,
  visualBounds,
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

  it("resizes in a rotated annotation frame without moving the visual anchor", () => {
    const original = { ...rect("rotated", 1), rotation: 90 };
    const originalCenter = center(original.geometry);
    const visualAnchor = rotate(
      { x: original.geometry.x, y: original.geometry.y },
      originalCenter,
      original.rotation,
    );
    const pointer = { x: 50, y: 140 };

    const resized = resizeAnnotation(original, "se", pointer);
    const resizedCenter = center(resized.geometry);
    expectPoint(
      rotate(
        { x: resized.geometry.x, y: resized.geometry.y },
        resizedCenter,
        resized.rotation,
      ),
      visualAnchor,
    );
    expectPoint(
      rotate(
        {
          x: resized.geometry.x + resized.geometry.width,
          y: resized.geometry.y + resized.geometry.height,
        },
        resizedCenter,
        resized.rotation,
      ),
      pointer,
    );
  });

  it("scales freestanding text when its geometry is resized", () => {
    const text: TextAnnotation = {
      id: "text",
      type: "text",
      geometry: { x: 0, y: 0, width: 100, height: 28 },
      z: 1,
      rotation: 0,
      text: "Scale me",
      color: "#000000",
      fontSize: 20,
      align: "left",
    };

    const resized = resizeAnnotation(text, "se", { x: 150, y: 56 });
    expect(resized.type).toBe("text");
    if (resized.type !== "text") throw new Error("Expected text.");
    expect(resized.fontSize).toBe(30);
    expect(resized.geometry).toMatchObject({ width: 150, height: 42 });

    const shrunk = resizeAnnotation(text, "se", { x: 1, y: 1 });
    if (shrunk.type !== "text") throw new Error("Expected text.");
    expect(shrunk.fontSize).toBe(8);
    expect(shrunk.geometry.width / text.geometry.width).toBeCloseTo(0.4);
    expect(shrunk.geometry.height / text.geometry.height).toBeCloseTo(0.4);
  });

  it("returns document bounds for a rotated annotation", () => {
    const bounds = visualBounds({ ...rect("rotated-bounds", 1), rotation: 90 });
    expect(bounds.x).toBeCloseTo(30);
    expect(bounds.y).toBeCloseTo(0);
    expect(bounds.width).toBeCloseTo(60);
    expect(bounds.height).toBeCloseTo(100);
  });

  it("edits a rotated arrow endpoint in the visible coordinate frame", () => {
    const arrow: ArrowAnnotation = {
      id: "rotated-arrow",
      type: "arrow",
      geometry: { x: 0, y: 0, width: 100, height: 0 },
      z: 1,
      rotation: 90,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      color: "#000000",
      strokeWidth: 2,
    };
    const visualStart = rotate(arrow.start, center(arrow.geometry), 90);
    const visualEnd = { x: 80, y: 80 };

    const updated = updateArrowEndpoint(arrow, "end", visualEnd);
    const updatedCenter = center(updated.geometry);
    expectPoint(rotate(updated.start, updatedCenter, 90), visualStart);
    expectPoint(rotate(updated.end, updatedCenter, 90), visualEnd);
  });

  it("moves a multi-selection through each z-order operation", () => {
    const annotations = [rect("one", 1), rect("two", 2), rect("three", 3)];
    const selected = new Set(["one"]);
    const forward = reorderAnnotations(annotations, selected, "forward");
    const front = reorderAnnotations(annotations, selected, "front");

    expect(forward.map(({ id }) => id)).toEqual(["one", "two", "three"]);
    expect(front.map(({ id }) => id)).toEqual(["one", "two", "three"]);
    expect(stackIds(forward)).toEqual(["two", "one", "three"]);
    expect(stackIds(front)).toEqual(["two", "three", "one"]);
  });
});

function center(rectangle: RectAnnotation["geometry"]): DocumentPoint {
  return {
    x: rectangle.x + rectangle.width / 2,
    y: rectangle.y + rectangle.height / 2,
  };
}

function rotate(
  point: DocumentPoint,
  origin: DocumentPoint,
  degrees: number,
): DocumentPoint {
  const radians = (degrees * Math.PI) / 180;
  const x = point.x - origin.x;
  const y = point.y - origin.y;
  return {
    x: origin.x + x * Math.cos(radians) - y * Math.sin(radians),
    y: origin.y + x * Math.sin(radians) + y * Math.cos(radians),
  };
}

function expectPoint(actual: DocumentPoint, expected: DocumentPoint): void {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
}

function stackIds(annotations: readonly { id: string; z: number }[]): string[] {
  return [...annotations]
    .sort((left, right) => left.z - right.z)
    .map(({ id }) => id);
}
