"use client";

import { useEffect, useId, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  /** Name of the specific item being acted on (e.g. a match/schedule title), shown for clarity before a destructive action. */
  targetName?: string;
  confirmLabel: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  /** Destructive actions (delete) render the confirm button in red and require an explicit confirm/cancel pair. */
  destructive?: boolean;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  targetName,
  confirmLabel,
  confirmingLabel,
  cancelLabel = "キャンセル",
  destructive = true,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const baseId = useId();

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isConfirming) onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, isConfirming, onCancel]);

  if (!open) return null;

  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description || targetName ? descId : undefined}
        className="w-full max-w-sm space-y-5 rounded-t-3xl border border-white/10 bg-zinc-950 p-6 sm:rounded-3xl"
      >
        <div className="space-y-2 text-center">
          <h2 id={titleId} className="text-base font-bold text-white">
            {title}
          </h2>
          {(description || targetName) && (
            <p id={descId} className="text-xs leading-relaxed text-zinc-400">
              {targetName && (
                <span className="mb-1 block truncate font-semibold text-zinc-200">
                  {targetName}
                </span>
              )}
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60 ${
              destructive ? "bg-red-500" : "bg-cyan-500 text-black"
            }`}
          >
            {isConfirming ? confirmingLabel ?? confirmLabel : confirmLabel}
          </button>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-white transition active:bg-white/10 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
