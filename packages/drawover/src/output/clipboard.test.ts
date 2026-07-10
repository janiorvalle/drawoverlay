import { afterEach, describe, expect, it, vi } from "vitest";
import {
  section5Expected,
  section5PageContext,
  section5Scene,
} from "../contracts/fixtures/section5.fixture.js";
import {
  copyReview,
  copyReviewImage,
  writeReviewToClipboard,
} from "./clipboard.js";
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
  it("puts Markdown and the rendered PNG on the clipboard in one item", async () => {
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const write = vi
      .fn<(items: ClipboardItem[]) => Promise<void>>()
      .mockResolvedValue();
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();
    const png = new Blob(["png-bytes"], { type: "image/png" });

    const result = await copyReview(review(), () => Promise.resolve(png), {
      write,
      writeText,
    });

    expect(result).toBe("markdown+png");
    expect(writeText).not.toHaveBeenCalled();
    const item = write.mock.calls[0]?.[0][0] as unknown as FakeClipboardItem;
    await expect(item.entries["image/png"] as Promise<Blob>).resolves.toBe(png);
    const textBlob = await (item.entries["text/plain"] as Promise<Blob>);
    await expect(textBlob.text()).resolves.toBe(section5Expected.markdown);
  });

  it("falls back to Markdown-only when the rich write is rejected", async () => {
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const write = vi
      .fn<(items: ClipboardItem[]) => Promise<void>>()
      .mockRejectedValue(new Error("image clipboard denied"));
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();

    const result = await copyReview(
      review(),
      () => Promise.resolve(new Blob()),
      { write, writeText },
    );

    expect(result).toBe("markdown-only");
    expect(writeText).toHaveBeenCalledWith(section5Expected.markdown);
  });

  it("falls back to Markdown-only when ClipboardItem is unsupported", async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();

    const result = await copyReview(
      review(),
      () => Promise.reject(new Error("must not render")),
      { writeText },
    );

    expect(result).toBe("markdown-only");
    expect(writeText).toHaveBeenCalledWith(section5Expected.markdown);
  });

  it("copies the image flavor alone for text-preferring paste targets", async () => {
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

  it("selects an already-serialized representation", async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();

    await writeReviewToClipboard(section5Expected, "json", { writeText });

    expect(writeText).toHaveBeenCalledWith(section5Expected.json);
  });

  it("propagates text clipboard failures after the fallback", async () => {
    const failure = new Error("Permission denied");
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValue(failure);

    await expect(
      copyReview(review(), () => Promise.resolve(new Blob()), { writeText }),
    ).rejects.toBe(failure);
  });

  it("reports an unavailable Clipboard API", async () => {
    vi.stubGlobal("navigator", {});

    await expect(
      copyReview(review(), () => Promise.resolve(new Blob())),
    ).rejects.toThrow("Clipboard API is unavailable.");
  });
});
