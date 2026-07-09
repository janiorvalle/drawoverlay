import type {
  Annotation,
  ArrowAnnotation,
  DocumentPoint,
  DocumentRect,
  RectAnnotation,
  SceneStore,
  TextAnnotation,
} from "../contracts/index.js";
import { viewportToDocument } from "../coordinates.js";
import {
  arrowGeometry,
  createAnnotationId,
  duplicateAnnotation,
  intersects,
  nextZ,
  normalizeRect,
  reorderAnnotations,
  resizeAnnotation,
  translateAnnotation,
  updateArrowEndpoint,
  visualBounds,
  type ZOrderAction,
} from "./model.js";
import { SceneRenderer } from "./renderer.js";
import { sceneStyles } from "./styles.js";

export type SceneTool = "arrow" | "image" | "rect" | "select" | "text";

interface SceneEditorOptions {
  host: HTMLElement;
  sceneLayer: SVGSVGElement;
  shadow: ShadowRoot;
  toolbar: HTMLElement;
  store: SceneStore;
}

interface DrawSession {
  kind: "draw";
  pointerId: number;
  start: DocumentPoint;
  preview: RectAnnotation | ArrowAnnotation;
}

interface MarqueeSession {
  kind: "marquee";
  pointerId: number;
  start: DocumentPoint;
  current: DocumentRect;
  additive: boolean;
}

interface MoveSession {
  kind: "move";
  pointerId: number;
  start: DocumentPoint;
  clickedId: string;
  originals: ReadonlyMap<string, Annotation>;
  drafts: Map<string, Annotation>;
  duplicate: boolean;
  selectedBeforeDuplicate: ReadonlySet<string>;
}

interface ResizeSession {
  kind: "resize";
  pointerId: number;
  original: Annotation;
  draft: Annotation;
  handle: "ne" | "nw" | "se" | "sw";
}

interface RotateSession {
  kind: "rotate";
  pointerId: number;
  original: Annotation;
  draft: Annotation;
  center: DocumentPoint;
  startAngle: number;
}

interface ArrowEndpointSession {
  kind: "arrow-endpoint";
  pointerId: number;
  original: ArrowAnnotation;
  draft: ArrowAnnotation;
  endpoint: "end" | "start";
}

type PointerSession =
  | ArrowEndpointSession
  | DrawSession
  | MarqueeSession
  | MoveSession
  | ResizeSession
  | RotateSession;

const COLORS = ["#e5484d", "#1769e0", "#16805c", "#202936"] as const;

