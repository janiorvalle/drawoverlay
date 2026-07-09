import type { Annotation, SceneSnapshot } from "./annotations.js";

/** Receives a stable scene snapshot after a committed mutation or history move. */
export type SceneListener = (snapshot: SceneSnapshot) => void;

/**
 * Mutable view available only during a transaction. Implementations commit all
 * operations performed by the callback as one undoable history entry.
 */
export interface SceneTransaction {
  create(annotation: Annotation): void;
  update(id: string, update: (current: Annotation) => Annotation): void;
  remove(id: string): void;
  replaceAll(annotations: readonly Annotation[]): void;
}

/**
 * Hub contract for scene state. Every mutation is transactional; undo and redo
 * belong here rather than in renderers or interaction state machines.
 */
export interface SceneStore {
  getSnapshot(): SceneSnapshot;
  getById(id: string): Annotation | undefined;
  create(annotation: Annotation, label?: string): void;
  update(
    id: string,
    update: (current: Annotation) => Annotation,
    label?: string,
  ): void;
  remove(id: string, label?: string): void;
  clear(label?: string): void;
  transaction(
    label: string,
    operation: (transaction: SceneTransaction) => void,
  ): void;
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): void;
  redo(): void;
  /** Returns an unsubscribe function. */
  subscribe(listener: SceneListener): () => void;
}
