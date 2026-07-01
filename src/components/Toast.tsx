"use client";

import { useEffect, useState } from "react";

const TOAST_SESSION_KEY = "reflog_toast";

export function queueToast(message: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOAST_SESSION_KEY, message);
}

export function useQueuedToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const queued = sessionStorage.getItem(TOAST_SESSION_KEY);
    if (queued) {
      sessionStorage.removeItem(TOAST_SESSION_KEY);
      setMessage(queued);
    }
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  return message;
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-orange-500/40 bg-zinc-900/95 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.6)]">
        <span className="h-2 w-2 rounded-full bg-orange-500" />
        {message}
      </div>
    </div>
  );
}
