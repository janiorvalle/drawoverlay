import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:43173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command:
        "pnpm --filter @drawover/playground dev --host 127.0.0.1 --port 43173",
      url: "http://127.0.0.1:43173",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node scripts/serve-static.mjs .fixture-builds/vite 43174",
      url: "http://127.0.0.1:43174",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node scripts/serve-static.mjs .fixture-builds/next 43175",
      url: "http://127.0.0.1:43175",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
