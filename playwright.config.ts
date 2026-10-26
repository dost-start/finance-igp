import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // CI: variables come from the environment
}

export const E2E_PORT = 3101;
export const E2E_AUTH_SECRET = "e2e-only-secret-never-used-in-production-0123456789";

// The test runs the app locally. Drive and Gmail are switched off (empty values beat .env.local), so
// receipts go to the git-ignored .data folder and no real email is sent. The database is the real
// one, so the test deletes everything it creates (see e2e/happy-path.e2e.ts).
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120_000,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${E2E_PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DRIVE_FOLDER_ID: "",
      DRIVE_REFRESH_TOKEN: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      AUTH_SECRET: E2E_AUTH_SECRET,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${E2E_PORT}`,
      // Values finance has not given yet, set to obvious test values so the actions that need them can run.
      REFUND_TIMEFRAME: "E2E TEST TIMEFRAME",
      REJECTION_DEADLINE_HOURS: "10",
      EMAIL_DAILY_LIMIT: "5", // small on purpose: the status-flow test fills it with fake "sent" rows to check the guard
    },
  },
});
