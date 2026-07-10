import type { SerializedReview } from "../contracts/index.js";

export type ClipboardFormat = "markdown" | "json";

export interface ClipboardWriter {
  writeText(value: string): Promise<void>;
  write?(items: ClipboardItem[]): Promise<void>;
}

/**
 * Copy only the composited PNG. Some paste targets prefer the text flavor
 * of a combined clipboard item, so reviewers need a way to hand over just
 * the image.
 */
export async function copyReviewImage(
  renderPng: () => Promise<Blob>,
  clipboard: ClipboardWriter = getClipboard(),
): Promise<void> {
  const clipboardItem = Reflect.get(globalThis, "ClipboardItem") as
    typeof ClipboardItem | undefined;
  if (!clipboard.write || !clipboardItem) {
    throw new Error("Image clipboard is unavailable in this browser.");
  }
  const png = renderPng();
  png.catch(() => undefined);
  await clipboard.write([new clipboardItem({ "image/png": png })]);
}

/** Write one already-serialized representation to the Clipboard API. */
export async function writeReviewToClipboard(
  review: SerializedReview,
  format: ClipboardFormat,
  clipboard: ClipboardWriter = getClipboard(),
): Promise<void> {
  await clipboard.writeText(review[format]);
}

function getClipboard(): ClipboardWriter {
  const currentNavigator = Reflect.get(globalThis, "navigator") as
    Navigator | undefined;
  if (!currentNavigator?.clipboard) {
    throw new Error("Clipboard API is unavailable.");
  }
  return currentNavigator.clipboard;
}
