import { afterEach, describe, expect, it, vi } from "vitest";
import { init } from "../index.js";
import { DRAWOVER_HOST_ID, type DrawoverInstance } from "../shell/shell.js";

let instance: DrawoverInstance | undefined;

afterEach(() => {
  instance?.destroy();
  instance = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 768,
  });
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
    expect(svg?.querySelectorAll("[data-handle]")).toHaveLength(0);
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

  it("rejects degenerate rectangles but keeps meaningful arrows", () => {
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
    draw(svg, { x: 80, y: 100 }, { x: 240, y: 100 }, 28);
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      0,
    );

    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="arrow"]')
      ?.click();
    draw(svg, { x: 80, y: 120 }, { x: 240, y: 120 }, 29);
    expect(
      svg?.querySelectorAll('[data-annotation-type="arrow"]'),
    ).toHaveLength(1);
  });

  it("hides annotations while the shell is closed and restores them on open", async () => {
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
    draw(svg, { x: 80, y: 100 }, { x: 240, y: 190 }, 20);

    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      1,
    );
    instance.close();
    await vi.waitFor(() => {
      expect(
        svg?.querySelectorAll('[data-annotation-type="rect"]'),
      ).toHaveLength(0);
    });

    instance.open();
    await vi.waitFor(() => {
      expect(
        svg?.querySelectorAll('[data-annotation-type="rect"]'),
      ).toHaveLength(1);
    });
  });

  it("cancels an active transform before applying a history shortcut", () => {
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
    draw(svg, { x: 80, y: 100 }, { x: 240, y: 190 }, 21);
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
      ?.click();

    const resize = svg?.querySelector<SVGElement>('[data-handle="se"]');
    resize?.dispatchEvent(pointer("pointerdown", 240, 190, { pointerId: 22 }));
    svg?.dispatchEvent(pointer("pointermove", 280, 220, { pointerId: 22 }));
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "z", ctrlKey: true }),
    );
    svg?.dispatchEvent(pointer("pointerup", 280, 220, { pointerId: 22 }));

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

  it("returns to select when new text entry is canceled", () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="text"]')
      ?.click();
    svg?.dispatchEvent(pointer("pointerdown", 100, 100, { pointerId: 23 }));

    shadow
      ?.querySelector<HTMLInputElement>(".inline-editor")
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(
      shadow
        ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");

    svg?.dispatchEvent(pointer("pointerdown", 160, 160, { pointerId: 24 }));
    expect(shadow?.querySelector(".inline-editor")).toBeNull();
  });

  it("cancels inline text entry when the shell closes", async () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="text"]')
      ?.click();
    svg?.dispatchEvent(pointer("pointerdown", 100, 100, { pointerId: 26 }));
    expect(shadow?.querySelector(".inline-editor")).not.toBeNull();

    instance.close();
    await vi.waitFor(() => {
      expect(shadow?.querySelector(".inline-editor")).toBeNull();
    });
    instance.open();
    await vi.waitFor(() => {
      expect(
        svg?.querySelectorAll('[data-annotation-type="text"]'),
      ).toHaveLength(0);
    });
  });

  it("allows an existing rectangle label to be cleared", () => {
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
    draw(svg, { x: 80, y: 100 }, { x: 240, y: 190 }, 27);
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
      ?.click();
    let rectangle = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    rectangle?.dispatchEvent(
      new MouseEvent("dblclick", {
        bubbles: true,
        clientX: 120,
        clientY: 130,
      }),
    );
    let editor = shadow?.querySelector<HTMLInputElement>(".inline-editor");
    if (!editor) throw new Error("Rectangle label editor was not created.");
    editor.value = "Header";
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    rectangle = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    expect(rectangle?.querySelector("text")?.textContent).toBe("Header");

    rectangle?.dispatchEvent(
      new MouseEvent("dblclick", {
        bubbles: true,
        clientX: 120,
        clientY: 130,
      }),
    );
    editor = shadow?.querySelector<HTMLInputElement>(".inline-editor");
    if (!editor) throw new Error("Rectangle label editor was not reopened.");
    editor.value = "";
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    rectangle = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    expect(rectangle?.querySelector("text")).toBeNull();
  });

  it("leaves shortcuts inside a closed host shadow root untouched", () => {
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
    draw(svg, { x: 80, y: 100 }, { x: 240, y: 190 }, 25);

    const externalHost = document.createElement("div");
    const externalInput = document.createElement("input");
    externalHost.attachShadow({ mode: "closed" }).append(externalInput);
    document.body.append(externalHost);
    externalInput.focus();
    const deleteEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      composed: true,
      key: "Delete",
    });
    externalInput.dispatchEvent(deleteEvent);
    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
      composed: true,
    }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        files: [new File(["image"], "external.png", { type: "image/png" })],
      },
    });
    externalInput.dispatchEvent(pasteEvent);

    expect(document.activeElement).toBe(externalHost);
    expect(deleteEvent.defaultPrevented).toBe(false);
    expect(pasteEvent.defaultPrevented).toBe(false);
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      1,
    );
    externalHost.remove();
  });

  it("discards a pending image import when the scene is cleared", async () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    let pendingReader: FileReader | undefined;
    const captureReader = (reader: FileReader): void => {
      pendingReader = reader;
    };
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(
      function (this: FileReader) {
        captureReader(this);
      },
    );
    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
      composed: true,
    }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        files: [new File(["image"], "slow.png", { type: "image/png" })],
      },
    });
    document.dispatchEvent(pasteEvent);
    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(pendingReader).toBeDefined();

    instance.clear();
    Object.defineProperty(pendingReader, "result", {
      configurable: true,
      value: "data:image/png;base64,AA==",
    });
    pendingReader?.onload?.(
      new ProgressEvent("load") as ProgressEvent<FileReader>,
    );

    await vi.waitFor(() => {
      expect(
        svg?.querySelectorAll('[data-annotation-type="image"]'),
      ).toHaveLength(0);
    });
  });

  it("rejects image files that the browser cannot decode", async () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(
      function (this: FileReader) {
        Object.defineProperty(this, "result", {
          configurable: true,
          value: "data:image/png;base64,invalid",
        });
        this.dispatchEvent(new ProgressEvent("load"));
      },
    );
    class BrokenImage extends EventTarget {
      readonly naturalHeight = 0;
      readonly naturalWidth = 0;

      set src(_value: string) {
        this.dispatchEvent(new Event("error"));
      }
    }
    vi.stubGlobal("Image", BrokenImage);
    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
      composed: true,
    }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        files: [new File(["broken"], "broken.png", { type: "image/png" })],
      },
    });
    document.dispatchEvent(pasteEvent);

    await vi.waitFor(() => {
      expect(
        svg?.querySelectorAll('[data-annotation-type="image"]'),
      ).toHaveLength(0);
    });
  });

  it("cancels active drawing and text entry when the scene is cleared", () => {
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
    svg?.dispatchEvent(pointer("pointerdown", 80, 100, { pointerId: 30 }));
    svg?.dispatchEvent(pointer("pointermove", 240, 190, { pointerId: 30 }));
    instance.clear();
    svg?.dispatchEvent(pointer("pointerup", 240, 190, { pointerId: 30 }));
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      0,
    );

    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="text"]')
      ?.click();
    svg?.dispatchEvent(pointer("pointerdown", 100, 100, { pointerId: 31 }));
    const editor = shadow?.querySelector<HTMLInputElement>(".inline-editor");
    if (!editor) throw new Error("Text editor was not created.");
    editor.value = "Draft";
    instance.clear();
    expect(shadow?.querySelector(".inline-editor")).toBeNull();
    expect(svg?.querySelectorAll('[data-annotation-type="text"]')).toHaveLength(
      0,
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
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
      ?.click();
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
    let duplicate = svg?.querySelectorAll<SVGGElement>(
      '[data-annotation-type="rect"]',
    )[2];
    duplicate?.dispatchEvent(
      pointer("pointerdown", 90, 105, { altKey: true, pointerId: 6 }),
    );
    svg?.dispatchEvent(pointer("pointerup", 90, 105, { pointerId: 6 }));
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      4,
    );

    duplicate = svg?.querySelectorAll<SVGGElement>(
      '[data-annotation-type="rect"]',
    )[2];
    duplicate?.dispatchEvent(
      pointer("pointerdown", 90, 105, { altKey: true, pointerId: 14 }),
    );
    svg?.dispatchEvent(pointer("pointercancel", 90, 105, { pointerId: 14 }));
    expect(svg?.querySelectorAll('[data-annotation-type="rect"]')).toHaveLength(
      4,
    );
    expect(shadow?.querySelector(".scene-status")?.textContent).toBe(
      "4 items / 2 selected",
    );

    duplicate = svg?.querySelectorAll<SVGGElement>(
      '[data-annotation-type="rect"]',
    )[2];
    duplicate?.dispatchEvent(
      pointer("pointerdown", 90, 105, { altKey: true, pointerId: 7 }),
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(shadow?.querySelector(".scene-status")?.textContent).toBe(
      "4 items / 2 selected",
    );

    duplicate = svg?.querySelectorAll<SVGGElement>(
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

  it("scales text through its resize handle", () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="text"]')
      ?.click();
    svg?.dispatchEvent(pointer("pointerdown", 100, 100));
    const editor = shadow?.querySelector<HTMLInputElement>(".inline-editor");
    if (!editor) throw new Error("Text editor was not created.");
    editor.value = "Scale me";
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    const resize = svg?.querySelector<SVGElement>('[data-handle="se"]');
    const startX = Number(resize?.getAttribute("cx"));
    const startY = Number(resize?.getAttribute("cy"));
    resize?.dispatchEvent(pointer("pointerdown", startX, startY));
    svg?.dispatchEvent(pointer("pointermove", startX + 40, startY + 28));
    svg?.dispatchEvent(pointer("pointerup", startX + 40, startY + 28));

    expect(
      Number(
        svg
          ?.querySelector('[data-annotation-type="text"] text')
          ?.getAttribute("font-size"),
      ),
    ).toBeGreaterThan(20);
  });

  it("keeps the inline editor inside a mobile viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 667,
    });
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
    draw(svg, { x: 300, y: 600 }, { x: 360, y: 650 }, 8);
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
      ?.click();
    let rectangle = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    rectangle?.dispatchEvent(
      pointer("pointerdown", 340, 630, { pointerId: 9 }),
    );
    svg?.dispatchEvent(pointer("pointerup", 340, 630, { pointerId: 9 }));
    rectangle = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    rectangle?.dispatchEvent(
      pointer("pointerdown", 360, 650, { pointerId: 9 }),
    );

    const editor = shadow?.querySelector<HTMLInputElement>(".inline-editor");
    expect(Number.parseFloat(editor?.style.left ?? "NaN")).toBeLessThanOrEqual(
      107,
    );
    expect(Number.parseFloat(editor?.style.top ?? "NaN")).toBeLessThanOrEqual(
      623,
    );
  });

  it("marquee-selects the visible bounds of a rotated annotation", () => {
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
    draw(svg, { x: 100, y: 100 }, { x: 200, y: 120 }, 10);
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
      ?.click();

    const rotate = svg?.querySelector<SVGElement>('[data-handle="rotate"]');
    rotate?.dispatchEvent(pointer("pointerdown", 150, 72, { pointerId: 11 }));
    svg?.dispatchEvent(pointer("pointermove", 200, 110, { pointerId: 11 }));
    svg?.dispatchEvent(pointer("pointerup", 200, 110, { pointerId: 11 }));

    draw(svg, { x: 0, y: 0 }, { x: 5, y: 5 }, 12);
    expect(shadow?.querySelector(".scene-status")?.textContent).toBe(
      "1 items / 0 selected",
    );
    draw(svg, { x: 145, y: 65 }, { x: 155, y: 90 }, 13);
    expect(shadow?.querySelector(".scene-status")?.textContent).toBe(
      "1 items / 1 selected",
    );
  });

  it("keeps general notes outside scene rendering and selection", () => {
    instance = init();
    instance.open();
    const shadow = document.getElementById(DRAWOVER_HOST_ID)?.shadowRoot;
    const svg = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
    shadow
      ?.querySelector<HTMLButtonElement>('[aria-label="Open general notes"]')
      ?.click();
    const draft = shadow?.querySelector<HTMLTextAreaElement>(
      '[aria-label="New general note"]',
    );
    const form = shadow?.querySelector<HTMLFormElement>(".note-form");
    if (!draft || !form) throw new Error("General note form was not found.");
    draft.value = "Keep me in the notes panel";
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    shadow
      ?.querySelector<HTMLButtonElement>('[aria-label="Close general notes"]')
      ?.click();
    shadow
      ?.querySelector<HTMLButtonElement>('button[data-mode="scene"]')
      ?.click();
    draw(svg, { x: -10, y: -10 }, { x: 20, y: 20 }, 32);

    expect(shadow?.querySelector(".scene-status")?.textContent).toBe(
      "0 items / 0 selected",
    );
    expect(svg?.querySelector('[data-annotation-type="note"]')).toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    shadow
      ?.querySelector<HTMLButtonElement>('[aria-label="Open general notes"]')
      ?.click();
    expect(
      shadow?.querySelector<HTMLTextAreaElement>(
        '[aria-label="Edit general note"]',
      )?.value,
    ).toBe("Keep me in the notes panel");
  });

  it("reorders scene annotations without invisible note steps", () => {
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
    draw(svg, { x: 40, y: 70 }, { x: 110, y: 120 }, 33);

    shadow
      ?.querySelector<HTMLButtonElement>('[aria-label="Open general notes"]')
      ?.click();
    const draft = shadow?.querySelector<HTMLTextAreaElement>(
      '[aria-label="New general note"]',
    );
    const form = shadow?.querySelector<HTMLFormElement>(".note-form");
    if (!draft || !form) throw new Error("General note form was not found.");
    draft.value = "Between the drawings";
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    shadow
      ?.querySelector<HTMLButtonElement>('[aria-label="Close general notes"]')
      ?.click();
    draft.blur();
    draw(svg, { x: 140, y: 80 }, { x: 210, y: 130 }, 34);

    shadow
      ?.querySelector<HTMLButtonElement>('button[data-tool="select"]')
      ?.click();
    const first = svg?.querySelector<SVGGElement>(
      '[data-annotation-type="rect"]',
    );
    const firstId = first?.dataset.annotationId;
    first?.dispatchEvent(pointer("pointerdown", 70, 90, { pointerId: 35 }));
    svg?.dispatchEvent(pointer("pointerup", 70, 90, { pointerId: 35 }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "]" }));

    expect(
      svg?.querySelectorAll<SVGGElement>("[data-annotation-id]")[1]?.dataset
        .annotationId,
    ).toBe(firstId);
    shadow
      ?.querySelector<HTMLButtonElement>('[aria-label="Open general notes"]')
      ?.click();
    expect(
      shadow?.querySelector<HTMLTextAreaElement>(
        '[aria-label="Edit general note"]',
      )?.value,
    ).toBe("Between the drawings");
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
