import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

test("annotates, edits, copies, reloads, and clears a mixed review", async ({
  page,
}) => {
  await page.goto("/phase-2-flow");
  let host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await addElementComment(page, host, "Disable until validation passes");

  await host.getByRole("button", { name: "Use the annotation scene" }).click();
  await host.locator('button[data-tool="rect"]').click();
  await drag(page, { x: 42, y: 180 }, { x: 174, y: 252 });
  const scene = host.locator('[data-layer="scene"]');
  const pin = scene.locator('[data-annotation-type="element-pin"]');
  const rectangle = scene.locator('[data-annotation-type="rect"]');
  await expect(pin).toHaveAttribute("data-annotation-number", "1");
  await expect(rectangle).toHaveAttribute("data-annotation-number", "2");
  await expect(pin.locator("text")).toHaveText("1");
  await expect(
    rectangle.locator('[data-annotation-badge-label="2"]'),
  ).toHaveText("2");

  await rectangle.click({ position: { x: 70, y: 38 } });
  await host.getByRole("button", { name: "Send to back" }).click();
  await expect(pin).toHaveAttribute("data-annotation-number", "1");
  await expect(rectangle).toHaveAttribute("data-annotation-number", "2");

  await host.getByRole("button", { name: "Copy Markdown" }).click();
  await expect(host.locator(".command-status")).toHaveText("Markdown copied");
  const markdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(markdown).toContain("## Element comments");
  expect(markdown).toContain('### [1] "Disable until validation passes"');
  expect(markdown).toContain("### [2] Rectangle");

  await pin.dispatchEvent("dblclick");
  const commentEditor = host.getByRole("textbox", { name: "Element comment" });
  await expect(commentEditor).toHaveValue("Disable until validation passes");
  await commentEditor.fill("Keep disabled until every field is valid");
  await host.getByRole("button", { name: "Save element comment" }).click();
  await expect(pin.locator("title")).toHaveText(
    "Keep disabled until every field is valid",
  );

  await page.reload();
  host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  const restoredScene = host.locator('[data-layer="scene"]');
  await expect(
    restoredScene.locator('[data-annotation-type="element-pin"]'),
  ).toHaveCount(1);
  await expect(
    restoredScene.locator('[data-annotation-type="rect"]'),
  ).toHaveCount(1);
  const undo = host.getByRole("button", { name: "Undo" });
  await expect(undo).toBeDisabled();
  await host.getByRole("button", { name: "Use the annotation scene" }).click();
  await page.keyboard.press("Control+z");
  await expect(restoredScene.locator("[data-annotation-id]")).toHaveCount(2);

  await host.getByRole("button", { name: "Clear annotations" }).click();
  await expect(restoredScene.locator("[data-annotation-id]")).toHaveCount(0);
  await page.reload();
  host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await expect(
    host.locator('[data-layer="scene"] [data-annotation-id]'),
  ).toHaveCount(0);
});

