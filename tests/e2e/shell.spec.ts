import { expect, test } from "@playwright/test";
import { openPlayground } from "./playground.js";

test("trigger and hotkey toggle the open Shadow DOM shell", async ({
  page,
}) => {
  await openPlayground(page);
  const host = page.locator("#drawover-root");
  const trigger = host.locator(".trigger");
  const toolbar = host.locator(".toolbar");

  await expect(host).toHaveCount(1);
  expect(await host.evaluate((element) => element.shadowRoot?.mode)).toBe(
    "open",
  );
  await expect(toolbar).toBeHidden();
  await trigger.click();
  await expect(toolbar).toBeVisible();
  await page.keyboard.press("Alt+Shift+d");
  await expect(toolbar).toBeHidden();
});

test("shell mode exclusively arbitrates scene pointer events", async ({
  page,
}) => {
  await openPlayground(page);
  const host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  const scene = host.locator('[data-layer="scene"]');
  const targeting = host.locator('[data-layer="element-select"]');

  await expect(scene).toHaveCSS("pointer-events", "none");
  await expect(targeting).toHaveCSS("pointer-events", "none");
  await host.getByRole("button", { name: "Use the annotation scene" }).click();
  await expect(scene).toHaveCSS("pointer-events", "auto");
  await host.getByRole("button", { name: "Select host page elements" }).click();
  await expect(scene).toHaveCSS("pointer-events", "none");
});

test("hostile host CSS does not break the shell", async ({ page }) => {
  await openPlayground(page, { hostile: true });
  const host = page.locator("#drawover-root");
  await host.locator(".trigger").click();

  await expect(host.locator(".toolbar")).toBeVisible();
  await expect(host.locator(".trigger")).toHaveCSS("width", "40px");
  await expect(host).toHaveCSS("z-index", "2147483647");
});

test("mobile toolbar remains inside the viewport without overlap", async ({
  page,
}) => {
  await openPlayground(page);
  const host = page.locator("#drawover-root");
  const trigger = host.locator(".trigger");
  const toolbar = host.locator(".toolbar");
  await trigger.click();

  const triggerBox = await trigger.boundingBox();
  const toolbarBox = await toolbar.boundingBox();
  const viewport = page.viewportSize();
  expect(triggerBox).not.toBeNull();
  expect(toolbarBox).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (triggerBox && toolbarBox && viewport) {
    expect(toolbarBox.x).toBeGreaterThanOrEqual(0);
    expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(viewport.width);
    expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(
      viewport.height,
    );
    expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(triggerBox.x);
  }
});
