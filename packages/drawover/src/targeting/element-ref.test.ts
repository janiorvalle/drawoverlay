import { beforeEach, describe, expect, it } from "vitest";
import { captureElementRef } from "./element-ref.js";

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "scrollX", { configurable: true, value: 0 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

describe("element reference capture", () => {
  it("captures bounded facts, relevant attributes, and document coordinates", () => {
    document.body.innerHTML = `
      <label id="field-label" for="field">Account name</label>
      <input id="field" aria-labelledby="field-label" type="text" name="account"
        placeholder="Example" value="ignored" />
    `;
    const element = document.querySelector("input");
    if (!element) throw new Error("fixture missing");
    Object.defineProperty(window, "scrollX", { configurable: true, value: 40 });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 120,
    });
    element.getBoundingClientRect = () =>
      ({ x: 12, y: 30, left: 12, top: 30, width: 300, height: 42 }) as DOMRect;

    expect(captureElementRef(element)).toMatchObject({
      selector: { primary: "#field" },
      facts: {
        tag: "input",
        role: "textbox",
        accessibleName: "Account name",
        attributes: {
          type: "text",
          name: "account",
          placeholder: "Example",
        },
        bbox: { x: 52, y: 150, width: 300, height: 42 },
      },
    });
  });

  it("normalizes and truncates text to 120 characters", () => {
    const button = document.createElement("button");
    button.id = "long-copy";
    button.textContent = `  ${"A".repeat(70)}   ${"B".repeat(70)}  `;
    document.body.append(button);

    const reference = captureElementRef(button);

    expect(reference.facts.text).toHaveLength(120);
    expect(reference.facts.text).not.toContain("  ");
    expect(reference.facts.accessibleName).toHaveLength(141);
  });

  it("reads React fiber component and exact source metadata", () => {
    const button = document.createElement("button");
    button.id = "react-button";
    document.body.append(button);
    const CheckoutButton = (): null => null;
    Object.defineProperty(button, "__reactFiber$fixture", {
      value: {
        type: "button",
        return: {
          type: CheckoutButton,
          _debugSource: {
            fileName: "src/components/CheckoutButton.tsx",
            lineNumber: 18,
            columnNumber: 7,
          },
          return: null,
        },
      },
    });

    expect(captureElementRef(button).component).toEqual({
      framework: "react",
      name: "CheckoutButton",
      source: {
        file: "src/components/CheckoutButton.tsx",
        line: 18,
        column: 7,
      },
    });
  });

  it("reads Vue component metadata without deriving unknown fields", () => {
    const button = document.createElement("button");
    button.id = "vue-button";
    document.body.append(button);
    Object.defineProperty(button, "__vueParentComponent", {
      value: {
        type: {
          __name: "CheckoutAction",
          __file: "src/components/CheckoutAction.vue",
        },
      },
    });

    expect(captureElementRef(button).component).toEqual({
      framework: "vue",
      name: "CheckoutAction",
      source: { file: "src/components/CheckoutAction.vue" },
    });
  });

  it("silently omits framework metadata when no name is known", () => {
    const element = document.createElement("div");
    element.id = "plain";
    document.body.append(element);
    Object.defineProperty(element, "__vueParentComponent", {
      value: { type: { __file: "src/components/Unknown.vue" } },
    });

    expect(captureElementRef(element)).not.toHaveProperty("component");
  });
});
