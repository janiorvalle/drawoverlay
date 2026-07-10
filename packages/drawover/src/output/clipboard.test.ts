import { afterEach, describe, expect, it, vi } from "vitest";
import {
  section5Expected,
  section5PageContext,
  section5Scene,
} from "../contracts/fixtures/section5.fixture.js";
import { copyReviewImage, writeReviewToClipboard } from "./clipboard.js";
import { serializeReview } from "./serializer.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const review = () => serializeReview(section5Scene, section5PageContext);

class FakeClipboardItem {
  readonly entries: Record<string, Blob | PromiseLike<Blob>>;
  constructor(entries: Record<string, Blob | PromiseLike<Blob>>) {
    this.entries = entries;
  }
}

describe("clipboard output", () => {
  it("writes the Markdown representation as plain text", async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();

    await writeReviewToClipboard(review(), "markdown", { writeText });

    expect(writeText).toHaveBeenCalledWith(section5Expected.markdown);
  });

  it("writes the JSON representation on request", async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();

    await writeReviewToClipboard(section5Expected, "json", { writeText });

    expect(writeText).toHaveBeenCalledWith(section5Expected.json);
  });

  it("copies the rendered PNG as an image-only clipboard item", async () => {
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const write = vi
      .fn<(items: ClipboardItem[]) => Promise<void>>()
      .mockResolvedValue();
    const png = new Blob(["png-bytes"], { type: "image/png" });

    await copyReviewImage(() => Promise.resolve(png), {
      write,
      writeText: vi.fn(),
    });

    const item = write.mock.calls[0]?.[0][0] as unknown as FakeClipboardItem;
    expect(Object.keys(item.entries)).toEqual(["image/png"]);
    await expect(item.entries["image/png"] as Promise<Blob>).resolves.toBe(png);
  });

  it("reports when image clipboard is unsupported", async () => {
    await expect(
      copyReviewImage(() => Promise.resolve(new Blob()), {
        writeText: vi.fn(),
      }),
    ).rejects.toThrow("Image clipboard is unavailable in this browser.");
  });

  it("propagates image clipboard write failures", async () => {
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const failure = new Error("Permission denied");
    const write = vi
      .fn<(items: ClipboardItem[]) => Promise<void>>()
      .mockRejectedValue(failure);

    await expect(
      copyReviewImage(() => Promise.resolve(new Blob()), {
        write,
        writeText: vi.fn(),
      }),
    ).rejects.toBe(failure);
  });

  it("reports an unavailable Clipboard API", async () => {
    vi.stubGlobal("navigator", {});

    await expect(
      copyReviewImage(() => Promise.resolve(new Blob())),
    ).rejects.toThrow("Clipboard API is unavailable.");
  });
});
