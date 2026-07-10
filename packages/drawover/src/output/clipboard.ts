import type { SerializedReview } from "../contracts/index.js";

export type ClipboardFormat = "markdown" | "json";

export interface ClipboardWriter {
  writeText(value: string): Promise<void>;
  write?(items: ClipboardItem[]): Promise<void>;
}

export type CopyReviewResult = "markdown+png" | "markdown-only";

/**
 * One-press export: put the Markdown review AND the composited PNG on the
 * clipboard as a single multi-format item, so text targets paste the
 * Markdown and image targets paste the screenshot. The PNG blob is passed
 * as a promise so the clipboard write stays inside the user gesture while
 * the capture renders. Falls back to Markdown-only when the browser or the
 * capture refuses.
 */
export async function copyReview(
  review: SerializedReview,
  renderPng: () => Promise<Blob>,
  clipboard: ClipboardWriter = getClipboard(),
): Promise<CopyReviewResult> {
  const clipboardItem = Reflect.get(globalThis, "ClipboardItem") as
    typeof ClipboardItem | undefined;
  if (clipboard.write && clipboardItem) {
    const png = renderPng();
    // The write consumes this promise; keep its rejection observed so a
    // failed capture cannot surface as an unhandled rejection.
    png.catch(() => undefined);
    try {
      await clipboard.write([
        new clipboardItem({
          "text/plain": Promise.resolve(
            new Blob([review.markdown], { type: "text/plain" }),
          ),
          "image/png": png,
        }),
      ]);
      return "markdown+png";
    } catch {
      // Image clipboard rejected (permissions, capture failure, browser
      // support) — the Markdown payload must still make it out.
    }
  }
  await clipboard.writeText(review.markdown);
  return "markdown-only";
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
