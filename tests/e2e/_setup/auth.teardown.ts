import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const TEST_EMAIL = "qa-bot@legaldesk-test.ai";
const STORAGE_PATH = path.join(process.cwd(), "tests/e2e/_setup/storage.json");

teardown("delete test user and cached storage", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return;

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Find the user by email, then delete. listUsers paginates; we only
  // care about the first matching entry since the email is unique.
  const { data } = await admin.auth.admin.listUsers();
  const target = data?.users?.find((u) => u.email === TEST_EMAIL);
  if (target) {
    await admin.auth.admin.deleteUser(target.id);
  }

  if (fs.existsSync(STORAGE_PATH)) {
    fs.unlinkSync(STORAGE_PATH);
  }
});
