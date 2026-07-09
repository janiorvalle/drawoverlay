import type { Page } from "@playwright/test";

interface PlaygroundOptions {
  hostile?: boolean;
}

export async function openPlayground(
  page: Page,
  options: PlaygroundOptions = {},
): Promise<void> {
  await page.goto(options.hostile ? "/?hostile" : "/");
}
