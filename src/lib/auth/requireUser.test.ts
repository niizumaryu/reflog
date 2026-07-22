import { describe, expect, it } from "vitest";
import { requireUser } from "@/lib/auth/requireUser";

function makeFakeSupabase(user: { id: string } | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
  } as unknown as Parameters<typeof requireUser>[0];
}

describe("requireUser", () => {
  it("returns the user when logged in", async () => {
    const supabase = makeFakeSupabase({ id: "user-1" });
    await expect(requireUser(supabase)).resolves.toEqual({ id: "user-1" });
  });

  it("throws the shared Japanese message when not logged in", async () => {
    const supabase = makeFakeSupabase(null);
    await expect(requireUser(supabase)).rejects.toThrow("ログインが必要です");
  });
});
