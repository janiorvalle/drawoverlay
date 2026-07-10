import { matchesHotkey, parseHotkey } from "./hotkey.js";
import { shellStyles } from "./styles.js";
import type { SceneStore } from "../contracts/index.js";
import { tokenStyles } from "../theme/tokens.js";
import { applyIcon, icon, logoMark } from "../theme/icons.js";

export type DrawoverMode = "element-select" | "scene";
export type DrawoverPosition =
  "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type DrawoverTheme = "auto" | "light" | "dark";

export interface DrawoverOptions {
  position?: DrawoverPosition;
  hotkey?: string;
  storageKey?: string;
  theme?: DrawoverTheme;
}

export interface DrawoverInstance {
  destroy(): void;
  open(): void;
  close(): void;
  copy(): Promise<void>;
  clear(): void;
}

interface CreateShellOptions extends DrawoverOptions {
  sceneStore: SceneStore;
  onClear: () => void;
  /** Copies the review; resolves with the status message to display. */
  onCopy: () => Promise<string>;
  onDestroy: () => void;
}

export const DRAWOVER_HOST_ID = "drawover-root";
export const DRAWOVER_BUNDLE_SENTINEL = "DRAWOVER_RUNTIME_SENTINEL_V1";

export function createShell(options: CreateShellOptions): DrawoverInstance {
  const position = options.position ?? "bottom-right";
  const theme = options.theme ?? "auto";
  const hotkey = parseHotkey(options.hotkey ?? "alt+shift+d");
  const host = document.createElement("div");
  host.id = DRAWOVER_HOST_ID;
  host.dataset.drawoverRuntime = DRAWOVER_BUNDLE_SENTINEL;
  setProtectedHostStyles(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = tokenStyles + shellStyles;
  const root = document.createElement("div");
  root.className = "root";
  root.dataset.position = position;
  root.dataset.theme = theme;

  const targetingLayer = document.createElement("div");
  targetingLayer.className = "interaction-layer targeting-layer";
  targetingLayer.dataset.layer = "element-select";
  targetingLayer.setAttribute("aria-hidden", "true");

  const sceneLayer = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  sceneLayer.classList.add("interaction-layer", "scene-layer");
  sceneLayer.dataset.layer = "scene";
  sceneLayer.setAttribute("aria-hidden", "true");

  const chrome = document.createElement("div");
  chrome.className = "chrome";
  const trigger = button("", "Toggle Drawover");
  trigger.append(logoMark());
  trigger.className = "trigger";
  trigger.title = `Toggle Drawover (${formatHotkey(options.hotkey ?? "alt+shift+d")})`;
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "drawover-toolbar");

  const toolbar = document.createElement("div");
  toolbar.id = "drawover-toolbar";
  toolbar.className = "toolbar";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Drawover tools");
  toolbar.hidden = true;

  const brand = document.createElement("span");
  brand.className = "brand";
  brand.append(logoMark());

  const modes = document.createElement("div");
  modes.className = "modes";
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", "Pointer mode");
  const inspectButton = button("Comment", "Comment on host page elements");
  const sceneButton = button("Draw", "Use the annotation scene");
  inspectButton.prepend(icon("comment"));
  sceneButton.prepend(icon("pen"));
  inspectButton.dataset.mode = "element-select";
  sceneButton.dataset.mode = "scene";
  modes.append(inspectButton, sceneButton);

  const copyButton = button("", "Copy review");
  applyIcon(copyButton, "copy");
  copyButton.className = "command";
  copyButton.dataset.command = "copy-review";
  copyButton.dataset.tip = "Copy review · Markdown + PNG";
  const clearButton = button("", "Clear annotations");
  applyIcon(clearButton, "trash");
  clearButton.className = "command";
  clearButton.dataset.tip = "Clear all";
  const closeButton = button("", "Close Drawover");
  applyIcon(closeButton, "close");
  closeButton.className = "close";
  closeButton.title = "Close";
  closeButton.dataset.tip = `Close · ${formatHotkey(options.hotkey ?? "alt+shift+d")}`;
  const commandStatus = document.createElement("span");
  commandStatus.className = "command-status";
  commandStatus.setAttribute("role", "status");
  commandStatus.setAttribute("aria-live", "polite");
  toolbar.append(
    brand,
    modes,
    separator(),
    copyButton,
    clearButton,
    commandStatus,
    separator(),
    closeButton,
  );
  const workspace = document.createElement("div");
  workspace.className = "workspace";
  workspace.append(toolbar);
  chrome.append(trigger, workspace);
  root.append(targetingLayer, sceneLayer, chrome);
  shadow.append(style, root);
  document.body.append(host);

  let mode: DrawoverMode = "element-select";
  let open = false;
  let destroyed = false;

  const setMode = (nextMode: DrawoverMode): void => {
    mode = nextMode;
    host.dataset.drawoverMode = mode;
    root.dataset.mode = mode;
    inspectButton.setAttribute(
      "aria-pressed",
      String(mode === "element-select"),
    );
    sceneButton.setAttribute("aria-pressed", String(mode === "scene"));
    applyPointerArbitration();
  };

  const applyPointerArbitration = (): void => {
    // Element selection observes document events so its visual layer never blocks the host.
    targetingLayer.style.pointerEvents = "none";
    sceneLayer.style.pointerEvents = open && mode === "scene" ? "auto" : "none";
  };

  const setOpen = (nextOpen: boolean): void => {
    if (destroyed) return;
    open = nextOpen;
    toolbar.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    applyPointerArbitration();
  };

  const emit = (
    name: "copy-request" | "clear-request",
    detail?: unknown,
  ): void => {
    host.dispatchEvent(
      new CustomEvent(`drawover:${name}`, { bubbles: false, detail }),
    );
  };

  const requestCopy = async (): Promise<string> => {
    emit("copy-request");
    return options.onCopy();
  };

  const runCommand = async (
    button: HTMLButtonElement,
    pending: string,
    operation: () => Promise<string>,
  ): Promise<void> => {
    button.disabled = true;
    commandStatus.textContent = pending;
    try {
      commandStatus.textContent = await operation();
    } catch (error) {
      commandStatus.textContent =
        error instanceof Error ? error.message : "Command failed";
      throw error;
    } finally {
      button.disabled = false;
    }
  };

  const requestClear = (): void => {
    options.onClear();
    emit("clear-request");
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (matchesHotkey(event, hotkey)) {
      event.preventDefault();
      setOpen(!open);
    }
  };

  trigger.addEventListener("click", () => setOpen(!open));
  closeButton.addEventListener("click", () => setOpen(false));
  inspectButton.addEventListener("click", () => setMode("element-select"));
  sceneButton.addEventListener("click", () => setMode("scene"));
  copyButton.addEventListener("click", () => {
    void runCommand(copyButton, "Copying...", requestCopy).catch(
      () => undefined,
    );
  });
  clearButton.addEventListener("click", requestClear);
  document.addEventListener("keydown", onKeydown);
  setMode(mode);

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    copy: async () => {
      await requestCopy();
    },
    clear: requestClear,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("keydown", onKeydown);
      host.remove();
      options.onDestroy();
    },
  };
}

