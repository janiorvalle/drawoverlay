import type {
  Annotation,
  DocumentPoint,
  DocumentRect,
  ElementRef,
  SceneSnapshot,
  SceneStore,
} from "../contracts/index.js";

const STORAGE_PREFIX = "drawover:scene:v1";

interface StorageLocation {
  origin: string;
  pathname: string;
}

interface BindScenePersistenceOptions {
  hydrate?: boolean;
  storageKey?: string;
  storage?: Storage;
  location?: StorageLocation;
}

export interface ScenePersistenceBinding {
  readonly key: string;
  clear(): void;
  destroy(): void;
}

export function getDefaultStorageKey(location: StorageLocation): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(location.origin)}:${encodeURIComponent(location.pathname)}`;
}

/** Hydrate and persist a SceneStore using localStorage only. */
export function bindScenePersistence(
  store: SceneStore,
  options: BindScenePersistenceOptions = {},
): ScenePersistenceBinding {
  const storage = options.storage ?? window.localStorage;
  const location = options.location ?? window.location;
  const key = options.storageKey ?? getDefaultStorageKey(location);
  let destroyed = false;
  let clearing = false;

  if (options.hydrate !== false) hydrate(store, storage, key);

  const unsubscribe = store.subscribe((snapshot) => {
    if (destroyed || clearing) return;
    writeSnapshot(storage, key, snapshot);
  });

  return {
    key,
    clear: () => {
      if (destroyed) return;
      clearing = true;
      try {
        store.clear("Clear persisted scene");
        removeItem(storage, key);
      } finally {
        clearing = false;
      }
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
    },
  };
}

/** Read a valid persisted scene for use as a store's initial history baseline. */
export function loadPersistedAnnotations(
  options: BindScenePersistenceOptions = {},
): Annotation[] {
  const storage = options.storage ?? window.localStorage;
  const location = options.location ?? window.location;
  const key = options.storageKey ?? getDefaultStorageKey(location);
  const snapshot = readSnapshot(storage, key);
  return snapshot
    ? snapshot.annotations.map((annotation) => structuredClone(annotation))
    : [];
}

function hydrate(store: SceneStore, storage: Storage, key: string): void {
  const candidate = readSnapshot(storage, key);
  if (!candidate) return;

  store.transaction("Hydrate persisted scene", (transaction) => {
    transaction.replaceAll(candidate.annotations);
  });
}

function readSnapshot(
  storage: Storage,
  key: string,
): SceneSnapshot | undefined {
  const serialized = readItem(storage, key);
  if (serialized === null) return undefined;

  let candidate: unknown;
  try {
    candidate = JSON.parse(serialized) as unknown;
  } catch {
    removeItem(storage, key);
    return undefined;
  }

  const snapshot = readSceneSnapshot(candidate);
  if (!snapshot) {
    removeItem(storage, key);
    return undefined;
  }
  return snapshot;
}

function writeSnapshot(
  storage: Storage,
  key: string,
  snapshot: SceneSnapshot,
): void {
  try {
    storage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Storage may be unavailable or full; the in-memory scene remains usable.
  }
}

function readItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function removeItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Clearing the in-memory scene must still succeed when storage is blocked.
  }
}

/**
 * Validate and normalize a persisted snapshot. Annotations that no longer
 * validate (corrupt entries, retired types such as the removed general
 * notes) are dropped individually so schema evolution never discards the
 * rest of a stored scene.
 */
function readSceneSnapshot(value: unknown): SceneSnapshot | undefined {
  if (!isRecord(value) || value.version !== 1) return undefined;
  if (!Array.isArray(value.annotations)) return undefined;
  return { version: 1, annotations: value.annotations.filter(isAnnotation) };
}

function isAnnotation(value: unknown): value is Annotation {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isDocumentRect(value.geometry) ||
    !isFiniteNumber(value.z) ||
    !isFiniteNumber(value.rotation) ||
    typeof value.type !== "string"
  ) {
    return false;
  }

  switch (value.type) {
    case "rect":
      return (
        (value.shape === undefined ||
          value.shape === "rectangle" ||
          value.shape === "ellipse") &&
        isStrings(value, "stroke", "fill") &&
        isFiniteNumber(value.strokeWidth) &&
        isOptionalString(value.label) &&
        (value.labelAlign === undefined ||
          value.labelAlign === "left" ||
          value.labelAlign === "center" ||
          value.labelAlign === "right") &&
        isOptionalString(value.spatialDescription)
      );
    case "arrow":
      return (
        (value.variant === undefined ||
          value.variant === "arrow" ||
          value.variant === "line") &&
        isDocumentPoint(value.start) &&
        isDocumentPoint(value.end) &&
        typeof value.color === "string" &&
        isFiniteNumber(value.strokeWidth) &&
        isOptionalString(value.spatialDescription)
      );
    case "text":
      return (
        isStrings(value, "text", "color") &&
        isFiniteNumber(value.fontSize) &&
        (value.align === "left" ||
          value.align === "center" ||
          value.align === "right") &&
        isOptionalString(value.spatialDescription) &&
        isOptionalString(value.intent)
      );
    case "image":
      return (
        isStrings(value, "dataUrl", "alt") &&
        isFiniteNumber(value.opacity) &&
        isOptionalString(value.spatialDescription)
      );
    case "element-pin":
      return (
        typeof value.comment === "string" &&
        isElementRef(value.element) &&
        isDocumentPoint(value.elementOffset) &&
        isOptionalString(value.spatialDescription)
      );
    default:
      return false;
  }
}

function isElementRef(value: unknown): value is ElementRef {
  if (!isRecord(value) || !isRecord(value.selector) || !isRecord(value.facts)) {
    return false;
  }
  const { selector, facts } = value;
  const component = value.component;
  return (
    typeof selector.primary === "string" &&
    Array.isArray(selector.fallbacks) &&
    selector.fallbacks.every((item) => typeof item === "string") &&
    typeof facts.tag === "string" &&
    isOptionalString(facts.role) &&
    isOptionalString(facts.accessibleName) &&
    isOptionalString(facts.text) &&
    isRecord(facts.attributes) &&
    Object.values(facts.attributes).every((item) => typeof item === "string") &&
    isDocumentRect(facts.bbox) &&
    (component === undefined || isComponentRef(component))
  );
}

function isComponentRef(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    (value.framework !== "react" && value.framework !== "vue") ||
    typeof value.name !== "string"
  ) {
    return false;
  }
  if (value.source === undefined) return true;
  return (
    isRecord(value.source) &&
    typeof value.source.file === "string" &&
    isOptionalFiniteNumber(value.source.line) &&
    isOptionalFiniteNumber(value.source.column)
  );
}

function isDocumentRect(value: unknown): value is DocumentRect {
  return (
    isDocumentPoint(value) &&
    isRecord(value) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height)
  );
}

function isDocumentPoint(value: unknown): value is DocumentPoint {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isStrings(value: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.every((key) => typeof value[key] === "string");
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
