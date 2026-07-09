import type { SceneSnapshot } from "./annotations.js";

/** Page facts captured at the moment output is requested. */
export interface PageContext {
  url: string;
  pathname: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  capturedAt: string;
}

/** Clipboard-ready representations of the same versioned review payload. */
export interface SerializedReview {
  markdown: string;
  json: string;
}

/** Pure scene serializer contract. It must not mutate the scene or host page. */
export type Serializer = (
  scene: SceneSnapshot,
  pageContext: PageContext,
) => SerializedReview;
