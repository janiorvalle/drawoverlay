import { expect, test } from "@playwright/test";

const sentinel = "DRAWOVER_RUNTIME_SENTINEL_V1";

for (const preview of [
  { name: "Vite", url: "http://127.0.0.1:43174/?fixture=normal" },
  { name: "Next.js", url: "http://127.0.0.1:43175/" },
]) {
  test(`${preview.name} preview opt-in build mounts drawover`, async ({
    page,
  }) => {
    await page.goto(preview.url);
    const host = page.locator("#drawover-root");

    await expect(host).toHaveCount(1);
    await expect(host).toHaveAttribute("data-drawover-runtime", sentinel);
    await expect(host.locator(".trigger")).toBeVisible();
  });
}
