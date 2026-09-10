"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const AuthContext = createContext({
  session: null,
  user: null,
  role: null,
  isLoading: true,
});

export function AuthProvider({ children, initialSession = null }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState(initialSession);
  const [role, setRole] = useState(getRoleFromSession(initialSession));
  const [isLoading, setIsLoading] = useState(
    Boolean(initialSession?.user) && !getRoleFromSession(initialSession),
  );

  useEffect(() => {
    let isMounted = true;

    async function syncFallbackRole(activeSession) {
      const fallbackRole = getRoleFromSession(activeSession);

      if (fallbackRole || !activeSession?.user) {
        if (isMounted) {
          setRole(fallbackRole);
          setIsLoading(false);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", activeSession.user.id)
        .maybeSingle();

      if (isMounted) {
        setRole(profile?.role || null);
        setIsLoading(false);
      }
    }

    syncFallbackRole(initialSession);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setRole(getRoleFromSession(newSession));
      setIsLoading(Boolean(newSession?.user) && !getRoleFromSession(newSession));
      syncFallbackRole(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialSession, supabase]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        role,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

function getRoleFromSession(session) {
  return (
    session?.user?.app_metadata?.user_role
    || session?.user?.app_metadata?.role
    || session?.user?.user_metadata?.user_role
    || null
  );
}
