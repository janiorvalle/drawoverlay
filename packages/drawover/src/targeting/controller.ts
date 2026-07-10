import type { ElementRef } from "../contracts/index.js";
import { captureElementRef } from "./element-ref.js";

export const ELEMENT_SELECTED_EVENT = "drawover:element-selected";
export const ELEMENT_COMMENT_REQUEST_EVENT = "drawover:element-comment-request";

export interface ElementTargetingController {
  destroy(): void;
}

export function createElementTargetingController(
  host: HTMLElement,
): ElementTargetingController {
  const shadow = host.shadowRoot;
  const layer = shadow?.querySelector<HTMLElement>(
    '[data-layer="element-select"]',
  );
  const root = shadow?.querySelector<HTMLElement>(".root");
  if (!shadow || !layer || !root) {
    throw new Error("Drawover element-select layer was not found.");
  }

  const highlight = document.createElement("div");
  highlight.dataset.targetingHighlight = "true";
  setHighlightStyles(highlight, "hover");
  const label = document.createElement("span");
  setLabelStyles(label);
  highlight.append(label);

  // Selections are deliberate, sticky, and additive: every click pins
  // another box with its own Add comment affordance, and clicking a pinned
  // element again unpins it. Commenting only happens when the user asks.
  const selections = new Map<Element, HTMLElement>();

  const createSelectionBox = (element: Element): HTMLElement => {
    const box = document.createElement("div");
    box.dataset.targetingSelection = "true";
    setHighlightStyles(box, "selection");
    const commentButton = document.createElement("button");
    commentButton.type = "button";
    commentButton.textContent = "Add comment";
    commentButton.setAttribute("aria-label", "Add comment");
    setCommentButtonStyles(commentButton);
    commentButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestComment(element);
    });
    box.append(commentButton);
    return box;
  };

  let hovered: Element | undefined;
  let destroyed = false;

  const isActive = (): boolean => {
    const trigger = shadow.querySelector<HTMLElement>(".trigger");
    return (
      host.isConnected &&
      host.dataset.drawoverMode === "element-select" &&
      trigger?.getAttribute("aria-expanded") === "true"
    );
  };

  const clearHighlight = (): void => {
    hovered = undefined;
    highlight.remove();
  };

  const clearSelections = (): void => {
    for (const box of selections.values()) box.remove();
    selections.clear();
  };

  const deselect = (element: Element): void => {
    selections.get(element)?.remove();
    selections.delete(element);
  };

  const positionBox = (box: HTMLElement, element: Element): boolean => {
    if (!element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    box.style.left = `${String(rect.left)}px`;
    box.style.top = `${String(rect.top)}px`;
    box.style.width = `${String(rect.width)}px`;
    box.style.height = `${String(rect.height)}px`;
    return true;
  };

  const renderHighlight = (element: Element): void => {
    if (!positionBox(highlight, element)) {
      clearHighlight();
      return;
    }
    const rect = element.getBoundingClientRect();
    const reference = captureElementRef(element);
    highlight.dataset.targetSelector = reference.selector.primary;
    label.textContent = `${reference.facts.tag}  ${reference.selector.primary}`;
    label.style.top = rect.top < 28 ? "100%" : "auto";
    label.style.bottom = rect.top < 28 ? "auto" : "100%";
    if (!highlight.isConnected) layer.append(highlight);
  };

  const renderSelections = (): void => {
    for (const [element, box] of selections) {
      if (!positionBox(box, element)) {
        deselect(element);
        continue;
      }
      const rect = element.getBoundingClientRect();
      const commentButton = box.querySelector<HTMLElement>("button");
      if (commentButton) {
        commentButton.style.top = rect.top < 44 ? "calc(100% + 6px)" : "auto";
        commentButton.style.bottom =
          rect.top < 44 ? "auto" : "calc(100% + 6px)";
      }
      // Selection boxes carry a real button; they mount on the root, not
      // inside the aria-hidden decorative layer.
      if (!box.isConnected) root.append(box);
    }
  };

  const requestComment = (element: Element): void => {
    if (!element.isConnected) return;
    const detail: ElementRef = captureElementRef(element);
    host.dispatchEvent(
      new CustomEvent<ElementRef>(ELEMENT_COMMENT_REQUEST_EVENT, { detail }),
    );
  };

  const targetAt = (clientX: number, clientY: number): Element | undefined => {
    const target = document.elementFromPoint(clientX, clientY) ?? undefined;
    if (!target || target === host || target.closest(`#${host.id}`)) {
      return undefined;
    }
    return target;
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!isActive()) {
      clearHighlight();
      clearSelections();
      return;
    }
    const target = targetAt(event.clientX, event.clientY);
    if (!target || selections.has(target)) {
      clearHighlight();
      return;
    }
    hovered = target;
    renderHighlight(target);
  };

  const onClick = (event: MouseEvent): void => {
    // Programmatic clicks (shell mode switches, host-app frameworks) are
    // never element picks; only trusted user clicks select or get consumed.
    if (!event.isTrusted) return;
    if (!isActive()) {
      clearHighlight();
      clearSelections();
      return;
    }
    const target = targetAt(event.clientX, event.clientY);
    if (!target) return;
    // Reviewing must never operate the page: a click that picks an element
    // is consumed before host links, buttons, or framework handlers see it.
    event.preventDefault();
    event.stopPropagation();
    if (selections.has(target)) {
      // Clicking a pinned element again unpins it.
      deselect(target);
      return;
    }
    selections.set(target, createSelectionBox(target));
    hovered = undefined;
    highlight.remove();
    renderSelections();
    const detail: ElementRef = captureElementRef(target);
    host.dispatchEvent(
      new CustomEvent<ElementRef>(ELEMENT_SELECTED_EVENT, { detail }),
    );
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!isActive() || !hovered) clearHighlight();
    if (!isActive()) {
      clearSelections();
      return;
    }
    if (event.key === "Escape" && selections.size > 0) {
      clearSelections();
    } else {
      renderSelections();
    }
  };

  const onShellStateChange = (event: MouseEvent): void => {
    if (event.composedPath().includes(host) && !isActive()) {
      clearHighlight();
      clearSelections();
    }
  };

  const onViewportChange = (): void => {
    if (!isActive()) {
      clearHighlight();
      clearSelections();
      return;
    }
    if (hovered) renderHighlight(hovered);
    renderSelections();
  };

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("click", onClick, true);
  document.addEventListener("click", onShellStateChange);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("scroll", onViewportChange, true);
  window.addEventListener("resize", onViewportChange);

  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("click", onShellStateChange);
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
      clearHighlight();
      clearSelections();
    },
  };
}

