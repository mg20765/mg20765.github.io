import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  use: { baseURL: "http://localhost:4174" },
  webServer: {
    command: "npm start",
    url: "http://localhost:4174",
    reuseExistingServer: true,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
