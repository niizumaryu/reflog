import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/client";
import type { NotificationType } from "@/lib/notifications/config";

// CRUD for the notification center (`/notifications`). Distinct from
// src/lib/notifications/settings.ts, which manages per-type on/off + send
// times, and from notification_log, which only exists server-side to dedupe
// scheduled sends.

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    url: row.url,
    referenceId: row.reference_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export type NotificationStatusFilter = "all" | "unread" | "read";

export type ListNotificationsOptions = {
  status?: NotificationStatusFilter;
  type?: NotificationType | "all";
  query?: string;
  limit?: number;
};

export async function listNotifications(
  options: ListNotificationsOptions = {},
): Promise<AppNotification[]> {
  const supabase = createClient();
  const { status = "all", type = "all", query, limit = 100 } = options;

  let builder = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "unread") builder = builder.eq("is_read", false);
  if (status === "read") builder = builder.eq("is_read", true);
  if (type !== "all") builder = builder.eq("type", type);
  if (query && query.trim()) {
    // Escape PostgREST ilike wildcards so a literal "%" or "_" in the
    // search box doesn't act as a pattern character.
    const escaped = query.trim().replace(/[%_]/g, (match) => `\\${match}`);
    builder = builder.or(`title.ilike.%${escaped}%,body.ilike.%${escaped}%`);
  }

  const { data, error } = await builder;
  if (error) throw error;
  return (data ?? []).map(rowToNotification);
}

export async function getUnreadCount(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllAsRead(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export type NewNotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  referenceId?: string | null;
};

export async function createNotification(input: NewNotificationInput): Promise<void> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const { error } = await supabase.from("notifications").insert({
    user_id: user.id,
    type: input.type,
    title: input.title,
    body: input.body,
    url: input.url ?? "/",
    reference_id: input.referenceId ?? null,
  });
  if (error) throw error;
}

// Used to dedupe client-created notifications (currently only ai_advice):
// true if a notification of this type + reference_id already exists.
export async function hasNotification(
  type: NotificationType,
  referenceId: string,
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", type)
    .eq("reference_id", referenceId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
