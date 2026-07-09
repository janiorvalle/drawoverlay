import { describe, expect, it, vi } from "vitest";
import type { RectAnnotation } from "../contracts/index.js";
import { createSceneStore } from "./store.js";

function rectangle(id: string, x = 10): RectAnnotation {
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

describe("scene store", () => {
  it("commits a transaction as one undoable history entry", () => {
    const store = createSceneStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.create(rectangle("one"));
    store.create(rectangle("two", 120));

    store.transaction("Move both", (transaction) => {
      transaction.update("one", (current) => ({
        ...current,
        geometry: { ...current.geometry, x: 30 },
      }));
      transaction.update("two", (current) => ({
        ...current,
        geometry: { ...current.geometry, x: 140 },
      }));
    });

    expect(store.getById("one")?.geometry.x).toBe(30);
    expect(store.getById("two")?.geometry.x).toBe(140);
    store.undo();
    expect(store.getById("one")?.geometry.x).toBe(10);
    expect(store.getById("two")?.geometry.x).toBe(120);
    store.redo();
    expect(store.getById("one")?.geometry.x).toBe(30);
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it("rolls back a failed transaction and protects its snapshots", () => {
    const store = createSceneStore();
    store.create(rectangle("one"));
    const snapshot = store.getSnapshot();
    const mutable = snapshot.annotations[0];
    if (mutable) mutable.geometry.x = 999;
    expect(store.getById("one")?.geometry.x).toBe(10);

    expect(() => {
      store.transaction("Fail", (transaction) => {
        transaction.update("one", (current) => ({
          ...current,
          geometry: { ...current.geometry, x: 40 },
        }));
        throw new Error("stop");
      });
    }).toThrow("stop");
    expect(store.getById("one")?.geometry.x).toBe(10);
  });
});
