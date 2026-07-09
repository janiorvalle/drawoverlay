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

test("max-z host fixture remains below the usable Drawover chrome", async ({
  page,
}) => {
  await page.goto("/?fixture=max-z");
  const hostObstacle = page.getByTestId("max-z-hostile");
  const host = page.locator("#drawover-root");
  const trigger = host.locator(".trigger");

  await expect(hostObstacle).toHaveCSS("z-index", "2147483647");
  await trigger.click();
  await expect(host.locator(".toolbar")).toBeVisible();
});

test("fixture matrix exposes stable paths and framework metadata", async ({
  page,
}) => {
  await page.goto("/?fixture=framework");

  await expect(page.getByTestId("expiry-date")).toBeVisible();
  await expect(page.locator("#card-number")).toBeVisible();
  await expect(page.locator(".fixtureControlaB12Cdef")).toBeVisible();
  await expect(page.locator(".checkoutButton_aB12Cdef")).toBeVisible();
  await expect(page.locator('[data-fixture="scroll-container"]')).toBeVisible();
  const overlapFixture = page.locator('[data-fixture="overlap"]');
  await expect(overlapFixture).toBeVisible();
  expect(
    await overlapFixture.evaluate((element) => {
      const back = element
        .querySelector(".overlap-back")
        ?.getBoundingClientRect();
      const front = element
        .querySelector(".overlap-front")
        ?.getBoundingClientRect();
      return Boolean(
        back &&
        front &&
        Math.max(back.left, front.left) < Math.min(back.right, front.right) &&
        Math.max(back.top, front.top) < Math.min(back.bottom, front.bottom),
      );
    }),
  ).toBe(true);

  const metadata = await page.evaluate(() => {
    const react = document.querySelector<HTMLElement>(
      '[data-framework-target="react"]',
    );
    const vue = document.querySelector<HTMLElement>(
      '[data-framework-target="vue"]',
    );
    const reactKey = Object.keys(react ?? {}).find((key) =>
      key.startsWith("__reactFiber$"),
    );

    const fiber = reactKey
      ? (react as unknown as Record<string, unknown>)[reactKey]
      : null;
    const fiberRecord = fiber as {
      return?: { _debugSource?: { fileName?: string } };
    } | null;
    const vueInstance = (
      vue as unknown as {
        __vueParentComponent?: { type?: { __name?: string } };
      }
    ).__vueParentComponent;

    return {
      hasReactFiber: fiber !== null,
      reactSource: fiberRecord?.return?._debugSource?.fileName,
      vueName: vueInstance?.type?.__name,
    };
  });

  expect(metadata).toEqual({
    hasReactFiber: true,
    reactSource: "src/components/CheckoutAction.tsx",
    vueName: "PaymentSummary",
  });
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
