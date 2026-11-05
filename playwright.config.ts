import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "html",
  use: {
    baseURL: "https://app.cityflostaging.com",
    storageState: "auth.json",
    channel: "chrome",
    headless: !process.env.HEADED,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
});
