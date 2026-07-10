import { applyIcon } from "../theme/icons.js";
import type { NoteAnnotation, SceneStore } from "../contracts/index.js";

interface GeneralNotesPanelOptions {
  createId?: () => string;
}

export interface GeneralNotesPanel {
  readonly button: HTMLButtonElement;
  readonly element: HTMLElement;
  close(): void;
  destroy(): void;
}

/** Build the toolbar control and panel for page-level note annotations. */
export function createGeneralNotesPanel(
  store: SceneStore,
  options: GeneralNotesPanelOptions = {},
): GeneralNotesPanel {
  const createId = options.createId ?? (() => crypto.randomUUID());
  let pendingEdit:
    { editor: HTMLTextAreaElement; id: string; text: string } | undefined;
  let editTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressRender = false;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "command notes-toggle";
  applyIcon(toggle, "notes");
  toggle.dataset.tip = "General notes";
  toggle.setAttribute("aria-label", "Open general notes");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "drawover-general-notes");

  const panel = document.createElement("section");
  panel.id = "drawover-general-notes";
  panel.className = "notes-panel";
  panel.setAttribute("aria-label", "General notes");
  panel.hidden = true;

  const header = document.createElement("div");
  header.className = "notes-header";
  const title = document.createElement("h2");
  title.textContent = "General notes";
  const count = document.createElement("span");
  count.className = "notes-count";
  header.append(title, count);

  const list = document.createElement("div");
  list.className = "notes-list";

  const form = document.createElement("form");
  form.className = "note-form";
  const draft = document.createElement("textarea");
  draft.rows = 2;
  draft.placeholder = "Add a page-level note";
  draft.setAttribute("aria-label", "New general note");
  const add = document.createElement("button");
  add.type = "submit";
  add.className = "note-add";
  add.textContent = "Add note";
  form.append(draft, add);
  panel.append(header, list, form);

  const render = (): void => {
    const annotations = store.getSnapshot().annotations;
    const notes = annotations.filter(
      (annotation): annotation is NoteAnnotation => annotation.type === "note",
    );
    count.textContent = String(notes.length);
    count.setAttribute(
      "aria-label",
      `${String(notes.length)} general ${notes.length === 1 ? "note" : "notes"}`,
    );

    if (notes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "notes-empty";
      empty.textContent = "No general notes yet.";
      list.replaceChildren(empty);
      return;
    }

    list.replaceChildren(...notes.map(createNoteRow));
  };

  const createNoteRow = (note: NoteAnnotation): HTMLElement => {
    const row = document.createElement("div");
    row.className = "note-row";
    row.dataset.noteId = note.id;
    const editor = document.createElement("textarea");
    editor.rows = 3;
    editor.value = note.text;
    editor.setAttribute("aria-label", "Edit general note");
    const commit = (): void => {
      if (pendingEdit?.editor === editor) pendingEdit = undefined;
      if (editTimer !== undefined) {
        clearTimeout(editTimer);
        editTimer = undefined;
      }
      persistEdit(note.id, editor.value);
    };
    editor.addEventListener("input", () => {
      pendingEdit = { editor, id: note.id, text: editor.value };
      if (editTimer !== undefined) clearTimeout(editTimer);
      editTimer = setTimeout(commit, 150);
    });
    editor.addEventListener("blur", commit);
    editor.addEventListener("change", commit);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "note-remove";
    applyIcon(remove, "close");
    remove.title = "Remove note";
    remove.setAttribute("aria-label", "Remove general note");
    remove.addEventListener("click", () => {
      store.transaction("Remove general note", (transaction) => {
        transaction.remove(note.id);
      });
    });
    row.append(editor, remove);
    return row;
  };

  const setOpen = (open: boolean): void => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close general notes" : "Open general notes",
    );
  };

  const flushPendingEdit = (): void => {
    const pending = pendingEdit;
    if (!pending) return;
    if (editTimer !== undefined) {
      clearTimeout(editTimer);
      editTimer = undefined;
    }
    pendingEdit = undefined;
    persistEdit(pending.id, pending.text);
  };

  const persistEdit = (id: string, text: string): void => {
    const current = store.getById(id);
    if (current?.type !== "note" || current.text === text) return;
    suppressRender = true;
    try {
      store.transaction("Edit general note", (transaction) => {
        transaction.update(id, (annotation) => {
          if (annotation.type !== "note") return annotation;
          return { ...annotation, text };
        });
      });
    } finally {
      suppressRender = false;
    }
  };

  toggle.addEventListener("click", () => setOpen(panel.hidden !== false));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = draft.value.trim();
    if (!text) return;
    const annotations = store.getSnapshot().annotations;
    const z = annotations.reduce(
      (highest, annotation) => Math.max(highest, annotation.z),
      -1,
    );
    const note: NoteAnnotation = {
      id: createId(),
      type: "note",
      geometry: { x: 0, y: 0, width: 0, height: 0 },
      z: z + 1,
      rotation: 0,
      text,
    };
    store.transaction("Add general note", (transaction) => {
      transaction.create(note);
    });
    draft.value = "";
    draft.focus();
  });

  const unsubscribe = store.subscribe(() => {
    if (suppressRender) return;
    const root = panel.getRootNode();
    const active =
      root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    if (active instanceof HTMLTextAreaElement && active.closest(".note-row")) {
      return;
    }
    render();
  });
  window.addEventListener("pagehide", flushPendingEdit);
  render();

  return {
    button: toggle,
    element: panel,
    close: () => setOpen(false),
    destroy: () => {
      flushPendingEdit();
      window.removeEventListener("pagehide", flushPendingEdit);
      unsubscribe();
    },
  };
}
