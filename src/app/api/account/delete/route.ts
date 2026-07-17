import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { removeAllUnderPrefix } from "@/lib/supabase/storageCleanup";

// Storage buckets that store files under a `${userId}/...` prefix. Deleting
// the auth.users row cascades every DB table via foreign keys, but Supabase
// Storage objects are NOT covered by that cascade — without this step, a
// deleted user's uploaded match videos (which may show players, coaches, or
// minors) and profile icons would remain in Storage forever with no owner
// left to request their removal.
const USER_SCOPED_BUCKETS = ["match-videos", "profile-icons"] as const;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Storage cleanup runs before the auth user (and its cascaded DB rows)
  // are deleted, and the whole deletion is aborted if it fails. This keeps
  // the operation safely retryable: if cleanup fails, the user's DB data is
  // still intact and nothing is orphaned in Storage.
  const storageErrors: string[] = [];
  for (const bucket of USER_SCOPED_BUCKETS) {
    const errors = await removeAllUnderPrefix(admin.storage.from(bucket), user.id);
    storageErrors.push(...errors.map((message) => `[${bucket}] ${message}`));
  }

  if (storageErrors.length > 0) {
    console.error("[account/delete] storage cleanup failed", {
      userId: user.id,
      errors: storageErrors,
    });
    return NextResponse.json(
      {
        error:
          "アップロード済みの動画・画像データの削除に失敗したため、アカウント削除を中止しました。時間をおいてもう一度お試しください。",
      },
      { status: 500 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
