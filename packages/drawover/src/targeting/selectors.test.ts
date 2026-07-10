import { beforeEach, describe, expect, it } from "vitest";
import { createSelectorChain, isGeneratedClassName } from "./selectors.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("selector engine", () => {
  it("orders unique testid, id, stable path, and structural fallbacks", () => {
    document.body.innerHTML = `
      <main>
        <button data-testid="save-button" id="save" class="action primary">Save</button>
      </main>
    `;
    const element = document.querySelector("button");
    if (!element) throw new Error("fixture missing");

    const selector = createSelectorChain(element);

    expect(selector.primary).toBe('[data-testid="save-button"]');
    expect(selector.fallbacks[0]).toBe("#save");
    expect(selector.fallbacks).toContain("button.action.primary");
    for (const candidate of [selector.primary, ...selector.fallbacks]) {
      expect(document.querySelectorAll(candidate)).toHaveLength(1);
      expect(document.querySelector(candidate)).toBe(element);
    }
  });

  it("prefers a unique aria-label over utility-class stable paths", () => {
    // Tailwind SPA archetype: no testid/id, ambiguous tag, utility classes.
    document.body.innerHTML = `
      <nav aria-label="Main navigation" class="flex h-20">
        <nav aria-label="User menu" class="flex h-10"></nav>
      </nav>
    `;
    const element = document.querySelector('[aria-label="Main navigation"]');
    if (!element) throw new Error("fixture missing");

    const selector = createSelectorChain(element);

    expect(selector.primary).toBe('nav[aria-label="Main navigation"]');
    expect(document.querySelector(selector.primary)).toBe(element);
  });

  it("skips duplicate preferred attributes and finds a unique stable path", () => {
    document.body.innerHTML = `
      <section class="billing"><button data-testid="action">Pay</button></section>
      <section class="shipping"><button data-testid="action">Ship</button></section>
    `;
    const element = document.querySelector(".shipping button");
    if (!element) throw new Error("fixture missing");

    const selector = createSelectorChain(element);

    expect(selector.primary).toBe("section.shipping > button");
    expect(selector.primary).not.toContain("data-testid");
  });

  it("escapes identifiers and attribute values before checking uniqueness", () => {
    document.body.innerHTML = `<button data-testid='save"draft' id="123:save">Save</button>`;
    const element = document.querySelector("button");
    if (!element) throw new Error("fixture missing");

    const selector = createSelectorChain(element);

    expect(selector.primary).toBe('[data-testid="save\\"draft"]');
    expect(selector.fallbacks).toContain("#\\31 23\\:save");
  });

  it("excludes high-entropy and CSS-module class names from stable paths", () => {
    document.body.innerHTML = `
      <div><button class="fixture-action css-1a2B3c styles_button__x7H2p">First</button></div>
      <div><button class="fixture-action css-9z8Y7x styles_button__q6W5e">Second</button></div>
    `;
    const element = document.querySelectorAll("button")[1];
    if (!element) throw new Error("fixture missing");
    const selector = createSelectorChain(element);

    expect(isGeneratedClassName("css-1a2B3c")).toBe(true);
    expect(isGeneratedClassName("styles_button__x7H2p")).toBe(true);
    expect(isGeneratedClassName("fixture-action")).toBe(false);
    expect(selector.primary).not.toMatch(/1a2B3c|x7H2p|9z8Y7x|q6W5e/);
    expect(selector.primary).toMatch(/nth-of-type|fixture-action/);
  });

  it("uses the shortest unique nested path", () => {
    document.body.innerHTML = `
      <article class="card"><div><span class="label">One</span></div></article>
      <article class="card featured"><div><span class="label">Two</span></div></article>
    `;
    const element = document.querySelector(".featured .label");
    if (!element) throw new Error("fixture missing");

    expect(createSelectorChain(element).primary).toBe(
      "article.card.featured > div > span.label",
    );
  });
});
