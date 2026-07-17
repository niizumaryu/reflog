import { describe, expect, it } from "vitest";
import { classifyQuality } from "@/lib/video-analysis/qualityMetrics";
import { QUALITY_HARD_FAILS, QUALITY_SOFT_FAILS } from "@/lib/video-analysis/constants";
import type { RawQualityMetrics, VideoMetadata } from "@/lib/video-analysis/types";

const goodMetadata: VideoMetadata = {
  durationSeconds: 60,
  widthPx: 1280,
  heightPx: 720,
  estimatedFps: 30,
};

const goodMetrics: RawQualityMetrics = {
  sampledFrameCount: 12,
  meanBrightness: 120,
  brightnessStddev: 10,
  darkFrameRatio: 0.1,
  overexposedFrameRatio: 0,
  blurProxyScore: 20,
};

describe("classifyQuality", () => {
  it("classifies a clean, well-lit, sharp video as high quality with no reasons", () => {
    const result = classifyQuality(goodMetadata, goodMetrics);
    expect(result.tier).toBe("high");
    expect(result.reasons).toHaveLength(0);
  });

  it("hard-fails on duration below the minimum, ignoring soft-fail checks", () => {
    const result = classifyQuality(
      { ...goodMetadata, durationSeconds: QUALITY_HARD_FAILS.minDurationSeconds - 0.5 },
      goodMetrics,
    );
    expect(result.tier).toBe("insufficient");
    expect(result.reasons).toEqual(["insufficient_data_for_analysis"]);
  });

  it("hard-fails on a dimension below the minimum", () => {
    const result = classifyQuality(
      { ...goodMetadata, widthPx: QUALITY_HARD_FAILS.minDimensionPx - 1 },
      goodMetrics,
    );
    expect(result.tier).toBe("insufficient");
  });

  it("hard-fails on too few sampled frames", () => {
    const result = classifyQuality(goodMetadata, {
      ...goodMetrics,
      sampledFrameCount: QUALITY_HARD_FAILS.minSampledFrameCount - 1,
    });
    expect(result.tier).toBe("insufficient");
  });

  it("hard-fails on null duration/dimensions", () => {
    const result = classifyQuality(
      { durationSeconds: null, widthPx: null, heightPx: null, estimatedFps: null },
      goodMetrics,
    );
    expect(result.tier).toBe("insufficient");
  });

  it("flags poor_lighting as a single soft-fail reason -> medium tier", () => {
    const result = classifyQuality(goodMetadata, {
      ...goodMetrics,
      meanBrightness: QUALITY_SOFT_FAILS.minMeanBrightness - 1,
    });
    expect(result.tier).toBe("medium");
    expect(result.reasons).toContain("poor_lighting");
  });

  it("accumulates multiple soft-fail reasons into low tier", () => {
    const result = classifyQuality(
      {
        ...goodMetadata,
        widthPx: QUALITY_SOFT_FAILS.minResolutionPx - 1,
        heightPx: QUALITY_SOFT_FAILS.minResolutionPx - 1,
      },
      { ...goodMetrics, blurProxyScore: QUALITY_SOFT_FAILS.minBlurProxyScore - 1 },
    );
    expect(result.tier).toBe("low");
    expect(result.reasons).toEqual(
      expect.arrayContaining(["low_sharpness", "low_resolution"]),
    );
  });

  it("flags mostly_dark_frames when dark frame ratio exceeds the threshold", () => {
    const result = classifyQuality(goodMetadata, {
      ...goodMetrics,
      darkFrameRatio: QUALITY_SOFT_FAILS.maxDarkFrameRatio + 0.01,
    });
    expect(result.reasons).toContain("mostly_dark_frames");
  });

  it("flags low_frame_rate when estimated fps is below the threshold", () => {
    const result = classifyQuality(
      { ...goodMetadata, estimatedFps: QUALITY_SOFT_FAILS.minEstimatedFps - 1 },
      goodMetrics,
    );
    expect(result.reasons).toContain("low_frame_rate");
  });
});
