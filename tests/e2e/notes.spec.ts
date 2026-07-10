import { expect, test, type Locator } from "@playwright/test";

test("general notes survive reload and remain isolated by pathname", async ({
  page,
}) => {
  await page.goto("/review-a");
  let host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await host.getByRole("button", { name: "Open general notes" }).click();

  await addNote(host, "Check mobile spacing");
  await addNote(host, "Make the action clearer");
  const editors = host.getByRole("textbox", { name: "Edit general note" });
  await expect(editors).toHaveCount(2);
  await editors.first().fill("Check mobile and tablet spacing");
  await editors.first().blur();
  await host
    .getByRole("button", { name: "Remove general note" })
    .last()
    .click();
  await expect(editors).toHaveCount(1);

  await page.reload();
  host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await host.getByRole("button", { name: "Open general notes" }).click();
  await expect(
    host.getByRole("textbox", { name: "Edit general note" }),
  ).toHaveValue("Check mobile and tablet spacing");

  await page.goto("/review-b");
  host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await host.getByRole("button", { name: "Open general notes" }).click();
  await expect(host.getByText("No general notes yet.")).toBeVisible();
  await addNote(host, "Only on review B");

  await page.goto("/review-a");
  host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await host.getByRole("button", { name: "Open general notes" }).click();
  await expect(
    host.getByRole("textbox", { name: "Edit general note" }),
  ).toHaveValue("Check mobile and tablet spacing");

  await host.getByRole("button", { name: "Clear annotations" }).click();
  await host.getByRole("button", { name: "Open general notes" }).click();
  await expect(host.getByText("No general notes yet.")).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.endsWith("%2Freview-a")),
    ),
  ).toBe(false);
});

test("general notes panel fits desktop and mobile viewports", async ({
  page,
}) => {
  await page.goto("/layout");
  const host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await host.getByRole("button", { name: "Open general notes" }).click();
  const panel = host.locator(".notes-panel");

  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
});

async function addNote(host: Locator, text: string): Promise<void> {
  await host.getByRole("textbox", { name: "New general note" }).fill(text);
  await host.getByRole("button", { name: "Save general note" }).click();
}