export class SceneEditor {
  readonly #host: HTMLElement;
  readonly #sceneLayer: SVGSVGElement;
  readonly #shadow: ShadowRoot;
  readonly #toolbar: HTMLElement;
  readonly #store: SceneStore;
  readonly #renderer: SceneRenderer;
  readonly #style: HTMLStyleElement;
  readonly #toolGroup: HTMLDivElement;
  readonly #historyGroup: HTMLDivElement;
  readonly #zGroup: HTMLDivElement;
  readonly #palette: HTMLDivElement;
  readonly #status: HTMLSpanElement;
  readonly #fileInput: HTMLInputElement;
  readonly #toolButtons = new Map<SceneTool, HTMLButtonElement>();
  readonly #colorButtons = new Map<string, HTMLButtonElement>();
  readonly #unsubscribe: () => void;
  readonly #onPointerDownBound = (event: PointerEvent): void =>
    this.#onPointerDown(event);
  readonly #onPointerMoveBound = (event: PointerEvent): void =>
    this.#onPointerMove(event);
  readonly #onPointerUpBound = (event: PointerEvent): void =>
    this.#onPointerUp(event);
  readonly #onPointerCancelBound = (event: PointerEvent): void =>
    this.#cancelPointerSession(event.pointerId);
  readonly #onDoubleClickBound = (event: MouseEvent): void =>
    this.#onDoubleClick(event);
  readonly #onKeyDownBound = (event: KeyboardEvent): void =>
    this.#onKeyDown(event);
  readonly #onPasteBound = (event: ClipboardEvent): void => {
    void this.#onPaste(event);
  };
  readonly #onViewportChangeBound = (): void => this.#render();
  readonly #onToolbarPointerDownBound = (event: PointerEvent): void => {
    const target = event.target instanceof Element ? event.target : undefined;
    if (target?.closest('button.close, button[aria-label="Clear annotations"]'))
      this.#cancelInlineEditor?.();
  };
  readonly #shellVisibilityObserver: MutationObserver;
  readonly #onClearBound = (): void => {
    this.#cancelActivePointerSession();
    this.#cancelInlineEditor?.();
    this.#invalidateImageImports();
    this.#store.clear("Clear scene");
    this.#selectedIds.clear();
    this.#render();
  };

  #tool: SceneTool = "select";
  #color: (typeof COLORS)[number] = COLORS[0];
  #fillEnabled = true;
  #selectedIds = new Set<string>();
  #session: PointerSession | undefined;
  #inlineEditor: HTMLInputElement | undefined;
  #cancelInlineEditor: (() => void) | undefined;
  #imageImportGeneration = 0;
  #lastAnnotationClick: { id: string; at: number } | undefined;
  #suppressDoubleClickUntil = 0;
  #destroyed = false;

  constructor(options: SceneEditorOptions) {
    this.#host = options.host;
    this.#sceneLayer = options.sceneLayer;
    this.#shadow = options.shadow;
    this.#toolbar = options.toolbar;
    this.#store = options.store;
    this.#renderer = new SceneRenderer(this.#sceneLayer);
    this.#style = document.createElement("style");
    this.#style.textContent = sceneStyles;
    this.#shadow.append(this.#style);

    this.#toolGroup = this.#buildToolGroup();
    this.#historyGroup = this.#buildHistoryGroup();
    this.#zGroup = this.#buildZGroup();
    this.#palette = this.#buildPalette();
    this.#status = document.createElement("span");
    this.#status.className = "scene-status";
    this.#status.setAttribute("aria-live", "polite");
    this.#fileInput = document.createElement("input");
    this.#fileInput.type = "file";
    this.#fileInput.accept = "image/*";
    this.#fileInput.hidden = true;
    this.#fileInput.dataset.sceneImageInput = "true";
    this.#fileInput.addEventListener("change", () => {
      const file = this.#fileInput.files?.[0];
      if (file) void this.#insertImage(file);
      this.#fileInput.value = "";
    });

    const modes = this.#toolbar.querySelector(".modes");
    modes?.after(
      this.#toolGroup,
      this.#palette,
      this.#historyGroup,
      this.#zGroup,
      this.#status,
    );
    this.#toolbar.append(this.#fileInput);

    this.#sceneLayer.addEventListener("pointerdown", this.#onPointerDownBound);
    this.#sceneLayer.addEventListener("pointermove", this.#onPointerMoveBound);
    this.#sceneLayer.addEventListener("pointerup", this.#onPointerUpBound);
    this.#sceneLayer.addEventListener(
      "pointercancel",
      this.#onPointerCancelBound,
    );
    this.#sceneLayer.addEventListener("dblclick", this.#onDoubleClickBound);
    document.addEventListener("keydown", this.#onKeyDownBound);
    document.addEventListener("paste", this.#onPasteBound);
    window.addEventListener("scroll", this.#onViewportChangeBound, {
      passive: true,
    });
    window.addEventListener("resize", this.#onViewportChangeBound);
    this.#toolbar.addEventListener(
      "pointerdown",
      this.#onToolbarPointerDownBound,
      true,
    );
    this.#shellVisibilityObserver = new MutationObserver(() => {
      if (this.#toolbar.hidden) {
        this.#cancelActivePointerSession();
        this.#cancelInlineEditor?.();
      }
      this.#render();
    });
    this.#shellVisibilityObserver.observe(this.#sceneLayer, {
      attributeFilter: ["style"],
      attributes: true,
    });
    this.#host.addEventListener("drawover:clear-request", this.#onClearBound);
    this.#unsubscribe = this.#store.subscribe(() => {
      this.#pruneSelection();
      this.#render();
    });
    this.#setTool("select");
    this.#setColor(COLORS[0]);
    this.#render();
  }

  get store(): SceneStore {
    return this.#store;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#invalidateImageImports();
    this.#cancelInlineEditor?.();
    this.#unsubscribe();
    this.#sceneLayer.removeEventListener(
      "pointerdown",
      this.#onPointerDownBound,
    );
    this.#sceneLayer.removeEventListener(
      "pointermove",
      this.#onPointerMoveBound,
    );
    this.#sceneLayer.removeEventListener("pointerup", this.#onPointerUpBound);
    this.#sceneLayer.removeEventListener(
      "pointercancel",
      this.#onPointerCancelBound,
    );
    this.#sceneLayer.removeEventListener("dblclick", this.#onDoubleClickBound);
    document.removeEventListener("keydown", this.#onKeyDownBound);
    document.removeEventListener("paste", this.#onPasteBound);
    window.removeEventListener("scroll", this.#onViewportChangeBound);
    window.removeEventListener("resize", this.#onViewportChangeBound);
    this.#toolbar.removeEventListener(
      "pointerdown",
      this.#onToolbarPointerDownBound,
      true,
    );
    this.#shellVisibilityObserver.disconnect();
    this.#host.removeEventListener(
      "drawover:clear-request",
      this.#onClearBound,
    );
    this.#toolGroup.remove();
    this.#historyGroup.remove();
    this.#zGroup.remove();
    this.#palette.remove();
    this.#status.remove();
    this.#fileInput.remove();
    this.#style.remove();
  }

  #buildToolGroup(): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "scene-tools";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Scene tools");
    const definitions: readonly [SceneTool, string, string][] = [
      ["select", "Select", "Select and move annotations"],
      ["rect", "Rect", "Draw rectangle"],
      ["arrow", "Arrow", "Draw arrow"],
      ["text", "Text", "Insert text"],
      ["image", "Image", "Insert image from file"],
    ];
    for (const [tool, text, label] of definitions) {
      const button = createButton(text, label);
      button.dataset.tool = tool;
      button.addEventListener("click", () => {
        this.#ensureSceneMode();
        if (tool === "image") {
          this.#setTool("select");
          this.#fileInput.click();
        } else {
          this.#setTool(tool);
        }
      });
      this.#toolButtons.set(tool, button);
      group.append(button);
    }
    return group;
  }

  #buildHistoryGroup(): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "history-tools";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "History");
    const undo = createButton("<", "Undo");
    undo.dataset.command = "undo";
    undo.title = "Undo";
    undo.addEventListener("click", () => this.#undo());
    const redo = createButton(">", "Redo");
    redo.dataset.command = "redo";
    redo.title = "Redo";
    redo.addEventListener("click", () => this.#redo());
    group.append(undo, redo);
    return group;
  }

  #buildZGroup(): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "z-tools";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Layer order");
    const definitions: readonly [ZOrderAction, string, string][] = [
      ["back", "|<", "Send to back"],
      ["backward", "<", "Send backward"],
      ["forward", ">", "Bring forward"],
      ["front", ">|", "Bring to front"],
    ];
    for (const [action, text, label] of definitions) {
      const button = createButton(text, label);
      button.dataset.zOrder = action;
      button.title = label;
      button.addEventListener("click", () => this.#reorder(action));
      group.append(button);
    }
    return group;
  }

  #buildPalette(): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "palette";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Drawing color");
    for (const color of COLORS) {
      const button = createButton("", `Use color ${color}`);
      button.style.background = color;
      button.dataset.color = color;
      button.addEventListener("click", () => this.#setColor(color));
      this.#colorButtons.set(color, button);
      group.append(button);
    }
    const fill = createButton("Fill", "Toggle rectangle fill");
    fill.dataset.fillToggle = "true";
    fill.setAttribute("aria-pressed", "true");
    fill.addEventListener("click", () => {
      this.#fillEnabled = !this.#fillEnabled;
      fill.setAttribute("aria-pressed", String(this.#fillEnabled));
    });
    group.append(fill);
    return group;
  }

  #setTool(tool: SceneTool): void {
    this.#tool = tool;
    this.#session = undefined;
    for (const [candidate, button] of this.#toolButtons) {
      button.setAttribute("aria-pressed", String(candidate === tool));
    }
    this.#sceneLayer.style.cursor = tool === "select" ? "default" : "crosshair";
    this.#render();
  }

  #setColor(color: (typeof COLORS)[number]): void {
    this.#color = color;
    for (const [candidate, button] of this.#colorButtons) {
      button.setAttribute("aria-pressed", String(candidate === color));
    }
  }

  #ensureSceneMode(): void {
    if (this.#host.dataset.drawoverMode !== "scene") {
      this.#shadow
        .querySelector<HTMLButtonElement>('button[data-mode="scene"]')
        ?.click();
    }
  }

  #isSceneActive(): boolean {
    const toolbar = this.#shadow.querySelector<HTMLElement>(".toolbar");
    return (
      this.#host.dataset.drawoverMode === "scene" && toolbar?.hidden === false
    );
  }

  #onPointerDown(event: PointerEvent): void {
    if (!this.#isSceneActive() || event.button !== 0) return;
    const point = eventPoint(event);
    const target = event.target instanceof Element ? event.target : undefined;
    const handle = target?.closest<SVGElement>("[data-handle]")?.dataset.handle;
    const node = target?.closest<SVGGElement>("[data-annotation-id]");
    const id = node?.dataset.annotationId;
    const repeatedClick =
      id !== undefined &&
      this.#lastAnnotationClick?.id === id &&
      event.timeStamp - this.#lastAnnotationClick.at < 500;
    if (this.#tool === "select" && repeatedClick && id) {
      this.#lastAnnotationClick = undefined;
      const annotation = this.#store.getById(id);
      if (annotation?.type === "rect" || annotation?.type === "text") {
        this.#openTextEditor(
          { x: annotation.geometry.x, y: annotation.geometry.y },
          { x: event.clientX, y: event.clientY },
          annotation,
        );
        event.preventDefault();
        return;
      }
    }
    const onlySelected = this.#onlySelected();
    if (this.#tool === "select" && handle && onlySelected) {
      this.#beginHandleSession(handle, onlySelected, point, event.pointerId);
      this.#capture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (this.#tool === "rect" || this.#tool === "arrow") {
      const preview =
        this.#tool === "rect"
          ? this.#newRect(point, point)
          : this.#newArrow(point, point);
      this.#session = {
        kind: "draw",
        pointerId: event.pointerId,
        start: point,
        preview,
      };
      this.#capture(event.pointerId);
      this.#render();
      event.preventDefault();
      return;
    }

    if (this.#tool === "text") {
      this.#openTextEditor(point, { x: event.clientX, y: event.clientY });
      event.preventDefault();
      return;
    }

    if (id) {
      if (event.shiftKey) {
        if (this.#selectedIds.has(id)) this.#selectedIds.delete(id);
        else this.#selectedIds.add(id);
      } else if (!this.#selectedIds.has(id)) {
        this.#selectedIds = new Set([id]);
      }
      if (!this.#selectedIds.has(id)) {
        this.#render();
        return;
      }
      const selectedBeforeDuplicate = new Set(this.#selectedIds);
      const originals = new Map<string, Annotation>();
      let z = nextZ(this.#store.getSnapshot());
      for (const selectedId of this.#selectedIds) {
        const annotation = this.#store.getById(selectedId);
        if (!annotation) continue;
        originals.set(
          selectedId,
          event.altKey
            ? duplicateAnnotation(annotation, { x: 0, y: 0 }, z++)
            : annotation,
        );
      }
      if (event.altKey)
        this.#selectedIds = new Set(
          [...originals.values()].map(({ id: duplicateId }) => duplicateId),
        );
      this.#session = {
        kind: "move",
        pointerId: event.pointerId,
        start: point,
        clickedId: id,
        originals,
        drafts: new Map(originals),
        duplicate: event.altKey,
        selectedBeforeDuplicate,
      };
      this.#capture(event.pointerId);
      this.#render();
      event.preventDefault();
      return;
    }

    if (!event.shiftKey) this.#selectedIds.clear();
    this.#session = {
      kind: "marquee",
      pointerId: event.pointerId,
      start: point,
      current: { ...point, width: 0, height: 0 },
      additive: event.shiftKey,
    };
    this.#capture(event.pointerId);
    this.#render();
  }

  #beginHandleSession(
    handle: string,
    annotation: Annotation,
    point: DocumentPoint,
    pointerId: number,
  ): void {
    if (handle === "rotate") {
      const center = {
        x: annotation.geometry.x + annotation.geometry.width / 2,
        y: annotation.geometry.y + annotation.geometry.height / 2,
      };
      this.#session = {
        kind: "rotate",
        pointerId,
        original: annotation,
        draft: annotation,
        center,
        startAngle: angleBetween(center, point),
      };
      return;
    }
    if (
      (handle === "arrow-start" || handle === "arrow-end") &&
      annotation.type === "arrow"
    ) {
      this.#session = {
        kind: "arrow-endpoint",
        pointerId,
        original: annotation,
        draft: annotation,
        endpoint: handle === "arrow-start" ? "start" : "end",
      };
      return;
    }
    if (
      handle === "ne" ||
      handle === "nw" ||
      handle === "se" ||
      handle === "sw"
    ) {
      this.#session = {
        kind: "resize",
        pointerId,
        original: annotation,
        draft: annotation,
        handle,
      };
    }
  }

  #onPointerMove(event: PointerEvent): void {
    const session = this.#session;
    if (session?.pointerId !== event.pointerId) return;
    const point = eventPoint(event);
    switch (session.kind) {
      case "draw":
        session.preview =
          session.preview.type === "rect"
            ? this.#newRect(session.start, point, session.preview.id)
            : this.#newArrow(session.start, point, session.preview.id);
        break;
      case "marquee":
        session.current = normalizeRect(session.start, point);
        break;
      case "move": {
        const delta = {
          x: point.x - session.start.x,
          y: point.y - session.start.y,
        };
        session.drafts = new Map(
          [...session.originals].map(([id, annotation]) => [
            id,
            translateAnnotation(annotation, delta),
          ]),
        );
        break;
      }
      case "resize":
        session.draft = resizeAnnotation(
          session.original,
          session.handle,
          point,
        );
        break;
      case "rotate": {
        const delta = angleBetween(session.center, point) - session.startAngle;
        let rotation = normalizeDegrees(session.original.rotation + delta);
        if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
        session.draft = { ...session.original, rotation };
        break;
      }
      case "arrow-endpoint":
        session.draft = updateArrowEndpoint(
          session.original,
          session.endpoint,
          point,
        );
        break;
    }
    this.#render();
    event.preventDefault();
  }

  #onPointerUp(event: PointerEvent): void {
    const session = this.#session;
    if (session?.pointerId !== event.pointerId) return;
    this.#session = undefined;
    this.#release(event.pointerId);
    switch (session.kind) {
      case "draw":
        if (isMeaningfulDraw(session.preview)) {
          this.#store.create(session.preview, `Create ${session.preview.type}`);
          this.#selectedIds = new Set([session.preview.id]);
        }
        break;
      case "marquee": {
        const selected = this.#store
          .getSnapshot()
          .annotations.filter(
            (annotation) =>
              annotation.type !== "note" &&
              intersects(visualBounds(annotation), session.current),
          )
          .map(({ id }) => id);
        if (!session.additive) this.#selectedIds.clear();
        for (const id of selected) this.#selectedIds.add(id);
        break;
      }
      case "move":
        if (hasMoved(session.originals, session.drafts)) {
          this.#lastAnnotationClick = undefined;
          this.#suppressDoubleClickUntil = event.timeStamp + 600;
        } else {
          this.#lastAnnotationClick = {
            id: session.clickedId,
            at: event.timeStamp,
          };
        }
        this.#store.transaction(
          session.duplicate ? "Duplicate and move" : "Move selection",
          (transaction) => {
            for (const [id, draft] of session.drafts) {
              if (session.duplicate) transaction.create(draft);
              else transaction.update(id, () => draft);
            }
          },
        );
        break;
      case "resize":
      case "rotate":
      case "arrow-endpoint":
        this.#store.update(
          session.original.id,
          () => session.draft,
          session.kind,
        );
        break;
    }
    this.#render();
  }

  #cancelPointerSession(pointerId: number): void {
    const session = this.#session;
    if (session?.pointerId !== pointerId) return;
    this.#session = undefined;
    this.#release(pointerId);
    if (session.kind === "move" && session.duplicate) {
      this.#selectedIds = new Set(session.selectedBeforeDuplicate);
    }
    this.#render();
  }

  #cancelActivePointerSession(): void {
    const session = this.#session;
    if (session) this.#cancelPointerSession(session.pointerId);
  }

  #undo(): void {
    this.#invalidateImageImports();
    this.#store.undo();
  }

  #redo(): void {
    this.#invalidateImageImports();
    this.#store.redo();
  }

  #invalidateImageImports(): void {
    this.#imageImportGeneration += 1;
  }

  #isImageImportCurrent(generation: number): boolean {
    return !this.#destroyed && generation === this.#imageImportGeneration;
  }

  #onDoubleClick(event: MouseEvent): void {
    if (
      !this.#isSceneActive() ||
      this.#inlineEditor ||
      event.timeStamp < this.#suppressDoubleClickUntil
    )
      return;
    const target = event.target instanceof Element ? event.target : undefined;
    const id = target?.closest<SVGGElement>("[data-annotation-id]")?.dataset
      .annotationId;
    const annotation = id ? this.#store.getById(id) : undefined;
    if (
      !annotation ||
      (annotation.type !== "rect" && annotation.type !== "text")
    )
      return;
    const point = { x: annotation.geometry.x, y: annotation.geometry.y };
    this.#openTextEditor(
      point,
      { x: event.clientX, y: event.clientY },
      annotation,
    );
    event.preventDefault();
  }

  #openTextEditor(
    documentPoint: DocumentPoint,
    viewportPoint: DocumentPoint,
    annotation?: RectAnnotation | TextAnnotation,
  ): void {
    if (this.#inlineEditor) return;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "inline-editor";
    input.setAttribute(
      "aria-label",
      annotation?.type === "rect" ? "Rectangle label" : "Annotation text",
    );
    input.value =
      annotation?.type === "rect"
        ? (annotation.label ?? "")
        : annotation?.type === "text"
          ? annotation.text
          : "";
    input.placeholder =
      annotation?.type === "rect" ? "Rectangle label" : "Type text";
    const editorWidth = Math.min(260, Math.max(0, window.innerWidth - 24));
    const maxLeft = Math.max(8, window.innerWidth - editorWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - 44);
    input.style.left = `${String(clamp(viewportPoint.x, 8, maxLeft))}px`;
    input.style.top = `${String(clamp(viewportPoint.y, 8, maxTop))}px`;
    this.#shadow.querySelector(".root")?.append(input);
    this.#inlineEditor = input;
    let finished = false;
    const finish = (commit: boolean): void => {
      if (finished) return;
      finished = true;
      const value = input.value.trim();
      input.remove();
      if (this.#inlineEditor === input) {
        this.#inlineEditor = undefined;
        this.#cancelInlineEditor = undefined;
      }
      if (!commit) {
        if (!annotation) this.#setTool("select");
        return;
      }
      if (annotation?.type === "rect") {
        this.#store.update(
          annotation.id,
          (current) => {
            if (current.type !== "rect") return current;
            if (value.length === 0) {
              const updated = { ...current };
              delete updated.label;
              delete updated.labelAlign;
              return updated;
            }
            return {
              ...current,
              label: value,
              labelAlign: current.labelAlign ?? "center",
            };
          },
          "Label rectangle",
        );
      } else if (annotation?.type === "text") {
        if (value.length === 0) return;
        this.#store.update(
          annotation.id,
          (current) =>
            current.type === "text"
              ? {
                  ...current,
                  text: value,
                  geometry: {
                    ...current.geometry,
                    width: textWidth(value, current.fontSize),
                  },
                }
              : current,
          "Edit text",
        );
      } else {
        if (value.length === 0) {
          this.#setTool("select");
          return;
        }
        const created = this.#newText(documentPoint, value);
        this.#store.create(created, "Create text");
        this.#selectedIds = new Set([created.id]);
        this.#setTool("select");
      }
      this.#render();
    };
    this.#cancelInlineEditor = () => finish(false);
    input.addEventListener("keydown", (inputEvent) => {
      if (inputEvent.key === "Enter") {
        inputEvent.preventDefault();
        finish(true);
      } else if (inputEvent.key === "Escape") {
        inputEvent.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
    input.focus();
    input.select();
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (!this.#isSceneActive()) return;
    if (
      event.defaultPrevented ||
      event.composedPath().some(isTextEntry) ||
      isTextEntry(this.#shadow.activeElement) ||
      hasExternalFocus(this.#host)
    )
      return;
    const modifier = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (modifier && key === "z") {
      event.preventDefault();
      this.#cancelActivePointerSession();
      if (event.shiftKey) this.#redo();
      else this.#undo();
      return;
    }
    if (modifier && key === "y") {
      event.preventDefault();
      this.#cancelActivePointerSession();
      this.#redo();
      return;
    }
    if (modifier && key === "d") {
      event.preventDefault();
      this.#cancelActivePointerSession();
      this.#duplicateSelection();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this.#cancelActivePointerSession();
      this.#deleteSelection();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      const session = this.#session;
      if (session) this.#cancelPointerSession(session.pointerId);
      this.#setTool("select");
      return;
    }
    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      this.#cancelActivePointerSession();
      const action =
        event.key === "]"
          ? modifier && event.shiftKey
            ? "front"
            : "forward"
          : modifier && event.shiftKey
            ? "back"
            : "backward";
      this.#reorder(action);
      return;
    }
    const nudge = event.shiftKey ? 10 : 1;
    const delta =
      event.key === "ArrowLeft"
        ? { x: -nudge, y: 0 }
        : event.key === "ArrowRight"
          ? { x: nudge, y: 0 }
          : event.key === "ArrowUp"
            ? { x: 0, y: -nudge }
            : event.key === "ArrowDown"
              ? { x: 0, y: nudge }
              : undefined;
    if (delta) {
      event.preventDefault();
      this.#cancelActivePointerSession();
      this.#translateSelection(delta, "Nudge selection");
    }
  }

  async #onPaste(event: ClipboardEvent): Promise<void> {
    if (
      !this.#isSceneActive() ||
      event.defaultPrevented ||
      event.composedPath().some(isTextEntry) ||
      isTextEntry(this.#shadow.activeElement) ||
      hasExternalFocus(this.#host)
    )
      return;
    const file = [...(event.clipboardData?.files ?? [])].find(({ type }) =>
      type.startsWith("image/"),
    );
    if (!file) return;
    event.preventDefault();
    await this.#insertImage(file);
  }

  async #insertImage(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) return;
    const generation = this.#imageImportGeneration;
    const dataUrl = await readDataUrl(file);
    if (!this.#isImageImportCurrent(generation)) return;
    const dimensions = await readImageDimensions(dataUrl);
    if (!this.#isImageImportCurrent(generation)) return;
    const width = Math.min(320, Math.max(80, dimensions.width));
    const height = Math.max(60, width * (dimensions.height / dimensions.width));
    const center = viewportToDocument({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const annotation: Annotation = {
      id: createAnnotationId(),
      type: "image",
      geometry: {
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height,
      },
      z: nextZ(this.#store.getSnapshot()),
      rotation: 0,
      dataUrl,
      alt: file.name || "Pasted image",
      opacity: 1,
    };
    this.#store.create(annotation, "Insert image");
    this.#selectedIds = new Set([annotation.id]);
    this.#setTool("select");
  }

  #duplicateSelection(): void {
    if (this.#selectedIds.size === 0) return;
    const snapshot = this.#store.getSnapshot();
    let z = nextZ(snapshot);
    const duplicates = snapshot.annotations
      .filter(({ id }) => this.#selectedIds.has(id))
      .map((annotation) =>
        duplicateAnnotation(annotation, { x: 16, y: 16 }, z++),
      );
    this.#store.transaction("Duplicate selection", (transaction) => {
      for (const annotation of duplicates) transaction.create(annotation);
    });
    this.#selectedIds = new Set(duplicates.map(({ id }) => id));
    this.#render();
  }

  #deleteSelection(): void {
    if (this.#selectedIds.size === 0) return;
    const ids = [...this.#selectedIds];
    this.#store.transaction("Delete selection", (transaction) => {
      for (const id of ids) transaction.remove(id);
    });
    this.#selectedIds.clear();
    this.#render();
  }

  #translateSelection(delta: DocumentPoint, label: string): void {
    const ids = [...this.#selectedIds];
    if (ids.length === 0) return;
    this.#store.transaction(label, (transaction) => {
      for (const id of ids)
        transaction.update(id, (current) =>
          translateAnnotation(current, delta),
        );
    });
  }

  #reorder(action: ZOrderAction): void {
    if (this.#selectedIds.size === 0) return;
    const reordered = reorderAnnotations(
      this.#store.getSnapshot().annotations,
      this.#selectedIds,
      action,
    );
    this.#store.transaction(`Z-order ${action}`, (transaction) =>
      transaction.replaceAll(reordered),
    );
  }

  #newRect(
    start: DocumentPoint,
    end: DocumentPoint,
    id = createAnnotationId(),
  ): RectAnnotation {
    return {
      id,
      type: "rect",
      geometry: normalizeRect(start, end),
      z: nextZ(this.#store.getSnapshot()),
      rotation: 0,
      stroke: this.#color,
      fill: this.#fillEnabled ? `${this.#color}22` : "transparent",
      strokeWidth: 3,
    };
  }

  #newArrow(
    start: DocumentPoint,
    end: DocumentPoint,
    id = createAnnotationId(),
  ): ArrowAnnotation {
    return {
      id,
      type: "arrow",
      geometry: arrowGeometry(start, end),
      z: nextZ(this.#store.getSnapshot()),
      rotation: 0,
      start: { ...start },
      end: { ...end },
      color: this.#color,
      strokeWidth: 3,
    };
  }

  #newText(point: DocumentPoint, text: string): TextAnnotation {
    const fontSize = 20;
    return {
      id: createAnnotationId(),
      type: "text",
      geometry: {
        ...point,
        width: textWidth(text, fontSize),
        height: fontSize * 1.4,
      },
      z: nextZ(this.#store.getSnapshot()),
      rotation: 0,
      text,
      color: this.#color,
      fontSize,
      align: "left",
    };
  }

  #capture(pointerId: number): void {
    try {
      this.#sceneLayer.setPointerCapture(pointerId);
    } catch {
      // Synthetic test events may not have an active browser pointer.
    }
  }

  #release(pointerId: number): void {
    try {
      if (this.#sceneLayer.hasPointerCapture(pointerId))
        this.#sceneLayer.releasePointerCapture(pointerId);
    } catch {
      // Synthetic test events may not have an active browser pointer.
    }
  }

  #onlySelected(): Annotation | undefined {
    if (this.#selectedIds.size !== 1) return undefined;
    const id = this.#selectedIds.values().next().value;
    return id ? this.#store.getById(id) : undefined;
  }

  #pruneSelection(): void {
    const ids = new Set(
      this.#store
        .getSnapshot()
        .annotations.filter(({ type }) => type !== "note")
        .map(({ id }) => id),
    );
    this.#selectedIds = new Set(
      [...this.#selectedIds].filter((id) => ids.has(id)),
    );
  }

  #render(): void {
    if (this.#destroyed) return;
    const snapshot = this.#store.getSnapshot();
    const sceneSnapshot = {
      ...snapshot,
      annotations: snapshot.annotations.filter(({ type }) => type !== "note"),
    };
    if (this.#toolbar.hidden) {
      this.#renderer.render(
        { ...sceneSnapshot, annotations: [] },
        { selectedIds: new Set() },
      );
      this.#updateControls(sceneSnapshot.annotations.length);
      return;
    }
    const session = this.#session;
    const overrides = new Map<string, Annotation>();
    const previews: Annotation[] = [];
    let marquee: DocumentRect | undefined;
    if (session?.kind === "draw") previews.push(session.preview);
    if (session?.kind === "move") {
      if (session.duplicate) previews.push(...session.drafts.values());
      else
        for (const [id, annotation] of session.drafts)
          overrides.set(id, annotation);
    }
    if (
      session?.kind === "resize" ||
      session?.kind === "rotate" ||
      session?.kind === "arrow-endpoint"
    ) {
      overrides.set(session.original.id, session.draft);
    }
    if (session?.kind === "marquee") marquee = session.current;
    this.#renderer.render(sceneSnapshot, {
      selectedIds:
        this.#tool === "select" ? this.#selectedIds : new Set<string>(),
      overrides,
      previews,
      ...(marquee ? { marquee } : {}),
    });
    this.#updateControls(sceneSnapshot.annotations.length);
  }

  #updateControls(annotationCount: number): void {
    this.#status.textContent = `${String(annotationCount)} items / ${String(this.#selectedIds.size)} selected`;
    const undo = this.#historyGroup.querySelector<HTMLButtonElement>(
      '[data-command="undo"]',
    );
    const redo = this.#historyGroup.querySelector<HTMLButtonElement>(
      '[data-command="redo"]',
    );
    if (undo) undo.disabled = !this.#store.canUndo();
    if (redo) redo.disabled = !this.#store.canRedo();
    for (const button of this.#zGroup.querySelectorAll<HTMLButtonElement>(
      "button",
    )) {
      button.disabled = this.#selectedIds.size === 0;
    }
  }
}

