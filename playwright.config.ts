import { defineConfig, devices } from "@playwright/test";

const playgroundPort = process.env.DRAWOVER_PLAYGROUND_PORT ?? "4173";
const playgroundUrl = `http://127.0.0.1:${playgroundPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: playgroundUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm --filter @drawover/playground dev --host 127.0.0.1 --port ${playgroundPort}`,
    url: playgroundUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
