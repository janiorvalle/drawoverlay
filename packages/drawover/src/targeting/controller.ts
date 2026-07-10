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

  // Selection is a deliberate, sticky state: clicking pins this box and the
  // Add comment affordance; commenting only happens when the user asks.
  const selectionBox = document.createElement("div");
  selectionBox.dataset.targetingSelection = "true";
  setHighlightStyles(selectionBox, "selection");
  const commentButton = document.createElement("button");
  commentButton.type = "button";
  commentButton.textContent = "Add comment";
  commentButton.setAttribute("aria-label", "Add comment");
  setCommentButtonStyles(commentButton);
  selectionBox.append(commentButton);

  let hovered: Element | undefined;
  let selected: Element | undefined;
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

  const clearSelection = (): void => {
    selected = undefined;
    selectionBox.remove();
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

  const renderSelection = (): void => {
    if (!selected) return;
    if (!positionBox(selectionBox, selected)) {
      clearSelection();
      return;
    }
    const rect = selected.getBoundingClientRect();
    commentButton.style.top = rect.top < 44 ? "calc(100% + 6px)" : "auto";
    commentButton.style.bottom = rect.top < 44 ? "auto" : "calc(100% + 6px)";
    // The selection box carries a real button; it mounts on the root, not
    // inside the aria-hidden decorative layer.
    if (!selectionBox.isConnected) root.append(selectionBox);
  };

  const requestComment = (): void => {
    if (!selected?.isConnected) return;
    const detail: ElementRef = captureElementRef(selected);
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
      clearSelection();
      return;
    }
    const target = targetAt(event.clientX, event.clientY);
    if (!target || target === selected) {
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
      clearSelection();
      return;
    }
    const target = targetAt(event.clientX, event.clientY);
    if (!target) return;
    // Reviewing must never operate the page: a click that picks an element
    // is consumed before host links, buttons, or framework handlers see it.
    event.preventDefault();
    event.stopPropagation();
    if (target === selected) {
      // Clicking the selection again is an explicit ask to comment on it.
      requestComment();
      return;
    }
    selected = target;
    hovered = undefined;
    highlight.remove();
    renderSelection();
    const detail: ElementRef = captureElementRef(target);
    host.dispatchEvent(
      new CustomEvent<ElementRef>(ELEMENT_SELECTED_EVENT, { detail }),
    );
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!isActive() || !hovered) clearHighlight();
    if (!isActive()) {
      clearSelection();
      return;
    }
    if (event.key === "Escape" && selected) {
      clearSelection();
    } else {
      renderSelection();
    }
  };

  const onShellStateChange = (event: MouseEvent): void => {
    if (event.composedPath().includes(host) && !isActive()) {
      clearHighlight();
      clearSelection();
    }
  };

  const onViewportChange = (): void => {
    if (!isActive()) {
      clearHighlight();
      clearSelection();
      return;
    }
    if (hovered) renderHighlight(hovered);
    renderSelection();
  };

  commentButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    requestComment();
  });
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
      clearSelection();
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