export function createSceneEditor(options: SceneEditorOptions): SceneEditor {
  return new SceneEditor(options);
}

function createButton(text: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", label);
  return button;
}

function eventPoint(event: MouseEvent): DocumentPoint {
  return viewportToDocument({ x: event.clientX, y: event.clientY });
}

function angleBetween(center: DocumentPoint, point: DocumentPoint): number {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function textWidth(text: string, fontSize: number): number {
  return Math.max(40, text.length * fontSize * 0.62);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function hasExternalFocus(host: HTMLElement): boolean {
  const active = document.activeElement;
  return (
    active instanceof HTMLElement &&
    active !== document.body &&
    active !== document.documentElement &&
    active !== host
  );
}

function isMeaningfulDraw(
  annotation: ArrowAnnotation | RectAnnotation,
): boolean {
  if (annotation.type === "rect") {
    return annotation.geometry.width >= 4 && annotation.geometry.height >= 4;
  }
  return (
    Math.hypot(
      annotation.end.x - annotation.start.x,
      annotation.end.y - annotation.start.y,
    ) >= 4
  );
}

function hasMoved(
  originals: ReadonlyMap<string, Annotation>,
  drafts: ReadonlyMap<string, Annotation>,
): boolean {
  for (const [id, original] of originals) {
    const draft = drafts.get(id);
    if (
      draft &&
      (draft.geometry.x !== original.geometry.x ||
        draft.geometry.y !== original.geometry.y)
    )
      return true;
  }
  return false;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The image could not be read as a data URL."));
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("The image could not be read.")),
    );
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () =>
      resolve({
        width: image.naturalWidth || 240,
        height: image.naturalHeight || 160,
      }),
    );
    image.addEventListener("error", () => resolve({ width: 240, height: 160 }));
    image.src = dataUrl;
  });
}
