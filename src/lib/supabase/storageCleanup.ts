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

// Read-only counterpart of removeAllUnderPrefix: recursively lists every
// file under a prefix (used by the orphan-upload detector, which needs
// to compare Storage's contents against video_analyses rather than
// delete anything itself). Supabase Storage's list() returns each file
// entry's updated_at, which orphan detection needs to apply a minimum-age
// grace period — see src/lib/video-analysis/orphanUploads.ts.
export type StorageListFileEntry = {
  name: string;
  id: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type StorageListerLike = {
  list: (
    path: string,
    options?: { limit?: number },
  ) => Promise<{ data: StorageListFileEntry[] | null; error: { message: string } | null }>;
};

export type ListedStorageFile = { path: string; updatedAt: string | null };

// Best-effort: a list() failure at any level is silently skipped rather
// than thrown, so one unreadable folder doesn't abort scanning the rest
// of the bucket. The caller (a maintenance job that only ever reads from
// this before deciding what to delete) treats an incomplete listing as
// "found fewer orphans this run" rather than a hard failure.
export async function listAllFilePaths(
  bucket: StorageListerLike,
  prefix: string,
): Promise<ListedStorageFile[]> {
  const { data: entries, error } = await bucket.list(prefix, { limit: 1000 });
  if (error || !entries) return [];

  const results: ListedStorageFile[] = [];
  for (const entry of entries) {
    // At the bucket root, prefix === "" — avoid producing a leading-slash
    // path like "/user-1" there, since Supabase Storage paths never start
    // with '/' and such a path would never match a real storage_path.
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      results.push(...(await listAllFilePaths(bucket, entryPath)));
    } else {
      results.push({ path: entryPath, updatedAt: entry.updated_at ?? entry.created_at ?? null });
    }
  }
  return results;
}
