import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// There's no local Postgres instance in this project's test setup, so RLS
// and trigger behavior can't be exercised by vitest directly. This test
// instead pins the presence of the specific hardening statements the
// Phase 2.5 migration relies on for "a user can only see/change their own
// data" and "quota can't be bypassed" — if a future edit accidentally
// drops one of these while touching the file, this test fails loudly
// instead of silently regressing a security property.
const migrationPath = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260717_harden_video_analysis.sql",
);
const sql = readFileSync(migrationPath, "utf-8");

describe("20260717_harden_video_analysis.sql", () => {
  it("scopes the plan_limits read policy to authenticated users only", () => {
    expect(sql).toMatch(/create policy "Authenticated users can view plan limits"/);
    expect(sql).toMatch(/auth\.role\(\) = 'authenticated'/);
  });

  it("does not grant any insert/update/delete policy on plan_limits", () => {
    expect(sql).not.toMatch(/on public\.plan_limits for (insert|update|delete)/);
  });

  it("scopes the quota check/increment to the inserting row's own user_id", () => {
    expect(sql).toMatch(/where id = new\.user_id/);
  });

  it("blocks a client from silently rewriting plan_type or usage counters", () => {
    expect(sql).toMatch(/protect_profile_plan_columns/);
    expect(sql).toMatch(/plan_type is managed by the system and cannot be changed directly/);
    expect(sql).toMatch(
      /monthly_video_analysis_count is managed by the system and cannot be changed directly/,
    );
  });

  it("only lets the quota trigger or a superuser/service-role session bypass the plan-column guard", () => {
    expect(sql).toMatch(/reflog\.bypass_plan_guard/);
    expect(sql).toMatch(/session_user in \('postgres', 'service_role'\)/);
  });

  it("enforces the quota atomically on video_analyses insert, not just in application code", () => {
    expect(sql).toMatch(/before insert on public\.video_analyses/);
    expect(sql).toMatch(/execute function public\.enforce_video_analysis_quota/);
  });

  it("keeps existing data intact: no destructive statements", () => {
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).not.toMatch(/delete from/i);
    expect(sql).not.toMatch(/truncate/i);
  });
});
