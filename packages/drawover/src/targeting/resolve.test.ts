import { beforeEach, describe, expect, it } from "vitest";
import type { ElementRef } from "../contracts/index.js";
import { resolveElement, resolveElementDocumentRect } from "./resolve.js";

const reference: ElementRef = {
  selector: { primary: "[invalid", fallbacks: ["#target"] },
  facts: {
    tag: "button",
    attributes: {},
    bbox: { x: 10, y: 20, width: 30, height: 40 },
  },
};

beforeEach(() => {
  document.body.innerHTML = '<button id="target">Target</button>';
  Object.defineProperty(window, "scrollX", { configurable: true, value: 5 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 7 });
});

describe("element reference resolution", () => {
  it("tries selector fallbacks and returns current document bounds", () => {
    const target = document.getElementById("target");
    if (!target) throw new Error("Target fixture was not mounted.");
    target.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 200,
        width: 80,
        height: 32,
        top: 200,
        right: 180,
        bottom: 232,
        left: 100,
        toJSON: () => ({}),
      }) satisfies DOMRect;

    expect(resolveElement(reference)).toBe(target);
    expect(resolveElementDocumentRect(reference)).toEqual({
      x: 105,
      y: 207,
      width: 80,
      height: 32,
    });
  });

  it("uses captured bounds when the element no longer resolves", () => {
    document.body.innerHTML = "";
    expect(resolveElementDocumentRect(reference)).toEqual(reference.facts.bbox);
  });
});
