"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { isProfileComplete } from "@/lib/profile";

const EXEMPT_PREFIXES = [
  "/login",
  "/reset-password",
  "/update-password",
  "/auth/",
  "/settings/profile",
];

export function ProfileGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, profile, profileLoading } = useAuth();

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    if (EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    if (!isProfileComplete(profile)) {
      router.push("/settings/profile?onboarding=1");
    }
  }, [loading, profileLoading, user, profile, pathname, router]);

  return null;
}
