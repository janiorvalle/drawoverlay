import { afterEach, describe, expect, it } from "vitest";
import { init } from "../index.js";
import { DRAWOVER_HOST_ID, type DrawoverInstance } from "../shell/shell.js";

let instance: DrawoverInstance | undefined;

afterEach(() => {
  instance?.destroy();
  instance = undefined;
});

describe("scene interactions", () => {
  it("draws a rectangle and routes undo/redo through the scene store", () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="rect"]')
      ?.click();

    svg?.dispatchEvent(pointer("pointerdown", 80, 100));
    svg?.dispatchEvent(pointer("pointermove", 240, 190));
    svg?.dispatchEvent(pointer("pointerup", 240, 190));

    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      1,
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "z", ctrlKey: true }),
    );
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      0,
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true }),
    );
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      1,
    );
  });

  it("labels, resizes, rotates, and edits arrow endpoints", () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="rect"]')
      ?.click();
    svg?.dispatchEvent(pointer("pointerdown", 50, 70));
    svg?.dispatchEvent(pointer("pointermove", 170, 140));
    svg?.dispatchEvent(pointer("pointerup", 170, 140));
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
      ?.click();

    let rectangle = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    rectangle?.dispatchEvent(pointer("pointerdown", 90, 100));
    svg?.dispatchEvent(pointer("pointerup", 90, 100));
    rectangle = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    rectangle?.dispatchEvent(pointer("pointerdown", 90, 100, { detail: 2 }));
    const editor = shadow?.querySelector<HTMLInputElement>(".inline-editor");
    expect(editor).not.toBeNull();
    if (editor) {
      editor.value = "Header";
      editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    }
    expect(
      svg?.querySelector('[data-annotation-type="rect"] text')?.textContent,
    ).toBe("Header");

    const resize = svg?.querySelector<SVGElement>('[data-handle="se"]');
    resize?.dispatchEvent(pointer("pointerdown", 170, 140));
    svg?.dispatchEvent(pointer("pointermove", 210, 175));
    svg?.dispatchEvent(pointer("pointerup", 210, 175));
    expect(
      Number(
        svg
          ?.querySelector('[data-annotation-type="rect"] rect')
          ?.getAttribute("width"),
      ),
    ).toBe(160);

    const rotate = svg?.querySelector<SVGElement>('[data-handle="rotate"]');
    rotate?.dispatchEvent(pointer("pointerdown", 130, 42));
    svg?.dispatchEvent(pointer("pointermove", 190, 95, { shiftKey: true }));
    svg?.dispatchEvent(pointer("pointerup", 190, 95));
    const transform = svg
      ?.querySelector('[data-annotation-type="rect"]')
      ?.getAttribute("transform");
    const degrees = Number(transform?.match(/rotate\(([-\d.]+)/u)?.[1]);
    expect(degrees % 15).toBe(0);

    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="arrow"]')
      ?.click();
    svg?.dispatchEvent(pointer("pointerdown", 230, 80));
    svg?.dispatchEvent(pointer("pointermove", 310, 130));
    svg?.dispatchEvent(pointer("pointerup", 310, 130));
    const endpoint = svg?.querySelector<SVGElement>(
      '[data-handle="arrow-end"]',
    );
    endpoint?.dispatchEvent(pointer("pointerdown", 310, 130));
    svg?.dispatchEvent(pointer("pointermove", 330, 170));
    svg?.dispatchEvent(pointer("pointerup", 330, 170));
    const arrowLine = svg?.querySelectorAll(
      '[data-annotation-type="arrow"] line',
    )[1];
    expect(arrowLine?.getAttribute("x2")).toBe("330");
    expect(arrowLine?.getAttribute("y2")).toBe("170");
  });

  it("marquee-selects, group-moves, duplicates, deletes, and restores history", () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="rect"]')
      ?.click();
    draw(svg, { x: 40, y: 70 }, { x: 110, y: 120 }, 1);
    draw(svg, { x: 140, y: 80 }, { x: 210, y: 130 }, 2);
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
      ?.click();
    let nodes = svg?.querySelectorAll<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    nodes?.[0]?.dispatchEvent(pointer("pointerdown", 70, 90, { pointerId: 3 }));
    svg?.dispatchEvent(pointer("pointerup", 70, 90, { pointerId: 3 }));
    nodes = svg?.querySelectorAll<SVGGElement>('[data-annotation-type="rect"]');
    nodes?.[1]?.dispatchEvent(
      pointer("pointerdown", 170, 100, {
        pointerId: 3,
        shiftKey: true,
      }),
    );
    svg?.dispatchEvent(pointer("pointerup", 170, 100, { pointerId: 3 }));
    expect(shadow?.querySelector(".scene-status")?.textContent).toBe(
      "2 items / 2 selected",
    );

    draw(svg, { x: 20, y: 50 }, { x: 230, y: 150 }, 3);
    expect(shadow?.querySelector(".scene-status")?.textContent).toBe(
      "2 items / 2 selected",
    );

    const first = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    first?.dispatchEvent(pointer("pointerdown", 70, 90, { pointerId: 4 }));
    svg?.dispatchEvent(pointer("pointermove", 90, 105, { pointerId: 4 }));
    svg?.dispatchEvent(pointer("pointerup", 90, 105, { pointerId: 4 }));
    const xs = [
      ...(svg?.querySelectorAll('[data-annotation-type="rect"] rect') ?? []),
    ].map((shape) => Number(shape.getAttribute("x")));
    expect(xs).toEqual([60, 160]);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "d", ctrlKey: true }),
    );
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      4,
    );
    const duplicate = svg?.querySelectorAll<SVGGElement>(
      '[data-annotation-type="rect"]',
    )[2];
    duplicate?.dispatchEvent(
      pointer("pointerdown", 90, 105, { altKey: true, pointerId: 5 }),
    );
    svg?.dispatchEvent(
      pointer("pointermove", 105, 120, { altKey: true, pointerId: 5 }),
    );
    svg?.dispatchEvent(pointer("pointerup", 105, 120, { pointerId: 5 }));
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      6,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      4,
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "z", ctrlKey: true }),
    );
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      6,
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        shiftKey: true,
      }),
    );
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      4,
    );
  });
});

interface PointerOptions {
  altKey?: boolean;
  detail?: number;
  pointerId?: number;
  shiftKey?: boolean;
}

function pointer(
  type: string,
  x: number,
  y: number,
  options: PointerOptions = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    clientX: x,
    clientY: y,
    ...options,
    pointerId: options.pointerId ?? 1,
  });
}

function draw(
  svg: SVGSVGElement | null | undefined,
  start: { x: number; y: number },
  end: { x: number; y: number },
  pointerId: number,
): void {
  svg?.dispatchEvent(pointer("pointerdown", start.x, start.y, { pointerId }));
  svg?.dispatchEvent(pointer("pointermove", end.x, end.y, { pointerId }));
  svg?.dispatchEvent(pointer("pointerup", end.x, end.y, { pointerId }));
}
