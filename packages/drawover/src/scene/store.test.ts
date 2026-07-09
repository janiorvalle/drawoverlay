import { describe, expect, it, vi } from "vitest";
import type { NoteAnnotation, RectAnnotation } from "../contracts/index.js";
import { createSceneStore } from "./store.js";

const firstNote = note("note-1", "First");
const secondNote = note("note-2", "Second");

describe("scene store", () => {
  it("commits a transaction atomically with one notification", () => {
    const store = createSceneStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.transaction("Add notes", (transaction) => {
      transaction.create(firstNote);
      transaction.create(secondNote);
    });

    expect(store.getSnapshot().annotations).toEqual([firstNote, secondNote]);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("rolls back a failed transaction", () => {
    const store = createSceneStore([firstNote]);

    expect(() =>
      store.transaction("Fail", (transaction) => {
        transaction.create(secondNote);
        throw new Error("stop");
      }),
    ).toThrow("stop");
    expect(store.getSnapshot().annotations).toEqual([firstNote]);
  });

  it("supports undo and redo for committed mutations", () => {
    const store = createSceneStore();
    store.create(firstNote, "Add note");

    expect(store.canUndo()).toBe(true);
    store.undo();
    expect(store.getSnapshot().annotations).toEqual([]);
    expect(store.canRedo()).toBe(true);
    store.redo();
    expect(store.getSnapshot().annotations).toEqual([firstNote]);
  });

  it("moves multiple annotations as one undoable transaction", () => {
    const first = rectangle("rect-1", 10);
    const second = rectangle("rect-2", 120);
    const store = createSceneStore([first, second]);

    store.transaction("Move selection", (transaction) => {
      transaction.update(first.id, (current) => ({
        ...current,
        geometry: { ...current.geometry, x: 30 },
      }));
      transaction.update(second.id, (current) => ({
        ...current,
        geometry: { ...current.geometry, x: 140 },
      }));
    });

    expect(store.getById(first.id)?.geometry.x).toBe(30);
    expect(store.getById(second.id)?.geometry.x).toBe(140);
    store.undo();
    expect(store.getById(first.id)?.geometry.x).toBe(10);
    expect(store.getById(second.id)?.geometry.x).toBe(120);
  });

  it("returns snapshots that cannot mutate stored annotations", () => {
    const store = createSceneStore([rectangle("rect-1", 10)]);
    const snapshot = store.getSnapshot();
    const annotation = snapshot.annotations[0];
    if (annotation) annotation.geometry.x = 999;

    expect(store.getById("rect-1")?.geometry.x).toBe(10);
  });
});

function note(id: string, text: string): NoteAnnotation {
  return {
    id,
    type: "note",
    geometry: { x: 0, y: 0, width: 0, height: 0 },
    z: 0,
    rotation: 0,
    text,
  };
}

function rectangle(id: string, x: number): RectAnnotation {
  return {
    id,
    type: "rect",
    geometry: { x, y: 20, width: 80, height: 50 },
    z: 1,
    rotation: 0,
    stroke: "#e5484d",
    fill: "transparent",
    strokeWidth: 2,
  };
}
