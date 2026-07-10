import { afterEach, describe, expect, it } from "vitest";
import type { TextAnnotation } from "../contracts/index.js";
import { createSceneStore } from "../scene/store.js";
import {
  bindScenePersistence,
  getDefaultStorageKey,
  loadPersistedAnnotations,
} from "./persistence.js";

afterEach(() => localStorage.clear());

describe("scene persistence", () => {
  it("saves and hydrates a scene across store lifecycles", () => {
    const key = "reload-test";
    const firstStore = createSceneStore();
    const firstBinding = bindScenePersistence(firstStore, { storageKey: key });
    firstStore.create(note("note-1", "Survives reload"));
    firstBinding.destroy();

    const secondStore = createSceneStore();
    const secondBinding = bindScenePersistence(secondStore, {
      storageKey: key,
    });

    expect(secondStore.getSnapshot().annotations).toEqual([
      note("note-1", "Survives reload"),
    ]);
    secondBinding.destroy();
  });

  it("loads persisted annotations as a non-undoable history baseline", () => {
    const key = "history-baseline";
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        annotations: [note("note-1", "Restored")],
      }),
    );
    const store = createSceneStore(
      loadPersistedAnnotations({ storageKey: key }),
    );
    const binding = bindScenePersistence(store, {
      storageKey: key,
      hydrate: false,
    });

    expect(store.canUndo()).toBe(false);
    store.create(note("note-2", "New"));
    store.undo();
    expect(store.getSnapshot().annotations).toEqual([
      note("note-1", "Restored"),
    ]);
    expect(store.canUndo()).toBe(false);
    binding.destroy();
  });

  it("isolates default keys by origin and pathname", () => {
    const checkout = getDefaultStorageKey({
      origin: "https://example.com",
      pathname: "/checkout",
    });
    const account = getDefaultStorageKey({
      origin: "https://example.com",
      pathname: "/account",
    });
    const preview = getDefaultStorageKey({
      origin: "https://preview.example.com",
      pathname: "/checkout",
    });

    expect(checkout).not.toBe(account);
    expect(checkout).not.toBe(preview);
    expect(checkout).toContain(encodeURIComponent("https://example.com"));
    expect(checkout).toContain(encodeURIComponent("/checkout"));
  });

  it("uses an explicit storage key override", () => {
    const store = createSceneStore();
    const binding = bindScenePersistence(store, {
      storageKey: "custom-scene",
      location: { origin: "https://example.com", pathname: "/ignored" },
    });
    store.create(note("note-1", "Custom"));

    expect(binding.key).toBe("custom-scene");
    expect(localStorage.getItem("custom-scene")).not.toBeNull();
    binding.destroy();
  });

  it.each([
    ["corrupt JSON", "{"],
    ["an unknown version", JSON.stringify({ version: 2, annotations: [] })],
  ])("falls back to an empty scene for %s", (_label, value) => {
    const key = "invalid-scene";
    localStorage.setItem(key, value);
    const store = createSceneStore();
    const binding = bindScenePersistence(store, { storageKey: key });

    expect(store.getSnapshot().annotations).toEqual([]);
    expect(localStorage.getItem(key)).toBeNull();
    binding.destroy();
  });

  it("drops unknown annotation types individually while keeping the rest", () => {
    const key = "mixed-scene";
    const kept = note("keep-1", "Still valid");
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        annotations: [
          { id: "retired", type: "note", text: "Removed feature" },
          kept,
        ],
      }),
    );
    const store = createSceneStore(
      loadPersistedAnnotations({ storageKey: key }),
    );
    const binding = bindScenePersistence(store, {
      storageKey: key,
      hydrate: false,
    });

    expect(store.getSnapshot().annotations).toEqual([kept]);
    binding.destroy();
  });

  it("clears the scene and removes its localStorage entry", () => {
    const key = "clear-test";
    const store = createSceneStore();
    const binding = bindScenePersistence(store, { storageKey: key });
    store.create(note("note-1", "Remove me"));

    binding.clear();

    expect(store.getSnapshot().annotations).toEqual([]);
    expect(localStorage.getItem(key)).toBeNull();
    binding.destroy();
  });

  it("tears down its scene subscription", () => {
    const key = "teardown-test";
    const store = createSceneStore();
    const binding = bindScenePersistence(store, { storageKey: key });
    binding.destroy();

    store.create(note("note-1", "Not persisted"));

    expect(localStorage.getItem(key)).toBeNull();
  });
});

function note(id: string, text: string): TextAnnotation {
  return {
    id,
    type: "text",
    geometry: { x: 0, y: 0, width: 120, height: 24 },
    z: 0,
    rotation: 0,
    text,
    color: "#e5484d",
    fontSize: 16,
    align: "left",
  };
}