test("copies the Markdown and the annotated PNG from separate buttons", async ({
  page,
}) => {
  const remoteAssetRequests: string[] = [];
  await page.route("https://assets.example.com/**", async (route) => {
    remoteAssetRequests.push(route.request().url());
    await route.abort();
  });
  await page.goto("/phase-2-png");
  await page.evaluate(() => {
    document.body.dataset.captureConnections = "0";
    if (!customElements.get("capture-probe")) {
      customElements.define(
        "capture-probe",
        class extends HTMLElement {
          connectedCallback() {
            const current = Number(
              document.body.dataset.captureConnections ?? "0",
            );
            document.body.dataset.captureConnections = String(current + 1);
          }
        },
      );
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const image = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "image",
    );
    image.setAttribute("href", "https://assets.example.com/remote.svg");
    svg.style.display = "none";
    svg.append(image);
    const remoteStyle = document.createElement("div");
    remoteStyle.style.backgroundImage =
      'url("https://assets.example.com/remote-background.png")';
    remoteStyle.style.display = "none";
    const responsiveImage = document.createElement("img");
    responsiveImage.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    responsiveImage.srcset = "https://assets.example.com/remote-2x.png 2x";
    responsiveImage.style.display = "none";
    const customElement = document.createElement("capture-probe");
    customElement.textContent = "Capture probe";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.dataset.captureFile = "true";
    fileInput.style.display = "none";
    const legacyBackground = document.createElement("table");
    legacyBackground.setAttribute(
      "background",
      "https://assets.example.com/legacy-background.png",
    );
    legacyBackground.style.display = "none";
    document.body.append(
      svg,
      remoteStyle,
      responsiveImage,
      customElement,
      fileInput,
      legacyBackground,
    );
  });
  await page.locator("[data-capture-file]").setInputFiles({
    buffer: Buffer.from("local review fixture"),
    mimeType: "text/plain",
    name: "review.txt",
  });
  await page.waitForTimeout(100);
  remoteAssetRequests.length = 0;
  const host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  await host.getByRole("button", { name: "Use the annotation scene" }).click();
  await host.locator('button[data-tool="rect"]').click();
  await drag(page, { x: 46, y: 180 }, { x: 190, y: 270 });
  const badge = host.locator(
    '[data-annotation-type="rect"] [data-annotation-badge]',
  );
  const badgePoint = await badge.evaluate((element) => ({
    x: Number(element.getAttribute("cx")) + 7,
    y: Number(element.getAttribute("cy")) + 7,
  }));
  const submitBounds = await page.getByTestId("checkout-submit").boundingBox();
  if (!submitBounds) throw new Error("Checkout button was not visible.");
  const gradientBounds = await page.getByTestId("gradient-cta").boundingBox();
  if (!gradientBounds) throw new Error("Gradient button was not visible.");
  const logoBounds = await page.getByTestId("capture-logo").boundingBox();
  if (!logoBounds) throw new Error("Logo image was not visible.");
  const svgLogoBounds = await page
    .getByTestId("capture-svg-logo")
    .boundingBox();
  if (!svgLogoBounds) throw new Error("SVG logo was not visible.");
  const badgeBounds = await page
    .getByTestId("capture-background-badge")
    .boundingBox();
  if (!badgeBounds) throw new Error("Background badge was not visible.");
  const pixelRatio = await page.evaluate(() => window.devicePixelRatio);

  await host.getByRole("button", { name: "Copy image" }).click();
  await expect(host.locator(".command-status")).toHaveText("Image copied");
  // Capture may re-fetch assets the page references, so they inline into
  // the PNG — and nothing beyond them: the href inside inline SVG must stay
  // untouched. The legacy background attribute surfaces as a computed
  // background-image, so it counts as referenced. The aborted background
  // proves a dead asset costs its own pixels, never the copy.
  const referencedRemoteAssets = new Set([
    "https://assets.example.com/remote-background.png",
    "https://assets.example.com/remote-2x.png",
    "https://assets.example.com/legacy-background.png",
  ]);
  expect(remoteAssetRequests).toContain(
    "https://assets.example.com/remote-background.png",
  );
  expect(
    remoteAssetRequests.filter((url) => !referencedRemoteAssets.has(url)),
  ).toEqual([]);
  await expect(page.locator("body")).toHaveAttribute(
    "data-capture-connections",
    "1",
  );
  const pngBase64 = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (!item.types.includes("image/png")) continue;
      const blob = await item.getType("image/png");
      const buffer = await blob.arrayBuffer();
      let binary = "";
      for (const byte of new Uint8Array(buffer)) {
        binary += String.fromCharCode(byte);
      }
      return btoa(binary);
    }
    throw new Error("Clipboard has no image/png item.");
  });
  const imageTypes = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return items.flatMap((item) => [...item.types]);
  });
  expect(imageTypes).not.toContain("text/plain");

  await host.getByRole("button", { name: "Copy Markdown" }).click();
  await expect(host.locator(".command-status")).toHaveText("Markdown copied");
  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardText).toContain("## Drawings");
  const png = Buffer.from(pngBase64, "base64");
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.byteLength).toBeGreaterThan(2_000);

  const pixels = await page.evaluate(
    async ({
      background,
      badge,
      dataUrl,
      gradient,
      host,
      logo,
      ratio,
      svgLogo,
    }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PNG test canvas is unavailable.");
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      const sample = (x: number, y: number) => {
        const pixelX = Math.min(canvas.width - 1, Math.round(x * ratio));
        const pixelY = Math.min(canvas.height - 1, Math.round(y * ratio));
        const index = (pixelY * canvas.width + pixelX) * 4;
        return [...imageData.slice(index, index + 4)];
      };
      let annotationPixels = 0;
      for (let y = background.y - 14; y <= background.y + 14; y += 1) {
        for (let x = background.x - 14; x <= background.x + 14; x += 1) {
          const [red, green, blue] = sample(x, y);
          if (
            red !== undefined &&
            green !== undefined &&
            blue !== undefined &&
            red > 180 &&
            green < 150 &&
            blue < 150
          ) {
            annotationPixels += 1;
          }
        }
      }
      let hostPixels = 0;
      for (let y = host.y; y <= host.y + host.height; y += 1) {
        for (let x = host.x; x <= host.x + host.width; x += 1) {
          const [red, green, blue] = sample(x, y);
          if (
            red !== undefined &&
            green !== undefined &&
            blue !== undefined &&
            red >= 10 &&
            red <= 40 &&
            green >= 90 &&
            green <= 130 &&
            blue >= 80 &&
            blue <= 120
          ) {
            hostPixels += 1;
          }
        }
      }
      // Tailwind v4 archetype: gradients with modern interpolation hints must
      // survive capture, or white-on-amber CTAs render white-on-white.
      let gradientPixels = 0;
      for (let y = gradient.y; y <= gradient.y + gradient.height; y += 1) {
        for (let x = gradient.x; x <= gradient.x + gradient.width; x += 1) {
          const [red, green, blue] = sample(x, y);
          if (
            red !== undefined &&
            green !== undefined &&
            blue !== undefined &&
            red >= 150 &&
            red <= 215 &&
            green >= 50 &&
            green <= 105 &&
            blue <= 40
          ) {
            gradientPixels += 1;
          }
        }
      }
      // Logo archetypes: a served bitmap, an inline SVG styled from CSS, and
      // a CSS background-image must all land in the capture.
      const countInBounds = (
        bounds: { x: number; y: number; width: number; height: number },
        match: (red: number, green: number, blue: number) => boolean,
      ) => {
        let matches = 0;
        for (let y = bounds.y; y <= bounds.y + bounds.height; y += 1) {
          for (let x = bounds.x; x <= bounds.x + bounds.width; x += 1) {
            const [red, green, blue] = sample(x, y);
            if (
              red !== undefined &&
              green !== undefined &&
              blue !== undefined &&
              match(red, green, blue)
            ) {
              matches += 1;
            }
          }
        }
        return matches;
      };
      const logoPixels = countInBounds(
        logo,
        (red, green, blue) =>
          red >= 170 && red <= 225 && green < 60 && blue >= 95 && blue <= 145,
      );
      const svgLogoPixels = countInBounds(
        svgLogo,
        (red, green, blue) =>
          red < 60 && green >= 40 && green <= 100 && blue > 180,
      );
      const badgePixels = countInBounds(
        badge,
        (red, green, blue) =>
          red < 50 && green >= 125 && green <= 180 && blue >= 60 && blue <= 115,
      );
      return {
        annotationPixels,
        badgePixels,
        gradientPixels,
        hostCenter: sample(host.x + host.width / 2, host.y + host.height / 2),
        hostPixels,
        logoPixels,
        page: sample(8, 150),
        svgLogoPixels,
      };
    },
    {
      background: badgePoint,
      badge: badgeBounds,
      dataUrl: `data:image/png;base64,${png.toString("base64")}`,
      gradient: gradientBounds,
      host: submitBounds,
      logo: logoBounds,
      ratio: pixelRatio,
      svgLogo: svgLogoBounds,
    },
  );
  expect(pixels.annotationPixels).toBeGreaterThan(20);
  expect(pixels.hostPixels).toBeGreaterThan(500);
  expect(pixels.gradientPixels).toBeGreaterThan(500);
  expect(pixels.logoPixels).toBeGreaterThan(200);
  expect(pixels.svgLogoPixels).toBeGreaterThan(200);
  expect(pixels.badgePixels).toBeGreaterThan(200);
  expect(pixels.hostCenter.slice(0, 3)).toEqual([19, 111, 99]);
  expect(pixels.page.slice(0, 3)).toEqual([238, 241, 245]);
});

