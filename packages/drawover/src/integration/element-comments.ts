import type {
  ElementPinAnnotation,
  ElementRef,
  SceneStore,
} from "../contracts/index.js";
import { documentToViewport } from "../coordinates.js";
import { createAnnotationId, nextZ } from "../scene/model.js";
import { ELEMENT_SELECTED_EVENT } from "../targeting/controller.js";
import {
  resolveElement,
  resolveElementDocumentRect,
} from "../targeting/resolve.js";

interface ElementCommentsOptions {
  host: HTMLElement;
  store: SceneStore;
}

export interface ElementCommentsController {
  destroy(): void;
}

interface CommentTarget {
  annotation?: ElementPinAnnotation;
  reference: ElementRef;
}

export function createElementCommentsController(
  options: ElementCommentsOptions,
): ElementCommentsController {
  const { host, store } = options;
  const shadow = host.shadowRoot;
  const root = shadow?.querySelector<HTMLElement>(".root");
  const scene = shadow?.querySelector<SVGSVGElement>('[data-layer="scene"]');
  const trigger = shadow?.querySelector<HTMLElement>(".trigger");
  if (!shadow || !root || !scene || !trigger) {
    throw new Error("Drawover element comments could not attach to the shell.");
  }

  const style = document.createElement("style");
  style.textContent = elementCommentStyles;
  const popover = document.createElement("div");
  popover.className = "element-comment-popover";
  popover.hidden = true;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-modal", "false");
  popover.setAttribute("aria-labelledby", "drawover-comment-title");
  const form = document.createElement("form");
  form.className = "element-comment-form";

  const chip = document.createElement("code");
  chip.className = "element-comment-chip";
  const heading = document.createElement("h2");
  heading.id = "drawover-comment-title";
  const textarea = document.createElement("textarea");
  textarea.required = true;
  textarea.maxLength = 1_000;
  textarea.setAttribute("aria-label", "Element comment");
  const actions = document.createElement("div");
  actions.className = "element-comment-actions";
  const cancel = button("Cancel", "Cancel element comment");
  const save = button("Save", "Save element comment");
  save.type = "submit";
  save.className = "element-comment-save";
  actions.append(cancel, save);
  form.append(chip, heading, textarea, actions);
  popover.append(form);
  shadow.append(style);
  root.append(popover);

  let target: CommentTarget | undefined;
  let returnFocus: HTMLElement | undefined;
  let destroyed = false;

  const close = (): void => {
    const focusTarget =
      returnFocus?.isConnected === true ? returnFocus : trigger;
    target = undefined;
    returnFocus = undefined;
    popover.hidden = true;
    textarea.value = "";
    window.setTimeout(() => {
      if (focusTarget.isConnected) focusTarget.focus();
      else if (trigger.isConnected) trigger.focus();
    }, 0);
  };

  const position = (): void => {
    if (!target || popover.hidden) return;
    const bounds = resolveElementDocumentRect(target.reference);
    const point = documentToViewport({
      x: bounds.x + bounds.width,
      y: bounds.y,
    });
    const width = Math.min(300, Math.max(0, window.innerWidth - 16));
    const left = clamp(
      point.x + 14,
      8,
      Math.max(8, window.innerWidth - width - 8),
    );
    const top =
      point.y + 180 <= window.innerHeight
        ? point.y + 14
        : Math.max(8, point.y - 180);
    popover.style.left = `${String(left)}px`;
    popover.style.top = `${String(top)}px`;
  };

  const open = (next: CommentTarget): void => {
    target = next;
    const active = shadow.activeElement ?? document.activeElement;
    const referencedElement = resolveElement(next.reference);
    returnFocus =
      !next.annotation && referencedElement instanceof HTMLElement
        ? referencedElement
        : active instanceof HTMLElement &&
            active !== host &&
            active !== document.body &&
            active !== document.documentElement
          ? active
          : referencedElement instanceof HTMLElement
            ? referencedElement
            : trigger;
    heading.textContent = next.annotation ? "Edit comment" : "Add comment";
    chip.textContent = next.reference.selector.primary;
    chip.title = next.reference.selector.primary;
    textarea.value = next.annotation?.comment ?? "";
    popover.hidden = false;
    position();
    textarea.focus();
    textarea.select();
  };

  const onElementSelected = (event: Event): void => {
    const reference = (event as CustomEvent<ElementRef>).detail;
    open({ reference });
  };

  const onSceneDoubleClick = (event: MouseEvent): void => {
    const element = event.target instanceof Element ? event.target : undefined;
    const id = element?.closest<SVGGElement>(
      '[data-annotation-type="element-pin"]',
    )?.dataset.annotationId;
    const annotation = id ? store.getById(id) : undefined;
    if (annotation?.type !== "element-pin") return;
    event.preventDefault();
    open({ annotation, reference: annotation.element });
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || popover.hidden) return;
    event.preventDefault();
    close();
  };

  const onClear = (): void => close();
  const observer = new MutationObserver(() => {
    if (trigger.getAttribute("aria-expanded") !== "true") close();
  });
  observer.observe(trigger, {
    attributeFilter: ["aria-expanded"],
    attributes: true,
  });

  cancel.addEventListener("click", close);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const current = target;
    const comment = textarea.value.trim();
    if (!current || comment.length === 0) return;

    if (current.annotation) {
      store.update(
        current.annotation.id,
        (annotation) =>
          annotation.type === "element-pin"
            ? { ...annotation, comment }
            : annotation,
        "Edit element comment",
      );
    } else {
      const bounds = current.reference.facts.bbox;
      const radius = 13;
      store.create(
        {
          id: createAnnotationId(),
          type: "element-pin",
          geometry: {
            x: bounds.x + bounds.width - radius,
            y: bounds.y - radius,
            width: 26,
            height: 26,
          },
          z: nextZ(store.getSnapshot()),
          rotation: 0,
          comment,
          element: current.reference,
          elementOffset: {
            x: bounds.width - radius,
            y: -radius,
          },
        },
        "Create element comment",
      );
    }
    close();
  });
  host.addEventListener(ELEMENT_SELECTED_EVENT, onElementSelected);
  host.addEventListener("drawover:clear-request", onClear);
  scene.addEventListener("dblclick", onSceneDoubleClick);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("scroll", position, true);
  window.addEventListener("scroll", position, { passive: true });
  window.addEventListener("resize", position);

  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      host.removeEventListener(ELEMENT_SELECTED_EVENT, onElementSelected);
      host.removeEventListener("drawover:clear-request", onClear);
      scene.removeEventListener("dblclick", onSceneDoubleClick);
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("scroll", position, true);
      window.removeEventListener("scroll", position);
      window.removeEventListener("resize", position);
      popover.remove();
      style.remove();
    },
  };
}

