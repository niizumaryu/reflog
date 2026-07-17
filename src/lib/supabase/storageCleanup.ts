// Recursively deletes every object under a given prefix (e.g. a user's own
// folder in a bucket) ahead of account deletion. Supabase Storage's
// list()/remove() only operate one folder level at a time, and match-videos
// nests one level deeper (`${userId}/${analysisId}/original.ext`) than
// profile-icons (`${userId}/${filename}`), so a single flat remove() call
// is not enough for every bucket. Takes a minimal structural interface
// (not the full Supabase StorageFileApi type) so it can be unit-tested
// without a network/mock Supabase client.

export type StorageListEntry = { name: string; id: string | null };

export type StorageBucketLike = {
  list: (
    path: string,
    options?: { limit?: number },
  ) => Promise<{ data: StorageListEntry[] | null; error: { message: string } | null }>;
  remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
};

// Returns a list of human-readable error strings; an empty array means
// everything under `prefix` was removed successfully (or there was nothing
// to remove — a missing folder is not an error, since not every user has
// uploaded a video or a custom avatar).
export async function removeAllUnderPrefix(
  bucket: StorageBucketLike,
  prefix: string,
): Promise<string[]> {
  const errors: string[] = [];
  const { data: entries, error: listError } = await bucket.list(prefix, { limit: 1000 });

  if (listError) {
    errors.push(`"${prefix}" の一覧取得に失敗しました: ${listError.message}`);
    return errors;
  }
  if (!entries || entries.length === 0) {
    return errors;
  }

  const filePaths: string[] = [];
  for (const entry of entries) {
    const entryPath = `${prefix}/${entry.name}`;
    // Supabase Storage represents a subfolder as an entry with id === null.
    if (entry.id === null) {
      errors.push(...(await removeAllUnderPrefix(bucket, entryPath)));
    } else {
      filePaths.push(entryPath);
    }
  }

  if (filePaths.length > 0) {
    const { error: removeError } = await bucket.remove(filePaths);
    if (removeError) {
      errors.push(`"${prefix}" 配下のファイル削除に失敗しました: ${removeError.message}`);
    }
  }

  return errors;
}
