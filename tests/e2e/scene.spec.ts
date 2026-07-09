import { expect, type Locator, type Page, test } from "@playwright/test";
import { openPlayground } from "./playground.js";

test.beforeEach(async ({ page }) => {
  await openPlayground(page);
  const host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await host.getByRole("button", { name: "Use the annotation scene" }).click();
});

test("creates and transforms rectangles, arrows, and text", async ({
  page,
}) => {
  const host = page.locator("#drawover-root");
  const scene = host.locator('[data-layer="scene"]');

  await tool(host, "rect").click();
  await drag(page, { x: 40, y: 90 }, { x: 160, y: 160 });
  const rectangle = scene.locator('[data-annotation-type="rect"]');
  await expect(rectangle).toHaveCount(1);

  await tool(host, "select").click();
  await page.mouse.dblclick(100, 125);
  const label = host.getByRole("textbox", { name: "Rectangle label" });
  await label.fill("Header");
  await label.press("Enter");
  await expect(rectangle.locator("text")).toHaveText("Header");

  const southeast = scene.locator('[data-handle="se"]');
  const beforeResize = await rectangle.locator("rect").getAttribute("width");
  await dragLocator(page, southeast, { x: 35, y: 25 });
  const afterResize = await rectangle.locator("rect").getAttribute("width");
  expect(Number(afterResize)).toBeGreaterThan(Number(beforeResize));

  const rotate = scene.locator('[data-handle="rotate"]');
  await page.keyboard.down("Shift");
  await dragLocator(page, rotate, { x: 45, y: 35 });
  await page.keyboard.up("Shift");
  const transform = await rectangle.getAttribute("transform");
  const rotation = Number(transform?.match(/rotate\(([-\d.]+)/)?.[1]);
  expect(rotation % 15).toBe(0);

  await tool(host, "arrow").click();
  await drag(page, { x: 205, y: 100 }, { x: 330, y: 175 });
  const arrow = scene.locator('[data-annotation-type="arrow"]');
  await expect(arrow).toHaveCount(1);
  const endpoint = scene.locator('[data-handle="arrow-end"]');
  const arrowLine = arrow.locator("line").nth(1);
  const oldEnd = await arrowLine.getAttribute("x2");
  await dragLocator(page, endpoint, { x: -40, y: 50 });
  await expect(arrowLine).not.toHaveAttribute("x2", oldEnd ?? "");

  await tool(host, "text").click();
  await page.mouse.click(55, 225);
  const textEditor = host.getByRole("textbox", { name: "Annotation text" });
  await textEditor.fill("Move this section");
  await textEditor.press("Enter");
  await expect(scene.locator('[data-annotation-type="text"]')).toContainText(
    "Move this section",
  );
});

test("supports marquee group moves, duplication, layers, delete, and deep history", async ({
  page,
}) => {
  const host = page.locator("#drawover-root");
  const scene = host.locator('[data-layer="scene"]');
  await tool(host, "rect").click();
  await drag(page, { x: 55, y: 85 }, { x: 145, y: 145 });
  await drag(page, { x: 175, y: 95 }, { x: 265, y: 155 });
  await tool(host, "select").click();

  await drag(page, { x: 25, y: 60 }, { x: 290, y: 180 });
  await expect(host.locator(".scene-status")).toHaveText(
    "2 items / 2 selected",
  );
  const shapes = scene.locator('[data-annotation-type="rect"] rect');
  const firstX = Number(await shapes.nth(0).getAttribute("x"));
  const secondX = Number(await shapes.nth(1).getAttribute("x"));
  await drag(page, { x: 90, y: 115 }, { x: 120, y: 135 });
  expect(Number(await shapes.nth(0).getAttribute("x"))).toBe(firstX + 30);
  expect(Number(await shapes.nth(1).getAttribute("x"))).toBe(secondX + 30);

  await page.keyboard.press("Control+d");
  await expect(scene.locator('[data-annotation-type="rect"]')).toHaveCount(4);
  await page.keyboard.down("Alt");
  await drag(page, { x: 120, y: 135 }, { x: 145, y: 160 });
  await page.keyboard.up("Alt");
  await expect(scene.locator('[data-annotation-type="rect"]')).toHaveCount(6);

  await page.mouse.click(105, 120);
  const selectedId = await scene
    .locator("[data-selection-for]")
    .getAttribute("data-selection-for");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await host.getByRole("button", { name: "Bring to front" }).click();
  await expect(scene.locator("[data-annotation-id]").last()).toHaveAttribute(
    "data-annotation-id",
    selectedId ?? "",
  );
  await page.keyboard.press("Delete");
  await expect(scene.locator('[data-annotation-type="rect"]')).toHaveCount(5);

  for (let step = 0; step < 10; step += 1)
    await page.keyboard.press("Control+z");
  await expect(scene.locator('[data-annotation-type="rect"]')).toHaveCount(0);
  for (let step = 0; step < 10; step += 1)
    await page.keyboard.press("Control+Shift+z");
  await expect(scene.locator('[data-annotation-type="rect"]')).toHaveCount(5);
});

test("inserts images from a file and clipboard paste", async ({ page }) => {
  const host = page.locator("#drawover-root");
  const images = host.locator('[data-annotation-type="image"]');
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );

  await host.locator('input[data-scene-image-input="true"]').setInputFiles({
    name: "inserted.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(images).toHaveCount(1);

  await page.evaluate((base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) =>
      character.charCodeAt(0),
    );
    const file = new File([bytes], "pasted.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    document.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData: transfer }),
    );
  }, png.toString("base64"));
  await expect(images).toHaveCount(2);

  await tool(host, "select").click();
  const imageBox = await images.last().boundingBox();
  expect(imageBox).not.toBeNull();
  if (imageBox) {
    await drag(
      page,
      {
        x: imageBox.x + imageBox.width / 2,
        y: imageBox.y + imageBox.height / 2,
      },
      {
        x: imageBox.x + imageBox.width / 2 + 30,
        y: imageBox.y + imageBox.height / 2 + 20,
      },
    );
  }
  await expect(images).toHaveCount(2);
});

function tool(host: Locator, name: string): Locator {
  return host.locator(`button[data-tool="${name}"]`);
}

async function drag(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
}

async function dragLocator(
  page: Page,
  locator: Locator,
  delta: { x: number; y: number },
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await drag(page, start, { x: start.x + delta.x, y: start.y + delta.y });
}
