import { describe, expect, it } from "vitest";
import { createSceneStore } from "../scene/store.js";
import { createGeneralNotesPanel } from "./general-notes.js";

describe("general notes panel", () => {
  it("adds, edits, and removes notes through store transactions", () => {
    const store = createSceneStore();
    const panel = createGeneralNotesPanel(store, {
      createId: () => "note-1",
    });
    document.body.append(panel.element);

    addNote(panel.element, "Original note");
    expect(store.getSnapshot().annotations).toMatchObject([
      { id: "note-1", type: "note", text: "Original note" },
    ]);

    const editor = panel.element.querySelector<HTMLTextAreaElement>(
      '.note-row textarea[aria-label="Edit general note"]',
    );
    expect(editor).not.toBeNull();
    if (!editor) return;
    editor.value = "Edited note";
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    expect(store.getById("note-1")).toMatchObject({ text: "Edited note" });

    panel.element
      .querySelector<HTMLButtonElement>('[aria-label="Remove general note"]')
      ?.click();
    expect(store.getSnapshot().annotations).toEqual([]);
    panel.destroy();
    panel.element.remove();
  });

  it("reflects add, edit, and delete undo/redo history from the store", () => {
    const ids = ["note-1", "note-2"];
    const store = createSceneStore();
    const panel = createGeneralNotesPanel(store, {
      createId: () => ids.shift() ?? "unexpected",
    });
    document.body.append(panel.element);

    addNote(panel.element, "First");
    addNote(panel.element, "Second");
    expect(noteEditors(panel.element)).toEqual(["First", "Second"]);

    const firstEditor = panel.element.querySelector<HTMLTextAreaElement>(
      '.note-row textarea[aria-label="Edit general note"]',
    );
    if (!firstEditor) throw new Error("First note editor was not found.");
    firstEditor.value = "First edited";
    firstEditor.dispatchEvent(new Event("change", { bubbles: true }));
    panel.element
      .querySelectorAll<HTMLButtonElement>(
        '[aria-label="Remove general note"]',
      )[1]
      ?.click();
    expect(noteEditors(panel.element)).toEqual(["First edited"]);

    store.undo();
    expect(noteEditors(panel.element)).toEqual(["First edited", "Second"]);
    store.undo();
    expect(noteEditors(panel.element)).toEqual(["First", "Second"]);
    store.redo();
    expect(noteEditors(panel.element)).toEqual(["First edited", "Second"]);
    store.redo();
    expect(noteEditors(panel.element)).toEqual(["First edited"]);

    panel.destroy();
    panel.element.remove();
  });
});

function addNote(panel: HTMLElement, text: string): void {
  const draft = panel.querySelector<HTMLTextAreaElement>(
    '[aria-label="New general note"]',
  );
  const form = panel.querySelector<HTMLFormElement>("form");
  if (!draft || !form) throw new Error("General note form was not found.");
  draft.value = text;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function noteEditors(panel: HTMLElement): string[] {
  return Array.from(
    panel.querySelectorAll<HTMLTextAreaElement>(
      '.note-row textarea[aria-label="Edit general note"]',
    ),
    (editor) => editor.value,
  );
}
