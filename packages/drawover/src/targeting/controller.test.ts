import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { init } from "../index.js";
import { DRAWOVER_HOST_ID, type DrawoverInstance } from "../shell/shell.js";
import {
  ELEMENT_COMMENT_REQUEST_EVENT,
  ELEMENT_SELECTED_EVENT,
} from "./controller.js";

let instance: DrawoverInstance | undefined;

beforeEach(() => {
  document.body.innerHTML = '<button id="host-action">Host action</button>';
});

afterEach(() => {
  instance?.destroy();
  instance = undefined;
  vi.restoreAllMocks();
});

describe("element targeting lifecycle", () => {
  it("highlights and selects the element under the pointer while consuming the click", () => {
    const target = document.querySelector<HTMLButtonElement>("#host-action");
    if (!target) throw new Error("fixture missing");
    target.getBoundingClientRect = () =>
      ({ x: 20, y: 30, left: 20, top: 30, width: 160, height: 44 }) as DOMRect;
    vi.spyOn(document, "elementFromPoint").mockReturnValue(target);
    const hostClick = vi.fn();
    target.addEventListener("click", hostClick);

    instance = init();
    instance.open();
    const host = document.getElementById(DRAWOVER_HOST_ID);
    const selected = vi.fn();
    host?.addEventListener(ELEMENT_SELECTED_EVENT, selected);

    document.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 30, clientY: 40 }),
    );
    const highlight = host?.shadowRoot?.querySelector<HTMLElement>(
      "[data-targeting-highlight]",
    );
    expect(highlight?.dataset.targetSelector).toBe("#host-action");
    expect(highlight?.style.left).toBe("20px");

    const click = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: 30,
      clientY: 40,
    });
    // jsdom events are untrusted by default; the controller only acts on
    // real user input, so trusted is stubbed for this synthetic click.
    Object.defineProperty(click, "isTrusted", { value: true });
    target.dispatchEvent(click);
    expect(selected).toHaveBeenCalledOnce();
    // Reviewing never operates the page: the host handler must not fire and
    // default actions (links, submits) are cancelled.
    expect(hostClick).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(true);

    // Selection pins the box with the Add comment affordance; commenting is
    // an explicit second step.
    const selection = host?.shadowRoot?.querySelector<HTMLElement>(
      "[data-targeting-selection]",
    );
    expect(selection).not.toBeNull();
    const commentRequest = vi.fn();
    host?.addEventListener(ELEMENT_COMMENT_REQUEST_EVENT, commentRequest);
    selection
      ?.querySelector<HTMLButtonElement>('[aria-label="Add comment"]')
      ?.click();
    expect(commentRequest).toHaveBeenCalledOnce();
  });

  it("obeys shell mode and removes highlight state when scene mode takes over", () => {
    const target = document.querySelector("#host-action");
    if (!target) throw new Error("fixture missing");
    target.getBoundingClientRect = () =>
      ({ x: 5, y: 5, left: 5, top: 5, width: 80, height: 30 }) as DOMRect;
    vi.spyOn(document, "elementFromPoint").mockReturnValue(target);

    instance = init();
    instance.open();
    const host = document.getElementById(DRAWOVER_HOST_ID);
    document.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 }),
    );
    expect(
      host?.shadowRoot?.querySelector("[data-targeting-highlight]"),
    ).not.toBeNull();

    // Clicking shell UI resolves to the drawover host in a real browser, so
    // interception must skip it. Mirror that in the mock before clicking.
    if (host) vi.spyOn(document, "elementFromPoint").mockReturnValue(host);
    host?.shadowRoot
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();

    expect(host?.dataset.drawoverMode).toBe("scene");
    expect(
      host?.shadowRoot?.querySelector("[data-targeting-highlight]"),
    ).toBeNull();
  });

  it("cleans all targeting listeners and visuals on destroy", () => {
    const target = document.querySelector("#host-action");
    if (!target) throw new Error("fixture missing");
    target.getBoundingClientRect = () =>
      ({ x: 5, y: 5, left: 5, top: 5, width: 80, height: 30 }) as DOMRect;
    const hitTest = vi
      .spyOn(document, "elementFromPoint")
      .mockReturnValue(target);

    instance = init();
    instance.open();
    document.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 }),
    );
    expect(hitTest).toHaveBeenCalledOnce();

    instance.destroy();
    instance = undefined;
    document.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 }),
    );
    expect(hitTest).toHaveBeenCalledOnce();
    expect(document.getElementById(DRAWOVER_HOST_ID)).toBeNull();
  });
});
