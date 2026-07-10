import type { ComponentRef, SourceLocation } from "../contracts/index.js";

type UnknownRecord = Record<PropertyKey, unknown>;

export function inspectFrameworkComponent(
  element: Element,
): ComponentRef | undefined {
  return inspectReact(element) ?? inspectVue(element);
}

function inspectReact(element: Element): ComponentRef | undefined {
  const record = element as unknown as UnknownRecord;
  const fiberKey = Object.getOwnPropertyNames(element).find((key) =>
    key.startsWith("__reactFiber$"),
  );
  if (!fiberKey) return undefined;

  let fiber = asRecord(record[fiberKey]);
  let depth = 0;
  while (fiber && depth < 100) {
    const type = fiber.type;
    const name = componentName(type);
    if (name && typeof type !== "string" && isMeaningfulName(name)) {
      const source =
        readSource(fiber._debugSource) ??
        readSource(asRecord(fiber.pendingProps)?.__source) ??
        readSource(asRecord(fiber.memoizedProps)?.__source) ??
        readSource(asRecord(type)?.__source) ??
        readDebugInfo(fiber._debugInfo);
      return source
        ? { framework: "react", name, source }
        : { framework: "react", name };
    }
    fiber = asRecord(fiber.return);
    depth += 1;
  }

  return undefined;
}

function inspectVue(element: Element): ComponentRef | undefined {
  const instance = asRecord(
    (element as unknown as UnknownRecord).__vueParentComponent,
  );
  const type = asRecord(instance?.type);
  const name = readString(type?.name) ?? readString(type?.__name);
  if (!name || !isMeaningfulName(name)) return undefined;

  const source =
    readSource(type?.__source) ??
    readSource(instance?.__source) ??
    sourceFromFile(readString(type?.__file));
  return source
    ? { framework: "vue", name, source }
    : { framework: "vue", name };
}

const LIBRARY_INTERNAL_NAMES = new Set([
  "Anonymous",
  "Consumer",
  "ForwardRef",
  "Fragment",
  "Portal",
  "Presence",
  "Provider",
  "Root",
  "Slot",
  "SlotClone",
  "Suspense",
]);

/**
 * Component-library internals (Radix "Primitive.button", styled.div, memo
 * wrappers) name plumbing, not the user's component. Keep walking up until a
 * name a developer would recognize from their own code appears.
 */
function isMeaningfulName(name: string): boolean {
  if (LIBRARY_INTERNAL_NAMES.has(name)) return false;
  if (name.includes(".")) return false;
  if (!/^[A-Z]/.test(name)) return false;
  return true;
}

function componentName(value: unknown): string | undefined {
  if (typeof value === "function") {
    const record = value as unknown as UnknownRecord;
    return readString(record.displayName) ?? readString(value.name);
  }
  const record = asRecord(value);
  if (!record) return undefined;
  return (
    readString(record.displayName) ??
    readString(record.name) ??
    componentName(record.type) ??
    componentName(record.render)
  );
}

function readDebugInfo(value: unknown): SourceLocation | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const entry of value) {
    const source = readSource(entry);
    if (source) return source;
  }
  return undefined;
}

function readSource(value: unknown): SourceLocation | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const file = readString(record.fileName) ?? readString(record.file);
  if (!file) return undefined;

  const line =
    readFiniteNumber(record.lineNumber) ?? readFiniteNumber(record.line);
  const column =
    readFiniteNumber(record.columnNumber) ?? readFiniteNumber(record.column);
  return {
    file,
    ...(line === undefined ? {} : { line }),
    ...(column === undefined ? {} : { column }),
  };
}

function sourceFromFile(file: string | undefined): SourceLocation | undefined {
  return file ? { file } : undefined;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return (typeof value === "object" && value !== null) ||
    typeof value === "function"
    ? (value as UnknownRecord)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
