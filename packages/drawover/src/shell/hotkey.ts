interface ParsedHotkey {
  key: string;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

export function parseHotkey(value: string): ParsedHotkey {
  const parts = value
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const key = parts.find(
    (part) => !["alt", "ctrl", "meta", "shift"].includes(part),
  );

  if (!key || parts.filter((part) => part === key).length !== 1) {
    throw new Error(`Invalid hotkey: ${value}`);
  }

  return {
    key,
    alt: parts.includes("alt"),
    ctrl: parts.includes("ctrl"),
    meta: parts.includes("meta"),
    shift: parts.includes("shift"),
  };
}

export function matchesHotkey(
  event: KeyboardEvent,
  hotkey: ParsedHotkey,
): boolean {
  return (
    event.key.toLowerCase() === hotkey.key &&
    event.altKey === hotkey.alt &&
    event.ctrlKey === hotkey.ctrl &&
    event.metaKey === hotkey.meta &&
    event.shiftKey === hotkey.shift
  );
}
