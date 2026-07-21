import { describe, expect, it } from "vitest";
import { isValidPushEndpoint } from "@/lib/notifications/pushEndpoint";

describe("isValidPushEndpoint", () => {
  it("accepts a real push-service-shaped https URL", () => {
    expect(isValidPushEndpoint("https://fcm.googleapis.com/fcm/send/abc123")).toBe(true);
    expect(
      isValidPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/xyz"),
    ).toBe(true);
  });

  it("rejects non-string/empty/oversized values", () => {
    expect(isValidPushEndpoint(undefined)).toBe(false);
    expect(isValidPushEndpoint(null)).toBe(false);
    expect(isValidPushEndpoint(123)).toBe(false);
    expect(isValidPushEndpoint("")).toBe(false);
    expect(isValidPushEndpoint(`https://fcm.googleapis.com/${"a".repeat(2048)}`)).toBe(false);
  });

  it("rejects a non-URL string", () => {
    expect(isValidPushEndpoint("not a url")).toBe(false);
  });

  it("rejects non-https schemes", () => {
    expect(isValidPushEndpoint("http://fcm.googleapis.com/fcm/send/abc123")).toBe(false);
    expect(isValidPushEndpoint("file:///etc/passwd")).toBe(false);
    expect(isValidPushEndpoint("ftp://example.com/x")).toBe(false);
  });

  it("rejects loopback and private-use hostnames (SSRF targets)", () => {
    expect(isValidPushEndpoint("https://localhost/x")).toBe(false);
    expect(isValidPushEndpoint("https://127.0.0.1/x")).toBe(false);
    expect(isValidPushEndpoint("https://10.0.0.5/x")).toBe(false);
    expect(isValidPushEndpoint("https://172.16.0.1/x")).toBe(false);
    expect(isValidPushEndpoint("https://192.168.1.1/x")).toBe(false);
    expect(isValidPushEndpoint("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isValidPushEndpoint("https://[::1]/x")).toBe(false);
  });

  it("does not reject a public hostname that merely starts with a digit-like private prefix", () => {
    // 172.32.x.x is outside the 172.16-31 private range and should be allowed.
    expect(isValidPushEndpoint("https://172.32.0.1/x")).toBe(true);
  });
});
