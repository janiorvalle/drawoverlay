import type {
  Annotation,
  SceneSnapshot,
  SceneStore,
  SceneTransaction,
} from "../contracts/index.js";

interface SceneState {
  annotations: Annotation[];
}

/** Create the in-memory implementation of the frozen SceneStore contract. */
export function createSceneStore(
  initialAnnotations: readonly Annotation[] = [],
): SceneStore {
  let state = createState(initialAnnotations);
  const undoStack: SceneState[] = [];
  const redoStack: SceneState[] = [];
  const listeners = new Set<(snapshot: SceneSnapshot) => void>();

  const snapshot = (): SceneSnapshot => ({
    version: 1,
    annotations: cloneAnnotations(state.annotations),
  });

  const notify = (): void => {
    const current = snapshot();
    for (const listener of listeners) listener(current);
  };

  const transact = (
    operation: (transaction: SceneTransaction) => void,
  ): void => {
    const before = createState(state.annotations);
    const next = createState(state.annotations);
    const transaction = createTransaction(next);

    operation(transaction);
    assertUniqueIds(next.annotations);

    if (sameAnnotations(before.annotations, next.annotations)) return;
    undoStack.push(before);
    state = next;
    redoStack.length = 0;
    notify();
  };

  return {
    getSnapshot: snapshot,
    getById: (id) => {
      const annotation = state.annotations.find((item) => item.id === id);
      return annotation ? cloneAnnotation(annotation) : undefined;
    },
    create: (annotation) => {
      transact((transaction) => transaction.create(annotation));
    },
    update: (id, update) => {
      transact((transaction) => transaction.update(id, update));
    },
    remove: (id) => {
      transact((transaction) => transaction.remove(id));
    },
    clear: () => {
      transact((transaction) => transaction.replaceAll([]));
    },
    transaction: (_label, operation) => {
      transact(operation);
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    undo: () => {
      const previous = undoStack.pop();
      if (!previous) return;
      redoStack.push(createState(state.annotations));
      state = previous;
      notify();
    },
    redo: () => {
      const next = redoStack.pop();
      if (!next) return;
      undoStack.push(createState(state.annotations));
      state = next;
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function createTransaction(state: SceneState): SceneTransaction {
  return {
    create: (annotation) => {
      if (state.annotations.some((item) => item.id === annotation.id)) {
        throw new Error(`Annotation already exists: ${annotation.id}`);
      }
      state.annotations.push(cloneAnnotation(annotation));
    },
    update: (id, update) => {
      const index = state.annotations.findIndex((item) => item.id === id);
      const current = state.annotations[index];
      if (index < 0 || !current) throw new Error(`Annotation not found: ${id}`);
      const next = update(cloneAnnotation(current));
      if (next.id !== id)
        throw new Error("Annotation updates cannot change ids.");
      state.annotations[index] = cloneAnnotation(next);
    },
    remove: (id) => {
      const index = state.annotations.findIndex((item) => item.id === id);
      if (index < 0) throw new Error(`Annotation not found: ${id}`);
      state.annotations.splice(index, 1);
    },
    replaceAll: (annotations) => {
      const next = cloneAnnotations(annotations);
      assertUniqueIds(next);
      state.annotations = next;
    },
  };
}

function createState(annotations: readonly Annotation[]): SceneState {
  const cloned = cloneAnnotations(annotations);
  assertUniqueIds(cloned);
  return { annotations: cloned };
}

function cloneAnnotations(annotations: readonly Annotation[]): Annotation[] {
  return annotations.map(cloneAnnotation);
}

function cloneAnnotation(annotation: Annotation): Annotation {
  return structuredClone(annotation);
}

function assertUniqueIds(annotations: readonly Annotation[]): void {
  const ids = new Set<string>();
  for (const annotation of annotations) {
    if (ids.has(annotation.id)) {
      throw new Error(`Duplicate annotation id: ${annotation.id}`);
    }
    ids.add(annotation.id);
  }
}

function sameAnnotations(
  first: readonly Annotation[],
  second: readonly Annotation[],
): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}
