"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { migrateLocalDataIfNeeded } from "@/lib/migration";
import { getProfile, type Profile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  profile: null,
  profileLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const handleSignedIn = (signedInUser: User) => {
      migrateLocalDataIfNeeded(signedInUser.id).catch((error: unknown) => {
        console.error("Local data migration failed:", error);
      });
      refreshProfile();
    };

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        handleSignedIn(data.user);
      } else {
        setProfileLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.user) {
        handleSignedIn(session.user);
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, profile, profileLoading, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
