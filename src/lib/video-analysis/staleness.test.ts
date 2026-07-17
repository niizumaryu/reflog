import { describe, expect, it } from "vitest";
import { isAnalysisStale } from "@/lib/video-analysis/staleness";

const NOW = new Date("2026-07-17T12:00:00.000Z").getTime();
const TIMEOUT_MS = 5 * 60 * 1000;

describe("isAnalysisStale", () => {
  it("is not stale when 'analyzing' was updated moments ago", () => {
    const updatedAt = new Date(NOW - 1000).toISOString();
    expect(isAnalysisStale("analyzing", updatedAt, NOW, TIMEOUT_MS)).toBe(false);
  });

  it("is stale when 'analyzing' hasn't updated in longer than the timeout", () => {
    const updatedAt = new Date(NOW - TIMEOUT_MS - 1000).toISOString();
    expect(isAnalysisStale("analyzing", updatedAt, NOW, TIMEOUT_MS)).toBe(true);
  });

  it("is stale when 'uploaded' has sat untouched longer than the timeout", () => {
    const updatedAt = new Date(NOW - TIMEOUT_MS - 1000).toISOString();
    expect(isAnalysisStale("uploaded", updatedAt, NOW, TIMEOUT_MS)).toBe(true);
  });

  it("is never stale for a terminal 'completed' status, no matter how old", () => {
    const updatedAt = new Date(NOW - TIMEOUT_MS * 100).toISOString();
    expect(isAnalysisStale("completed", updatedAt, NOW, TIMEOUT_MS)).toBe(false);
  });

  it("is never stale for a terminal 'completed_insufficient_quality' status", () => {
    const updatedAt = new Date(NOW - TIMEOUT_MS * 100).toISOString();
    expect(isAnalysisStale("completed_insufficient_quality", updatedAt, NOW, TIMEOUT_MS)).toBe(
      false,
    );
  });

  it("is never stale for 'failed' — it already has its own retry button", () => {
    const updatedAt = new Date(NOW - TIMEOUT_MS * 100).toISOString();
    expect(isAnalysisStale("failed", updatedAt, NOW, TIMEOUT_MS)).toBe(false);
  });

  it("is exactly at the boundary (not strictly greater) treated as not stale", () => {
    const updatedAt = new Date(NOW - TIMEOUT_MS).toISOString();
    expect(isAnalysisStale("analyzing", updatedAt, NOW, TIMEOUT_MS)).toBe(false);
  });
});
