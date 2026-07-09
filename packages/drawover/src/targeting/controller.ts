import type { ElementRef } from "../contracts/index.js";
import { captureElementRef } from "./element-ref.js";

export const ELEMENT_SELECTED_EVENT = "drawover:element-selected";

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
  if (!shadow || !layer) {
    throw new Error("Drawover element-select layer was not found.");
  }

  const highlight = document.createElement("div");
  highlight.dataset.targetingHighlight = "true";
  setHighlightStyles(highlight);
  const label = document.createElement("span");
  setLabelStyles(label);
  highlight.append(label);

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

  const renderHighlight = (element: Element): void => {
    if (!element.isConnected) {
      clearHighlight();
      return;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      clearHighlight();
      return;
    }
    const reference = captureElementRef(element);
    highlight.style.left = `${String(rect.left)}px`;
    highlight.style.top = `${String(rect.top)}px`;
    highlight.style.width = `${String(rect.width)}px`;
    highlight.style.height = `${String(rect.height)}px`;
    highlight.dataset.targetSelector = reference.selector.primary;
    label.textContent = `${reference.facts.tag}  ${reference.selector.primary}`;
    label.style.top = rect.top < 28 ? "100%" : "auto";
    label.style.bottom = rect.top < 28 ? "auto" : "100%";
    if (!highlight.isConnected) layer.append(highlight);
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
      return;
    }
    const target = targetAt(event.clientX, event.clientY);
    if (!target) {
      clearHighlight();
      return;
    }
    hovered = target;
    renderHighlight(target);
  };

  const onClick = (event: MouseEvent): void => {
    if (!isActive()) {
      clearHighlight();
      return;
    }
    const target = targetAt(event.clientX, event.clientY);
    if (!target) return;
    const detail: ElementRef = captureElementRef(target);
    host.dispatchEvent(
      new CustomEvent<ElementRef>(ELEMENT_SELECTED_EVENT, { detail }),
    );
    hovered = target;
    renderHighlight(target);
  };

  const onShellStateChange = (event: MouseEvent): void => {
    if (event.composedPath().includes(host) && !isActive()) clearHighlight();
  };

  const onViewportChange = (): void => {
    if (!isActive() || !hovered) {
      clearHighlight();
      return;
    }
    renderHighlight(hovered);
  };

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("click", onClick, true);
  document.addEventListener("click", onShellStateChange);
  document.addEventListener("keydown", onViewportChange);
  document.addEventListener("scroll", onViewportChange, true);
  window.addEventListener("resize", onViewportChange);

  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("click", onShellStateChange);
      document.removeEventListener("keydown", onViewportChange);
      document.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
      clearHighlight();
    },
  };
}

function setHighlightStyles(highlight: HTMLElement): void {
  const styles = {
    background: "rgb(53 121 246 / 14%)",
    border: "2px solid #3579f6",
    boxSizing: "border-box",
    pointerEvents: "none",
    position: "fixed",
    zIndex: "1",
  } as const;
  for (const [property, value] of Object.entries(styles)) {
    highlight.style.setProperty(toKebabCase(property), value, "important");
  }
}

function setLabelStyles(label: HTMLElement): void {
  const styles = {
    background: "#174ea6",
    borderRadius: "3px",
    bottom: "100%",
    color: "#ffffff",
    font: "600 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
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