function setHighlightStyles(
  highlight: HTMLElement,
  variant: "hover" | "selection",
): void {
  const styles = {
    background: variant === "hover" ? "var(--dv-accent-soft)" : "transparent",
    border:
      variant === "hover"
        ? "2px solid var(--dv-accent)"
        : "2px solid var(--dv-accent)",
    borderStyle: variant === "hover" ? "solid" : "solid",
    boxSizing: "border-box",
    pointerEvents: "none",
    position: "fixed",
    zIndex: variant === "hover" ? "1" : "2",
  } as const;
  for (const [property, value] of Object.entries(styles)) {
    highlight.style.setProperty(toKebabCase(property), value, "important");
  }
  if (variant === "selection") {
    highlight.style.setProperty(
      "box-shadow",
      "0 0 0 4px var(--dv-accent-soft)",
      "important",
    );
  }
}

function setCommentButtonStyles(button: HTMLElement): void {
  const styles = {
    background: "var(--dv-accent)",
    border: "0",
    borderRadius: "6px",
    bottom: "calc(100% + 6px)",
    color: "var(--dv-accent-text)",
    cursor: "pointer",
    font: "600 11px/1 var(--dv-font-sans)",
    padding: "6px 9px",
    pointerEvents: "auto",
    position: "absolute",
    right: "-2px",
    whiteSpace: "nowrap",
  } as const;
  for (const [property, value] of Object.entries(styles)) {
    button.style.setProperty(toKebabCase(property), value, "important");
  }
}

function setLabelStyles(label: HTMLElement): void {
  const styles = {
    background: "var(--dv-surface-raised-opaque)",
    border: "1px solid var(--dv-border)",
    borderRadius: "5px",
    bottom: "100%",
    color: "var(--dv-selected-text)",
    font: "500 11px/1.5 var(--dv-font-mono)",
    left: "-2px",
    maxWidth: "min(420px, calc(100vw - 16px))",
    overflow: "hidden",
    padding: "3px 5px",
    pointerEvents: "none",
    position: "absolute",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as const;
  for (const [property, value] of Object.entries(styles)) {
    label.style.setProperty(toKebabCase(property), value, "important");
  }
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