test("keeps element pins anchored through layout and nested scrolling", async ({
  page,
}) => {
  await page.goto("/phase-2-anchor");
  const host = page.locator("#drawover-root");
  await host.locator(".trigger").click();
  const container = page.locator('[data-fixture="scroll-container"]');
  const target = page.locator('[data-fixture="scrolled-target"]');
  await container.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await target.scrollIntoViewIfNeeded();
  await target.click();
  await host.getByRole("button", { name: "Add comment" }).click();
  const dialog = host.getByRole("dialog", { name: "Add comment" });
  const dialogStart = await dialog.boundingBox();
  if (!dialogStart) throw new Error("Comment dialog was not visible.");
  await container.evaluate((element) => {
    const before = element.scrollTop;
    element.scrollTop = Math.max(0, before - 20);
  });
  await expect
    .poll(async () => {
      const bounds = await dialog.boundingBox();
      return Math.round((bounds?.y ?? 0) - dialogStart.y);
    })
    .not.toBe(0);
  await host
    .getByRole("textbox", { name: "Element comment" })
    .fill("Keep this anchored");
  await host.getByRole("button", { name: "Save element comment" }).click();
  await expect(target).toBeFocused();

  const pin = host.locator('[data-annotation-type="element-pin"] circle');
  const startX = Number(await pin.getAttribute("cx"));
  const startY = Number(await pin.getAttribute("cy"));
  const targetStart = await target.boundingBox();
  if (!targetStart) throw new Error("Target element was not visible.");
  await container.evaluate((element) => {
    const before = element.scrollTop;
    element.scrollTop = Math.max(0, before - 30);
  });
  const targetAfterScroll = await target.boundingBox();
  if (!targetAfterScroll) throw new Error("Target element was not visible.");
  const expectedPinY = startY + targetAfterScroll.y - targetStart.y;
  await expect
    .poll(async () =>
      Math.abs(Number(await pin.getAttribute("cy")) - expectedPinY),
    )
    .toBeLessThanOrEqual(5);

  await target.evaluate((element) => {
    (element as HTMLElement).style.transform = "translateX(30px)";
  });
  await expect
    .poll(async () => Number(await pin.getAttribute("cx")))
    .toBe(startX + 30);
});

