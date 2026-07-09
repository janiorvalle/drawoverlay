import type {
  PageContext,
  SceneSnapshot,
  SerializedReview,
} from "../contracts/index.js";
import { serializeReview } from "./serializer.js";

export type ClipboardFormat = "markdown" | "json";

export interface ClipboardWriter {
  writeText(value: string): Promise<void>;
}

/** Write one already-serialized representation to the Clipboard API. */
export async function writeReviewToClipboard(
  review: SerializedReview,
  format: ClipboardFormat,
  clipboard: ClipboardWriter = getClipboard(),
): Promise<void> {
  await clipboard.writeText(review[format]);
}

/** Serialize and copy the primary Markdown representation. */
export async function copyMarkdown(
  scene: SceneSnapshot,
  pageContext: PageContext,
  clipboard?: ClipboardWriter,
): Promise<void> {
  await writeReviewToClipboard(
    serializeReview(scene, pageContext),
    "markdown",
    clipboard,
  );
}

/** Serialize and copy the secondary versioned JSON representation. */
export async function copyJson(
  scene: SceneSnapshot,
  pageContext: PageContext,
  clipboard?: ClipboardWriter,
): Promise<void> {
  await writeReviewToClipboard(
    serializeReview(scene, pageContext),
    "json",
    clipboard,
  );
}

function getClipboard(): ClipboardWriter {
  const currentNavigator = Reflect.get(globalThis, "navigator") as
    Navigator | undefined;
  if (!currentNavigator?.clipboard) {
    throw new Error("Clipboard API is unavailable.");
  }
  return currentNavigator.clipboard;
}
