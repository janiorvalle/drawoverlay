import { describe, expect, it } from "vitest";
import {
  findUnapprovedUrlHosts,
  isBinaryContent,
  isForbiddenPublicPath,
} from "./infra-policy.mjs";

describe("public repository infra policy", () => {
  it("rejects local artifacts at any repository depth", () => {
    for (const path of [
      "apps/demo/.env",
      "packages/demo/.env.production",
      "packages/demo/notes/idea.txt",
      "packages/demo/reviews/result.txt",
      "scratch/HANDOFF.local.md",
    ]) {
      expect(isForbiddenPublicPath(path)).toBe(true);
    }
    expect(isForbiddenPublicPath("packages/drawover/README.md")).toBe(false);
  });

  it("finds private hosts across supported URL forms", () => {
    const schemeSeparator = "://";
    const privateHost = ["private", "invalid"].join(".");
    expect(
      findUnapprovedUrlHosts(
        [
          `HTTPS${schemeSeparator}${privateHost}/path`,
          `ssh${schemeSeparator}git.${privateHost}/repo`,
          ["git", "@", `source.${privateHost}:team/repo.git`].join(""),
          ["/", "/", `assets.${privateHost}/file.js`].join(""),
          ["/", "/", `query.${privateHost}?asset=1`].join(""),
          `http${schemeSeparator}[fd00::1]/`,
          `http${schemeSeparator}[::1]/`,
          `https${schemeSeparator}github.com/janiorvalle/drawoverlay`,
          `http${schemeSeparator}localhost:4173/`,
        ].join("\n"),
      ),
    ).toEqual([
      "assets.private.invalid",
      "fd00::1",
      "git.private.invalid",
      "private.invalid",
      "query.private.invalid",
      "source.private.invalid",
    ]);
  });

  it("does not decode binary content as public text", () => {
    expect(isBinaryContent(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0]))).toBe(
      true,
    );
    expect(isBinaryContent(Buffer.from("plain text"))).toBe(false);
  });
});
