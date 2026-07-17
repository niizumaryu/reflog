import { NextResponse } from "next/server";
import webpush from "web-push";
import { checkRateLimit } from "@/lib/rateLimit";
import { createClient } from "@/lib/supabase/server";

// Sends a one-off push to every device the logged-in user has subscribed,
// so the settings UI can offer a "send test notification" button without
// waiting for the hourly cron (src/app/api/cron/notifications) to fire.
// Uses the cookie-authenticated client (not the service-role admin client)
// since RLS already scopes push_subscriptions to auth.uid() = user_id.
export async function POST() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: "通知機能が設定されていません（VAPID公開鍵が未設定）" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // This route pushes to every device the user has subscribed and calls an
  // external push service per device — worth capping per-user so a stuck
  // "send test notification" button (or a script) can't be used to spam a
  // device or hammer the push provider.
  const rateLimit = checkRateLimit(`notifications-test:${user.id}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく待ってからもう一度お試しください。" },
      { status: 429 },
    );
  }

  const { data: subscriptions, error: subError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", user.id);
  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json(
      { error: "プッシュ通知が登録されていません。まず通知をONにしてください。" },
      { status: 400 },
    );
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@reflog.app",
    vapidPublicKey,
    vapidPrivateKey,
  );

  const payload = JSON.stringify({
    title: "REFLOG",
    body: "テスト通知です。これが届けば設定は正常に動作しています。",
    url: "/",
  });

  let sent = 0;
  const errors: string[] = [];
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload,
      );
      sent++;
    } catch (sendError) {
      const statusCode =
        sendError && typeof sendError === "object" && "statusCode" in sendError
          ? (sendError as { statusCode?: number }).statusCode
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      } else {
        errors.push(sendError instanceof Error ? sendError.message : String(sendError));
      }
    }
  }

  if (sent === 0) {
    return NextResponse.json(
      { error: errors[0] || "通知の送信に失敗しました。登録済みのデバイスが無効な可能性があります。" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, sent, errors });
}
