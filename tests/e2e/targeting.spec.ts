import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle Drawover" }).click();
});

test("targets the complete selector and framework fixture matrix", async ({
  page,
}) => {
  const output = page.locator("#targeting-output");

  await page.getByTestId("fixture-testid").click();
  await expect(output).toContainText('[data-testid="fixture-testid"] | button');
  await cancelComment(page);

  await page.locator("#fixture-id").click();
  await expect(output).toContainText("#fixture-id | button");
  await cancelComment(page);

  await page.locator(".stable-action").click();
  await expect(output).toContainText("button.stable-action | button");
  await cancelComment(page);

  await page.locator(".styles_button__x7H2p").click();
  await expect(output).toContainText("div.hash-region > button | button");
  await expect(output).not.toContainText("x7H2p");
  await cancelComment(page);

  await page.locator("#react-fixture").click();
  await expect(output).toContainText(
    "#react-fixture | button | react:CheckoutAction",
  );
  await cancelComment(page);

  await page.locator("#vue-fixture").click();
  await expect(output).toContainText(
    "#vue-fixture | button | vue:PaymentSummary",
  );
  await cancelComment(page);
});

test("highlights nested and overlapping hit-test targets", async ({ page }) => {
  const highlight = page
    .locator("#drawover-root")
    .locator("[data-targeting-highlight]");

  await page.locator(".nested-label").hover();
  await expect(highlight).toHaveAttribute(
    "data-target-selector",
    "span.nested-label",
  );

  await page.locator(".overlap-front").hover();
  await expect(highlight).toHaveAttribute(
    "data-target-selector",
    "div.overlap-front",
  );
});

test("selects in scrolled containers and consumes reviewing clicks", async ({
  page,
}) => {
  const scroller = page.locator(".scroll-fixture");
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.locator(".scrolled-action").click();
  await expect(page.locator("#targeting-output")).toContainText(
    "button.scrolled-action | button",
  );
  await cancelComment(page);

  // Reviewing must never operate the page: the click selects the button
  // for commenting but its own handler (and any navigation) never fires.
  const passThrough = page.locator("#pass-through");
  await passThrough.click();
  await expect(page.locator("#targeting-output")).toContainText(
    "#pass-through | button",
  );
  await expect(passThrough).toContainText("Host click count: 0");
  await cancelComment(page);

  // With Drawover closed, the page behaves normally again.
  const host = page.locator("#drawover-root");
  await host.getByRole("button", { name: "Close Drawover" }).click();
  await passThrough.click();
  await expect(passThrough).toContainText("Host click count: 1");
});

test("clears hover visuals when the shell closes", async ({ page }) => {
  const highlight = page
    .locator("#drawover-root")
    .locator("[data-targeting-highlight]");
  await page.locator("#fixture-id").hover();
  await expect(highlight).toBeVisible();

  await page.getByRole("button", { name: "Close Drawover" }).click();
  await expect(highlight).toHaveCount(0);
});

async function cancelComment(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page
    .locator("#drawover-root")
    .getByRole("button", { name: "Cancel element comment" })
    .click();
}
