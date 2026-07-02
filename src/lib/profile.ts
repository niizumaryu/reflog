import { createClient } from "@/lib/supabase/client";

export type Profile = {
  name: string;
  prefecture: string;
  refereeGrade: string;
  categories: string[];
  yearsOfExperience: number | null;
};

type ProfileRow = {
  name: string;
  prefecture: string;
  referee_grade: string;
  categories: string[];
  years_of_experience: number | null;
};

function rowToProfile(row: ProfileRow): Profile {
  return {
    name: row.name,
    prefecture: row.prefecture,
    refereeGrade: row.referee_grade,
    categories: row.categories,
    yearsOfExperience: row.years_of_experience,
  };
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    name: input.name,
    prefecture: input.prefecture,
    referee_grade: input.refereeGrade,
    categories: input.categories,
    years_of_experience: input.yearsOfExperience,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
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
