import { afterEach, describe, expect, it, vi } from "vitest";
import {
  section5Expected,
  section5PageContext,
  section5Scene,
} from "../contracts/fixtures/section5.fixture.js";
import { copyJson, copyMarkdown, writeReviewToClipboard } from "./clipboard.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clipboard output", () => {
  it("copies Markdown as the primary representation", async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();

    await copyMarkdown(section5Scene, section5PageContext, { writeText });

    expect(writeText).toHaveBeenCalledWith(section5Expected.markdown);
  });

  it("copies versioned JSON as the secondary representation", async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();

    await copyJson(section5Scene, section5PageContext, { writeText });

    expect(writeText).toHaveBeenCalledWith(section5Expected.json);
  });

  it("selects an already-serialized representation", async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();

    await writeReviewToClipboard(section5Expected, "json", { writeText });

    expect(writeText).toHaveBeenCalledWith(section5Expected.json);
  });

  it("propagates Clipboard API write failures", async () => {
    const failure = new Error("Permission denied");
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValue(failure);

    await expect(
      copyMarkdown(section5Scene, section5PageContext, { writeText }),
    ).rejects.toBe(failure);
  });

  it("reports an unavailable Clipboard API", async () => {
    vi.stubGlobal("navigator", {});

    await expect(copyJson(section5Scene, section5PageContext)).rejects.toThrow(
      "Clipboard API is unavailable.",
    );
  });
});
