// Browser-side helpers for Web Push subscription. All functions are no-ops
// (or throw) when called outside a browser / unsupported browser, so callers
// must check `isPushSupported()` first.

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

// Web Push requires the VAPID public key as a Uint8Array, but it's issued as
// a URL-safe base64 string.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// navigator.serviceWorker.ready never rejects — if registration silently
// failed (see ServiceWorkerRegister) it just hangs forever. A timeout turns
// that into a clear, catchable error instead of a permanently-stuck button.
async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  const readyOrTimeout = Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Service Workerの登録がタイムアウトしました。ページを再読み込みしてください。")),
        10_000,
      ),
    ),
  ]);
  return readyOrTimeout;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await getReadyRegistration();
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("通知機能が設定されていません（VAPID公開鍵が未設定）");
  }
  if (!isPushSupported()) {
    throw new Error("このブラウザはプッシュ通知に対応していません");
  }
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    throw new Error("プッシュ通知にはHTTPS接続が必要です（localhostを除く）");
  }

  const registration = await getReadyRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      throw new Error("通知の許可が得られませんでした。ブラウザの通知設定を確認してください。");
    }
    throw new Error(
      `プッシュ登録に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
