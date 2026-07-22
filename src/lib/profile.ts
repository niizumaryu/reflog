import type { DefaultAvatarKey } from "@/components/AvatarIcons";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/client";

export type AvatarType = "default" | "custom";

export type Profile = {
  username: string;
  name: string;
  prefecture: string;
  refereeGrade: string;
  categories: string[];
  yearsOfExperience: number | null;
  avatarType: AvatarType;
  avatarKey: string;
  avatarUrl: string | null;
};

type ProfileRow = {
  username: string | null;
  name: string;
  prefecture: string;
  referee_grade: string;
  categories: string[];
  years_of_experience: number | null;
  avatar_type: string;
  avatar_key: string;
  avatar_url: string | null;
};

function rowToProfile(row: ProfileRow): Profile {
  return {
    username: row.username ?? "",
    name: row.name,
    prefecture: row.prefecture,
    refereeGrade: row.referee_grade,
    categories: row.categories,
    yearsOfExperience: row.years_of_experience,
    avatarType: row.avatar_type === "custom" ? "custom" : "default",
    avatarKey: row.avatar_key || "basketball",
    avatarUrl: row.avatar_url,
  };
}

export const EMPTY_PROFILE: Profile = {
  username: "",
  name: "",
  prefecture: "",
  refereeGrade: "",
  categories: [],
  yearsOfExperience: null,
  avatarType: "default",
  avatarKey: "basketball",
  avatarUrl: null,
};

export function isProfileComplete(profile: Profile | null): boolean {
  return !!profile && profile.username.trim().length > 0;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function validateUsername(username: string): string | null {
  if (!username.trim()) return "ユーザー名は必須です";
  if (!USERNAME_PATTERN.test(username)) {
    return "ユーザー名は英数字とアンダースコアのみ、3〜20文字で入力してください";
  }
  return null;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProfile(data) : null;
}

export async function updateProfile(input: Profile): Promise<void> {
  const usernameError = validateUsername(input.username);
  if (usernameError) throw new Error(usernameError);

  const supabase = createClient();
  const user = await requireUser(supabase);

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    username: input.username,
    name: input.name,
    prefecture: input.prefecture,
    referee_grade: input.refereeGrade,
    categories: input.categories,
    years_of_experience: input.yearsOfExperience,
    avatar_type: input.avatarType,
    avatar_key: input.avatarKey,
    avatar_url: input.avatarUrl,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("このユーザー名は既に使われています");
    }
    throw error;
  }
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png"];
// Maps validated MIME types to a Storage path extension. The extension
// must never be derived from the client-supplied `file.name` (as opposed
// to the browser/OS-reported, already-validated `file.type`) — a crafted
// File with a dot-less or path-like name (e.g. built via `new File([...],
// "../../x")`) would otherwise inject an unsanitized path segment into the
// user's own Storage prefix. Mirrors the same approach already used for
// video uploads in src/lib/video-analysis/upload.ts.
const AVATAR_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return "JPGまたはPNG形式の画像を選択してください";
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return "画像サイズは5MB以内にしてください";
  }
  return null;
}

export async function uploadAvatarImage(file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const user = await requireUser(supabase);

  const extension = AVATAR_EXTENSION_BY_MIME_TYPE[file.type] || "jpg";
  const path = `${user.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-icons")
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("profile-icons").getPublicUrl(path);
  return data.publicUrl;
}

export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

export const ACTIVITY_CATEGORIES = [
  "小学生",
  "中学生",
  "高校",
  "大学",
  "社会人",
  "プロ/Bリーグ",
  "その他",
] as const;

export type { DefaultAvatarKey };
