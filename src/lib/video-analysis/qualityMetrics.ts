import {
  FRAME_SAMPLE_COUNT,
  QUALITY_HARD_FAILS,
  QUALITY_SOFT_FAILS,
} from "@/lib/video-analysis/constants";
import type {
  QualityClassification,
  RawQualityMetrics,
  VideoMetadata,
} from "@/lib/video-analysis/types";

// Real, dependency-free video analysis: everything here is computed from
// actual decoded frames of the file the user selected, using only
// standard browser APIs (HTMLVideoElement + Canvas2D). Nothing in this
// file is fabricated — where a browser can't reliably produce a number
// (e.g. exact frame rate), the field is left `null` rather than guessed.

function waitForEvent(
  target: HTMLVideoElement,
  event: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      target.removeEventListener(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    function onEvent() {
      clearTimeout(timer);
      target.removeEventListener(event, onEvent);
      resolve();
    }
    target.addEventListener(event, onEvent);
  });
}

async function loadVideoElement(file: File): Promise<{
  video: HTMLVideoElement;
  objectUrl: string;
}> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  await Promise.race([
    waitForEvent(video, "loadedmetadata", 15000),
    waitForEvent(video, "error", 15000).then(() => {
      throw new Error("動画のメタデータを読み込めませんでした");
    }),
  ]);

  return { video, objectUrl };
}

export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  const { video, objectUrl } = await loadVideoElement(file);
  try {
    const durationSeconds = Number.isFinite(video.duration) ? video.duration : null;
    const widthPx = video.videoWidth || null;
    const heightPx = video.videoHeight || null;
    const estimatedFps = await estimateFps(video);
    return { durationSeconds, widthPx, heightPx, estimatedFps };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Best-effort: browsers don't expose a video's encoded frame rate
// directly. If requestVideoFrameCallback is available, we play a short
// muted snippet and count real presented frames over a real elapsed
// time window. Any failure (unsupported API, autoplay blocked, etc.)
// honestly yields `null` instead of a fabricated number.
async function estimateFps(video: HTMLVideoElement): Promise<number | null> {
  if (typeof video.requestVideoFrameCallback !== "function") return null;

  try {
    const startedAt = video.currentTime;
    let frameCount = 0;
    let firstMediaTime: number | null = null;
    let lastMediaTime: number | null = null;
    let handle = 0;
    let stopped = false;

    const onFrame: VideoFrameRequestCallback = (_now, metadata) => {
      if (stopped) return;
      frameCount += 1;
      if (firstMediaTime === null) firstMediaTime = metadata.mediaTime;
      lastMediaTime = metadata.mediaTime;
      handle = video.requestVideoFrameCallback(onFrame);
    };

    handle = video.requestVideoFrameCallback(onFrame);
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 600));
    stopped = true;
    video.pause();
    video.cancelVideoFrameCallback(handle);
    video.currentTime = startedAt;

    if (frameCount < 2 || firstMediaTime === null || lastMediaTime === null) return null;
    const elapsed = lastMediaTime - firstMediaTime;
    if (elapsed <= 0) return null;
    const fps = (frameCount - 1) / elapsed;
    return Number.isFinite(fps) && fps > 0 ? Math.round(fps * 10) / 10 : null;
  } catch {
    return null;
  }
}

type FrameSample = { brightness: number; gradientEnergy: number };

const SAMPLE_CANVAS_WIDTH = 96;
const SAMPLE_CANVAS_HEIGHT = 54;

function sampleFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): FrameSample | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const gray = new Float32Array(canvas.width * canvas.height);
  let brightnessSum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = luminance;
    brightnessSum += luminance;
  }
  const brightness = brightnessSum / gray.length;

  // Simplified gradient-energy sharpness proxy (a stand-in for
  // variance-of-Laplacian): average absolute horizontal+vertical
  // finite difference over the downsampled grayscale frame. Explicitly
  // named "proxy" throughout the app — it is not a certified sharpness
  // metric, only a real, reproducible signal computed from real pixels.
  let gradientSum = 0;
  let gradientSamples = 0;
  for (let y = 0; y < canvas.height - 1; y += 1) {
    for (let x = 0; x < canvas.width - 1; x += 1) {
      const idx = y * canvas.width + x;
      const dx = gray[idx + 1] - gray[idx];
      const dy = gray[idx + canvas.width] - gray[idx];
      gradientSum += Math.abs(dx) + Math.abs(dy);
      gradientSamples += 1;
    }
  }
  const gradientEnergy = gradientSamples > 0 ? gradientSum / gradientSamples : 0;

  return { brightness, gradientEnergy };
}