function button(text: string, label: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.setAttribute("aria-label", label);
  return element;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

const elementCommentStyles = `
.element-comment-popover {
  position: fixed;
  z-index: 3;
  display: grid;
  width: min(300px, calc(100vw - 16px));
  padding: 12px;
  border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius);
  background: var(--dv-surface-raised);
  box-shadow: var(--dv-shadow);
  backdrop-filter: var(--dv-blur);
  -webkit-backdrop-filter: var(--dv-blur);
  color: var(--dv-text);
  pointer-events: auto;
  gap: 10px;
}

.element-comment-chip {
  justify-self: start;
  max-width: 100%;
  overflow: hidden;
  padding: 2px 7px;
  border: 1px solid var(--dv-border);
  border-radius: 5px;
  background: var(--dv-accent-soft);
  color: var(--dv-selected-text);
  font: 500 11px/1.5 var(--dv-font-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.element-comment-form {
  display: grid;
  gap: 10px;
}

.element-comment-popover h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.element-comment-popover textarea {
  width: 100%;
  min-height: 86px;
  resize: vertical;
  padding: 8px;
  border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius-inner);
  background: var(--dv-accent-soft);
  color: var(--dv-text);
  font: inherit;
  line-height: 1.45;
}

.element-comment-popover textarea:focus-visible {
  border-color: var(--dv-focus-ring);
  outline: none;
}

.element-comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.element-comment-actions button {
  min-width: 68px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dv-border);
  color: var(--dv-muted);
}

.element-comment-actions button:hover {
  color: var(--dv-text);
  background: var(--dv-accent-soft);
}

.element-comment-save,
.element-comment-actions button.element-comment-save {
  border-color: transparent;
  background: var(--dv-accent);
  color: var(--dv-accent-text);
  font-weight: 600;
}

.element-comment-actions button.element-comment-save:hover {
  color: var(--dv-accent-text);
  background: var(--dv-accent);
  filter: brightness(1.08);
}
`;
