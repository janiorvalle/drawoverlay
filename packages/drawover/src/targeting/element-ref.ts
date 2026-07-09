import type { ElementFacts, ElementRef } from "../contracts/index.js";
import { viewportRectToDocument } from "../coordinates.js";
import { inspectFrameworkComponent } from "./introspection.js";
import { createSelectorChain } from "./selectors.js";

const TEXT_LIMIT = 120;
const RELEVANT_ATTRIBUTES = ["type", "name", "placeholder", "href"] as const;

export function captureElementRef(element: Element): ElementRef {
  const component = inspectFrameworkComponent(element);
  return {
    selector: createSelectorChain(element),
    facts: captureElementFacts(element),
    ...(component ? { component } : {}),
  };
}

export function captureElementFacts(element: Element): ElementFacts {
  const rect = element.getBoundingClientRect();
  const role = element.getAttribute("role")?.trim() ?? implicitRole(element);
  const accessibleName = getAccessibleName(element);
  const text =
    normalizeText(element.textContent).slice(0, TEXT_LIMIT) || undefined;
  const attributes: Record<string, string> = {};

  for (const attribute of RELEVANT_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (value !== null) attributes[attribute] = value;
  }

  return {
    tag: element.localName.toLowerCase(),
    ...(role ? { role } : {}),
    ...(accessibleName ? { accessibleName } : {}),
    ...(text ? { text } : {}),
    attributes,
    bbox: viewportRectToDocument({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }),
  };
}

function getAccessibleName(element: Element): string | undefined {
  const ariaLabel = normalizeText(element.getAttribute("aria-label"));
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const name = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent)
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");
    if (name) return name;
  }

  const alt = normalizeText(element.getAttribute("alt"));
  if (alt) return alt;

  if (isLabelledControl(element)) {
    const labels = Array.from(element.labels ?? [])
      .map((label) => normalizeText(label.textContent))
      .filter(Boolean)
      .join(" ");
    if (labels) return labels;
  }

  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (["button", "submit", "reset"].includes(type)) {
      const value = normalizeText(element.value);
      if (value) return value;
    }
  }

  if (hasTextAccessibleName(element)) {
    return normalizeText(element.textContent) || undefined;
  }

  const title = normalizeText(element.getAttribute("title"));
  return title || undefined;
}

function isLabelledControl(
  element: Element,
): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function hasTextAccessibleName(element: Element): boolean {
  return [
    "a",
    "button",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "label",
    "legend",
    "option",
    "summary",
  ].includes(element.localName);
}

function implicitRole(element: Element): string | undefined {
  switch (element.localName) {
    case "a":
      return element.hasAttribute("href") ? "link" : undefined;
    case "button":
      return "button";
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return "heading";
    case "img":
      return "img";
    case "nav":
      return "navigation";
    case "textarea":
      return "textbox";
    case "input":
      return inputRole(element);
    default:
      return undefined;
  }
}

function inputRole(element: Element): string | undefined {
  const type = (element.getAttribute("type") ?? "text").toLowerCase();
  if (["button", "image", "reset", "submit"].includes(type)) return "button";
  if (type === "checkbox") return "checkbox";
  if (type === "radio") return "radio";
  if (type === "range") return "slider";
  if (type === "number") return "spinbutton";
  if (["email", "search", "tel", "text", "url"].includes(type)) {
    return type === "search" ? "searchbox" : "textbox";
  }
  return undefined;
}

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}