export async function computeQualityMetrics(file: File): Promise<RawQualityMetrics> {
  const { video, objectUrl } = await loadVideoElement(file);
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_CANVAS_WIDTH;
  canvas.height = SAMPLE_CANVAS_HEIGHT;

  try {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration <= 0) {
      return {
        sampledFrameCount: 0,
        meanBrightness: null,
        brightnessStddev: null,
        darkFrameRatio: null,
        overexposedFrameRatio: null,
        blurProxyScore: null,
      };
    }

    const margin = duration * 0.05;
    const usableSpan = Math.max(duration - margin * 2, 0);
    const sampleTimes = Array.from({ length: FRAME_SAMPLE_COUNT }, (_, index) =>
      FRAME_SAMPLE_COUNT === 1
        ? duration / 2
        : margin + (usableSpan * index) / (FRAME_SAMPLE_COUNT - 1),
    );

    const samples: FrameSample[] = [];
    for (const time of sampleTimes) {
      try {
        video.currentTime = Math.min(time, Math.max(duration - 0.05, 0));
        await waitForEvent(video, "seeked", 5000);
        const sample = sampleFrame(video, canvas);
        if (sample) samples.push(sample);
      } catch {
        // Browser couldn't decode/seek to this timestamp — skip it. A
        // reduced sampledFrameCount is itself an honest quality signal.
      }
    }

    if (samples.length === 0) {
      return {
        sampledFrameCount: 0,
        meanBrightness: null,
        brightnessStddev: null,
        darkFrameRatio: null,
        overexposedFrameRatio: null,
        blurProxyScore: null,
      };
    }

    const brightnessValues = samples.map((s) => s.brightness);
    const meanBrightness =
      brightnessValues.reduce((sum, v) => sum + v, 0) / brightnessValues.length;
    const variance =
      brightnessValues.reduce((sum, v) => sum + (v - meanBrightness) ** 2, 0) /
      brightnessValues.length;
    const brightnessStddev = Math.sqrt(variance);
    const darkFrameRatio =
      brightnessValues.filter((v) => v < 40).length / brightnessValues.length;
    const overexposedFrameRatio =
      brightnessValues.filter((v) => v > 235).length / brightnessValues.length;
    const blurProxyScore =
      samples.reduce((sum, s) => sum + s.gradientEnergy, 0) / samples.length;

    return {
      sampledFrameCount: samples.length,
      meanBrightness,
      brightnessStddev,
      darkFrameRatio,
      overexposedFrameRatio,
      blurProxyScore,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function classifyQuality(
  metadata: VideoMetadata,
  metrics: RawQualityMetrics,
): QualityClassification {
  const reasons: string[] = [];

  const hardFail =
    metadata.durationSeconds === null ||
    metadata.durationSeconds < QUALITY_HARD_FAILS.minDurationSeconds ||
    metadata.widthPx === null ||
    metadata.heightPx === null ||
    Math.min(metadata.widthPx, metadata.heightPx) < QUALITY_HARD_FAILS.minDimensionPx ||
    metrics.sampledFrameCount < QUALITY_HARD_FAILS.minSampledFrameCount;

  if (hardFail) {
    return { tier: "insufficient", reasons: ["insufficient_data_for_analysis"] };
  }

  if (
    metrics.meanBrightness !== null &&
    (metrics.meanBrightness < QUALITY_SOFT_FAILS.minMeanBrightness ||
      metrics.meanBrightness > QUALITY_SOFT_FAILS.maxMeanBrightness)
  ) {
    reasons.push("poor_lighting");
  }
  if (
    metrics.darkFrameRatio !== null &&
    metrics.darkFrameRatio > QUALITY_SOFT_FAILS.maxDarkFrameRatio
  ) {
    reasons.push("mostly_dark_frames");
  }
  if (
    metrics.blurProxyScore !== null &&
    metrics.blurProxyScore < QUALITY_SOFT_FAILS.minBlurProxyScore
  ) {
    reasons.push("low_sharpness");
  }
  if (
    metadata.widthPx !== null &&
    metadata.heightPx !== null &&
    Math.min(metadata.widthPx, metadata.heightPx) < QUALITY_SOFT_FAILS.minResolutionPx
  ) {
    reasons.push("low_resolution");
  }
  if (
    metadata.estimatedFps !== null &&
    metadata.estimatedFps < QUALITY_SOFT_FAILS.minEstimatedFps
  ) {
    reasons.push("low_frame_rate");
  }

  const tier = reasons.length === 0 ? "high" : reasons.length === 1 ? "medium" : "low";
  return { tier, reasons };
}