function button(text: string, label: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.setAttribute("aria-label", label);
  return element;
}

function separator(): HTMLSpanElement {
  const element = document.createElement("span");
  element.className = "separator";
  element.setAttribute("aria-hidden", "true");
  return element;
}

/** Human-readable hotkey (⌥⇧D on Apple platforms, Alt+Shift+D elsewhere). */
export function formatHotkey(value: string): string {
  const hotkey = parseHotkey(value);
  const apple = /mac|iphone|ipad/i.test(globalThis.navigator.platform);
  const key = hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key;
  if (apple) {
    return [
      hotkey.ctrl ? "⌃" : "",
      hotkey.alt ? "⌥" : "",
      hotkey.shift ? "⇧" : "",
      hotkey.meta ? "⌘" : "",
      key,
    ].join("");
  }
  return [
    hotkey.ctrl ? "Ctrl" : "",
    hotkey.alt ? "Alt" : "",
    hotkey.shift ? "Shift" : "",
    hotkey.meta ? "Meta" : "",
    key,
  ]
    .filter(Boolean)
    .join("+");
}

function setProtectedHostStyles(host: HTMLElement): void {
  const styles = {
    all: "initial",
    display: "block",
    inset: "0",
    pointerEvents: "none",
    position: "fixed",
    zIndex: "2147483647",
  } as const;

  for (const [property, value] of Object.entries(styles)) {
    host.style.setProperty(toKebabCase(property), value, "important");
  }
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
