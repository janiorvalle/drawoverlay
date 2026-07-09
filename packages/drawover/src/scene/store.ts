import type {
  Annotation,
  SceneListener,
  SceneSnapshot,
  SceneStore,
  SceneTransaction,
} from "../contracts/index.js";

const EMPTY_SCENE: SceneSnapshot = { version: 1, annotations: [] };

export function createSceneStore(
  initial: SceneSnapshot = EMPTY_SCENE,
): SceneStore {
  let present = cloneSnapshot(initial);
  const past: SceneSnapshot[] = [];
  const future: SceneSnapshot[] = [];
  const listeners = new Set<SceneListener>();

  const notify = (): void => {
    const snapshot = cloneSnapshot(present);
    for (const listener of listeners) listener(snapshot);
  };

  const commit = (next: SceneSnapshot): void => {
    if (snapshotsEqual(present, next)) return;
    past.push(present);
    present = cloneSnapshot(next);
    future.length = 0;
    notify();
  };

  const transact = (
    operation: (transaction: SceneTransaction) => void,
  ): void => {
    const annotations = structuredClone(present.annotations) as Annotation[];
    const transaction: SceneTransaction = {
      create(annotation) {
        if (annotations.some(({ id }) => id === annotation.id)) {
          throw new Error(`Annotation ${annotation.id} already exists.`);
        }
        annotations.push(structuredClone(annotation));
      },
      update(id, update) {
        const index = annotations.findIndex(
          (annotation) => annotation.id === id,
        );
        if (index < 0) throw new Error(`Annotation ${id} was not found.`);
        const current = annotations[index];
        if (!current) throw new Error(`Annotation ${id} was not found.`);
        const next = update(structuredClone(current));
        if (next.id !== id)
          throw new Error("An update cannot change an annotation id.");
        annotations[index] = structuredClone(next);
      },
      remove(id) {
        const index = annotations.findIndex(
          (annotation) => annotation.id === id,
        );
        if (index >= 0) annotations.splice(index, 1);
      },
      replaceAll(nextAnnotations) {
        annotations.splice(
          0,
          annotations.length,
          ...structuredClone(nextAnnotations),
        );
      },
    };

    operation(transaction);
    commit({ version: 1, annotations });
  };

  return {
    getSnapshot: () => cloneSnapshot(present),
    getById: (id) => {
      const annotation = present.annotations.find(
        (candidate) => candidate.id === id,
      );
      return annotation ? structuredClone(annotation) : undefined;
    },
    create: (annotation) =>
      transact((transaction) => transaction.create(annotation)),
    update: (id, update) =>
      transact((transaction) => transaction.update(id, update)),
    remove: (id) => transact((transaction) => transaction.remove(id)),
    clear: () => transact((transaction) => transaction.replaceAll([])),
    transaction: (_label, operation) => transact(operation),
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    undo: () => {
      const previous = past.pop();
      if (!previous) return;
      future.push(present);
      present = previous;
      notify();
    },
    redo: () => {
      const next = future.pop();
      if (!next) return;
      past.push(present);
      present = next;
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function cloneSnapshot(snapshot: SceneSnapshot): SceneSnapshot {
  return structuredClone(snapshot);
}

function snapshotsEqual(left: SceneSnapshot, right: SceneSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
