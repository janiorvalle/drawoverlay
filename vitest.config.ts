import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["packages/**/*.test.ts", "packages/**/*.spec.ts"],
    restoreMocks: true,
  },
});
