import type { SelectorChain } from "../contracts/index.js";

const GENERATED_CLASS_SHAPE = /^[a-z]+-?[A-Za-z0-9]{5,}$/;
const HEX_DIGEST = /^[a-f\d]{6,}$/i;

export function createSelectorChain(element: Element): SelectorChain {
  const root = element.ownerDocument;
  const candidates: string[] = [];
  const testId = element.getAttribute("data-testid")?.trim();

  if (testId && isUniqueAttributeMatch("data-testid", testId, element, root)) {
    addCandidate(candidates, `[data-testid="${escapeAttributeValue(testId)}"]`);
  }

  if (element.id && isUniqueAttributeMatch("id", element.id, element, root)) {
    addCandidate(candidates, `#${escapeIdentifier(element.id)}`);
  }

  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) {
    const selector = `${element.localName.toLowerCase()}[aria-label="${escapeAttributeValue(ariaLabel)}"]`;
    if (isUniqueMatch(selector, element, root)) {
      addCandidate(candidates, selector);
    }
  }

  const stablePath = shortestStablePath(element, root);
  if (stablePath) addCandidate(candidates, stablePath);

  const structuralPath = createStructuralPath(element);
  addUniqueCandidate(candidates, structuralPath, element, root);

  const primary = candidates.at(0);
  if (!primary) {
    throw new Error("Unable to create a unique selector for the element.");
  }

  return {
    primary,
    fallbacks: candidates.slice(1),
  };
}

export function isGeneratedClassName(className: string): boolean {
  const value = className.trim();
  if (!value) return false;
  if (HEX_DIGEST.test(value)) return true;

  const tokens = value.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return tokens.some((token) => {
    if (!GENERATED_CLASS_SHAPE.test(token) && token === value) return false;
    if (token.length < 5 || !/[A-Za-z]/.test(token) || !/\d/.test(token)) {
      return false;
    }
    return shannonEntropy(token) >= 2.2;
  });
}

function shortestStablePath(
  element: Element,
  root: Document,
): string | undefined {
  const stableCandidates: string[] = [];
  let current: Element | null = element;
  let path = stableSegment(element);

  addIfUnique(stableCandidates, path, element, root);

  while ((current = current.parentElement)) {
    const anchor = uniqueAnchor(current, root);
    if (anchor) {
      addIfUnique(stableCandidates, `${anchor} > ${path}`, element, root);
    }

    path = `${stableSegment(current)} > ${path}`;
    addIfUnique(stableCandidates, path, element, root);
  }

  if (stableCandidates.length > 0) {
    return stableCandidates.sort(
      (left, right) => left.length - right.length,
    )[0];
  }

  return shortestStructuralSuffix(element, root);
}

function shortestStructuralSuffix(
  element: Element,
  root: Document,
): string | undefined {
  const candidates: string[] = [];
  let current: Element | null = element;
  let path = structuralSegment(element);

  addIfUnique(candidates, path, element, root);
  while ((current = current.parentElement)) {
    path = `${structuralSegment(current)} > ${path}`;
    addIfUnique(candidates, path, element, root);
  }

  return candidates.sort((left, right) => left.length - right.length)[0];
}

function stableSegment(element: Element): string {
  const tag = element.localName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter((className) => !isGeneratedClassName(className))
    .sort((left, right) => left.length - right.length)
    .slice(0, 2);
  return `${tag}${classes.map((name) => `.${escapeIdentifier(name)}`).join("")}`;
}

function structuralSegment(element: Element): string {
  const tag = element.localName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) return tag;

  const sameTagSiblings = Array.from(parent.children).filter(
    (sibling) => sibling.localName === element.localName,
  );
  if (sameTagSiblings.length <= 1) return tag;
  return `${tag}:nth-of-type(${String(sameTagSiblings.indexOf(element) + 1)})`;
}

function createStructuralPath(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;
  while (current) {
    segments.unshift(structuralSegment(current));
    current = current.parentElement;
  }
  return segments.join(" > ");
}

function uniqueAnchor(element: Element, root: Document): string | undefined {
  const testId = element.getAttribute("data-testid")?.trim();
  if (testId && isUniqueAttributeMatch("data-testid", testId, element, root)) {
    return `[data-testid="${escapeAttributeValue(testId)}"]`;
  }
  if (element.id && isUniqueAttributeMatch("id", element.id, element, root)) {
    return `#${escapeIdentifier(element.id)}`;
  }
  return undefined;
}

function addIfUnique(
  candidates: string[],
  selector: string,
  element: Element,
  root: Document,
): void {
  if (isUniqueMatch(selector, element, root))
    addCandidate(candidates, selector);
}

function addUniqueCandidate(
  candidates: string[],
  selector: string,
  element: Element,
  root: Document,
): void {
  if (isUniqueMatch(selector, element, root))
    addCandidate(candidates, selector);
}

function isUniqueAttributeMatch(
  attribute: "data-testid" | "id",
  value: string,
  element: Element,
  root: Document,
): boolean {
  const matches = Array.from(root.querySelectorAll(`[${attribute}]`)).filter(
    (candidate) => candidate.getAttribute(attribute) === value,
  );
  return matches.length === 1 && matches[0] === element;
}

function addCandidate(candidates: string[], selector: string): void {
  if (!candidates.includes(selector)) candidates.push(selector);
}

function isUniqueMatch(
  selector: string,
  element: Element,
  root: Document,
): boolean {
  try {
    const matches = root.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
}

function shannonEntropy(value: string): number {
  const counts = new Map<string, number>();
  for (const character of value) {
    counts.set(character, (counts.get(character) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function escapeAttributeValue(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replace(/\r\n|[\n\r\f]/g, (character) => {
      const code = character.codePointAt(0);
      return code === undefined ? "" : `\\${code.toString(16)} `;
    });
}

// CSS.escape-compatible identifier escaping without requiring a browser polyfill.
function escapeIdentifier(value: string): string {
  const codePoints = Array.from(value);
  if (codePoints.length === 1 && codePoints[0] === "-") return "\\-";

  return codePoints
    .map((character, index) => {
      const code = character.codePointAt(0) ?? 0xfffd;
      if (code === 0) return "\ufffd";
      if (
        (code >= 1 && code <= 31) ||
        code === 127 ||
        (index === 0 && code >= 48 && code <= 57) ||
        (index === 1 && code >= 48 && code <= 57 && codePoints[0] === "-")
      ) {
        return `\\${code.toString(16)} `;
      }
      if (
        code >= 128 ||
        code === 45 ||
        code === 95 ||
        (code >= 48 && code <= 57) ||
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122)
      ) {
        return character;
      }
      return `\\${character}`;
    })
    .join("");
}
