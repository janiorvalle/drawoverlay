import { afterEach, describe, expect, it, vi } from "vitest";
import { init } from "../index.js";
import { DRAWOVER_HOST_ID, type DrawoverInstance } from "./shell.js";

let current: DrawoverInstance | undefined;

afterEach(() => {
  current?.destroy();
  current = undefined;
  localStorage.clear();
});

describe("shell", () => {
  it("mounts one host with an open shadow root", () => {
    const first = init();
    current = first;
    const second = init();
    const host = document.getElementById(DRAWOVER_HOST_ID);

    expect(second).toBe(first);
    expect(document.querySelectorAll(`#${DRAWOVER_HOST_ID}`)).toHaveLength(1);
    expect(host?.shadowRoot).not.toBeNull();
    first.destroy();
  });

  it("opens and closes from the trigger and hotkey", () => {
    const instance = init();
    current = instance;
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const trigger = shadow?.querySelector<HTMLButtonElement>(".trigger");
    const toolbar = shadow?.querySelector<HTMLElement>(".toolbar");

    expect(toolbar?.hidden).toBe(true);
    trigger?.click();
    expect(toolbar?.hidden).toBe(false);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "d", altKey: true, shiftKey: true }),
    );
    expect(toolbar?.hidden).toBe(true);

    // macOS reports the composed character for Option combinations
    // (Option+Shift+D is "Î"); the physical key code must still match.
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Î",
        code: "KeyD",
        altKey: true,
        shiftKey: true,
      }),
    );
    expect(toolbar?.hidden).toBe(false);
    instance.destroy();
  });

  it("keeps pointer arbitration under the shell mode", () => {
    const instance = init();
    current = instance;
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const scene = shadow?.querySelector<SVGElement>('[data-layer="scene"]');
    const targeting = shadow?.querySelector<HTMLElement>(
      '[data-layer="element-select"]',
    );
    const drawButton = shadow?.querySelector<HTMLButtonElement>(
      'button[data-mode="scene"]',
    );
    const inspectButton = shadow?.querySelector<HTMLButtonElement>(
      'button[data-mode="element-select"]',
    );

    expect(scene?.style.pointerEvents).toBe("none");
    expect(targeting?.style.pointerEvents).toBe("none");
    drawButton?.click();
    expect(scene?.style.pointerEvents).toBe("auto");
    inspectButton?.click();
    expect(scene?.style.pointerEvents).toBe("none");
    instance.destroy();
  });

  it("emits shell requests without owning scene behavior", async () => {
    const instance = init();
    current = instance;
    const host = document.getElementById(DRAWOVER_HOST_ID);
    const copy = vi.fn();
    const clear = vi.fn();
    host?.addEventListener("drawover:copy-request", copy);
    host?.addEventListener("drawover:clear-request", clear);

    await instance.copy();
    instance.clear();
    expect(copy).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
    instance.destroy();
  });

  it("hydrates and clears the storage key override", async () => {
    const key = "custom-shell-scene";
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        annotations: [
          {
            id: "text-1",
            type: "text",
            geometry: { x: 40, y: 40, width: 160, height: 24 },
            z: 0,
            rotation: 0,
            text: "Hydrated text",
            color: "#e5484d",
            fontSize: 16,
            align: "left",
          },
        ],
      }),
    );
    const instance = init({ storageKey: key });
    current = instance;
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;

    await vi.waitFor(() => {
      expect(
        shadow?.querySelector(
          '[data-layer="scene"] [data-annotation-type="text"]',
        )?.textContent,
      ).toContain("Hydrated text");
    });

    instance.clear();
    expect(localStorage.getItem(key)).toBeNull();
    instance.destroy();
  });
});
