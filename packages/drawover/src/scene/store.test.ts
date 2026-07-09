import { describe, expect, it, vi } from "vitest";
import type { NoteAnnotation } from "../contracts/index.js";
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
