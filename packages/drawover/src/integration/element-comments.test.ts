import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ElementRef } from "../contracts/index.js";
import { init } from "../index.js";
import { DRAWOVER_HOST_ID, type DrawoverInstance } from "../shell/shell.js";
import { ELEMENT_COMMENT_REQUEST_EVENT } from "../targeting/controller.js";

let instance: DrawoverInstance | undefined;

beforeEach(() => {
  document.body.innerHTML = '<button id="target">Place order</button>';
  localStorage.clear();
});

afterEach(() => {
  instance?.destroy();
  instance = undefined;
  localStorage.clear();
});

describe("element comment integration", () => {
  it("creates numbered pins and edits their comments in the popover", async () => {
    instance = init();
    instance.open();
    const host = document.getElementById(DRAWOVER_HOST_ID);
    const shadow = host?.shadowRoot;
    const target = document.getElementById("target");
    if (!host || !shadow) throw new Error("drawover shell was not mounted.");
    target?.focus();

    host.dispatchEvent(
      new CustomEvent<ElementRef>(ELEMENT_COMMENT_REQUEST_EVENT, {
        detail: elementReference(),
      }),
    );
    const popover = shadow.querySelector<HTMLElement>(
      ".element-comment-popover",
    );
    const editor = popover?.querySelector<HTMLTextAreaElement>("textarea");
    expect(popover?.hidden).toBe(false);
    expect(editor).not.toBeNull();
    expect(shadow.activeElement).toBe(editor);
    if (!editor) return;
    editor.value = "Disable this until the form validates";
    popover?.querySelector<HTMLButtonElement>('[type="submit"]')?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(document.activeElement).toBe(target);

    const pin = shadow.querySelector<SVGGElement>(
      '[data-annotation-type="element-pin"]',
    );
    expect(pin?.dataset.annotationNumber).toBe("1");
    expect(pin?.querySelector("title")?.textContent).toBe(
      "Disable this until the form validates",
    );
    expect(pin?.querySelector("text")?.textContent).toBe("1");

    pin?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(editor.value).toBe("Disable this until the form validates");
    editor.value = "Keep this disabled until validation passes";
    popover?.querySelector<HTMLButtonElement>('[type="submit"]')?.click();

    expect(
      shadow.querySelector('[data-annotation-type="element-pin"] title')
        ?.textContent,
    ).toBe("Keep this disabled until validation passes");
  });

  it("dismisses an unfinished comment when the shell closes", async () => {
    instance = init();
    instance.open();
    const host = document.getElementById(DRAWOVER_HOST_ID);
    host?.dispatchEvent(
      new CustomEvent<ElementRef>(ELEMENT_COMMENT_REQUEST_EVENT, {
        detail: elementReference(),
      }),
    );
    const shadow = host?.shadowRoot;
    const popover = shadow?.querySelector<HTMLElement>(
      ".element-comment-popover",
    );

    instance.close();
    await Promise.resolve();

    expect(popover?.hidden).toBe(true);
    expect(
      shadow?.querySelectorAll('[data-annotation-type="element-pin"]'),
    ).toHaveLength(0);
  });
});

function elementReference(): ElementRef {
  return {
    selector: { primary: "#target", fallbacks: ["button"] },
    facts: {
      tag: "button",
      role: "button",
      accessibleName: "Place order",
      text: "Place order",
      attributes: { type: "submit" },
      bbox: { x: 100, y: 200, width: 180, height: 44 },
    },
  };
}
