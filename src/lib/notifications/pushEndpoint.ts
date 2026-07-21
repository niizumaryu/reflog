// Defense-in-depth guard against a maliciously-crafted `endpoint` being used
// as a server-side request target. `push_subscriptions.endpoint` is only
// ever supposed to contain a URL the browser's real PushManager handed back,
// but nothing in the RLS policy stops an authenticated user from calling the
// Supabase REST API directly and writing an arbitrary string there instead
// of going through subscribeToPush()/savePushSubscription(). That value is
// later fed straight into webpush.sendNotification() by server-side code
// (src/app/api/cron/notifications, src/app/api/notifications/test), which
// makes an outbound HTTPS request to it using our own VAPID identity — an
// unvalidated endpoint is a server-side request forgery primitive. This
// check is used both at write time (savePushSubscription) and again at
// send time (belt and suspenders, since the row could have been inserted by
// a direct API call that bypassed the write-time check).
const PRIVATE_OR_LOCAL_HOSTNAME =
  /^(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|\[?::1\]?$)/i;

export function isValidPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2048) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (PRIVATE_OR_LOCAL_HOSTNAME.test(url.hostname)) return false;
  return true;
}
