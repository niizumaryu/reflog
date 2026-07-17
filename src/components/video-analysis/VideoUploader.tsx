"use client";

import { ALLOWED_VIDEO_MIME_TYPES, MAX_VIDEO_SIZE_BYTES } from "@/lib/video-analysis/constants";

export function VideoUploader({
  selectedFile,
  previewUrl,
  onSelect,
  onClear,
  disabled,
}: {
  selectedFile: File | null;
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-cyan-500/40 p-8 text-center">
      <div className="text-5xl">🎥</div>
      <p className="mt-4 text-lg font-bold text-white">動画をアップロード</p>
      <p className="mt-1 text-xs text-zinc-400">
        MP4・MOV・WebM対応(最大{Math.floor(MAX_VIDEO_SIZE_BYTES / 1024 / 1024)}MB)
      </p>

      <label
        className={`mt-6 inline-flex h-12 cursor-pointer items-center justify-center rounded-xl bg-cyan-500 px-6 text-sm font-bold text-black transition active:scale-[0.98] ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        動画を選択
        <input
          type="file"
          accept={ALLOWED_VIDEO_MIME_TYPES.join(",")}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = "";
          }}
        />
      </label>

      {selectedFile && (
        <div className="relative mt-6 rounded-xl bg-white/5 p-4 text-left">
          <p className="text-xs font-semibold text-cyan-300">選択した動画</p>
          <p className="mt-2 truncate text-sm text-white">🎥 {selectedFile.name}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label="選択を解除"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 disabled:opacity-50"
          >
            ×
          </button>
        </div>
      )}

      {previewUrl && (
        <div className="mt-4">
          <p className="mb-2 text-left text-xs font-semibold text-cyan-300">プレビュー</p>
          <video src={previewUrl} controls className="w-full rounded-xl border border-white/10" />
        </div>
      )}
    </div>
  );
}