for (const theme of ["dark", "light"] as const) {
  test(`keeps the complete overlay accessible under hostile host CSS (${theme} theme)`, async ({
    page,
  }) => {
    await page.goto("/?fixture=hostile");
    const host = page.locator("#drawover-root");
    await host
      .locator(".root")
      .evaluate(
        (root, next) => ((root as HTMLElement).dataset.theme = next),
        theme,
      );
    await host.locator(".trigger").click();
    await page.getByTestId("checkout-submit").click();
    await host.getByRole("button", { name: "Add comment" }).click();
    await expect(
      host.getByRole("dialog", { name: "Add comment" }),
    ).toBeVisible();
    await expect(
      host.getByRole("textbox", { name: "Element comment" }),
    ).toBeFocused();

    const results = await new AxeBuilder({ page })
      .include("#drawover-root")
      .analyze();
    expect(
      results.violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map(({ failureSummary, html, target }) => ({
          failureSummary,
          html,
          target,
        })),
      })),
    ).toEqual([]);
  });
}

async function addElementComment(
  page: Page,
  host: Locator,
  comment: string,
): Promise<void> {
  await page.getByTestId("checkout-submit").click();
  await host.getByRole("button", { name: "Add comment" }).click();
  const editor = host.getByRole("textbox", { name: "Element comment" });
  await editor.fill(comment);
  await host.getByRole("button", { name: "Save element comment" }).click();
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
